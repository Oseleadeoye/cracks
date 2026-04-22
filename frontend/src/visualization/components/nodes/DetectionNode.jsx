import { useState, useRef, useCallback } from 'react';
import { Handle, Position } from '@xyflow/react';
import { Upload, Image, Camera, Play, Download, Settings, Eye, Info, X } from 'lucide-react';
import './NodeStyles.css';

const DetectionNode = ({ data }) => {
  const [activeTab, setActiveTab] = useState('upload'); // upload, webcam, results
  const [selectedImage, setSelectedImage] = useState(null);
  const [isDetecting, setIsDetecting] = useState(false);
  const [detections, setDetections] = useState([]);
  const [confidence, setConfidence] = useState(0.5);
  const [showSettings, setShowSettings] = useState(false);
  const fileInputRef = useRef(null);

  const sampleImages = [
    { id: 1, name: 'Concrete Crack', src: '/demo/pred_b077a492.jpg' },
    { id: 2, name: 'Asphalt Damage', src: '/demo/pred_91d92072.jpg' },
    { id: 3, name: 'Bridge Deck', src: '/demo/pred_8d8f9081.jpg' }
  ];

  const handleFileSelect = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSelectedImage(event.target?.result);
        setActiveTab('results');
        runDetection();
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const selectSample = useCallback((sample) => {
    setSelectedImage(sample.src);
    setActiveTab('results');
    runDetection();
  }, []);

  const runDetection = useCallback(() => {
    setIsDetecting(true);
    setDetections([]);
    
    // Simulate detection
    setTimeout(() => {
      setDetections([
        { id: 1, class: 'crack', confidence: 0.89, x: 120, y: 80, w: 200, h: 15 },
        { id: 2, class: 'crack', confidence: 0.76, x: 350, y: 150, w: 80, h: 120 },
        { id: 3, class: 'crack', confidence: 0.94, x: 180, y: 280, w: 300, h: 20 }
      ]);
      setIsDetecting(false);
    }, 2000);
  }, []);

  return (
    <div className="node-card detection-node">
      <Handle type="target" position={Position.Left} className="node-handle" />
      
      <div className="node-header">
        <Eye className="node-icon" size={18} />
        <span className="node-title">Detection</span>
        <Info 
          className="info-trigger" 
          size={14} 
          onClick={(e) => {
            e.stopPropagation();
            data.openConceptDialog?.('detection');
          }}
          style={{ cursor: 'pointer' }}
        />
      </div>

      <div className="node-content">
        {/* Tab Navigation */}
        <div className="detection-tabs">
          <button 
            className={`tab-btn ${activeTab === 'upload' ? 'active' : ''}`}
            onClick={() => setActiveTab('upload')}
          >
            <Upload size={14} />
            <span>Upload</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'webcam' ? 'active' : ''}`}
            onClick={() => setActiveTab('webcam')}
          >
            <Camera size={14} />
            <span>Webcam</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'results' ? 'active' : ''}`}
            onClick={() => setActiveTab('results')}
            disabled={!selectedImage}
          >
            <Image size={14} />
            <span>Results</span>
          </button>
        </div>

          {/* Upload Tab */}
          {activeTab === 'upload' && (
            <div className="tab-content upload-tab">
              <div 
                className="drop-zone"
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={32} className="drop-icon" />
                <p>Upload or drag & drop photo or video</p>
                <span className="hint">Supports JPG, PNG, WEBP</span>
              <input 
                ref={fileInputRef}
                type="file" 
                accept="image/*" 
                onChange={handleFileSelect}
                hidden 
              />
            </div>

            <div className="samples-section">
              <span className="samples-label">Or try a sample:</span>
              <div className="sample-grid">
                {sampleImages.map(sample => (
                  <button 
                    key={sample.id}
                    className="sample-btn"
                    onClick={() => selectSample(sample)}
                  >
                    <img src={sample.src} alt={sample.name} />
                    <span>{sample.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Webcam Tab */}
        {activeTab === 'webcam' && (
          <div className="tab-content webcam-tab">
            <div className="webcam-preview">
              <Camera size={48} className="webcam-icon" />
              <p>Camera preview would appear here</p>
              <button className="webcam-btn">
                <Play size={16} />
                Start Camera
              </button>
            </div>
          </div>
        )}

        {/* Results Tab */}
        {activeTab === 'results' && selectedImage && (
          <div className="tab-content results-tab">
            <div className="result-viewer">
              <div className="image-container">
                <img src={selectedImage} alt="Detection result" />
                {isDetecting && (
                  <div className="detecting-overlay">
                    <div className="spinner" />
                    <span>Detecting cracks...</span>
                  </div>
                )}
                {!isDetecting && detections.map(d => (
                  <div 
                    key={d.id}
                    className="detection-box"
                    style={{
                      left: `${(d.x / 640) * 100}%`,
                      top: `${(d.y / 640) * 100}%`,
                      width: `${(d.w / 640) * 100}%`,
                      height: `${(d.h / 640) * 100}%`
                    }}
                  >
                    <span className="box-label">
                      {d.class} {(d.confidence * 100).toFixed(0)}%
                    </span>
                  </div>
                ))}
              </div>
            </div>

            <div className="detection-summary">
              <div className="summary-header">
                <span className="detection-count">
                  {detections.length} crack{detections.length !== 1 ? 's' : ''} detected
                </span>
                <button className="download-btn">
                  <Download size={14} />
                </button>
              </div>
              
              <div className="detection-list">
                {detections.map(d => (
                  <div key={d.id} className="detection-item">
                    <div 
                      className="confidence-bar"
                      style={{ width: `${d.confidence * 100}%` }}
                    />
                    <span className="item-class">{d.class}</span>
                    <span className="item-conf">{(d.confidence * 100).toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </div>

      <Handle type="source" position={Position.Right} className="node-handle" />
    </div>
  );
};

export default DetectionNode;
