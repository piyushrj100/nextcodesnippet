import { TreeNode } from './types';

// Sample tree data for testing
export const sampleTreeData: TreeNode = {
  id: 'root',
  label: 'Root Node',
  shape: 'dot',
  color: '#a78bfa',    // purple-400
  metadata: { type: 'root', level: 0 },
  children: [
    {
      id: 'child1',
      label: 'Processing',
      shape: 'box',
      color: '#7c3aed',   // purple-600
      metadata: { type: 'process', status: 'active' },
      children: [
        {
          id: 'child1-1',
          label: 'Step 1',
          shape: 'dot',
          color: '#8b5cf6',  // purple-500
          metadata: { duration: '2ms' },
        },
        {
          id: 'child1-2',
          label: 'Step 2',
          shape: 'dot',
          color: '#8b5cf6',
          metadata: { duration: '5ms' },
        },
      ],
    },
    {
      id: 'child2',
      label: 'Analysis',
      shape: 'diamond',
      color: '#c084fc',   // purple-400 lighter
      metadata: { type: 'analysis', confidence: 0.95 },
      children: [
        {
          id: 'child2-1',
          label: 'Model A',
          shape: 'star',
          color: '#d8b4fe',  // purple-300
          metadata: { accuracy: '98%' },
        },
        {
          id: 'child2-2',
          label: 'Model B',
          shape: 'star',
          color: '#d8b4fe',
          metadata: { accuracy: '95%' },
        },
        {
          id: 'child2-3',
          label: 'Model C',
          shape: 'star',
          color: '#d8b4fe',
          metadata: { accuracy: '92%' },
        },
      ],
    },
    {
      id: 'child3',
      label: 'Output',
      shape: 'box',
      color: '#6d28d9',   // purple-700
      metadata: { type: 'output', size: '1.2MB' },
    },
  ],
};
