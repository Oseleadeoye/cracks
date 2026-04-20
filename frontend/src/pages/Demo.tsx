import React, { useState } from 'react';
import { Image, X, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

// Demo items with actual images
const demoItems = [
  // New photos on top row
  {
    id: 6,
    type: 'image',
    title: 'Settlement Crack Detection',
    description: 'Foundation settlement crack analysis',
    src: '/demo/pred_settlement.jpg'
  },
  {
    id: 7,
    type: 'image',
    title: 'Plastic Shrinkage Crack',
    description: 'Early-stage concrete shrinkage detection',
    src: '/demo/pred_plastic.jpg'
  },
  {
    id: 8,
    type: 'image',
    title: 'Thermal Crack Assessment',
    description: 'Temperature-induced crack analysis',
    src: '/demo/pred_thermal.jpg'
  },
  // Middle row - Metal Surface Cracks
  {
    id: 1,
    type: 'image',
    title: 'Metal Surface Crack',
    description: 'Structural crack detection with high confidence',
    src: '/demo/pred_b077a492.jpg'
  },
  {
    id: 2,
    type: 'image',
    title: 'Metal Surface Crack',
    description: 'Structural crack detection with high confidence',
    src: '/demo/pred_new.jpg'
  },
  {
    id: 3,
    type: 'image',
    title: 'Metal Surface Crack',
    description: 'Structural crack detection with high confidence',
    src: '/demo/pred_8d8f9081.jpg'
  },
  // Bottom row - Videos + 1 new
  {
    id: 9,
    type: 'image',
    title: 'Settlement Pattern Analysis',
    description: 'Structural settlement evaluation',
    src: '/demo/orig_settlement.jpg'
  },
  {
    id: 4,
    type: 'video',
    title: 'Highway Inspection',
    description: 'Real-time crack detection on asphalt pavement',
    src: '/demo/video_pred_f7f8a325.mp4'
  },
  {
    id: 5,
    type: 'video',
    title: 'Infrastructure Survey',
    description: 'Automated road condition assessment',
    src: '/demo/video_pred_579e350b.mp4'
  }
];

const Demo: React.FC = () => {
  const [selectedItem, setSelectedItem] = useState<typeof demoItems[0] | null>(null);

  return (
    <div className="h-screen w-full flex flex-col" style={{ background: 'var(--bg-primary)' }}>
      {/* Header Bar with Back Button */}
      <div 
        className="flex items-center justify-between px-6 py-4 border-b"
        style={{ borderColor: 'var(--border-primary)' }}
      >
        <div className="flex items-center gap-4">
          <Link 
            to="/" 
            className="flex items-center gap-2 px-3 py-2 rounded-lg transition-colors hover:opacity-80"
            style={{ 
              background: 'var(--bg-secondary)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-primary)'
            }}
          >
            <ChevronLeft size={18} />
            <span className="text-sm font-medium">Back</span>
          </Link>
          <div>
            <h1 className="text-2xl font-serif" style={{ color: 'var(--text-primary)' }}>
              Detection Showcase
            </h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
              Sample crack detection results on various infrastructure
            </p>
          </div>
        </div>
      </div>

      {/* Grid Content - Takes remaining space */}
      <div className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-3 gap-4 max-w-7xl mx-auto">
          {demoItems.map((item) => (
            <div
              key={item.id}
              className="group relative rounded-xl overflow-hidden cursor-pointer"
              style={{ 
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border-primary)'
              }}
              onClick={() => setSelectedItem(item)}
            >
              {/* Media Area */}
              <div className="aspect-video relative">
                {item.src ? (
                  item.type === 'video' ? (
                    // Video - autoplay in grid
                    <video
                      src={item.src}
                      className="w-full h-full object-cover"
                      autoPlay
                      muted
                      loop
                      playsInline
                    />
                  ) : (
                    // Image
                    <img
                      src={item.src}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                  )
                ) : (
                  // Placeholder
                  <div 
                    className="w-full h-full flex items-center justify-center"
                    style={{ background: 'var(--bg-tertiary)' }}
                  >
                    <div 
                      className="w-16 h-16 rounded-xl flex items-center justify-center"
                      style={{ 
                        background: 'var(--success-bg)',
                        border: '2px solid var(--success-text)'
                      }}
                    >
                      <Image size={24} style={{ color: 'var(--success-text)' }} />
                    </div>
                  </div>
                )}

                {/* Hover Overlay */}
                <div 
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ background: 'rgba(0, 0, 0, 0.5)' }}
                >
                  <span className="text-white font-medium">
                    {item.type === 'video' ? 'Click to enlarge' : 'Click to view'}
                  </span>
                </div>

                {/* Type Badge */}
                <div 
                  className="absolute top-3 left-3 px-2 py-1 rounded text-xs font-medium uppercase"
                  style={{ 
                    background: 'var(--bg-card)',
                    color: 'var(--text-muted)'
                  }}
                >
                  {item.type}
                </div>
              </div>

              {/* Info */}
              <div className="p-4">
                <h3 
                  className="font-medium mb-1 truncate"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {item.title}
                </h3>
                <p 
                  className="text-sm truncate"
                  style={{ color: 'var(--text-muted)' }}
                >
                  {item.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal */}
      {selectedItem && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: 'rgba(0, 0, 0, 0.9)' }}
          onClick={() => setSelectedItem(null)}
        >
          <div 
            className="max-w-5xl w-full rounded-xl overflow-hidden"
            style={{ background: 'var(--bg-secondary)' }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Media */}
            <div className="relative flex items-center justify-center" style={{ maxHeight: '70vh' }}>
              {selectedItem.src ? (
                selectedItem.type === 'video' ? (
                  <video
                    src={selectedItem.src}
                    controls
                    autoPlay
                    className="w-full max-h-[70vh] object-contain"
                  />
                ) : (
                  <img
                    src={selectedItem.src}
                    alt={selectedItem.title}
                    className="w-full h-auto max-h-[70vh] object-contain"
                  />
                )
              ) : (
                <div 
                  className="aspect-video flex items-center justify-center"
                  style={{ background: 'var(--bg-tertiary)' }}
                >
                  <div 
                    className="w-24 h-24 rounded-xl flex items-center justify-center"
                    style={{ 
                      background: 'var(--success-bg)',
                      border: '3px solid var(--success-text)'
                    }}
                  >
                    <Image size={40} style={{ color: 'var(--success-text)' }} />
                  </div>
                </div>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedItem(null)}
                className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center transition-colors"
                style={{ 
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)'
                }}
              >
                <X size={24} />
              </button>
            </div>

            {/* Modal Info */}
            <div className="p-6">
              <h3 
                className="text-xl font-medium mb-2"
                style={{ color: 'var(--text-secondary)' }}
              >
                {selectedItem.title}
              </h3>
              <p style={{ color: 'var(--text-muted)' }}>
                {selectedItem.description}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Demo;
