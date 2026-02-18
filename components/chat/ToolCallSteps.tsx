'use client';

import React, { useState } from 'react';
import { ToolCall } from '@/types/message';

interface ToolCallStepsProps {
  toolCalls: ToolCall[];
}

// Icons for different states
const SpinnerIcon = () => (
  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" />
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
  </svg>
);

const CheckIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <polyline points="20 6 9 17 4 12" />
  </svg>
);

const ErrorIcon = () => (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const ChevronIcon = ({ expanded }: { expanded: boolean }) => (
  <svg
    className={`h-4 w-4 transition-transform duration-200 ${expanded ? 'rotate-90' : ''}`}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
  >
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Tool name to friendly display name mapping
const toolDisplayNames: Record<string, string> = {
  search_documents: 'Searching documents',
  retrieve_context: 'Retrieving context',
  analyze_content: 'Analyzing content',
  generate_summary: 'Generating summary',
  fetch_data: 'Fetching data',
  process_query: 'Processing query',
  extract_information: 'Extracting information',
  calculate: 'Calculating',
  format_response: 'Formatting response',
};

function getToolDisplayName(toolName: string): string {
  return toolDisplayNames[toolName] || toolName.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function getStatusColor(status: ToolCall['status']) {
  switch (status) {
    case 'pending':
      return 'text-gray-400';
    case 'running':
      return 'text-blue-400';
    case 'completed':
      return 'text-green-400';
    case 'error':
      return 'text-red-400';
    default:
      return 'text-gray-400';
  }
}

function getStatusBgColor(status: ToolCall['status']) {
  switch (status) {
    case 'pending':
      return 'bg-gray-500/10';
    case 'running':
      return 'bg-blue-500/10';
    case 'completed':
      return 'bg-green-500/10';
    case 'error':
      return 'bg-red-500/10';
    default:
      return 'bg-gray-500/10';
  }
}

interface ToolCallItemProps {
  toolCall: ToolCall;
  index: number;
}

function ToolCallItem({ toolCall, index }: ToolCallItemProps) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = toolCall.input || toolCall.output || toolCall.error;

  const statusIcon = () => {
    switch (toolCall.status) {
      case 'pending':
        return <div className="h-4 w-4 rounded-full border-2 border-gray-400 border-dashed" />;
      case 'running':
        return <SpinnerIcon />;
      case 'completed':
        return <CheckIcon />;
      case 'error':
        return <ErrorIcon />;
    }
  };

  const duration = toolCall.startTime && toolCall.endTime
    ? Math.round((toolCall.endTime.getTime() - toolCall.startTime.getTime()) / 1000 * 10) / 10
    : null;

  return (
    <div className={`rounded-lg border border-purple-500/10 ${getStatusBgColor(toolCall.status)} overflow-hidden`}>
      <button
        onClick={() => hasDetails && setExpanded(!expanded)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors ${
          hasDetails ? 'hover:bg-purple-500/5 cursor-pointer' : 'cursor-default'
        }`}
        disabled={!hasDetails}
      >
        {/* Step number */}
        <span className="flex-shrink-0 w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 text-xs font-medium flex items-center justify-center">
          {index + 1}
        </span>

        {/* Status icon */}
        <span className={`flex-shrink-0 ${getStatusColor(toolCall.status)}`}>
          {statusIcon()}
        </span>

        {/* Tool name */}
        <span className="flex-1 text-sm text-purple-100/90 font-medium truncate">
          {getToolDisplayName(toolCall.name)}
        </span>

        {/* Duration */}
        {duration !== null && (
          <span className="text-xs text-purple-400/50 mr-1">
            {duration}s
          </span>
        )}

        {/* Expand chevron */}
        {hasDetails && (
          <span className="text-purple-400/50">
            <ChevronIcon expanded={expanded} />
          </span>
        )}
      </button>

      {/* Expanded details */}
      {expanded && hasDetails && (
        <div className="px-3 pb-3 pt-1 border-t border-purple-500/10">
          {toolCall.input && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-purple-400/50 mb-1">Input</div>
              <pre className="text-xs text-purple-200/70 bg-black/20 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto">
                {JSON.stringify(toolCall.input, null, 2)}
              </pre>
            </div>
          )}
          {toolCall.output && (
            <div className="mb-2">
              <div className="text-[10px] uppercase tracking-wider text-purple-400/50 mb-1">Output</div>
              <pre className="text-xs text-purple-200/70 bg-black/20 rounded p-2 overflow-x-auto max-h-32 overflow-y-auto whitespace-pre-wrap">
                {toolCall.output}
              </pre>
            </div>
          )}
          {toolCall.error && (
            <div>
              <div className="text-[10px] uppercase tracking-wider text-red-400/70 mb-1">Error</div>
              <pre className="text-xs text-red-300/80 bg-red-500/10 rounded p-2 overflow-x-auto">
                {toolCall.error}
              </pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function ToolCallSteps({ toolCalls }: ToolCallStepsProps) {
  const [collapsed, setCollapsed] = useState(false);
  
  if (!toolCalls || toolCalls.length === 0) return null;

  const completedCount = toolCalls.filter(t => t.status === 'completed').length;
  const isAllComplete = completedCount === toolCalls.length;
  const hasError = toolCalls.some(t => t.status === 'error');

  return (
    <div className="mb-4">
      {/* Header */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center gap-2 text-xs text-purple-400/70 hover:text-purple-400 transition-colors mb-2"
      >
        <ChevronIcon expanded={!collapsed} />
        <span className="font-medium">
          {isAllComplete ? (
            hasError ? 'Completed with errors' : 'Completed'
          ) : (
            'Working...'
          )}
        </span>
        <span className="text-purple-400/50">
          {completedCount}/{toolCalls.length} steps
        </span>
      </button>

      {/* Tool call list */}
      {!collapsed && (
        <div className="space-y-2 pl-1">
          {toolCalls.map((toolCall, index) => (
            <ToolCallItem key={toolCall.id} toolCall={toolCall} index={index} />
          ))}
        </div>
      )}
    </div>
  );
}
