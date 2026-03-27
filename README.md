# Linkus

YouTube 플레이리스트를 Spotify 플레이리스트로 자동 동기화하는 웹 서비스.

## How it works

1. Spotify 계정으로 로그인
2. YouTube 플레이리스트 URL을 입력
3. Linkus가 곡을 매칭해 Spotify 플레이리스트를 자동 생성
4. 이후 주기적으로 새 곡을 감지해 자동 동기화

## Tech stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: PostgreSQL on [Neon](https://neon.tech)
- **ORM**: Prisma 7
- **Auth**: NextAuth.js v5 (Spotify OAuth)
- **Styling**: Tailwind CSS v4
- **Hosting**: Vercel (Hobby tier, free)
- **Cron**: Vercel Cron Jobs

## Getting started

### Prerequisites

- Node.js 20+
- A [Spotify Developer](https://developer.spotify.com/dashboard) app
- A [Google Cloud](https://console.cloud.google.com) project with YouTube Data API v3 enabled
- A [Neon](https://neon.tech) PostgreSQL database

### Setup

```bash
# Install dependencies
npm install

# Copy env template and fill in your credentials
cp .env.example .env.local

# Generate Prisma client
npm run db:generate

# Push schema to database
npm run db:push

# Start dev server
npm run dev
```

### Spotify app configuration

In the [Spotify Developer Dashboard](https://developer.spotify.com/dashboard):

1. Create an app
2. Set redirect URI to `http://localhost:3000/api/auth/callback/spotify`
3. Copy Client ID and Client Secret to `.env.local`

> **Note**: In development mode, Spotify allows up to 25 users. To go public, submit an Extension Request.

### YouTube API setup

In [Google Cloud Console](https://console.cloud.google.com):

1. Enable "YouTube Data API v3"
2. Create an API key (no OAuth needed for unlisted playlists)
3. Copy the key to `.env.local`

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run lint` | Run ESLint |
| `npm run typecheck` | Run TypeScript type check |
| `npm run db:generate` | Generate Prisma client |
| `npm run db:push` | Push schema to database |
| `npm run db:studio` | Open Prisma Studio |

## Project structure

```
src/
├── app/
│   ├── page.tsx                    # Landing page
│   ├── dashboard/                  # Dashboard (playlist management)
│   ├── api/
│   │   ├── auth/[...nextauth]/     # Spotify OAuth
│   │   ├── cron/sync/              # Cron job endpoint
│   │   ├── links/                  # Playlist link CRUD
│   │   └── sync/[linkId]/          # Manual sync trigger
│   └── layout.tsx
├── lib/
│   ├── auth.ts                     # NextAuth config
│   ├── db.ts                       # Prisma client
│   ├── youtube.ts                  # YouTube Data API client
│   ├── spotify.ts                  # Spotify Web API client
│   ├── matcher.ts                  # Track matching engine
│   └── sync.ts                     # Sync orchestration
└── components/
    ├── playlist-link-card.tsx
    └── sync-status-badge.tsx
```
