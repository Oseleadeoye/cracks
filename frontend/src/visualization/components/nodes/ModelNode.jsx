import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Layers, Settings, GitBranch, Box, Info, ChevronDown, ChevronUp } from 'lucide-react';
import './NodeStyles.css';

const modelTypes = [
  { id: 'yolo11', name: 'YOLO11', desc: 'Latest YOLO architecture, best efficiency' },
  { id: 'yolo11-seg', name: 'YOLO11-Seg', desc: 'Segmentation variant with mask prediction' }
];

const sizeVariants = [
  { id: 'n', name: 'Nano', params: '2.6M', speed: 'Fastest' },
  { id: 's', name: 'Small', params: '10.1M', speed: 'Fast' },
  { id: 'm', name: 'Medium', params: '20.0M', speed: 'Balanced' },
  { id: 'l', name: 'Large', params: '25.3M', speed: 'Accurate' }
];

const ModelNode = ({ data }) => {
  const [selectedModel, setSelectedModel] = useState('yolo11-seg');
  const [selectedSize, setSelectedSize] = useState('n');
  const [isExpanded, setIsExpanded] = useState(false);
  const [showArchitecture, setShowArchitecture] = useState(false);

  const config = data.config || {};

  return (
    <div className="node-card model-node">
      <Handle type="target" position={Position.Left} className="node-handle" />
      
      <div className="node-header">
        <Layers className="node-icon" size={18} />
        <span className="node-title">Model Architecture</span>
        <Info 
          className="info-trigger" 
          size={14} 
          onClick={(e) => {
            e.stopPropagation();
            data.openConceptDialog?.('architecture');
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div className="node-content">
        {/* Model Type Selector */}
        <div className="selector-group">
          <label className="selector-label">Model Type</label>
          <div className="model-buttons">
            {modelTypes.map(model => (
              <button
                key={model.id}
                className={`model-btn ${selectedModel === model.id ? 'active' : ''}`}
                onClick={() => {
                  setSelectedModel(model.id);
                  data.onNetworkConfigChange?.({ ...config, model_type: model.id });
                }}
              >
                <span className="btn-name">{model.name}</span>
                <span className="btn-desc">{model.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Size Selector */}
        <div className="selector-group">
          <label className="selector-label">Size Variant</label>
          <div className="size-chips">
            {sizeVariants.map(size => (
              <button
                key={size.id}
                className={`size-chip ${selectedSize === size.id ? 'active' : ''}`}
                onClick={() => setSelectedSize(size.id)}
              >
                <span className="chip-name">{size.name}</span>
                <span className="chip-meta">{size.params}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Architecture Preview */}
        <div className="arch-section">
          <button 
            className="arch-toggle"
            onClick={() => setShowArchitecture(!showArchitecture)}
          >
            <Box size={16} />
            <span>Architecture Layers</span>
            {showArchitecture ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {showArchitecture && (
            <div className="arch-layers">
              <div className="arch-layer input">
                <div className="layer-block">
                  <span className="layer-name">Input</span>
                  <span className="layer-dim">640×640×3</span>
                </div>
              </div>
              <div className="arch-arrow">↓</div>
              
              <div className="arch-layer backbone">
                <div className="layer-block">
                  <span className="layer-name">Backbone (CSP)</span>
                  <span className="layer-dim">Feature Extraction</span>
                </div>
                <div className="layer-details">
                  <span>Conv → CSP → SPPF</span>
                </div>
              </div>
              <div className="arch-arrow">↓</div>
              
              <div className="arch-layer neck">
                <div className="layer-block">
                  <span className="layer-name">Neck (PANet)</span>
                  <span className="layer-dim">Feature Pyramid</span>
                </div>
                <div className="layer-details">
                  <span>FPN + PAN</span>
                </div>
              </div>
              <div className="arch-arrow">↓</div>
              
              <div className="arch-layer head">
                <div className="layer-block">
                  <span className="layer-name">Detection Head</span>
                  <span className="layer-dim">3 Scales</span>
                </div>
                <div className="layer-details">
                  <span>80×80 | 40×40 | 20×20</span>
                </div>
              </div>
              
              <div className="arch-arrow">↓</div>
              <div className="arch-layer output">
                <div className="layer-block">
                  <span className="layer-name">Output</span>
                  <span className="layer-dim">x, y, w, h, conf</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Hyperparameters */}
        <div className="hyperparams">
          <div className="param-row">
            <Settings size={14} />
            <span className="param-label">Activation:</span>
            <span className="param-value">SiLU</span>
          </div>
          <div className="param-row">
            <GitBranch size={14} />
            <span className="param-label">NMS IoU:</span>
            <span className="param-value">0.45</span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default ModelNode;
