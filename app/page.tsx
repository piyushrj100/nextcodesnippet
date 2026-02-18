'use client';

import { useState } from 'react';
import ChatWindow from '@/components/chat/ChatWindow';
import ChatInput from '@/components/chat/ChatInput';
import Header from '@/components/layout/Header';
import Sidebar, { Conversation } from '@/components/layout/Sidebar';
import { Message } from '@/components/chat/ChatMessage';
import { DocumentSource, ToolCall } from '@/types/message';
import DocumentViewer from '@/components/document/DocumentViewer';
import { sampleTreeData } from '@/components/tree';

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeConversationId, setActiveConversationId] = useState<string>();
  const [isTyping, setIsTyping] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [selectedDocumentSources, setSelectedDocumentSources] = useState<DocumentSource[] | null>(null);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);

  const handleSendMessage = async (content: string, files?: File[]) => {
    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: files && files.length > 0 
        ? `${content}\n\n[Attached ${files.length} file(s): ${files.map(f => f.name).join(', ')}]`
        : content,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    // Check for "tools" trigger → show tool calling demo
    if (content.trim().toLowerCase() === 'tools') {
      // Create initial message with pending tool calls
      const toolCalls: ToolCall[] = [
        {
          id: 'tool-1',
          name: 'search_documents',
          status: 'pending',
          input: { query: content, limit: 5 },
        },
        {
          id: 'tool-2',
          name: 'retrieve_context',
          status: 'pending',
          input: { documentIds: ['doc-1', 'doc-2'] },
        },
        {
          id: 'tool-3',
          name: 'generate_summary',
          status: 'pending',
        },
      ];

      const assistantMessageId = (Date.now() + 1).toString();
      
      // Add message with pending tool calls
      setMessages((prev) => [...prev, {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date(),
        toolCalls: [...toolCalls],
      }]);

      // Simulate tool execution one by one
      const updateToolCall = (index: number, updates: Partial<ToolCall>) => {
        setMessages((prev) => prev.map(msg => {
          if (msg.id === assistantMessageId && msg.toolCalls) {
            const newToolCalls = [...msg.toolCalls];
            newToolCalls[index] = { ...newToolCalls[index], ...updates };
            return { ...msg, toolCalls: newToolCalls };
          }
          return msg;
        }));
      };

      // Tool 1: Search documents
      setTimeout(() => {
        updateToolCall(0, { status: 'running', startTime: new Date() });
      }, 300);

      setTimeout(() => {
        updateToolCall(0, { 
          status: 'completed', 
          endTime: new Date(),
          output: 'Found 3 relevant documents matching the query.'
        });
        updateToolCall(1, { status: 'running', startTime: new Date() });
      }, 1200);

      // Tool 2: Retrieve context
      setTimeout(() => {
        updateToolCall(1, { 
          status: 'completed', 
          endTime: new Date(),
          output: 'Retrieved context from 2 document sections.'
        });
        updateToolCall(2, { status: 'running', startTime: new Date() });
      }, 2200);

      // Tool 3: Generate summary & final response
      setTimeout(() => {
        updateToolCall(2, { 
          status: 'completed', 
          endTime: new Date(),
          output: 'Summary generated successfully.'
        });
        
        // Update with final content
        setMessages((prev) => prev.map(msg => {
          if (msg.id === assistantMessageId) {
            return { 
              ...msg, 
              content: `## Tool Calling Demo Complete! 🛠️

I just demonstrated the tool calling workflow that modern LLMs use:

1. **Search Documents** - Found relevant documents in your knowledge base
2. **Retrieve Context** - Extracted the most relevant passages
3. **Generate Summary** - Synthesized the information into a response

You can click on each step above to expand and see the inputs/outputs!

This pattern is commonly used in RAG (Retrieval-Augmented Generation) systems.`
            };
          }
          return msg;
        }));
        setIsTyping(false);
        updateConversations(content, 'Tool calling demo completed');
      }, 3200);

      return;
    }

    // Check for "test" trigger → show tree visualization
    if (content.trim().toLowerCase() === 'test') {
      setTimeout(() => {
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: `Here's the document tree structure generated by PageIndex. You can **drag to pan**, **scroll to zoom**, and **hover over nodes** to see metadata.`,
          timestamp: new Date(),
          treeData: sampleTreeData,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setIsTyping(false);
        updateConversations(content, assistantMessage.content);
      }, 500);
      return;
    }

    // Simulate AI response with document sources
    setTimeout(() => {
      // Generate mock sources for RAG demonstration
      const mockSources: DocumentSource[] = [
        {
          id: `source-${Date.now()}-1`,
          nodeId: '0007',
          title: 'RAG System Implementation',
          documentName: 'Technical Documentation.pdf',
          pageIndex: 42,
          endPageIndex: 44,
          content: `This section discusses the implementation details of the RAG system. The retrieval-augmented generation approach combines the power of large language models with external knowledge bases to provide more accurate and contextual responses. This technique has proven to be highly effective in domain-specific applications where accuracy and factual grounding are critical.`,
          summary: 'Details on RAG system architecture and implementation approach using LLMs with external knowledge.',
          citationNumber: 1,
          highlights: [
            {
              text: 'retrieval-augmented generation approach combines the power of large language models',
              startOffset: 85,
              endOffset: 167,
            },
          ],
        },
        {
          id: `source-${Date.now()}-2`,
          nodeId: '0012',
          title: 'Document Annotation Best Practices',
          documentName: 'Best Practices Guide.pdf',
          pageIndex: 15,
          endPageIndex: 16,
          content: `When implementing document annotation systems, it's important to consider both the user experience and the technical architecture. Highlighting relevant passages helps users quickly identify the source of information and builds trust in the AI system's responses. Multi-page support ensures that users can navigate through different sources seamlessly.`,
          summary: 'Guidelines for building effective document annotation and highlighting systems.',
          citationNumber: 2,
          highlights: [
            {
              text: 'Highlighting relevant passages helps users quickly identify the source',
              startOffset: 145,
              endOffset: 213,
            },
          ],
        },
        {
          id: `source-${Date.now()}-3`,
          nodeId: '0003',
          title: 'Frontend Architecture',
          documentName: 'Architecture Overview.pdf',
          pageIndex: 8,
          content: `The frontend components should be modular and reusable. Each component should have a single responsibility and be composable with other components. This approach makes the codebase easier to maintain and extend. Consider using TypeScript for type safety and better developer experience.`,
          summary: 'Overview of modular frontend component architecture patterns.',
          citationNumber: 3,
          highlights: [
            {
              text: 'frontend components should be modular and reusable',
              startOffset: 4,
              endOffset: 55,
            },
          ],
        },
      ];

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: files && files.length > 0
          ? `I can see you've attached ${files.length} file(s). ${getAIResponse(content)}`
          : getAIResponse(content),
        timestamp: new Date(),
        sources: mockSources, // Add sources to the message
      };

      setMessages((prev) => [...prev, assistantMessage]);
      setIsTyping(false);

      // Update or create conversation
      updateConversations(content, assistantMessage.content);
    }, 1000 + Math.random() * 1000);
  };

  const getAIResponse = (userMessage: string): string => {
    const responses = [
      `# Understanding Your Question

That's an interesting question! Let me break this down for you based on the available documentation [1].

## Key Points

1. **First consideration**: This is important because the technical documentation emphasizes the importance of proper implementation [1].
2. **Second aspect**: According to best practices [2], we should also think about user experience and architecture.
3. **Final thought**: Based on these factors and modern development standards [3], this approach is recommended.

\`\`\`javascript
// Here's a simple example
function example() {
  console.log("This demonstrates the concept");
  return true;
}
\`\`\`

I hope this helps! Let me know if you need more clarification about any of the referenced sources [1][2][3].`,
      
      `Great question! Here's what I think based on the documentation [1]:

- First, we need to consider the **context** as mentioned in the technical guide [1]
- Then, look at the available options outlined in the best practices [2]
- Finally, make an informed decision using the architecture patterns [3]

> "The best way to predict the future is to invent it." - Alan Kay

The approach described in [2] is particularly effective for this use case.`,
      
      `## Analysis

Based on your question and the available resources [1][2], here are my thoughts:

### Technical Approach

The implementation should follow the patterns described in [3]:

\`\`\`python
def process_data(input_data):
    """Process the input data efficiently"""
    result = []
    for item in input_data:
        result.append(item * 2)
    return result
\`\`\`

### Benefits

According to the documentation [1]:

- **Efficiency**: Optimized for performance as shown in [2]
- **Scalability**: Can handle large datasets [1]
- **Maintainability**: Clean and readable code following [3]

Let me know if you'd like me to elaborate on any part!`,
      
      `I'd be happy to help with that! Here's a comprehensive answer based on multiple sources [1][2][3]:

1. **Understanding the basics**: Start with the fundamentals outlined in [1]
2. **Building on knowledge**: Layer more complex concepts from [2]
3. **Practical application**: Apply what you've learned using patterns from [3]

**Important**: The technical documentation [1] emphasizes that \`inline code\` can be useful too!

| Feature | Description | Source |
|---------|-------------|--------|
| Fast    | Quick response | [1] |
| Reliable | Consistent results | [2] |
| Scalable | Grows with needs | [3] |

Feel free to ask follow-up questions about any of these sources!`,
      
      `Thank you for asking! Let me provide a detailed response:

### Overview

This is a multifaceted topic that requires careful consideration. According to the architecture overview [3], the approach should be systematic.

\`\`\`typescript
interface Example {
  id: string;
  name: string;
  active: boolean;
}

const myExample: Example = {
  id: "123",
  name: "Sample",
  active: true
};
\`\`\`

**Key Takeaways** from [1][2][3]:

- Always validate your assumptions [1]
- Test thoroughly before deployment [2]
- Document your code properly [3]

---

Hope this helps! 🚀`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const updateConversations = (userMsg: string, aiMsg: string) => {
    if (activeConversationId) {
      setConversations((prev) =>
        prev.map((conv) =>
          conv.id === activeConversationId
            ? {
                ...conv,
                lastMessage: userMsg.substring(0, 50),
                timestamp: new Date(),
              }
            : conv
        )
      );
    } else {
      const newConversation: Conversation = {
        id: Date.now().toString(),
        title: userMsg.substring(0, 30) + (userMsg.length > 30 ? '...' : ''),
        lastMessage: userMsg.substring(0, 50),
        timestamp: new Date(),
      };
      setConversations((prev) => [newConversation, ...prev]);
      setActiveConversationId(newConversation.id);
    }
  };

  const handleNewChat = () => {
    setMessages([]);
    setActiveConversationId(undefined);
    setIsSidebarOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveConversationId(id);
    // In a real app, you'd load the conversation messages here
    setMessages([]);
    setIsSidebarOpen(false);
  };

  const handleSourceClick = (source: DocumentSource) => {
    // Find all sources from the same message
    const message = messages.find(
      (msg) => msg.sources?.some((s) => s.id === source.id)
    );
    if (message?.sources) {
      const sourceIndex = message.sources.findIndex((s) => s.id === source.id);
      setSelectedSourceIndex(sourceIndex);
      setSelectedDocumentSources(message.sources);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-[#0c0a14]">
      <Sidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        onNewChat={handleNewChat}
        onSelectConversation={handleSelectConversation}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />
      
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          showExpandButton={isSidebarCollapsed}
          onExpandClick={() => setIsSidebarCollapsed(false)}
          showTitle={isSidebarCollapsed}
        />
        <ChatWindow messages={messages} isTyping={isTyping} onSourceClick={handleSourceClick} />

        <ChatInput
          onSendMessage={handleSendMessage}
          disabled={isTyping}
          placeholder="Ask me anything..."
        />
      </div>

      {/* Document Viewer Modal */}
      {selectedDocumentSources && (
        <DocumentViewer
          sources={selectedDocumentSources}
          initialSourceIndex={selectedSourceIndex}
          onClose={() => setSelectedDocumentSources(null)}
        />
      )}
    </div>
  );
}
