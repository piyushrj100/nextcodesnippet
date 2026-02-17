'use client';

import React from 'react';
import { PlusIcon } from '../icons/PlusIcon';
import { ChevronLeftIcon } from '../icons/ChevronLeftIcon';

export interface Conversation {
  id: string;
  title: string;
  lastMessage: string;
  timestamp: Date;
}

interface SidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  onNewChat: () => void;
  onSelectConversation: (id: string) => void;
  isOpen?: boolean;
  onClose?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  conversations,
  activeConversationId,
  onNewChat,
  onSelectConversation,
  isOpen = true,
  onClose,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  return (
    <>
      {/* Overlay for mobile */}
      {isOpen && onClose && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:relative inset-y-0 left-0 z-50 bg-[#110d1d] border-r border-white/6 flex flex-col transform transition-all duration-300 ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        } ${isCollapsed ? 'lg:w-[60px]' : 'lg:w-72'} w-72`}
      >
        {/* Top area: Logo + collapse */}
        <div className={`flex items-center p-4 ${isCollapsed ? 'justify-center' : 'justify-between'}`}>
          {!isCollapsed && (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold shadow-lg shadow-purple-500/20">
                DM
              </div>
              <span className="text-sm font-semibold text-gray-200 tracking-wide">DocMiner AI</span>
            </div>
          )}
          
          {isCollapsed && (
            <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg flex items-center justify-center text-white text-[10px] font-bold">
              DM
            </div>
          )}

          {!isCollapsed && onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1.5 rounded-md hover:bg-white/5 transition-colors"
              aria-label="Collapse sidebar"
              title="Collapse sidebar"
            >
              <ChevronLeftIcon className="w-4 h-4 text-gray-500" />
            </button>
          )}
        </div>

        {/* New Chat Button */}
        <div className={`${isCollapsed ? 'px-2.5' : 'px-3'} mb-1 mt-4`}>
          <button
            onClick={onNewChat}
            className={`w-full flex items-center gap-2.5 bg-purple-600 hover:bg-purple-500 text-white font-medium transition-all duration-200 focus:outline-none ${
              isCollapsed
                ? 'justify-center rounded-lg p-2'
                : 'rounded-xl px-4 py-2.5 text-sm'
            }`}
            title="New Chat"
          >
            <PlusIcon className={`flex-shrink-0 ${isCollapsed ? 'w-4 h-4' : 'w-4.5 h-4.5'}`} />
            {!isCollapsed && <span>New Chat</span>}
          </button>
        </div>

        {/* Divider in collapsed mode */}
        {isCollapsed && conversations.length > 0 && (
          <div className="mx-3 my-2 border-t border-white/6" />
        )}

        {/* Section label */}
        {!isCollapsed && conversations.length > 0 && (
          <div className="px-5 pt-4 pb-2">
            <span className="text-[10px] font-semibold text-gray-600 uppercase tracking-[0.15em]">
              Recent
            </span>
          </div>
        )}

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          <div className="space-y-0.5">
            {conversations.length === 0 && !isCollapsed ? (
              <div className="px-3 py-12 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-xl bg-white/5 flex items-center justify-center">
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <p className="text-xs text-gray-600">No conversations yet</p>
              </div>
            ) : (
              conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => onSelectConversation(conversation.id)}
                  className={`w-full text-left rounded-lg transition-all duration-150 group ${
                    isCollapsed ? 'p-1.5 flex justify-center' : 'px-3 py-2.5'
                  } ${
                    activeConversationId === conversation.id
                      ? 'bg-white/8 text-gray-100'
                      : 'hover:bg-white/5 text-gray-400 hover:text-gray-200'
                  }`}
                  title={isCollapsed ? conversation.title : undefined}
                >
                  {isCollapsed ? (
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-medium ${
                      activeConversationId === conversation.id
                        ? 'bg-white/10 text-gray-200'
                        : 'bg-white/5 text-gray-500 group-hover:text-gray-300 group-hover:bg-white/8'
                    }`}>
                      {conversation.title.substring(0, 2).toUpperCase()}
                    </div>
                  ) : (
                    <>
                      <div className="font-medium text-[13px] truncate leading-snug">
                        {conversation.title}
                      </div>
                      <div className="text-[11px] text-gray-600 truncate mt-0.5">
                        {conversation.lastMessage}
                      </div>
                    </>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        {!isCollapsed && (
          <div className="border-t border-white/6 p-4">
            <div className="text-[10px] text-gray-700 text-center tracking-wider">
              Powered by Doc Miner
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
