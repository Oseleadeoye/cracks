import { useState, useEffect, useRef } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Pause, Activity, TrendingDown, Target, Zap, Clock, RotateCcw, Info } from 'lucide-react';
import './NodeStyles.css';

// Simple chart component using canvas
const MiniChart = ({ data, color, width = 200, height = 60 }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || data.length < 2) return;

    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 2;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    ctx.scale(dpr, dpr);

    // Get theme-aware colors from CSS variables
    const computedStyle = getComputedStyle(document.documentElement);
    const isLightMode = document.documentElement.getAttribute('data-theme') === 'light';

    // Use CSS variables for theme-aware colors with fallbacks - use bg-tertiary to match chart-box container
    const bgColor = computedStyle.getPropertyValue('--bg-tertiary').trim() || (isLightMode ? '#f1f5f9' : '#292524');
    const gridColor = computedStyle.getPropertyValue('--border-secondary').trim() || (isLightMode ? '#cbd5e1' : '#44403c');

    // Clear with theme-aware background
    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, width, height);

    // Draw subtle grid lines with theme-aware color
    ctx.strokeStyle = gridColor;
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    for (let i = 1; i < 4; i++) {
      const y = (height / 4) * i;
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    ctx.stroke();

    // Draw chart line with the passed color
    const maxVal = Math.max(...data, 1);
    const minVal = Math.min(...data, 0);
    const range = maxVal - minVal || 1;

    ctx.beginPath();
    ctx.strokeStyle = color || '#4ade80';  // Use passed color or default bright green
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    
    data.forEach((val, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - ((val - minVal) / range) * (height - 10) - 5;
      
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Draw current point with glow effect using the passed color
    const lastY = height - ((data[data.length - 1] - minVal) / range) * (height - 10) - 5;
    const chartColor = color || '#4ade80';
    
    // Convert hex to rgba for glow
    const hexToRgba = (hex, alpha) => {
      const r = parseInt(hex.slice(1, 3), 16);
      const g = parseInt(hex.slice(3, 5), 16);
      const b = parseInt(hex.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    };
    
    // Glow
    ctx.beginPath();
    ctx.arc(width - 4, lastY, 6, 0, Math.PI * 2);
    ctx.fillStyle = hexToRgba(chartColor, 0.3);
    ctx.fill();
    
    // Point
    ctx.beginPath();
    ctx.arc(width - 4, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = chartColor;
    ctx.fill();
  }, [data, color, width, height]);

  return <canvas ref={canvasRef} className="mini-chart" style={{ width, height }} />;
};

const TrainingNode = ({ data }) => {
  const [isTraining, setIsTraining] = useState(true); // Auto-start for demo
  const [currentEpoch, setCurrentEpoch] = useState(1);
  const [totalEpochs] = useState(100);
  const [lossHistory, setLossHistory] = useState([2.5]);
  const [mapHistory, setMapHistory] = useState([30]);
  const [precisionHistory, setPrecisionHistory] = useState([40]);
  const [recallHistory, setRecallHistory] = useState([35]);
  const [currentLoss, setCurrentLoss] = useState(2.5);
  const [currentMap, setCurrentMap] = useState(0.3);
  const [currentPrecision, setCurrentPrecision] = useState(0.4);
  const [currentRecall, setCurrentRecall] = useState(0.35);
  const [trainingTime, setTrainingTime] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(Date.now()); // Auto-start timer

  // Simulate training - continuously loops for demo
  useEffect(() => {
    if (isTraining) {
      intervalRef.current = setInterval(() => {
        setCurrentEpoch(prev => {
          let next = prev + 1;
          
          // Loop back to start when reaching the end
          if (next > totalEpochs) {
            next = 1;
            setLossHistory([2.5]);
            setMapHistory([30]);
            setPrecisionHistory([40]);
            setRecallHistory([35]);
            setCurrentLoss(2.5);
            setCurrentMap(0.3);
            setCurrentPrecision(0.4);
            setCurrentRecall(0.35);
            startTimeRef.current = Date.now();
            setTrainingTime(0);
          }
          
          // Simulate metrics
          const newLoss = 2.5 * Math.exp(-next / 30) + 0.1 + Math.random() * 0.05;
          const newMap = Math.min(0.95, 0.3 + (next / totalEpochs) * 0.65 + Math.random() * 0.05);
          const newPrecision = Math.min(0.95, 0.4 + (next / totalEpochs) * 0.55 + Math.random() * 0.05);
          const newRecall = Math.min(0.95, 0.35 + (next / totalEpochs) * 0.6 + Math.random() * 0.05);
          
          setCurrentLoss(newLoss);
          setCurrentMap(newMap);
          setCurrentPrecision(newPrecision);
          setCurrentRecall(newRecall);
          setLossHistory(h => [...h.slice(-50), newLoss]);
          setMapHistory(h => [...h.slice(-50), newMap]);
          setPrecisionHistory(h => [...h.slice(-50), newPrecision * 100]);
          setRecallHistory(h => [...h.slice(-50), newRecall * 100]);
          
          // Update time
          const elapsed = Math.floor((Date.now() - startTimeRef.current) / 1000);
          setTrainingTime(elapsed);
          
          return next;
        });
      }, 200); // Fast simulation
    } else {
      clearInterval(intervalRef.current);
    }

    return () => clearInterval(intervalRef.current);
  }, [isTraining, totalEpochs]);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = (currentEpoch / totalEpochs) * 100;

  return (
    <div className="node-card training-node">
      <Handle type="target" position={Position.Left} className="node-handle" />
      
      <div className="node-header">
        <Activity className="node-icon" size={18} />
        <span className="node-title">Training Monitor</span>
        <Info 
          className="info-trigger" 
          size={14} 
          onClick={(e) => {
            e.stopPropagation();
            data.openConceptDialog?.('training');
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div className="node-content">
        {/* Progress Bar */}
        <div className="progress-section">
          <div className="progress-header">
            <span className="epoch-counter">Epoch {currentEpoch}/{totalEpochs}</span>
            <span className="time-counter">
              <Clock size={12} />
              {formatTime(trainingTime)}
            </span>
          </div>
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Charts */}
        <div className="charts-grid">
          <div className="chart-box">
            <div className="chart-header">
              <TrendingDown size={14} />
              <span>Loss: {currentLoss.toFixed(4)}</span>
            </div>
            <MiniChart 
              data={lossHistory.length > 0 ? lossHistory : [2.5, 2.4, 2.3, 2.2]} 
              color="#ef4444" 
            />
          </div>
          
          <div className="chart-box">
            <div className="chart-header">
              <Activity size={14} />
              <span>mAP50: {(currentMap * 100).toFixed(1)}%</span>
            </div>
            <MiniChart 
              data={mapHistory.length > 0 ? mapHistory.map(m => m * 100) : [30, 35, 42, 48]} 
              color="#3b82f6" 
            />
          </div>
        </div>

        {/* Additional Charts - Precision & Recall */}
        <div className="charts-grid">
          <div className="chart-box">
            <div className="chart-header">
              <Target size={14} />
              <span>Precision: {(currentPrecision * 100).toFixed(1)}%</span>
            </div>
            <MiniChart 
              data={precisionHistory.length > 0 ? precisionHistory : [40, 45, 52, 58]} 
              color="#22c55e" 
            />
          </div>
          
          <div className="chart-box">
            <div className="chart-header">
              <Zap size={14} />
              <span>Recall: {(currentRecall * 100).toFixed(1)}%</span>
            </div>
            <MiniChart 
              data={recallHistory.length > 0 ? recallHistory : [35, 42, 50, 57]} 
              color="#a855f7" 
            />
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default TrainingNode;
