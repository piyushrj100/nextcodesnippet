'use client';

import React, { useState } from 'react';
import { DocumentSource } from '@/types/message';
import { DocumentIcon } from '../icons/DocumentIcon';
import { ExternalLinkIcon } from '../icons/ExternalLinkIcon';

interface SourceCitationProps {
  sources: DocumentSource[];
  onSourceClick?: (source: DocumentSource) => void;
}

export default function SourceCitation({ sources, onSourceClick }: SourceCitationProps) {
  const [expandedSources, setExpandedSources] = useState<Set<string>>(new Set());

  const toggleSource = (sourceId: string) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      if (next.has(sourceId)) {
        next.delete(sourceId);
      } else {
        next.add(sourceId);
      }
      return next;
    });
  };

  if (!sources || sources.length === 0) return null;

  return (
    <div className="mt-6 border-t border-white/6 pt-4">
      <div className="flex items-center gap-2 mb-3">
        <DocumentIcon className="w-4 h-4 text-gray-500" />
        <h4 className="text-sm font-semibold text-gray-400">
          Sources ({sources.length})
        </h4>
      </div>
      
      <div className="space-y-2">
        {sources.map((source, index) => (
          <div
            key={source.id}
            className="border border-white/6 rounded-lg overflow-hidden hover:border-white/12 transition-colors"
          >
            {/* Source Header */}
            <div className="w-full flex items-center justify-between p-3 bg-white/[0.02]">
              <button
                onClick={() => toggleSource(source.id)}
                className="flex items-center gap-3 flex-1 text-left hover:bg-white/[0.02] -m-3 p-3 rounded-lg transition-colors"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-500/15 text-purple-300 text-xs font-semibold flex items-center justify-center">
                  {source.citationNumber || index + 1}
                </span>
                <div className="flex-1 min-w-0">
                  {source.title && (
                    <p className="text-sm font-medium text-gray-200 truncate">
                      {source.title}
                    </p>
                  )}
                  <p className={`text-xs ${source.title ? 'text-gray-500' : 'text-sm font-medium text-gray-200'} truncate`}>
                    {source.documentName}
                    {' • '}
                    {source.endPageIndex && source.endPageIndex > (source.pageIndex ?? source.pageNumber ?? 0)
                      ? `Pages ${source.pageIndex ?? source.pageNumber}–${source.endPageIndex}`
                      : `Page ${source.pageIndex ?? source.pageNumber}`}
                    {source.score != null && (
                      <span className="ml-2">
                        • Relevance: {(source.score * 100).toFixed(0)}%
                      </span>
                    )}
                  </p>
                  {source.summary && (
                    <p className="text-xs text-gray-600 mt-0.5 truncate">
                      {source.summary}
                    </p>
                  )}
                </div>
                
                <svg
                  className={`w-4 h-4 text-gray-500 transition-transform flex-shrink-0 ${
                    expandedSources.has(source.id) ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {onSourceClick && (
                <button
                  onClick={() => onSourceClick(source)}
                  className="p-1.5 ml-2 rounded hover:bg-white/8 transition-colors flex-shrink-0"
                  title="View in document"
                >
                  <ExternalLinkIcon className="w-4 h-4 text-gray-500" />
                </button>
              )}
            </div>

            {/* Expanded Source Content */}
            {expandedSources.has(source.id) && (
              <div className="p-4 bg-white/[0.02] border-t border-white/6">
                <div className="text-sm text-gray-400 leading-relaxed">
                  {source.highlights && source.highlights.length > 0 ? (
                    <div className="space-y-2">
                      {source.highlights.map((highlight, idx) => (
                        <div key={idx} className="relative">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-purple-500/50 rounded-full"></div>
                          <p className="pl-4 py-1.5 bg-purple-500/5 rounded-r text-gray-300">
                            &quot;{highlight.text}&quot;
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="italic text-gray-500">
                      {source.content.substring(0, 300)}
                      {source.content.length > 300 && '...'}
                    </p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
