'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import InlineCitation from './InlineCitation';

interface MarkdownRendererProps {
  content: string;
  onCitationClick?: (citationNumber: number) => void;
}

export default function MarkdownRenderer({ content, onCitationClick }: MarkdownRendererProps) {
  // Process content to convert [1], [2], etc. to citation components
  const processContentWithCitations = (text: string) => {
    const parts: (string | React.ReactElement)[] = [];
    const citationRegex = /\[(\d+)\]/g;
    let lastIndex = 0;
    let match;

    while ((match = citationRegex.exec(text)) !== null) {
      // Add text before citation
      if (match.index > lastIndex) {
        parts.push(text.substring(lastIndex, match.index));
      }
      
      // Add citation component
      const citationNumber = parseInt(match[1], 10);
      parts.push(
        <InlineCitation
          key={`citation-${match.index}-${citationNumber}`}
          citationNumber={citationNumber}
          onCitationClick={onCitationClick}
        />
      );
      
      lastIndex = match.index + match[0].length;
    }

    // Add remaining text
    if (lastIndex < text.length) {
      parts.push(text.substring(lastIndex));
    }

    return parts.length > 0 ? parts : text;
  };

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        // Headings
        h1: ({ node, ...props }) => (
          <h1 className="text-3xl font-bold mt-6 mb-4 text-gray-100" {...props} />
        ),
        h2: ({ node, ...props }) => (
          <h2 className="text-2xl font-bold mt-5 mb-3 text-gray-100" {...props} />
        ),
        h3: ({ node, ...props }) => (
          <h3 className="text-xl font-bold mt-4 mb-2 text-gray-100" {...props} />
        ),
        h4: ({ node, ...props }) => (
          <h4 className="text-lg font-bold mt-3 mb-2 text-gray-200" {...props} />
        ),
        h5: ({ node, ...props }) => (
          <h5 className="text-base font-bold mt-2 mb-1 text-gray-200" {...props} />
        ),
        h6: ({ node, ...props }) => (
          <h6 className="text-sm font-bold mt-2 mb-1 text-gray-300" {...props} />
        ),
        
        // Paragraph
        p: ({ node, children, ...props }) => (
          <p className="mb-4 leading-7 text-gray-300" {...props}>
            {typeof children === 'string' 
              ? processContentWithCitations(children)
              : React.Children.map(children, (child) => {
                  if (typeof child === 'string') {
                    return processContentWithCitations(child);
                  }
                  return child;
                })
            }
          </p>
        ),
        
        // Links
        a: ({ node, ...props }) => (
          <a
            className="text-purple-400 hover:text-purple-300 hover:underline transition-colors"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),
        
        // Lists
        ul: ({ node, ...props }) => (
          <ul className="mb-4 ml-6 list-disc space-y-2 text-gray-300 marker:text-gray-600" {...props} />
        ),
        ol: ({ node, ...props }) => (
          <ol className="mb-4 ml-6 list-decimal space-y-2 text-gray-300 marker:text-gray-600" {...props} />
        ),
        li: ({ node, ...props }) => (
          <li className="leading-7" {...props} />
        ),
        
        // Code blocks
        code: ({ node, inline, className, children, ...props }: any) => {
          const match = /language-(\w+)/.exec(className || '');
          const language = match ? match[1] : '';
          
          return !inline && language ? (
            <div className="relative group my-4">
              <div className="absolute right-2 top-2 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(String(children));
                  }}
                  className="px-3 py-1 text-xs bg-white/10 hover:bg-white/15 text-gray-300 rounded border border-white/10 transition-colors backdrop-blur-sm"
                >
                  Copy
                </button>
              </div>
              <SyntaxHighlighter
                style={oneDark}
                language={language}
                PreTag="div"
                className="rounded-lg text-sm"
                customStyle={{ background: '#1a1a2e', border: '1px solid rgba(255,255,255,0.06)' }}
                {...props}
              >
                {String(children).replace(/\n$/, '')}
              </SyntaxHighlighter>
            </div>
          ) : (
            <code
              className="bg-white/8 text-purple-300 px-1.5 py-0.5 rounded text-sm font-mono border border-white/6"
              {...props}
            >
              {children}
            </code>
          );
        },
        
        // Blockquote
        blockquote: ({ node, ...props }) => (
          <blockquote
            className="border-l-4 border-purple-500/30 pl-4 py-2 my-4 italic text-gray-400"
            {...props}
          />
        ),
        
        // Horizontal rule
        hr: ({ node, ...props }) => (
          <hr className="my-6 border-white/8" {...props} />
        ),
        
        // Table
        table: ({ node, ...props }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border border-white/8 rounded-lg overflow-hidden" {...props} />
          </div>
        ),
        thead: ({ node, ...props }) => (
          <thead className="bg-white/5" {...props} />
        ),
        th: ({ node, ...props }) => (
          <th className="border border-white/8 px-4 py-2 text-left font-semibold text-gray-200" {...props} />
        ),
        td: ({ node, ...props }) => (
          <td className="border border-white/8 px-4 py-2 text-gray-400" {...props} />
        ),
        
        // Strong and emphasis
        strong: ({ node, ...props }) => (
          <strong className="font-semibold text-gray-100" {...props} />
        ),
        em: ({ node, ...props }) => (
          <em className="italic text-gray-400" {...props} />
        ),
        
        // Images
        img: ({ node, ...props }) => (
          <img className="max-w-full h-auto rounded-lg my-4" {...props} alt={props.alt || ''} />
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
