import { useState } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Sparkles, Info, RefreshCw, Sun, FlipHorizontal, RotateCw } from 'lucide-react';
import './NodeStyles.css';

const DataAugmentationNode = ({ data }) => {
  const [showOptions, setShowOptions] = useState(false);

  // Demo augmentation settings
  const augmentations = [
    { id: 'flip', name: 'Horizontal Flip', icon: FlipHorizontal, enabled: true, prob: '50%' },
    { id: 'rotate', name: 'Rotation', icon: RotateCw, enabled: true, range: '±15°' },
    { id: 'brightness', name: 'Brightness', icon: Sun, enabled: true, range: '±20%' },
    { id: 'mosaic', name: 'Mosaic', icon: RefreshCw, enabled: true, prob: '25%' },
  ];

  return (
    <div className="node-card augmentation-node">
      <Handle type="target" position={Position.Left} className="node-handle" />
      
      <div className="node-header">
        <Sparkles className="node-icon" size={18} />
        <span className="node-title">Data Augmentation</span>
        <Info 
          className="info-trigger" 
          size={14} 
          onClick={(e) => {
            e.stopPropagation();
            data.openConceptDialog?.('augmentation');
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div className="node-content">
        {/* Description */}
        <div className="augmentation-desc">
          <span>Enhance dataset with synthetic variations to improve model generalization</span>
        </div>

        {/* Augmentation List */}
        <div className="augmentation-list">
          {augmentations.map((aug) => {
            const Icon = aug.icon;
            return (
              <div key={aug.id} className={`augmentation-item ${aug.enabled ? 'enabled' : 'disabled'}`}>
                <div className="aug-icon-wrapper">
                  <Icon size={14} />
                </div>
                <div className="aug-info">
                  <span className="aug-name">{aug.name}</span>
                  <span className="aug-value">
                    {aug.prob || aug.range}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Summary */}
        <div className="augmentation-summary">
          <div className="summary-item">
            <span className="summary-label">Dataset size:</span>
            <span className="summary-value">4× (estimated)</span>
          </div>
        </div>
      </div>

      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default DataAugmentationNode;
