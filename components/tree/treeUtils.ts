import { TreeNode, TreeSchema } from './types';

const defaultSchema: TreeSchema = {
  nodeShape: 'dot',
  nodeColor: '#a78bfa',   // purple-400
  lineColor: '#6b21a8',   // purple-800
  lineWidth: 2,
  nodeSize: 25,
  fontSize: 14,
  hierarchical: true,
  physics: true,
};

/**
 * Flatten a TreeNode hierarchy into vis-network nodes[] and edges[] arrays.
 */
export function treeToGraph(
  node: TreeNode,
  schema: TreeSchema = defaultSchema
): { nodes: any[]; edges: any[] } {
  const nodes: any[] = [];
  const edges: any[] = [];

  function traverse(n: TreeNode, level: number = 0) {
    const nodeShape = n.shape || schema.nodeShape || 'dot';
    const nodeColor = n.color || schema.nodeColor || '#a78bfa';

    // Build tooltip from metadata
    const tooltipParts = [n.label];
    if (n.metadata) {
      Object.entries(n.metadata).forEach(([key, value]) => {
        tooltipParts.push(`${key}: ${value}`);
      });
    }

    nodes.push({
      id: n.id,
      label: n.label,
      shape: nodeShape,
      size: schema.nodeSize || 25,
      color: {
        background: nodeColor,
        border: nodeColor,
        highlight: {
          background: '#c4b5fd',  // purple-300
          border: '#c4b5fd',
        },
        hover: {
          background: '#c4b5fd',
          border: '#c4b5fd',
        },
      },
      font: {
        color: '#e9d5ff',   // purple-200
        size: schema.fontSize || 14,
        face: 'Inter, -apple-system, sans-serif',
      },
      level: level,
      title: tooltipParts.join('\n'),
    });

    // Add edges for children
    if (n.children) {
      n.children.forEach((child) => {
        edges.push({
          from: n.id,
          to: child.id,
          arrows: 'to',
          color: {
            color: schema.lineColor || '#6b21a8',   // purple-800
            highlight: '#a78bfa',  // purple-400
            hover: '#a78bfa',
          },
          width: schema.lineWidth || 2,
          smooth: {
            type: 'cubicBezier',
            forceDirection: schema.hierarchical ? 'vertical' : 'none',
          },
        });
        traverse(child, level + 1);
      });
    }
  }

  traverse(node);
  return { nodes, edges };
}

/**
 * Build vis-network options from a TreeSchema.
 */
export function buildNetworkOptions(schema: TreeSchema = defaultSchema): any {
  const mergedSchema = { ...defaultSchema, ...schema };

  return {
    layout: mergedSchema.hierarchical
      ? {
          hierarchical: {
            direction: 'UD',
            sortMethod: 'directed',
            nodeSpacing: 150,
            levelSeparation: 150,
          },
        }
      : {
          randomSeed: 2,
        },
    physics: {
      enabled: mergedSchema.physics,
      solver: 'forceAtlas2Based',
      stabilization: {
        iterations: 150,
        updateInterval: 25,
      },
      forceAtlas2Based: {
        gravitationalConstant: -50,
        centralGravity: 0.01,
        springLength: 150,
        springConstant: 0.08,
      },
    },
    interaction: {
      dragView: true,
      zoomView: true,
      hover: true,
      tooltipDelay: 100,
    },
    nodes: {
      borderWidth: 2,
      borderWidthSelected: 3,
    },
    edges: {
      smooth: {
        enabled: true,
        type: 'cubicBezier',
        roundness: 0.5,
      },
    },
  };
}
