export type TreeNodeShape = 'dot' | 'box' | 'diamond' | 'hexagon' | 'triangle' | 'star';

export interface TreeNode {
  id: string;
  label: string;
  children?: TreeNode[];
  shape?: TreeNodeShape;
  color?: string;
  metadata?: Record<string, any>;
}

export interface TreeSchema {
  nodeShape?: TreeNodeShape;
  nodeColor?: string;
  lineColor?: string;
  lineWidth?: number;
  nodeSize?: number;
  fontSize?: number;
  hierarchical?: boolean;
  physics?: boolean;
}

export interface TreeRendererProps {
  data: TreeNode;
  schema?: TreeSchema;
}
