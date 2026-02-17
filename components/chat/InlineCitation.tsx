'use client';

import React from 'react';

interface InlineCitationProps {
  citationNumber: number;
  onCitationClick?: (citationNumber: number) => void;
}

export default function InlineCitation({ citationNumber, onCitationClick }: InlineCitationProps) {
  return (
    <button
      onClick={() => onCitationClick?.(citationNumber)}
      className="inline-flex items-center justify-center w-[18px] h-[18px] ml-0.5 text-[10px] font-bold text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 rounded-[4px] border border-purple-400/25 hover:border-purple-400/40 transition-colors cursor-pointer align-super"
      style={{ lineHeight: '1' }}
      title={`View source ${citationNumber}`}
    >
      {citationNumber}
    </button>
  );
}
