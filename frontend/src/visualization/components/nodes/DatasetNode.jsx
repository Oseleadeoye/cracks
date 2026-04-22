import { Handle, Position } from '@xyflow/react';
import { Database, FileText, Folder, Info, Image as ImageIcon, Upload } from 'lucide-react';
import './NodeStyles.css';

const DatasetNode = ({ data }) => {
  // Sample demonstration data
  const demoDataset = {
    name: 'Concrete Crack Dataset',
    trainImages: 1250,
    valImages: 150,
    testImages: 150,
    classes: ['crack'],
  };

  // Demo images from the demo folder
  const demoImages = [
    { id: 1, src: '/demo/1616_jpg.rf.314cac4ea933182f48e1082da574b087.jpg', label: 'Sample 1' },
    { id: 2, src: '/demo/1625_JPG.rf.413905985d41297fcf7c9348f70fead7.jpg', label: 'Sample 2' },
    { id: 3, src: '/demo/1066-2-_JPG.rf.02edf51909d67b1b8f6eea4e25e262c4.jpg', label: 'Sample 3' },
    { id: 4, src: '/demo/1089-3-_JPG.rf.51fe8688e4160b78f58ceea2c41cd4f0.jpg', label: 'Sample 4' },
    { id: 5, src: '/demo/1896_jpg.rf.a6759200c57921c5fa8260583b1ff0e8.jpg', label: 'Sample 5' },
    { id: 6, src: '/demo/1706_jpg.rf.44527ec2216182ccb1988d4e69e458be.jpg', label: 'Sample 6' },
  ];

  return (
    <div className="node-card dataset-node">
      <Handle type="target" position={Position.Left} className="node-handle" />
      
      <div className="node-header">
        <Database className="node-icon" size={18} />
        <span className="node-title">Dataset</span>
        <Info 
          className="info-trigger" 
          size={14} 
          onClick={(e) => {
            e.stopPropagation();
            data.openConceptDialog?.('dataset');
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div className="node-content">
        {/* Upload Instruction */}
        <div className="upload-instruction">
          <Upload size={28} />
          <span>Upload dataset in YOLO format</span>
          <span className="upload-hint">images/ + labels/ + data.yaml</span>
        </div>

        {/* Dataset Name */}
        <div className="dataset-name-section">
          <Folder size={16} />
          <span className="dataset-name">{demoDataset.name}</span>
        </div>

        {/* Demo Preview Grid */}
        <div className="demo-preview-grid">
          {demoImages.map((img) => (
            <div key={img.id} className="demo-preview-item">
              <img 
                src={img.src} 
                alt={img.label}
                className="demo-image"
              />
            </div>
          ))}
        </div>

        {/* Stats */}
        <div className="dataset-stats">
          <div className="stat-item">
            <ImageIcon size={14} />
            <span>{demoDataset.trainImages + demoDataset.valImages + demoDataset.testImages} images</span>
          </div>
          <div className="stat-item">
            <FileText size={14} />
            <span>{demoDataset.classes.length} class: {demoDataset.classes[0]}</span>
          </div>
        </div>

        {/* Dataset Split Table */}
        <table className="dataset-split-table">
          <tbody>
            <tr>
              <td className="split-label">Training</td>
              <td className="split-value">{demoDataset.trainImages} images</td>
            </tr>
            <tr>
              <td className="split-label">Validation</td>
              <td className="split-value">{demoDataset.valImages} images</td>
            </tr>
            <tr>
              <td className="split-label">Test</td>
              <td className="split-value">{demoDataset.testImages} images</td>
            </tr>
          </tbody>
        </table>
      </div>

      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default DatasetNode;
