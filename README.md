# ShareDesk — Enterprise Digital Workplace & Collaboration Platform

[![ShareDesk CI/CD](https://github.com/aryanty4gi/Sharedeskkkk/actions/workflows/ci.yml/badge.svg)](https://github.com/aryanty4gi/Sharedeskkkk/actions/workflows/ci.yml)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue.svg)](https://www.typescriptlang.org/)
[![React 19](https://img.shields.io/badge/React-19.2-blue.svg)](https://react.dev/)
[![TanStack Start](https://img.shields.io/badge/TanStack%20Start-1.168-orange.svg)](https://tanstack.com/router)
[![Supabase](https://img.shields.io/badge/Supabase-PostgreSQL-green.svg)](https://supabase.com/)
[![License](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

**ShareDesk** is a modern enterprise digital workplace application built for high-performance team collaboration, company employee directory management, department document workspaces, real-time messaging, WebRTC video calling, and an AI knowledge assistant powered by Retrieval-Augmented Generation (RAG) and Google Gemini.

---

## 🌟 Key Features

- 👥 **Enterprise Employee Directory**: Fully paginated employee directory with 300ms debounced search, department/role filters, and interactive profile drawers.
- 📁 **Enterprise Documents Workspace**: Department document storage supporting file search, sort, grid/list view toggles, favorite pinning, and automated background RAG vector ingestion.
- 🤖 **AI Knowledge Engine (RAG + Gemini)**: RAG pipeline powered by Google Gemini and Supabase `pgvector` for querying company documentation with source citations and adaptive thresholding.
- 💬 **Realtime Workspace Chat & WebRTC Video**: Direct messaging, replies, reactions, star messages, and peer-to-peer WebRTC video calling over Supabase Realtime Channels.
- 🔍 **Unified Global Search (`Ctrl+K`)**: Instant search across employees, documents, and chat conversations with category grouping and keyboard navigation.
- 📊 **Enterprise Admin Dashboard**: Real-time KPI analytics metrics, department headcount distributions (`recharts`), recent activity logs, and administrative user management.
- 🔒 **Enterprise Production Security**: Strict JWT auth token validation, role-based access control (RBAC), private storage buckets, path sanitization, prohibited extension checks, and indirect prompt injection mitigations.

---

## 🏗️ Architecture & Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend Framework** | React 19, TanStack Start (SSR), TanStack Router, TanStack React Query |
| **Styling & Components** | Tailwind CSS v4, Lucide Icons, Recharts, Radix UI Primitives |
| **Backend & Database** | Supabase (PostgreSQL, Storage, Auth, Realtime WebSockets) |
| **Vector Database** | PostgreSQL `pgvector` extension |
| **AI Integration** | Google Gemini API (`gemini-flash-latest`, `text-embedding-004`) |
| **Testing & CI/CD** | Vitest, React Testing Library, GitHub Actions CI/CD |

---

## 🛠️ Local Development & Quickstart

### Prerequisites
- **Node.js**: `v20.x` or higher
- **Bun**: `v1.x` or higher
- **Supabase Account**: Connected project with PostgreSQL database

### Environment Setup
Create a `.env` file in the project root:

```env
SUPABASE_PROJECT_ID="your-project-id"
SUPABASE_URL="https://your-project-id.supabase.co"
SUPABASE_PUBLISHABLE_KEY="your-publishable-key"
SUPABASE_SERVICE_ROLE_KEY="your-service-role-key"

VITE_SUPABASE_URL="https://your-project-id.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="your-publishable-key"

GEMINI_API_KEY="your-gemini-api-key"
```

### Installation & Execution

```bash
# 1. Install dependencies
npm install

# 2. Run local development server
npm run dev

# 3. Open browser
http://localhost:3000
```

---

## 🧪 Testing & Code Verification

ShareDesk includes a comprehensive Vitest unit and component test suite.

```bash
# Run unit and component tests
npm run test

# Run test coverage report
npm run test:coverage

# Run TypeScript typecheck
npx tsc --noEmit

# Run ESLint check
npm run lint
```

---

## 📚 Architectural Documentation

For deep technical documentation, view the following docs:
- [Architecture Documentation](docs/ARCHITECTURE.md)
- [Database Schema & RLS Documentation](docs/DATABASE.md)
- [RAG & AI Engine Documentation](docs/RAG.md)
- [GitHub Project Showcase](docs/SHOWCASE.md)
- [Resume & Impact Metrics](docs/RESUME.md)
- [System Design & Interview Kit](docs/INTERVIEW_KIT.md)

---

## 📄 License
MIT License. Built for enterprise workplace collaboration.
