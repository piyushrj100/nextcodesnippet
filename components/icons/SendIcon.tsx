import React from 'react';

interface IconProps {
  className?: string;
}

export function SendIcon({ className = 'w-6 h-6' }: IconProps) {
  return (
    <svg
      className={className}
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M6 12L3 21l18-9L3 3l3 9zm0 0h8"
      />
    </svg>
  );
}
