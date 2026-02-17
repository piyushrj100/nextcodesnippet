# Chat Assistant UI Components

A modular and reusable Claude-like chat interface built with Next.js, React, and Tailwind CSS.

## 🎨 Features

- **Clean, Modern UI**: Claude-inspired design with smooth animations
- **Dark Mode Support**: Automatic dark mode based on system preferences
- **Responsive Layout**: Works seamlessly on desktop and mobile
- **Modular Components**: Easy to customize and extend
- **Type-Safe**: Built with TypeScript for better developer experience

## 📁 Component Structure

```
components/
├── chat/
│   ├── ChatMessage.tsx      # Individual message bubble component
│   ├── ChatWindow.tsx        # Message list container with auto-scroll
│   ├── ChatInput.tsx         # Message input with send button
│   └── TypingIndicator.tsx   # Animated typing indicator
├── layout/
│   ├── Header.tsx            # Top navigation bar
│   └── Sidebar.tsx           # Conversation history sidebar
└── icons/
    ├── SendIcon.tsx          # Send message icon
    ├── MenuIcon.tsx          # Hamburger menu icon
    ├── PlusIcon.tsx          # New chat icon
    └── CloseIcon.tsx         # Close sidebar icon
```

## 🧩 Component Documentation

### ChatMessage

Displays a single message bubble with role-based styling.

**Props:**
- `message: Message` - Message object containing id, role, content, and timestamp

**Example:**
```tsx
<ChatMessage message={{
  id: '1',
  role: 'user',
  content: 'Hello!',
  timestamp: new Date()
}} />
```

### ChatWindow

Container for displaying message history with auto-scroll functionality.

**Props:**
- `messages: Message[]` - Array of messages to display
- `isTyping?: boolean` - Shows typing indicator when true

**Example:**
```tsx
<ChatWindow messages={messages} isTyping={isTyping} />
```

### ChatInput

Text input area with send button for composing messages.

**Props:**
- `onSendMessage: (message: string) => void` - Callback when message is sent
- `disabled?: boolean` - Disables input when true
- `placeholder?: string` - Placeholder text

**Features:**
- Auto-expanding textarea
- Enter to send (Shift+Enter for new line)
- Disabled state during AI response

**Example:**
```tsx
<ChatInput
  onSendMessage={handleSendMessage}
  disabled={isTyping}
  placeholder="Ask me anything..."
/>
```

### TypingIndicator

Animated dots indicator showing AI is typing.

**Example:**
```tsx
{isTyping && <TypingIndicator />}
```

### Header

Top navigation bar with logo and optional menu button.

**Props:**
- `onMenuClick?: () => void` - Callback for menu button click
- `title?: string` - Header title text

**Example:**
```tsx
<Header
  onMenuClick={() => setIsSidebarOpen(true)}
  title="Chat Assistant"
/>
```

### Sidebar

Collapsible sidebar for conversation history and new chat button.

**Props:**
- `conversations: Conversation[]` - List of conversations
- `activeConversationId?: string` - Currently active conversation
- `onNewChat: () => void` - Callback for new chat button
- `onSelectConversation: (id: string) => void` - Callback when conversation is selected
- `isOpen?: boolean` - Sidebar open state
- `onClose?: () => void` - Callback to close sidebar

**Example:**
```tsx
<Sidebar
  conversations={conversations}
  activeConversationId={activeConversationId}
  onNewChat={handleNewChat}
  onSelectConversation={handleSelectConversation}
  isOpen={isSidebarOpen}
  onClose={() => setIsSidebarOpen(false)}
/>
```

## 🎯 Usage

The main page (`app/page.tsx`) demonstrates how to use all components together:

1. **State Management**: Uses React hooks for managing messages, conversations, and UI state
2. **Message Flow**: User sends message → Show typing indicator → Display AI response
3. **Conversation Management**: Create new chats, switch between conversations
4. **Responsive Behavior**: Sidebar toggles on mobile, always visible on desktop

## 🎨 Customization

### Colors

Modify Tailwind classes in components:
- **Primary Color**: Change `bg-blue-600` to your preferred color
- **Message Bubbles**: Update colors in `ChatMessage.tsx`
- **Dark Mode**: Adjust dark mode colors using `dark:` prefix

### Layout

- **Max Width**: Adjust `max-w-4xl` in ChatWindow and ChatInput
- **Sidebar Width**: Change `w-80` in Sidebar component
- **Message Bubble Width**: Modify `max-w-[80%]` in ChatMessage

### Icons

All icons are SVG-based and can be replaced or modified in the `components/icons/` directory.

## 🚀 Getting Started

1. Install dependencies:
```bash
pnpm install
```

2. Run development server:
```bash
pnpm dev
```

3. Open [http://localhost:3000](http://localhost:3000)

## 🔧 Future Enhancements

- [ ] Markdown rendering in messages
- [ ] Code syntax highlighting
- [ ] File attachments
- [ ] Message editing/deletion
- [ ] Conversation search
- [ ] Export conversations
- [ ] Multi-model support
- [ ] Streaming responses

## 📝 License

MIT
