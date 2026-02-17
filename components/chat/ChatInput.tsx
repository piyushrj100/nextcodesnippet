'use client';

import React, { useState, KeyboardEvent, useRef } from 'react';
import { SendIcon } from '../icons/SendIcon';
import { PaperclipIcon } from '../icons/PaperclipIcon';

interface ChatInputProps {
  onSendMessage: (message: string, files?: File[]) => void;
  disabled?: boolean;
  placeholder?: string;
}

export default function ChatInput({
  onSendMessage,
  disabled = false,
  placeholder = 'Type your message...',
}: ChatInputProps) {
  const [message, setMessage] = useState('');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = () => {
    if ((message.trim() || selectedFiles.length > 0) && !disabled) {
      onSendMessage(message.trim(), selectedFiles);
      setMessage('');
      setSelectedFiles([]);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles((prev) => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  return (
    <div className="border-t border-white/6 bg-[#0f0b19] p-4">
      <div className="max-w-4xl mx-auto">
        {/* Selected Files Display */}
        {selectedFiles.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-2">
            {selectedFiles.map((file, index) => (
              <div
                key={index}
                className="flex items-center gap-2 bg-white/5 border border-white/8 rounded-lg px-3 py-2 text-sm"
              >
                <PaperclipIcon className="w-4 h-4 text-gray-500" />
                <span className="text-gray-300 max-w-[150px] truncate">
                  {file.name}
                </span>
                <button
                  onClick={() => removeFile(index)}
                  className="text-gray-500 hover:text-red-400 transition-colors"
                  aria-label="Remove file"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Area */}
        <div className="flex gap-3 items-end">
          {/* File Upload Button */}
          <input
            ref={fileInputRef}
            type="file"
            multiple
            onChange={handleFileSelect}
            className="hidden"
            disabled={disabled}
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={disabled}
            className="flex-shrink-0 rounded-xl p-2.5 text-gray-500 hover:text-gray-300 hover:bg-white/5 focus:outline-none disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            aria-label="Attach file"
            title="Attach file"
          >
            <PaperclipIcon className="w-5 h-5" />
          </button>

          {/* Text Input */}
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-gray-100 placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-white/15 focus:border-white/15 disabled:opacity-30 disabled:cursor-not-allowed max-h-32 overflow-hidden transition-colors"
            style={{
              minHeight: '44px',
              height: 'auto',
            }}
            onInput={(e) => {
              const target = e.target as HTMLTextAreaElement;
              target.style.height = 'auto';
              target.style.height = `${Math.min(target.scrollHeight, 128)}px`;
            }}
          />

          {/* Send Button */}
          <button
            onClick={handleSend}
            disabled={disabled || (!message.trim() && selectedFiles.length === 0)}
            className="flex-shrink-0 rounded-xl bg-purple-600 p-2.5 text-white hover:bg-purple-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
            aria-label="Send message"
          >
            <SendIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
