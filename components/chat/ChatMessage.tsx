import React from 'react';
import MarkdownRenderer from './MarkdownRenderer';
import { UserIcon } from '../icons/UserIcon';
import SourceCitation from '../document/SourceCitation';
import { DocumentSource } from '@/types/message';
import dynamic from 'next/dynamic';
import type { TreeNode, TreeSchema } from '../tree/types';

// Lazy-load TreeRenderer (vis-network is heavy, only load when needed)
const TreeRenderer = dynamic(() => import('../tree/TreeRenderer'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-[400px] rounded-xl bg-purple-950/30 border border-purple-500/20 flex items-center justify-center">
      <div className="flex items-center gap-2 text-purple-400 text-sm">
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        Loading tree visualization...
      </div>
    </div>
  ),
});

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: DocumentSource[];
  treeData?: TreeNode;
  treeSchema?: TreeSchema;
}

interface ChatMessageProps {
  message: Message;
  onSourceClick?: (source: DocumentSource) => void;
}

export default function ChatMessage({ message, onSourceClick }: ChatMessageProps) {
  const isUser = message.role === 'user';

  const handleCitationClick = (citationNumber: number) => {
    // Find the source with this citation number
    const source = message.sources?.find(s => s.citationNumber === citationNumber);
    if (source && onSourceClick) {
      onSourceClick(source);
    }
  };

  if (isUser) {
    // User message - compact style at top right
    return (
      <div className="flex w-full justify-end mb-4">
        <div className="flex items-start gap-3 max-w-[85%]">
          <div className="flex-1 text-right">
            <div className="inline-block bg-purple-600 text-white rounded-2xl rounded-tr-sm px-4 py-2.5 text-sm shadow-lg shadow-purple-600/10">
              <p className="leading-relaxed whitespace-pre-wrap break-words text-left">
                {message.content}
              </p>
            </div>
            <div className="text-[11px] text-purple-400/30 mt-1.5 px-2">
              {message.timestamp.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </div>
          </div>
          <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-600 flex items-center justify-center text-white shadow-lg shadow-purple-600/20">
            <UserIcon className="w-4 h-4" />
          </div>
        </div>
      </div>
    );
  }

  // AI message - full width with avatar on left
  return (
    <div className="flex w-full justify-start mb-8">
      <div className="flex items-start gap-4 w-full">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-purple-500/20">
          AI
        </div>
        <div className="flex-1 min-w-0">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <MarkdownRenderer content={message.content} onCitationClick={handleCitationClick} />
          </div>

          {/* Tree Visualization — rendered inline as part of the message */}
          {message.treeData && (
            <div className="mt-4">
              <TreeRenderer data={message.treeData} schema={message.treeSchema} />
            </div>
          )}

          {/* Source Citations */}
          {message.sources && message.sources.length > 0 && (
            <SourceCitation sources={message.sources} onSourceClick={onSourceClick} />
          )}
          
          <div className="text-[11px] text-purple-400/30 mt-3">
            {message.timestamp.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
