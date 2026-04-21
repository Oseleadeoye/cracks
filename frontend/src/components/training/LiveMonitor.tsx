import React, { useState, useEffect, useMemo } from 'react';
import { Activity, RotateCcw, TrendingUp, AlertTriangle } from 'lucide-react';
import { Panel } from '../ui/Panel';
import { LED } from '../ui/LED';
import { useWebSocket } from '../../hooks/useWebSocket';
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer 
} from 'recharts';
import { 
  getTrainingSessions, 
  getTrainingMetrics 
} from '../../api';

interface LiveMonitorProps {
  className?: string;
  title?: string;
  collapsible?: boolean;
  activeSession?: any;
}

export const LiveMonitor: React.FC<LiveMonitorProps> = ({ 
  className = "", 
  title = "Live Monitor",
  collapsible = false,
  activeSession: initialActiveSession = null
}) => {
  const [activeSession, setActiveSession] = useState<any>(initialActiveSession);
  const [metrics, setMetrics] = useState<any[]>([]);
  const [currentBatch, setCurrentBatch] = useState<any>(null);
  const [isCollapsed, setIsCollapsed] = useState(false);

  // Check if validation losses are available in the data (either defined or greater than 0)
  const hasValidationLoss = metrics.length > 0 && metrics.some(m => 
    (m.val_box_loss !== undefined && m.val_box_loss > 0) ||
    (m.val_cls_loss !== undefined && m.val_cls_loss > 0)
  );

  // Detect overfitting patterns
  const overfittingStatus = useMemo(() => {
    if (metrics.length < 10) return null; // Need enough data
    
    const recent = metrics.slice(-10); // Last 10 epochs
    const older = metrics.slice(-20, -10); // Previous 10 epochs
    
    if (older.length < 5 || recent.length < 5) return null;
    
    // Calculate trends
    const avgLossOlder = older.reduce((sum, m) => sum + m.box_loss, 0) / older.length;
    const avgLossRecent = recent.reduce((sum, m) => sum + m.box_loss, 0) / recent.length;
    const lossImproving = avgLossRecent < avgLossOlder * 0.95; // Loss dropped by 5%+
    
    // Check validation metrics (precision, mAP50)
    const hasValidationMetrics = recent.some(m => m.precision !== undefined && m.precision > 0);
    
    if (hasValidationMetrics) {
      const avgPrecisionOlder = older.reduce((sum, m) => sum + (m.precision || 0), 0) / older.length;
      const avgPrecisionRecent = recent.reduce((sum, m) => sum + (m.precision || 0), 0) / recent.length;
      const precisionDeclining = avgPrecisionRecent < avgPrecisionOlder * 0.95;
      const precisionStagnant = Math.abs(avgPrecisionRecent - avgPrecisionOlder) < 0.02;
      
      const avgMapOlder = older.reduce((sum, m) => sum + (m.mAP50 || 0), 0) / older.length;
      const avgMapRecent = recent.reduce((sum, m) => sum + (m.mAP50 || 0), 0) / recent.length;
      const mapDeclining = avgMapRecent < avgMapOlder * 0.95;
      const mapStagnant = Math.abs(avgMapRecent - avgMapOlder) < 0.02;
      
      // Overfitting: loss improving but metrics declining/stagnant
      if (lossImproving && (precisionDeclining || mapDeclining)) {
        return {
          type: 'severe',
          message: 'Validation metrics declining while training loss improves. Model is overfitting!',
          recommendation: 'Consider early stopping or reducing epochs.'
        };
      }
      
      if (lossImproving && (precisionStagnant || mapStagnant)) {
        return {
          type: 'warning',
          message: 'Training loss improving but validation metrics stagnant. Risk of overfitting.',
          recommendation: 'Monitor closely - consider stopping if metrics don\'t improve.'
        };
      }
    }
    
    return null;
  }, [metrics]);

  // Debug logging
  useEffect(() => {
    if (metrics.length > 0) {
      const latest = metrics[metrics.length - 1];
      console.log('Latest metrics:', latest);
      console.log('Has validation loss:', hasValidationLoss);
      console.log('Overfitting status:', overfittingStatus);
      console.log('val_box_loss:', latest?.val_box_loss);
      console.log('val_cls_loss:', latest?.val_cls_loss);
    }
  }, [metrics]);

  useEffect(() => {
    if (initialActiveSession) {
      setActiveSession(initialActiveSession);
    } else {
      loadSessions();
    }
  }, [initialActiveSession]);

  // Load existing metrics when active session changes
  useEffect(() => {
    if (activeSession?.id) {
      getTrainingMetrics(activeSession.id).then(res => {
        if (res.data && Array.isArray(res.data)) {
          setMetrics(res.data);
        }
      });
    } else {
      setMetrics([]);
      setCurrentBatch(null);
    }
  }, [activeSession?.id]);

  const loadSessions = () => {
    getTrainingSessions().then(res => {
      const active = res.data.find((s: any) => s.status === 'running');
      setActiveSession(active);
    });
  };

  // WebSocket for live training updates
  useWebSocket(
    activeSession ? `/ws/training/${activeSession.id}` : null,
    (data) => {
      if (data.type === 'epoch') {
        setMetrics((prev: any[]) => [...prev, data.metrics]);
        setCurrentBatch(null); 
        setActiveSession((prev: any) => prev ? {
          ...prev,
          current_epoch: data.epoch
        } : null);
      } else if (data.type === 'batch') {
        setCurrentBatch(data.metrics);
      } else if (data.type === 'complete') {
        loadSessions();
      }
    }
  );

  if (collapsible && isCollapsed) {
    return (
        <div className={`bg-[var(--bg-secondary)]/80 border border-[var(--border-primary)] rounded-xl p-3 flex items-center justify-between cursor-pointer hover:bg-[var(--bg-hover)] transition-colors ${className}`} onClick={() => setIsCollapsed(false)}>
            <div className="flex items-center gap-3">
                <Activity size={18} className="text-[var(--accent-primary)]" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">{title}</span>
                {activeSession && <LED color="orange" pulse />}
            </div>
            <span className="text-xs text-[var(--text-muted)]">Click to expand</span>
        </div>
    );
  }

  return (
    <Panel 
      title={title} 
      className={className}
      onClose={collapsible ? () => setIsCollapsed(true) : undefined}
    >
      {activeSession ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <LED color="orange" pulse />
              <div>
                <span className="font-mono text-[var(--accent-primary)] text-sm">
                  Session #{activeSession.id?.substring(0, 8)}
                </span>
                <span className="ml-2 text-[10px] bg-[var(--warning-bg)] text-[var(--warning-text)] px-1.5 py-0.5 rounded animate-pulse uppercase font-bold">
                  TRAINING
                </span>
              </div>
            </div>
            <span className="text-sm text-[var(--text-muted)]">
              {activeSession.current_epoch}/{activeSession.total_epochs} epochs
            </span>
          </div>

          {/* Progress Bar */}
          <div className="progress-clean">
            <div 
              className="progress-clean-bar"
              style={{ 
                width: `${Math.max(2, (activeSession.current_epoch / activeSession.total_epochs) * 100)}%` 
              }}
            />
          </div>

          {/* Overfitting Warning */}
          {overfittingStatus && (
            <div className={`rounded-lg p-3 border ${
              overfittingStatus.type === 'severe' 
                ? 'bg-red-500/10 border-red-500/30' 
                : 'bg-amber-500/10 border-amber-500/30'
            }`}>
              <div className="flex items-start gap-2">
                <AlertTriangle size={16} className={
                  overfittingStatus.type === 'severe' ? 'text-red-500' : 'text-amber-500'
                } />
                <div className="flex-1">
                  <div className={`text-xs font-semibold ${
                    overfittingStatus.type === 'severe' ? 'text-red-600' : 'text-amber-600'
                  }`}>
                    {overfittingStatus.type === 'severe' ? '⚠️ Overfitting Detected' : '⚡ Overfitting Risk'}
                  </div>
                  <p className="text-xs text-[var(--text-secondary)] mt-1">
                    {overfittingStatus.message}
                  </p>
                  <p className="text-[10px] text-[var(--text-muted)] mt-1 italic">
                    💡 {overfittingStatus.recommendation}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Live Status (Batch metrics) */}
          {(currentBatch || metrics.length === 0) && (
            <div className="bg-[var(--bg-secondary)]/60 border border-[var(--border-primary)] rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold tracking-tighter">Live Status</span>
                <div className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse" />
                  <span className="text-[10px] text-[var(--accent-primary)] font-mono">STEP {currentBatch?.step ?? '...'}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] text-[var(--text-muted)] mb-0.5">Current Loss</div>
                  <div className="font-mono text-lg text-[var(--text-primary)]">
                    {currentBatch?.box_loss?.toFixed(4) ?? 'Initializing...'}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-[var(--text-muted)] mb-0.5">Progress</div>
                  <div className="font-mono text-lg text-[var(--text-secondary)]">
                    {activeSession.current_epoch} <span className="text-xs opacity-40">/ {activeSession.total_epochs}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loss Chart */}
          <div className="mt-4">
            <div className="flex items-center gap-2 mb-2">
              <Activity size={16} className="text-[var(--accent-primary)]" />
              <span className="text-sm font-medium text-[var(--text-secondary)]">Loss Curves</span>
              <span className="text-xs text-[var(--text-muted)]">
                ({metrics.length} epochs recorded)
              </span>
              {hasValidationLoss && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[var(--accent-primary)]/20 text-[var(--accent-primary)]">
                  Solid = Train, Dashed = Val
                </span>
              )}
            </div>
            
            {metrics.length > 0 ? (
              <div className="h-48 bg-[var(--bg-secondary)]/50 rounded-lg border border-[var(--border-primary)] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--text-secondary)' }}
                    />
                    <Line type="monotone" dataKey="box_loss" stroke="#22c55e" strokeWidth={2} dot={metrics.length < 20} name="Train Box Loss" />
                    {(metrics[0]?.cls_loss !== undefined || metrics[0]?.class_loss !== undefined) && (
                      <Line type="monotone" dataKey={metrics[0]?.cls_loss !== undefined ? "cls_loss" : "class_loss"} stroke="#3b82f6" strokeWidth={2} dot={metrics.length < 20} name="Train Cls Loss" />
                    )}
                    {metrics[0]?.dfl_loss > 0 && (
                      <Line type="monotone" dataKey="dfl_loss" stroke="#f97316" strokeWidth={2} dot={metrics.length < 20} name="Train DFL Loss" />
                    )}
                    {/* Validation losses - show if any metric has validation data */}
                    {(metrics.some(m => m.val_box_loss !== undefined) || metrics.some(m => m.val_cls_loss !== undefined)) && (
                      <>
                        {metrics.some(m => m.val_box_loss !== undefined) && (
                          <Line type="monotone" dataKey="val_box_loss" stroke="#22c55e" strokeWidth={2} dot={metrics.length < 20} name="Val Box Loss" strokeDasharray="5 5" />
                        )}
                        {metrics.some(m => m.val_cls_loss !== undefined) && (
                          <Line type="monotone" dataKey="val_cls_loss" stroke="#3b82f6" strokeWidth={2} dot={metrics.length < 20} name="Val Cls Loss" strokeDasharray="5 5" />
                        )}
                        {metrics.some(m => m.val_dfl_loss !== undefined && m.val_dfl_loss > 0) && (
                          <Line type="monotone" dataKey="val_dfl_loss" stroke="#f97316" strokeWidth={2} dot={metrics.length < 20} name="Val DFL Loss" strokeDasharray="5 5" />
                        )}
                      </>
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-48 border border-dashed border-[var(--border-primary)] rounded-lg flex flex-col items-center justify-center text-[var(--text-muted)] gap-2">
                <Activity size={24} className="opacity-20 animate-pulse" />
                <p className="text-xs">Waiting for first epoch metrics...</p>
              </div>
            )}
          </div>

          {/* Validation Metrics Chart - show if validation metrics exist */}
          {metrics.length > 0 && metrics.some(m => m.precision !== undefined || m.mAP50 !== undefined) && (
            <div className="mt-4">
              <div className="flex items-center gap-2 mb-2">
                <TrendingUp size={16} className="text-[var(--accent-primary)]" />
                <span className="text-sm font-medium text-[var(--text-secondary)]">Validation Metrics</span>
                <span className="text-xs text-[var(--text-muted)]">
                  (Precision, Recall, mAP)
                </span>
              </div>
              
              <div className="h-48 bg-[var(--bg-secondary)]/50 rounded-lg border border-[var(--border-primary)] p-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={metrics} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-primary)" />
                    <XAxis dataKey="epoch" stroke="var(--text-muted)" fontSize={10} tickLine={false} />
                    <YAxis stroke="var(--text-muted)" fontSize={10} tickLine={false} domain={[0, 1]} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-primary)', borderRadius: '8px', fontSize: '12px' }}
                      itemStyle={{ color: 'var(--text-secondary)' }}
                      formatter={(value: number) => `${(value * 100).toFixed(1)}%`}
                    />
                    {metrics.some(m => m.precision !== undefined) && (
                      <Line type="monotone" dataKey="precision" stroke="#ec4899" strokeWidth={2} dot={metrics.length < 20} name="Precision" />
                    )}
                    {metrics.some(m => m.recall !== undefined) && (
                      <Line type="monotone" dataKey="recall" stroke="#06b6d4" strokeWidth={2} dot={metrics.length < 20} name="Recall" />
                    )}
                    {metrics.some(m => m.f1 !== undefined) && (
                      <Line type="monotone" dataKey="f1" stroke="#8b5cf6" strokeWidth={2} dot={metrics.length < 20} name="F1 Score" />
                    )}
                    {metrics.some(m => m.mAP50 !== undefined) && (
                      <Line type="monotone" dataKey="mAP50" stroke="#f59e0b" strokeWidth={2} dot={metrics.length < 20} name="mAP50" />
                    )}
                    {metrics.some(m => m.mAP50_95 !== undefined) && (
                      <Line type="monotone" dataKey="mAP50_95" stroke="#10b981" strokeWidth={2} dot={metrics.length < 20} name="mAP50-95" />
                    )}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* Metric Guide */}
          <div className="mt-6 pt-4 border-t border-[var(--border-primary)]/50">
            <h4 className="text-[10px] uppercase tracking-wider text-[var(--text-muted)] font-bold mb-3 tracking-tighter">Understanding the Curves</h4>
            <div className="space-y-3">
              <div className="flex gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">Box Loss</div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                    Measures how accurately the model predicts crack locations. A <strong>downward trend</strong> indicates learning.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">Cls Loss</div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                    Measures accuracy of identifying cracks vs shadows/non-cracks.
                  </p>
                </div>
              </div>
              <div className="flex gap-3">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">DFL Loss</div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                    Refines detection boundaries for sharper, more precise crack edges.
                  </p>
                </div>
              </div>
              {hasValidationLoss && (
                <div className="flex gap-3">
                  <div className="mt-1 w-1.5 h-1.5 rounded-full border border-dashed border-green-500 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold text-[var(--text-secondary)]">Validation Loss (dashed lines)</div>
                    <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                      Measures model performance on validation data. If validation loss rises while training loss falls, the model may be <strong>overfitting</strong>.
                    </p>
                  </div>
                </div>
              )}
              {metrics.some(m => m.precision !== undefined || m.mAP50 !== undefined) && (
                <>
                  <div className="flex gap-3">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-pink-500 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">Precision</div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                        Percentage of correct crack detections out of all detections. Higher is better.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-cyan-500 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">Recall</div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                        Percentage of actual cracks that were detected. Higher is better.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">F1 Score</div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                        Harmonic mean of Precision and Recall. Balances both metrics.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">mAP50</div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                        Mean Average Precision at 50% IoU threshold. Key object detection metric.
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <div className="mt-1 w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                    <div>
                      <div className="text-xs font-semibold text-[var(--text-secondary)]">mAP50-95</div>
                      <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                        Mean Average Precision across IoU thresholds 0.5 to 0.95. Stricter metric.
                      </p>
                    </div>
                  </div>
                </>
              )}
              <div className="flex gap-3 pt-2 border-t border-[var(--border-primary)]/30">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                <div>
                  <div className="text-xs font-semibold text-[var(--text-secondary)]">Overfitting Detection</div>
                  <p className="text-[10px] text-[var(--text-muted)] leading-relaxed italic">
                    The system monitors for overfitting: when training loss improves but validation metrics (Precision, mAP) 
                    stagnate or decline. <strong>Warning signs:</strong> large gap between improving loss and flat metrics, 
                    or metrics that peak then drop while loss keeps falling.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Latest Metric Cards */}
          {metrics.length > 0 && (
            <div className={`grid gap-2 mt-4 p-3 bg-[var(--bg-tertiary)]/50 rounded-lg ${hasValidationLoss ? 'grid-cols-6' : 'grid-cols-3'}`}>
              {/* Box Loss */}
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">Train Box</div>
                <div className="font-mono text-xs text-green-500">
                  {metrics[metrics.length - 1].box_loss?.toFixed(4)}
                </div>
              </div>
              {hasValidationLoss && (
                <div className="text-center border-r border-[var(--border-primary)]">
                  <div className="text-[10px] text-[var(--text-muted)] mb-1">Val Box</div>
                  <div className="font-mono text-xs text-green-500/70">
                    {metrics[metrics.length - 1].val_box_loss?.toFixed(4) ?? '--'}
                  </div>
                </div>
              )}
              {/* Cls Loss */}
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">Train Cls</div>
                <div className="font-mono text-xs text-blue-500">
                  {(metrics[metrics.length - 1].cls_loss ?? metrics[metrics.length - 1].class_loss)?.toFixed(4)}
                </div>
              </div>
              {hasValidationLoss && (
                <div className="text-center border-r border-[var(--border-primary)]">
                  <div className="text-[10px] text-[var(--text-muted)] mb-1">Val Cls</div>
                  <div className="font-mono text-xs text-blue-500/70">
                    {metrics[metrics.length - 1].val_cls_loss?.toFixed(4) ?? '--'}
                  </div>
                </div>
              )}
              {/* DFL Loss */}
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">Train DFL</div>
                <div className="font-mono text-xs text-amber-500">
                  {metrics[metrics.length - 1].dfl_loss?.toFixed(4) ?? '0.000'}
                </div>
              </div>
              {hasValidationLoss && (
                <div className="text-center">
                  <div className="text-[10px] text-[var(--text-muted)] mb-1">Val DFL</div>
                  <div className="font-mono text-xs text-amber-500/70">
                    {metrics[metrics.length - 1].val_dfl_loss?.toFixed(4) ?? '--'}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Validation Metrics Cards */}
          {metrics.length > 0 && metrics.some(m => m.precision !== undefined || m.mAP50 !== undefined) && (
            <div className="grid grid-cols-5 gap-2 mt-4 p-3 bg-[var(--bg-tertiary)]/50 rounded-lg">
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">Precision</div>
                <div className="font-mono text-xs text-pink-500">
                  {(metrics[metrics.length - 1].precision * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center border-x border-[var(--border-primary)]">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">Recall</div>
                <div className="font-mono text-xs text-cyan-500">
                  {(metrics[metrics.length - 1].recall * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center border-r border-[var(--border-primary)]">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">F1</div>
                <div className="font-mono text-xs text-violet-500">
                  {(metrics[metrics.length - 1].f1 * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center border-r border-[var(--border-primary)]">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">mAP50</div>
                <div className="font-mono text-xs text-amber-500">
                  {(metrics[metrics.length - 1].mAP50 * 100).toFixed(1)}%
                </div>
              </div>
              <div className="text-center">
                <div className="text-[10px] text-[var(--text-muted)] mb-1">mAP50-95</div>
                <div className="font-mono text-xs text-emerald-500">
                  {(metrics[metrics.length - 1].mAP50_95 * 100).toFixed(1)}%
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-12 text-[var(--text-muted)]">
          <RotateCcw size={48} className="mb-4 opacity-20" />
          <p className="text-sm font-medium text-[var(--text-muted)]">No active sessions</p>
        </div>
      )}
    </Panel>
  );
};
