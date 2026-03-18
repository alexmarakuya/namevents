# NāM Events Hub

Events management app for the NāM community on Koh Phangan, Thailand.

## Setup

### Prerequisites
- Node.js 20+
- Docker (for PostgreSQL)

### 1. Start the database

```bash
docker compose up -d
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment

```bash
cp .env.example .env
# Edit .env with your credentials
```

### 4. Run migrations and seed

```bash
npx prisma migrate dev
npx prisma db seed
```

### 5. Start the dev server

```bash
npm run dev
```

Open http://localhost:3000 — sign in with the credentials from your `.env` file.

## Public API

Events marked as public are available via REST API:

```bash
# List all public events
curl http://localhost:3000/api/events

# Filter by entity
curl http://localhost:3000/api/events?entity=kin_haus

# Filter by stage
curl http://localhost:3000/api/events?stage=confirmed,announced

# Single event (by ID or slug)
curl http://localhost:3000/api/events/ai-meetup-phangan-3
```

## Tech Stack

- Next.js 16 (App Router) + TypeScript + Tailwind CSS v4
- PostgreSQL + Prisma ORM v7
- JWT auth (jose)
- Drag-and-drop pipeline (dnd-kit)
