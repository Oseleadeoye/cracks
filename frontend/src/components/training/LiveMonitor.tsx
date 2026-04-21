import React, { useState, useEffect } from 'react';
import { Activity, RotateCcw } from 'lucide-react';
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

  // Check if validation losses are available in the data
  const hasValidationLoss = metrics.length > 0 && 
    (metrics[metrics.length - 1]?.val_box_loss !== undefined ||
     metrics[metrics.length - 1]?.val_cls_loss !== undefined);

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
                    {hasValidationLoss && (
                      <>
                        <Line type="monotone" dataKey="val_box_loss" stroke="#22c55e" strokeWidth={2} dot={metrics.length < 20} name="Val Box Loss" strokeDasharray="5 5" />
                        <Line type="monotone" dataKey="val_cls_loss" stroke="#3b82f6" strokeWidth={2} dot={metrics.length < 20} name="Val Cls Loss" strokeDasharray="5 5" />
                        {metrics[0]?.val_dfl_loss > 0 && (
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
