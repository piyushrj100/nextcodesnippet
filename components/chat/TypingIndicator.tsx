import React from 'react';

export default function TypingIndicator() {
  return (
    <div className="flex w-full justify-start mb-8">
      <div className="flex items-start gap-4 w-full">
        <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center text-white text-[11px] font-bold shadow-lg shadow-purple-500/20">
          AI
        </div>
        <div className="flex-1 min-w-0 pt-2">
          <div className="flex gap-1.5">
            <div className="w-2 h-2 bg-purple-400/50 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 bg-purple-400/50 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
            <div className="w-2 h-2 bg-purple-400/50 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
          </div>
        </div>
      </div>
    </div>
  );
}
