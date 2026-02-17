# DocMiner AI - RAG-Powered Document Chat Interface

A modern, Claude-like chat interface with RAG (Retrieval-Augmented Generation) capabilities powered by **PageIndex** (vectorless, reasoning-based retrieval).

## ✨ Features

- 🎨 **Beautiful UI** - Purple-themed dark mode interface inspired by Claude
- 💬 **Chat Interface** - Real-time streaming responses with typing indicators
- 📄 **Document RAG** - Upload PDFs and query them with inline citations [1][2][3]
- 🔍 **Smart Citations** - Click citation numbers to view source documents
- 📊 **Document Viewer** - Full-screen modal with highlighted relevant sections
- 🌳 **Tree Visualization** - Interactive vis-network tree view of document structure
- 🎯 **PageIndex Integration** - No vector DB, no chunking, just LLM reasoning over document trees
- ⚡ **Server-Sent Events** - Real-time token streaming for smooth UX
- 📱 **Responsive Design** - Works on desktop, tablet, and mobile

## 🚀 Quick Start

### 1. Install Dependencies

```bash
pnpm install
```

### 2. Run Development Server

```bash
pnpm dev
```

Open [http://localhost:3001](http://localhost:3001) with your browser.

**Note:** The app currently uses **mock data**. To connect to a real backend, see the integration guide below.

## 📚 Documentation

> **🆕 New Developer?** Start with [DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md) for a quick onboarding checklist.

| Document | Purpose | Audience |
|----------|---------|----------|
| **[DEVELOPER_GUIDE.md](./DEVELOPER_GUIDE.md)** | 🚀 Quick onboarding for new devs | New team members |
| **[BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)** | Complete backend integration guide | Backend developers |
| [lib/README.md](./lib/README.md) | Service layer and React hooks | Frontend developers |
| [COMPONENTS.md](./COMPONENTS.md) | UI component architecture | UI developers |
| [RAG_DOCUMENTATION.md](./RAG_DOCUMENTATION.md) | RAG features and citations | Product/Design team |
| [PAGEINDEX_ANALYSIS.md](./PAGEINDEX_ANALYSIS.md) | PageIndex technical details | Advanced users |
| [examples/backend_pageindex.py](./examples/backend_pageindex.py) | Complete backend code | Backend developers |

## 🔌 Backend Integration (Quick Summary)

1. **Get PageIndex API Key:** [dash.pageindex.ai/api-keys](https://dash.pageindex.ai/api-keys)
2. **Set Up Backend:** Copy `examples/backend_pageindex.py` and add your API key
3. **Configure Frontend:** Create `.env.local` with `NEXT_PUBLIC_API_URL=http://localhost:8000`
4. **Switch to API Mode:** Replace `app/page.tsx` with `app/page-with-api.tsx.example`
5. **Run:** Start backend (`uvicorn main:app --reload`) and frontend (`pnpm dev`)

**Full details:** See [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)

## 🛠 Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript 5, Tailwind CSS v4
- **UI Libraries:** react-markdown, react-syntax-highlighter, vis-network
- **Backend (example):** FastAPI, PageIndex SDK, Python 3.10+
- **Retrieval:** PageIndex (vectorless, reasoning-based RAG)

## 📁 Project Structure

```
my-app/
├── app/
│   ├── page.tsx                    # Main page (currently mock data)
│   ├── page-with-api.tsx.example   # API-integrated version
│   └── layout.tsx                  # Root layout
├── components/
│   ├── chat/                       # ChatWindow, ChatMessage, ChatInput, MarkdownRenderer
│   ├── document/                   # SourceCitation, DocumentViewer
│   ├── layout/                     # Header, Sidebar
│   ├── tree/                       # TreeRenderer (vis-network)
│   └── icons/                      # SVG icons
├── lib/
│   ├── config/                     # API configuration
│   ├── services/                   # API client and RAG service
│   └── hooks/                      # useRAG, useDocuments, useConversations
├── types/
│   ├── api.ts                      # Backend API types
│   └── message.ts                  # Frontend message types
└── examples/
    └── backend_pageindex.py        # Complete backend example

## 🎨 Design Philosophy

**Purple for Branding/Accents Only:**
- Logo badge, New Chat button, Send button
- User message bubbles, AI avatar gradient
- Citation badges, blockquote borders, links

**Neutral Grays for Content:**
- All text (headings, paragraphs, code)
- Borders, backgrounds, secondary UI elements
- Document viewer, source cards

## 🧪 Development

### Run Tests
```bash
pnpm test
```

### Build for Production
```bash
pnpm build
```

### Type Check
```bash
pnpm type-check
```

### Lint
```bash
pnpm lint
```

## 🚢 Deployment

**Frontend (Vercel):**
```bash
vercel deploy
```

**Backend:**
- Railway.app (recommended)
- Heroku, AWS Lambda, Google Cloud Run

See [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md) for deployment details.

## 🎯 Key Features Explained

### RAG with Citations
- Backend returns inline citations: `<doc=file;page=N>`
- Frontend normalizes to: `[1][2][3]`
- Citations are clickable and open the document viewer

### Document Viewer
- Full-screen modal with section navigation
- Highlights relevant text passages
- Shows section title, page range, and summary

### Tree Visualization
- Type "test" in chat to see sample tree
- Interactive vis-network diagram
- Drag to pan, scroll to zoom, hover for details

### Streaming
- Real-time token streaming via SSE
- Tool events (`tool_start`, `tool_result`) for search indicators
- Smooth typing animation

## 📝 License

MIT

## 🤝 Contributing

This is a complete, production-ready template. Feel free to:
- Add authentication (Clerk, Auth0, etc.)
- Connect to your own backend
- Customize the purple theme
- Add new visualization types
- Extend the RAG capabilities

---

**Need help integrating the backend?** Read [BACKEND_INTEGRATION.md](./BACKEND_INTEGRATION.md)
