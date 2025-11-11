# metai-fullstack-interview

## Setup & Local Run Instructions

### Prerequisites

- Python 3.14+ with UV package manager
- Node.js 18+ and npm/pnpm
- PostgreSQL database or Supabase account

### Environment Setup

**Backend** (`/backend/.env`):

```bash
SUPABASE_URL=your_supabase_url
SUPABASE_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

**Frontend** (`/frontend/.env`):

```bash
VITE_API_URL=http://localhost:8000
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Installation & Running

**Backend**:

```bash
cd backend
uv venv
source .venv/bin/activate
uv run fastapi dev
```

**Frontend**:

```bash
cd frontend
pnpm install
pnpm run dev
```

## Architecture & Design Decisions

### Tech Stack

- **Backend**: FastAPI (Python) with Supabase client for database/storage/auth
- **Frontend**: React 19 + TypeScript + Vite, React Query for server state management
- **Database**: PostgreSQL with Row Level Security (RLS) policies
- **Storage**: Supabase Storage (S3-compatible object storage)
- **Authentication**: JWT-based with Supabase Auth (30-minute expiry)

### Key Design Patterns

**Layered Backend Architecture**:

- Clear separation of concerns for maintainability
- Services handle validation, sanitization, and business rules
- Background tasks for thumbnail generation (non-blocking)

**Frontend State Management**:

- React Query for server state (caching, invalidation, optimistic updates)
- Custom hooks encapsulate business logic (useAuth, useFileUpload, useFiles)
- Components remain presentational and composable

**Security-First Approach**:

- RLS policies enforce user data isolation at database level
- Filename sanitization prevents path traversal and XSS attacks
- Pre-signed URLs (1-hour expiry) for secure file downloads
- File size validation (50MB max) and type checking

**Performance Optimizations**:

- Database indexes on `user_id` and `(user_id, uploaded_at DESC)`
- Chunked uploads for large files (5MB chunks for 10-50MB files)
- Background thumbnail generation (100x100px WebP format)
- React Query caching with 5-minute stale time

## Future Improvements

### Authentication & Security

- Implement refresh tokens for persistent sessions
- Add OAuth providers (Google, GitHub)
- Two-factor authentication support

### File Management

- Folder/directory structure with nested navigation
- File sharing with granular permissions (view-only, edit, expiry dates)
- Batch operations (multi-select download, delete, move)
- File versioning with restore capability
- Advanced search and filtering (by type, size range, date range, tags)

### Performance & Scalability

- CDN integration for faster global content delivery
- Server-side compression for large files

### User Experience

- Drag-and-drop folder upload
- File preview for common formats (PDF, images, videos)
- Dark mode theme
- Customizable pagination (items per page)

### Enterprise Features

- Virus/malware scanning integration
- Team workspaces with role-based access control
- Bulk import/export tools
