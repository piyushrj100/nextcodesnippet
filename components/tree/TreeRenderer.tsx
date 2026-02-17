'use client';

import React, { useEffect, useRef } from 'react';
import { Network, DataSet } from 'vis-network/standalone';
import { TreeRendererProps } from './types';
import { treeToGraph, buildNetworkOptions } from './treeUtils';

export default function TreeRenderer({ data, schema }: TreeRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Convert tree to graph format
    const { nodes: graphNodes, edges: graphEdges } = treeToGraph(data, schema);

    // Configure Vis.js Data
    const visData = {
      nodes: new DataSet(graphNodes),
      edges: new DataSet(graphEdges),
    };

    // Configure Vis.js Options
    const options = buildNetworkOptions(schema);

    // Initialize Network
    networkRef.current = new Network(containerRef.current, visData, options);

    // Fit graph after stabilization
    networkRef.current.once('stabilizationIterationsDone', () => {
      if (networkRef.current) {
        networkRef.current.fit({
          animation: {
            duration: 500,
            easingFunction: 'easeInOutQuad',
          },
        });
      }
    });

    // Cleanup
    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data, schema]);

  return (
    <div className="w-full rounded-xl border border-purple-500/20 overflow-hidden bg-gradient-to-b from-purple-950/40 to-gray-950/60 backdrop-blur-sm">
      <div className="px-5 py-3 border-b border-purple-500/15 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-md bg-purple-500/20 flex items-center justify-center">
            <svg className="w-3.5 h-3.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </div>
          <h3 className="text-sm font-semibold text-purple-200">Tree Visualization</h3>
        </div>
        <p className="text-[11px] text-purple-400/60">Drag to pan • Scroll to zoom • Hover for details</p>
      </div>
      <div
        ref={containerRef}
        className="w-full cursor-grab active:cursor-grabbing"
        style={{ height: '450px', background: 'transparent' }}
      />
    </div>
  );
}
