import os
import csv
import json
from pathlib import Path
import time
from storage import get_storage, save_training_session

def parse_yolo_results_csv(csv_path):
    """Parse Ultralytics YOLO results.csv into a metrics array."""
    metrics = []
    try:
        with open(csv_path, 'r') as f:
            reader = csv.DictReader(f)
            # Strip whitespace from header keys
            reader.fieldnames = [name.strip() for name in reader.fieldnames]
            
            for row in reader:
                # Extract basic metrics safely
                epoch = int(float(row.get('epoch', 0)))
                box_loss = float(row.get('train/box_loss', row.get('train/box_loss ', 0.0)))
                cls_loss = float(row.get('train/cls_loss', row.get('train/cls_loss ', 0.0)))
                dfl_loss = float(row.get('train/dfl_loss', row.get('train/dfl_loss ', 0.0)))
                
                # Validation losses (if available)
                val_box_loss = float(row.get('val/box_loss', row.get('val/box_loss ', 0.0)))
                val_cls_loss = float(row.get('val/cls_loss', row.get('val/cls_loss ', 0.0)))
                val_dfl_loss = float(row.get('val/dfl_loss', row.get('val/dfl_loss ', 0.0)))
                
                prec = float(row.get('metrics/precision(B)', row.get('metrics/precision(M)', 0.0)))
                rec = float(row.get('metrics/recall(B)', row.get('metrics/recall(M)', 0.0)))
                map50 = float(row.get('metrics/mAP50(B)', row.get('metrics/mAP50(M)', 0.0)))
                map50_95 = float(row.get('metrics/mAP50-95(B)', row.get('metrics/mAP50-95(M)', 0.0)))
                fit = float(row.get('fitness', 0.0))
                
                f1 = 0.0
                if (prec + rec) > 0:
                    f1 = 2 * (prec * rec) / (prec + rec)
                    
                metric_entry = {
                    'epoch': epoch,
                    'box_loss': box_loss,
                    'cls_loss': cls_loss,
                    'dfl_loss': dfl_loss,
                    'precision': prec,
                    'recall': rec,
                    'mAP50': map50,
                    'mAP50_95': map50_95,
                    'fitness': fit,
                    'f1': f1
                }
                
                # Add validation losses if they exist (non-zero)
                if val_box_loss > 0:
                    metric_entry['val_box_loss'] = val_box_loss
                if val_cls_loss > 0:
                    metric_entry['val_cls_loss'] = val_cls_loss
                if val_dfl_loss > 0:
                    metric_entry['val_dfl_loss'] = val_dfl_loss
                    
                metrics.append(metric_entry)
    except Exception as e:
        print(f"Failed to parse {csv_path}: {e}")
    return metrics

def discover_offline_runs():
    """Scan directories for external runs and inject them into SQLite."""
    storage = get_storage()
    runs_to_check = []
    
    # Check YOLO standard run directories recursively
    for base in ['./runs/segment', './runs/detect', './checkpoints']:
        base_path = Path(base)
        if base_path.exists():
            for csv_path in base_path.rglob('results.csv'):
                runs_to_check.append(csv_path.parent)
                
    # Also collect any configless .pt files in checkpoints
    checkpoints_path = Path('./checkpoints')
    if checkpoints_path.exists():
        for pt_file in checkpoints_path.rglob('*.pt'):
            parent_dir = pt_file.parent
            if parent_dir.name == 'weights':
                parent_dir = parent_dir.parent
            if parent_dir not in runs_to_check:
                runs_to_check.append(parent_dir)

    for run_dir in set(runs_to_check):
        session_id = run_dir.name
        # Some folders might be named 'train' inside 'segment' or they are actual session IDs
        if session_id in ('train', 'train2', 'val', 'tune'):
            session_id = f"yolo_{session_id}_{int(run_dir.stat().st_mtime)}"
        
        # Skip if already in database
        if session_id in storage['training_sessions']:
            continue
            
        csv_path = run_dir / 'results.csv'
        metrics = []
        config = {'imported': True, 'path': str(run_dir)}
        model_type = 'yolo'
        total_epochs = 0
        
        if csv_path.exists():
            print(f"Discovered offline run from CSV: {session_id} at {csv_path}")
            metrics = parse_yolo_results_csv(csv_path)
            total_epochs = len(metrics)
            if 'checkpoints' in str(run_dir) and (run_dir / 'metadata.txt').exists():
                model_type = 'rfdetr'
            config['model_type'] = model_type
        else:
            # Fallback to checking the .pt file
            pt_files = list(run_dir.glob('*.pt'))
            if not pt_files and (run_dir / 'weights').exists():
                pt_files = list((run_dir / 'weights').glob('*.pt'))
                
            if pt_files:
                pt_file = pt_files[0]
                print(f"Discovered offline run from PT file: {session_id} at {pt_file}")
                try:
                    import torch
                    import warnings
                    with warnings.catch_warnings():
                        warnings.simplefilter('ignore')
                        ckpt = torch.load(str(pt_file), map_location='cpu', weights_only=False)
                        
                        if 'train_args' in ckpt:
                            train_args = ckpt['train_args']
                            config.update(train_args)
                            total_epochs = train_args.get('epochs', 0)
                            if 'model' in train_args:
                                model_type = train_args['model']
                                
                        if 'train_metrics' in ckpt:
                            t_metrics = ckpt['train_metrics']
                            prec = t_metrics.get('metrics/precision(B)', t_metrics.get('metrics/precision(M)', 0.0))
                            rec = t_metrics.get('metrics/recall(B)', t_metrics.get('metrics/recall(M)', 0.0))
                            map50 = t_metrics.get('metrics/mAP50(B)', t_metrics.get('metrics/mAP50(M)', 0.0))
                            map50_95 = t_metrics.get('metrics/mAP50-95(B)', t_metrics.get('metrics/mAP50-95(M)', 0.0))
                            
                            f1 = 2 * (prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0
                            metrics = [{
                                'epoch': ckpt.get('epoch', total_epochs - 1 if total_epochs > 0 else 0) if isinstance(ckpt.get('epoch'), int) else total_epochs - 1,
                                'box_loss': t_metrics.get('val/box_loss', 0.0),
                                'cls_loss': t_metrics.get('val/cls_loss', 0.0),
                                'dfl_loss': t_metrics.get('val/dfl_loss', 0.0),
                                'precision': prec,
                                'recall': rec,
                                'mAP50': map50,
                                'mAP50_95': map50_95,
                                'f1': f1
                            }]
                except Exception as e:
                    print(f"Failed to parse PT file {pt_file}: {e}")
            else:
                continue # Skip if no csv and no pt file

        if len(metrics) == 0 and total_epochs == 0:
             continue # Skip empty discovery
             
        storage['training_sessions'][session_id] = {
            'id': session_id,
            'status': 'completed',
            'current_epoch': total_epochs - 1 if total_epochs > 0 else 0,
            'total_epochs': total_epochs,
            'model_type': model_type,
            'start_time': run_dir.stat().st_mtime,
            'config': config,
            'metrics': metrics
        }
        save_training_session(session_id)
        print(f"Successfully synced offline run {session_id} to database.")
