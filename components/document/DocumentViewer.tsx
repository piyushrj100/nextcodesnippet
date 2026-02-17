'use client';

import React, { useState } from 'react';
import { DocumentSource } from '@/types/message';
import { CloseIcon } from '../icons/CloseIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';

interface DocumentViewerProps {
  sources: DocumentSource[];
  onClose: () => void;
  initialSourceIndex?: number;
}

export default function DocumentViewer({
  sources,
  onClose,
  initialSourceIndex = 0,
}: DocumentViewerProps) {
  const [currentIndex, setCurrentIndex] = useState(initialSourceIndex);
  const currentSource = sources[currentIndex];

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev > 0 ? prev - 1 : sources.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev < sources.length - 1 ? prev + 1 : 0));
  };

  const highlightText = (text: string, highlights?: { text: string; startOffset: number; endOffset: number }[]) => {
    if (!highlights || highlights.length === 0) {
      return <span>{text}</span>;
    }

    const parts: React.ReactNode[] = [];
    let lastIndex = 0;

    // Sort highlights by start position
    const sortedHighlights = [...highlights].sort((a, b) => a.startOffset - b.startOffset);

    sortedHighlights.forEach((highlight, idx) => {
      // Add text before highlight
      if (highlight.startOffset > lastIndex) {
        parts.push(
          <span key={`text-${idx}`}>
            {text.substring(lastIndex, highlight.startOffset)}
          </span>
        );
      }

      // Add highlighted text
      parts.push(
        <mark
          key={`highlight-${idx}`}
          className="bg-purple-400/15 text-gray-100 px-0.5 rounded-sm"
        >
          {text.substring(highlight.startOffset, highlight.endOffset)}
        </mark>
      );

      lastIndex = highlight.endOffset;
    });

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(<span key="text-end">{text.substring(lastIndex)}</span>);
    }

    return <>{parts}</>;
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#141218] rounded-xl shadow-2xl border border-white/8 w-full max-w-4xl h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-white/6">
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-semibold text-gray-100 truncate">
              {currentSource.title || currentSource.documentName}
            </h3>
            <p className="text-sm text-gray-500 mt-0.5">
              {currentSource.title && (
                <span className="mr-1">{currentSource.documentName} •</span>
              )}
              {currentSource.endPageIndex && currentSource.endPageIndex > (currentSource.pageIndex ?? currentSource.pageNumber ?? 0)
                ? `Pages ${currentSource.pageIndex ?? currentSource.pageNumber}–${currentSource.endPageIndex}`
                : `Page ${currentSource.pageIndex ?? currentSource.pageNumber}`}
              {currentSource.score != null && (
                <span className="ml-1">
                  • Relevance: {(currentSource.score * 100).toFixed(0)}%
                </span>
              )}
            </p>
            {currentSource.summary && (
              <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                {currentSource.summary}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/6 transition-colors ml-4"
            aria-label="Close document viewer"
          >
            <CloseIcon className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Navigation */}
        {sources.length > 1 && (
          <div className="flex items-center justify-between px-5 py-2.5 bg-white/[0.02] border-b border-white/6">
            <button
              onClick={goToPrevious}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/6 transition-colors text-sm text-gray-400 hover:text-gray-300"
            >
              <ChevronLeftIcon className="w-4 h-4" />
              Previous
            </button>
            <span className="text-sm text-gray-500">
              {currentIndex + 1} of {sources.length}
            </span>
            <button
              onClick={goToNext}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-white/6 transition-colors text-sm text-gray-400 hover:text-gray-300"
            >
              Next
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="bg-white/[0.03] rounded-lg p-6 border border-white/6">
            <div className="text-gray-300 leading-relaxed whitespace-pre-wrap text-[14px]">
              {highlightText(currentSource.content, currentSource.highlights)}
            </div>
          </div>

          {/* Highlights Section */}
          {currentSource.highlights && currentSource.highlights.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-semibold text-gray-400 mb-3">
                Highlighted Sections ({currentSource.highlights.length})
              </h4>
              <div className="space-y-2">
                {currentSource.highlights.map((highlight, idx) => (
                  <div
                    key={idx}
                    className="relative border-l-[3px] border-purple-500/50 bg-white/[0.03] rounded-r-lg px-4 py-2.5"
                  >
                    <p className="text-sm text-gray-400 italic">
                      &quot;{highlight.text}&quot;
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/6">
          <div className="flex items-center justify-between text-xs text-gray-600">
            <span>Document ID: {currentSource.id}</span>
            <span>
              {currentSource.highlights?.length || 0} highlight(s) in this section
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
