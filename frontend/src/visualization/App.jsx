import { useCallback, useMemo, useState } from 'react';
import './App.css';
import FlowCanvas from './components/FlowCanvas';
import DatasetNode from './components/nodes/DatasetNode';
import DataAugmentationNode from './components/nodes/DataAugmentationNode';
import ModelNode from './components/nodes/ModelNode';
import TrainingNode from './components/nodes/TrainingNode';
import DetectionNode from './components/nodes/DetectionNode';
import MetricsNode from './components/nodes/MetricsNode';
import ConceptDialog from './components/ConceptDialog';
import { useCrackDetectionStore } from './stores/crackDetectionStore';

const nodeTypes = {
  dataset: DatasetNode,
  augmentation: DataAugmentationNode,
  model: ModelNode,
  training: TrainingNode,
  detection: DetectionNode,
  metrics: MetricsNode,
};

const edgeTypes = {
  default: 'smoothstep',
  smoothstep: 'smoothstep',
};

function App() {
  // Get state from crack detection store
  const datasetConfig = useCrackDetectionStore(state => state.datasetConfig);
  const modelConfig = useCrackDetectionStore(state => state.modelConfig);
  const trainingState = useCrackDetectionStore(state => state.trainingState);
  const detectionResults = useCrackDetectionStore(state => state.detectionResults);
  const metrics = useCrackDetectionStore(state => state.metrics);
  
  const updateDatasetConfig = useCrackDetectionStore(state => state.updateDatasetConfig);
  const updateModelConfig = useCrackDetectionStore(state => state.updateModelConfig);
  const startTraining = useCrackDetectionStore(state => state.startTraining);
  const stopTraining = useCrackDetectionStore(state => state.stopTraining);
  const runDetection = useCrackDetectionStore(state => state.runDetection);
  const resetMetrics = useCrackDetectionStore(state => state.resetMetrics);

  // State for concept dialog
  const [activeConcept, setActiveConcept] = useState(null);

  const openConceptDialog = useCallback((conceptKey) => {
    setActiveConcept(conceptKey);
  }, []);

  const closeConceptDialog = useCallback(() => {
    setActiveConcept(null);
  }, []);

  // Define nodes for the crack detection workflow
  // Flow: Dataset → Data Augmentation → Model Architecture → Training Monitor → [Detection ↑ Metrics Dashboard]
  const nodes = useMemo(() => [
    {
      id: 'dataset',
      type: 'dataset',
      position: { x: 0, y: 455 },
      data: {
        config: datasetConfig,
        onConfigChange: updateDatasetConfig,
        openConceptDialog,
      }
    },
    {
      id: 'augmentation',
      type: 'augmentation',
      position: { x: 400, y: 455 },
      data: {
        openConceptDialog,
      }
    },
    {
      id: 'model',
      type: 'model',
      position: { x: 800, y: 455 },
      data: {
        config: modelConfig,
        onConfigChange: updateModelConfig,
        openConceptDialog,
      }
    },
    {
      id: 'training',
      type: 'training',
      position: { x: 1200, y: 455 },
      data: {
        state: trainingState,
        onStart: startTraining,
        onStop: stopTraining,
        openConceptDialog,
      }
    },
    {
      id: 'detection',
      type: 'detection',
      position: { x: 1600, y: 200 },
      data: {
        results: detectionResults,
        onRunDetection: runDetection,
        openConceptDialog,
      }
    },
    {
      id: 'metrics',
      type: 'metrics',
      position: { x: 1600, y: 650 },
      data: {
        metrics: metrics,
        onReset: resetMetrics,
        openConceptDialog,
      }
    }
  ], [
    datasetConfig, modelConfig, trainingState, detectionResults, metrics,
    updateDatasetConfig, updateModelConfig, startTraining, stopTraining, 
    runDetection, resetMetrics, openConceptDialog
  ]);

  // Define edges connecting the workflow - white dotted lines with flowing animation
  // Flow: Dataset -> Data Augmentation -> Model Architecture -> Training Monitor -> Detection -> Metrics Dashboard
  const edges = useMemo(() => [
    {
      id: 'e-dataset-augmentation',
      source: 'dataset',
      target: 'augmentation',
      type: 'straight',
      animated: true,
      label: 'Data',
      style: { 
        stroke: '#ffffff', 
        strokeWidth: 3,
        strokeDasharray: '6,4'
      },
      labelStyle: { 
        fill: '#ffffff', 
        fontSize: 12, 
        fontWeight: 700
      },
      labelBgStyle: {
        fill: '#0c0a09',
        fillOpacity: 1,
        stroke: '#ffffff',
        strokeWidth: 1
      }
    },
    {
      id: 'e-augmentation-model',
      source: 'augmentation',
      target: 'model',
      type: 'straight',
      animated: true,
      label: 'Augmented Data',
      style: { 
        stroke: '#ffffff', 
        strokeWidth: 3,
        strokeDasharray: '6,4'
      },
      labelStyle: { 
        fill: '#ffffff', 
        fontSize: 12, 
        fontWeight: 700
      },
      labelBgStyle: {
        fill: '#0c0a09',
        fillOpacity: 1,
        stroke: '#ffffff',
        strokeWidth: 1
      }
    },
    {
      id: 'e-model-training',
      source: 'model',
      target: 'training',
      type: 'straight',
      animated: true,
      label: 'Architecture',
      style: { 
        stroke: '#ffffff', 
        strokeWidth: 3,
        strokeDasharray: '6,4'
      },
      labelStyle: { 
        fill: '#ffffff', 
        fontSize: 12, 
        fontWeight: 700
      },
      labelBgStyle: {
        fill: '#0c0a09',
        fillOpacity: 1,
        stroke: '#ffffff',
        strokeWidth: 1
      }
    },
    {
      id: 'e-training-detection',
      source: 'training',
      target: 'detection',
      type: 'straight',
      animated: true,
      label: 'Model Weights',
      style: { 
        stroke: '#ffffff', 
        strokeWidth: 3,
        strokeDasharray: '6,4'
      },
      labelStyle: { 
        fill: '#ffffff', 
        fontSize: 12, 
        fontWeight: 700
      },
      labelBgStyle: {
        fill: '#0c0a09',
        fillOpacity: 1,
        stroke: '#ffffff',
        strokeWidth: 1
      }
    },
    {
      id: 'e-training-metrics',
      source: 'training',
      target: 'metrics',
      type: 'straight',
      animated: true,
      label: 'Validation Metrics',
      style: { 
        stroke: '#ffffff', 
        strokeWidth: 3,
        strokeDasharray: '6,4'
      },
      labelStyle: { 
        fill: '#ffffff', 
        fontSize: 12, 
        fontWeight: 700
      },
      labelBgStyle: {
        fill: '#0c0a09',
        fillOpacity: 1,
        stroke: '#ffffff',
        strokeWidth: 1
      }
    }
  ], []);

  return (
    <div className="app">
      <FlowCanvas
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
      />
      {activeConcept && (
        <ConceptDialog
          conceptKey={activeConcept}
          onClose={closeConceptDialog}
        />
      )}
    </div>
  );
}

export default App;
