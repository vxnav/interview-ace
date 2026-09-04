# InterviewAce Frontend

A modern, clean React frontend for the InterviewAce AI-powered mock interview platform.

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── Button.tsx
│   ├── Input.tsx
│   ├── Card.tsx
│   ├── Messages.tsx    # ErrorMessage, LoadingSpinner
│   ├── Navbar.tsx
│   ├── AuthGuard.tsx
│   └── index.ts
├── context/            # React Context (Auth)
│   └── AuthContext.tsx
├── pages/              # Page components
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx
│   ├── DashboardPage.tsx
│   ├── ResumeUploadPage.tsx
│   ├── StartInterviewPage.tsx
│   ├── InterviewScreen.tsx
│   ├── ResultsPage.tsx
│   └── index.ts
├── services/           # API client
│   └── api.ts
├── types/              # TypeScript types
│   └── api.ts
├── App.tsx            # Main app component with routing
├── main.tsx           # React entry point
├── index.css          # Global styles with Tailwind
└── vite-env.d.ts
```

## Setup

### Prerequisites
- Node.js 16+ and npm

### Installation

1. Install dependencies:
```bash
cd frontend
npm install
```

2. Create `.env.local` (copy from `.env.example`):
```bash
VITE_API_URL=http://localhost:8000
```

3. Start development server:
```bash
npm run dev
```

The app will be available at `http://localhost:5173`

## Development

### Start Dev Server
```bash
npm run dev
```

### Build for Production
```bash
npm run build
```

### Preview Production Build
```bash
npm run preview
```

## Features

- **Authentication**: Login and register with JWT tokens
- **Resume Management**: Upload and manage resumes
- **Interview Setup**: Create interviews with target roles
- **Interactive Interview**: Answer AI-generated questions
- **AI Evaluation**: Get immediate feedback on answers
- **Results**: View comprehensive interview results with scores

## Architecture

### State Management
- React Context API for authentication
- Local component state for forms and interview progress
- localStorage for JWT token persistence

### API Integration
- Centralized API client in `services/api.ts`
- Type-safe API calls using TypeScript
- Error handling with user-friendly messages
- Support for JWT Bearer token authentication

### Styling
- Tailwind CSS for styling
- Minimal, clean design system
- Responsive mobile-first approach
- Subtle animations and transitions

## Key Design Decisions

1. **No Heavy Dependencies**: Uses vanilla React with Context API instead of Redux
2. **Type Safety**: Full TypeScript implementation with API types
3. **Clean UI**: Minimal components, restrained colors, good typography
4. **Error Handling**: User-friendly error messages, not raw API errors
5. **State Reliability**: Interview state persists across page refreshes via localStorage

## Environment Variables

- `VITE_API_URL`: Backend API endpoint (default: http://localhost:8000)

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Mobile Responsive

The app is fully responsive on:
- Desktop (1920px+)
- Laptop (1366px+)
- Tablet (768px+)
- Mobile (375px+)

## Performance

- Vite for fast development and optimized builds
- Tree-shaking of unused code
- Code splitting for routes
- Optimized images and assets

## Notes

- JWT tokens are stored in localStorage
- Backend CORS is configured to allow all origins (should be restricted in production)
- API proxy in vite.config.ts allows calling `/api/*` instead of full URLs
