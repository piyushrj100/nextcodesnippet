'use client';

import React from 'react';
import { MenuIcon } from '../icons/MenuIcon';
import { ChevronRightIcon } from '../icons/ChevronRightIcon';

interface HeaderProps {
  onMenuClick?: () => void;
  title?: string;
  showExpandButton?: boolean;
  onExpandClick?: () => void;
  showTitle?: boolean;
}

export default function Header({ 
  onMenuClick, 
  title = 'DocMiner AI',
  showExpandButton = false,
  onExpandClick,
  showTitle = true
}: HeaderProps) {
  return (
    <header className="border-b border-white/6 bg-[#0f0b19] px-4 py-3 flex items-center gap-3">
      {showExpandButton && onExpandClick && (
        <button
          onClick={onExpandClick}
          className="hidden lg:flex p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Expand sidebar"
          title="Expand sidebar"
        >
          <ChevronRightIcon className="w-5 h-5 text-gray-500" />
        </button>
      )}

      {onMenuClick && (
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          aria-label="Toggle menu"
        >
          <MenuIcon className="w-5 h-5 text-gray-400" />
        </button>
      )}
      
      {showTitle && (
        <h1 className="text-[15px] font-semibold text-gray-200 tracking-tight">
          {title}
        </h1>
      )}
    </header>
  );
}
