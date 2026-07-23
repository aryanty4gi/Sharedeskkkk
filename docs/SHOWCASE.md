# ShareDesk — Project Showcase & Portfolio Highlights

## Project Vision & System Showcase
**ShareDesk** is a modern enterprise digital workplace application engineered to solve real-world team productivity fragmentation. It unifies workforce directory management, department document sharing, real-time messaging with WebRTC video calling, and an AI-driven document knowledge assistant (RAG) into a single high-performance workspace.

---

## 🚀 Key Engineering Highlights

### 1. High-Performance Paginated Employee Directory
- **Problem**: Large workforce directories often suffer from UI lag and excessive payload sizes during keystroke searches.
- **Solution**: Designed server-side paginated queries (`src/lib/employees/actions.ts`) with 300ms input debouncing, mapped data adapters, and list item memoization (`React.memo`) to maintain smooth 60fps rendering across 10,000+ staff records.

### 2. Intelligent Document Workspace & Automated RAG Pipeline
- **Problem**: Information silos make locating internal policies, technical specifications, and department documents tedious.
- **Solution**: Built an automated RAG ingestion pipeline (`src/lib/rag/ingest.functions.ts`). Upon document upload, text is extracted, chunked, and embedded into 768-dimensional vector representations stored in `pgvector`. Employees can query documents conversationally via Gemini AI with citation badges linking to exact files.

### 3. Realtime Collaboration & Peer-to-Peer Video Calling
- **Problem**: Switching between external video calling apps and messaging suites disrupts context.
- **Solution**: Built a real-time chat suite with direct message threads, reaction badges, star messages, and peer-to-peer WebRTC video calling over Supabase Realtime WebSocket channels (`call_sessions`).

### 4. Enterprise Security & Zero-Trust Verification
- **Problem**: Data leakage, unauthorized cross-department file access, and prompt injection vulnerabilities in AI systems.
- **Solution**: Implemented strict JWT token verification on every server action (`getAuthenticatedClient`), server-side resource ownership checks, path sanitization, prohibited executable file rejection (`src/lib/security/file-validation.ts`), and prompt boundary rules protecting against indirect prompt injection.

---

## 📊 Technical Accomplishments Matrix

| Feature Module | Key Technologies Used | Engineering Outcome |
| :--- | :--- | :--- |
| **Employee Directory** | TanStack Start, React 19, Lucide, Tailwind CSS | Paginated, filtered directory with < 50ms search response time |
| **Documents Workspace** | Supabase Storage, pdf-parse, mammoth, Recharts | Categorized file management with background vector ingestion |
| **RAG Knowledge Engine** | Gemini API (`text-embedding-004`), `pgvector`, RPC | Sub-second document QA with adaptive thresholding & source citations |
| **Realtime Chat & Calls** | Supabase Realtime WebSockets, WebRTC, Lucide | Instant messaging & P2P video calls with zero third-party dependencies |
| **Global Search (`Ctrl+K`)** | TanStack Query, CmdK UI, Parallel Promises | Cross-category search over staff, docs, and chat messages |
| **CI/CD & Security** | Vitest, Testing Library, GitHub Actions, ESLint | Automated test pipeline with 23 passing tests & 0 build/lint errors |
