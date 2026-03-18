# NāM Events Hub

## What This Is
A self-hosted events management web application for Alex Duffner's NāM community on Koh Phangan, Thailand. Source of truth for all events across Kin Haus, AI Meetup, Island Connection, NāM Space, and external collaborations.

## Tech Stack
- **Framework**: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- **Database**: PostgreSQL 16 via Prisma ORM 7.5
- **Auth**: JWT sessions via `jose` (password-based, env vars)
- **AI**: Vercel AI SDK + OpenAI gpt-4o-mini (description, blurb, tags generation)
- **Drag & Drop**: @dnd-kit/core + @dnd-kit/sortable
- **Deployment**: Docker + Docker Compose on VPS (5.223.42.90)

## Project Structure
```
src/
├── app/
│   ├── api/
│   │   ├── auth/          # login/logout
│   │   ├── ai/            # event, blurb, tags generation
│   │   ├── events/        # public REST API
│   │   ├── venues/        # venue CRUD
│   │   ├── people/        # person CRUD
│   │   ├── preview/       # share token preview
│   │   └── upload/        # image upload
│   ├── dashboard/         # kanban pipeline
│   ├── events/            # create wizard + edit page
│   ├── login/             # auth page
│   └── preview/           # public event preview
├── components/
│   ├── events/            # CreateWizard, EventForm
│   ├── layout/            # Header
│   ├── pipeline/          # Board, Column, EventCard, ComingUp
│   └── logo.tsx           # NāM SVG logo
├── lib/
│   ├── actions.ts         # server actions (CRUD)
│   ├── ai.ts              # AI generation functions
│   ├── auth.ts            # JWT helpers
│   ├── prisma.ts          # Prisma client singleton
│   └── utils.ts           # entity labels, formatters
└── generated/prisma/      # auto-generated Prisma client
```

## Data Models
- **Event** — title, slug, entity, format, stage, dates, venue, description, tags, distributions
- **Venue** — name, address, mapsUrl (reusable across events)
- **Person** — name, email, photo, bio, socials (reusable)
- **EventPerson** — links Person to Event with role (HOST/SPEAKER)
- **Distribution** — tracks where events are promoted (platform + URL + date)

## Entity Types
KIN_HAUS, AI_MEETUP, ISLAND_CONNECTION, NAM_SPACE, EXTERNAL

## Event Pipeline
SEED → BREWING → CONFIRMED → ANNOUNCED → DONE (+ CANCELLED)

## Design System
- **Light mode**: cream (#f5f2e9), white cards, deep green text (#2b3a2c), terracotta accent (#d56b45)
- **Fonts**: Epilogue (display), Sometype Mono (body/UI)
- **Entity colors**: amber (Kin Haus), purple (AI Meetup), green (Island Connection), cyan (NāM Space), gray (External)

## Key Commands
```bash
npm run dev -- -p 8080    # local dev
npm run build             # production build
npx prisma migrate dev    # new migration
npx prisma generate       # regenerate client
npx prisma migrate deploy # apply migrations (production)
```

## Deployment
```bash
# On VPS (5.223.42.90)
ssh root@5.223.42.90
cd /var/www/namevents
bash deploy.sh
```

## Environment Variables
See `.env.example` for local dev, `.env.production.example` for production.

Required: DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD, AUTH_SECRET, NEXT_PUBLIC_APP_URL
Optional: OPENAI_API_KEY (for AI features)

## Conventions
- Server actions in `src/lib/actions.ts`
- AI functions in `src/lib/ai.ts` with Zod schemas
- CSS variables for all colors (defined in globals.css, mapped in @theme inline)
- Entity labels/colors in `src/lib/utils.ts`
- Prisma migrations are manually written SQL (for enum changes)
- All API routes under `/api/` — public ones listed in middleware.ts publicPaths
