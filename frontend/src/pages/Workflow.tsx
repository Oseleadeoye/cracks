import React from 'react';
import { ReactFlowProvider } from '@xyflow/react';
// @ts-ignore
import NnfsApp from '../visualization/App';
import '@xyflow/react/dist/style.css';
import '../visualization/App.css';
import '../visualization/components/nodes/NodeStyles.css';

const Workflow: React.FC = () => {
  return (
    <div className="h-screen w-full" style={{ background: 'var(--bg-primary)' }}>
      <ReactFlowProvider>
        <NnfsApp />
      </ReactFlowProvider>
    </div>
  );
};

export default Workflow;
