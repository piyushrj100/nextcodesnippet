'use client';

import React, { useRef, useEffect } from 'react';
import ChatMessage, { Message } from './ChatMessage';
import TypingIndicator from './TypingIndicator';
import { DocumentSource } from '@/types/message';

interface ChatWindowProps {
  messages: Message[];
  isTyping?: boolean;
  onSourceClick?: (source: DocumentSource) => void;
}

export default function ChatWindow({ messages, isTyping = false, onSourceClick }: ChatWindowProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  return (
    <div className="flex-1 overflow-y-auto bg-[#0c0a14] px-4 py-6">
      <div className="max-w-4xl mx-auto">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center py-20">
            <div className="mb-5">
              <div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-violet-600 rounded-2xl flex items-center justify-center text-white text-xl font-bold shadow-xl shadow-purple-500/20">
                DM
              </div>
            </div>
            <h2 className="text-2xl font-semibold text-purple-100 mb-2">
              Start a conversation
            </h2>
            <p className="text-purple-300/40 max-w-md text-sm">
              Ask me anything! I&apos;m here to help you with your questions and tasks.
            </p>
          </div>
        ) : (
          <>
            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} onSourceClick={onSourceClick} />
            ))}
            {isTyping && <TypingIndicator />}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
