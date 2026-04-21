"""
Training functions - YOLO and RF-DETR, no classes.
"""
import threading
import uuid
import time
import asyncio
from typing import Dict, Callable, Optional
from pathlib import Path

def train_yolo(config: Dict, session_id: str, on_epoch_end: Optional[Callable] = None,
               on_complete: Optional[Callable] = None, stop_event: Optional[threading.Event] = None,
               event_loop: Optional[asyncio.AbstractEventLoop] = None):
    """Simple YOLO training function."""
    try:
        from ultralytics import YOLO
        import torch

        # Handle resuming logic
        is_resuming = config.get('resume', False)
        
        # Load model definition
        if is_resuming:
            # When resuming, YOLO needs the checkpoint path explicitly
            ckpt_path = f"./checkpoints/{session_id}/weights/last.pt"
            print(f"Resuming YOLO from {ckpt_path}")
            model = YOLO(ckpt_path)
        else:
            model = YOLO("./models/" + config.get('model', 'yolo11n-seg.pt'))
            
        device = "cuda" if torch.cuda.is_available() else "cpu"
        torch.cuda.empty_cache()

        args = {
            'data': config['dataset_yaml'],
            'epochs': config.get('epochs', 100),
            'imgsz': config.get('imgsz', 640),
            'batch': config.get('batch', 16),
            'device': device,
            'lr0': config.get('lr0', 0.01),
            'lrf': config.get('lrf', 0.01),
            'momentum': config.get('momentum', 0.937),
            'weight_decay': config.get('weight_decay', 0.0005),
            'patience': config.get('patience', 50),
            'save': True,
            'project': './checkpoints',
            'name': session_id,
            'exist_ok': True,
        }

        # If resuming, inject the resume flag
        if is_resuming:
            args['resume'] = True

        # Custom callback for epoch end
        def callback_trainer(trainer):
            print(f"Callback triggered for session {session_id}")
            if stop_event and stop_event.is_set():
                trainer.stop = True
                return

            epoch = trainer.epoch
            print(f"Epoch completed: {epoch}")
            
            # Convert tensors to floats for JSON serialization
            def to_float(val):
                if hasattr(val, 'item'):  # Tensor
                    return float(val.item())
                return float(val) if val is not None else 0.0
            
            # Basic losses
            metrics = {
                'epoch': epoch,
                'box_loss': to_float(trainer.loss_items[0]) if hasattr(trainer, 'loss_items') and len(trainer.loss_items) > 0 else 0.0,
                'cls_loss': to_float(trainer.loss_items[1]) if hasattr(trainer, 'loss_items') and len(trainer.loss_items) > 1 else 0.0,
                'dfl_loss': to_float(trainer.loss_items[2]) if hasattr(trainer, 'loss_items') and len(trainer.loss_items) > 2 else 0.0,
            }
            
            # Detailed metrics from validator if available
            if hasattr(trainer, 'validator') and hasattr(trainer.validator, 'metrics'):
                val_metrics = trainer.validator.metrics
                # For segmentation models, prefer mask metrics suffix (M)
                # For detection, use (B)
                suffix = '(M)' if 'segment' in str(type(trainer)).lower() else '(B)'
                
                results_dict = val_metrics.results_dict if hasattr(val_metrics, 'results_dict') else {}
                
                metrics.update({
                    'precision': to_float(results_dict.get(f'metrics/precision{suffix}', 0.0)),
                    'recall': to_float(results_dict.get(f'metrics/recall{suffix}', 0.0)),
                    'mAP50': to_float(results_dict.get(f'metrics/mAP50{suffix}', 0.0)),
                    'mAP50_95': to_float(results_dict.get(f'metrics/mAP50-95{suffix}', 0.0)),
                    'fitness': to_float(val_metrics.fitness) if hasattr(val_metrics, 'fitness') else 0.0
                })
                
                # Calculate F1 if not provided
                if metrics['precision'] + metrics['recall'] > 0:
                    metrics['f1'] = 2 * (metrics['precision'] * metrics['recall']) / (metrics['precision'] + metrics['recall'])
                else:
                    metrics['f1'] = 0.0
                
                # Extract validation losses from results_dict with 'val/' prefix
                # YOLO stores these as val/box_loss, val/cls_loss, val/dfl_loss
                val_box = results_dict.get('val/box_loss', 0.0)
                val_cls = results_dict.get('val/cls_loss', 0.0)
                val_dfl = results_dict.get('val/dfl_loss', 0.0)
                
                if val_box and float(val_box) > 0:
                    metrics['val_box_loss'] = to_float(val_box)
                    print(f"Extracted val_box_loss: {metrics['val_box_loss']}")
                if val_cls and float(val_cls) > 0:
                    metrics['val_cls_loss'] = to_float(val_cls)
                    print(f"Extracted val_cls_loss: {metrics['val_cls_loss']}")
                if val_dfl and float(val_dfl) > 0:
                    metrics['val_dfl_loss'] = to_float(val_dfl)
                    print(f"Extracted val_dfl_loss: {metrics['val_dfl_loss']}")

            print(f"Metrics: {metrics}")

            if on_epoch_end:
                print(f"Calling on_epoch_end callback")
                on_epoch_end(session_id, epoch, metrics)

        # Custom callback for batch end
        def callback_batch(trainer):
            if stop_event and stop_event.is_set():
                trainer.stop = True
                return

            # Remove buggy fitness throttle - let the frontend handle incoming frequency or just send them all
            
            # Use same logic to get current loss
            def to_float(val):
                if hasattr(val, 'item'): return float(val.item())
                return float(val) if val is not None else 0.0

            batch_metrics = {
                'epoch': trainer.epoch,
                'step': getattr(trainer, 'batch_idx', 0),
                'box_loss': to_float(trainer.loss_items[0]) if hasattr(trainer, 'loss_items') and len(trainer.loss_items) > 0 else 0.0,
                'cls_loss': to_float(trainer.loss_items[1]) if hasattr(trainer, 'loss_items') and len(trainer.loss_items) > 1 else 0.0,
                'dfl_loss': to_float(trainer.loss_items[2]) if hasattr(trainer, 'loss_items') and len(trainer.loss_items) > 2 else 0.0,
            }

            if event_loop and event_loop.is_running():
                from storage import storage
                if session_id in storage.get('active_websockets', {}):
                    for ws in storage['active_websockets'][session_id]:
                        asyncio.run_coroutine_threadsafe(
                            ws.send_json({
                                'type': 'batch',
                                'metrics': batch_metrics
                            }),
                            event_loop
                        )

        # Add callbacks
        model.add_callback('on_train_epoch_end', callback_trainer)
        model.add_callback('on_train_batch_end', callback_batch)

        # Train
        results = model.train(**args)

        if on_complete:
            # Try to get best checkpoint path, fall back to default location
            best_path = None
            if hasattr(results, 'best'):
                best_path = str(results.best)
            elif hasattr(results, 'save_dir'):
                # For segmentation models, checkpoint is in save_dir/weights/best.pt
                from pathlib import Path
                best_path = str(Path(results.save_dir) / 'weights' / 'best.pt')
            else:
                # Fallback to expected location
                best_path = f"./checkpoints/{session_id}/weights/best.pt"
            on_complete(session_id, True, best_path)

    except Exception as e:
        print(f"Training error: {e}")
        if on_complete:
            on_complete(session_id, False, str(e))



def start_training_session(config: Dict, storage: Dict, resume_session_id: Optional[str] = None) -> str:
    """Start a training session and return session ID."""
    if resume_session_id and resume_session_id in storage['training_sessions']:
        session_id = resume_session_id
        session = storage['training_sessions'][session_id]
        
        # We inject resume=True silently so the training loop handles it
        config['resume'] = True
        
        # Retain past epochs and metrics
        current_epoch = session['current_epoch']
        metrics = session['metrics']
        
        # Reset stop event & update status
        stop_event = threading.Event()
        session['stop_event'] = stop_event
        session['status'] = 'running'
        session['config'] = config
        
    else:
        session_id = str(uuid.uuid4())[:8]
        # Create stop event
        stop_event = threading.Event()
        current_epoch = 0
        metrics = []
        
        # Store initial session
        storage['training_sessions'][session_id] = {
            'id': session_id,
            'config': config,
            'status': 'running',
            'start_time': time.time(),
            'current_epoch': current_epoch,
            'total_epochs': config.get('epochs', 100),
            'metrics': metrics,
            'stop_event': stop_event,
            'model_type': config.get('model_type', 'yolo')
        }

    # Get the stored event loop from storage (set during startup)
    event_loop = storage.get('event_loop')
    print(f"Using event loop from storage: {event_loop}")

    # Save initial state to database
    from storage import save_training_session
    save_training_session(session_id)

    # Start training in thread
    def on_epoch_end(sid, epoch, metrics):
        # print("epoch end\n");
        # print(epoch);
        # print(metrics);

        if sid in storage['training_sessions']:
            storage['training_sessions'][sid]['current_epoch'] = epoch
            storage['training_sessions'][sid]['metrics'].append(metrics)
            
            # Save to database
            from storage import save_training_session
            save_training_session(sid)

            # Broadcast to WebSocket if available
            print(f"Checking websockets for session {sid}: {sid in storage.get('active_websockets', {})}")
            if sid in storage.get('active_websockets', {}):
                print(f"Found {len(storage['active_websockets'][sid])} websocket(s)")
                for ws in storage['active_websockets'][sid]:
                    try:
                        print(f"Sending epoch {epoch} to websocket, event_loop: {event_loop}, is_running: {event_loop.is_running() if event_loop else False}")
                        # Use run_coroutine_threadsafe to call async method from sync context
                        if event_loop and event_loop.is_running():
                            future = asyncio.run_coroutine_threadsafe(
                                ws.send_json({
                                    'type': 'epoch',
                                    'epoch': epoch,
                                    'metrics': metrics
                                }),
                                event_loop
                            )
                            # Wait for the result with timeout to catch any errors
                            try:
                                future.result(timeout=5.0)
                                print(f"Sent epoch {epoch} successfully")
                            except Exception as send_error:
                                print(f"Failed to send epoch {epoch}: {send_error}")
                        else:
                            print(f"Cannot send: event_loop not available or not running")
                    except Exception as e:
                        print(f"WebSocket send error: {e}")

    def on_complete(sid, success, result):
        if sid in storage['training_sessions']:
            storage['training_sessions'][sid]['status'] = 'completed' if success else 'error'
            storage['training_sessions'][sid]['result'] = result
            
            # Save final state to database
            from storage import save_training_session
            save_training_session(sid)

            # Broadcast completion
            if sid in storage.get('active_websockets', {}):
                for ws in storage['active_websockets'][sid]:
                    try:
                        # Use run_coroutine_threadsafe to call async method from sync context
                        if event_loop and event_loop.is_running():
                            asyncio.run_coroutine_threadsafe(
                                ws.send_json({
                                    'type': 'complete',
                                    'success': success,
                                    'result': result
                                }),
                                event_loop
                            )
                    except Exception as e:
                        print(f"WebSocket send error: {e}")

    # Exclusively use YOLO training (YOLOv11 & YOLOv26 handled natively by Ultralytics)
    thread = threading.Thread(
        target=train_yolo,
        args=(config, session_id, on_epoch_end, on_complete, stop_event, event_loop),
        daemon=True
    )

    thread.start()

    return session_id

def stop_training_session(session_id: str, storage: Dict) -> bool:
    """Stop a training session."""
    if session_id in storage['training_sessions']:
        session = storage['training_sessions'][session_id]
        if 'stop_event' in session:
            session['stop_event'].set()
            session['status'] = 'stopping'
            return True
    return False
