# Collaborative Task Manager

A real-time collaborative task management application with private and shared task lists. Built with a horizontally scalable backend cluster using Nginx load balancing, Redis Pub/Sub for cross-node sync, and JWT authentication.

---

## Features

- **Private task lists** — each user has their own personal lists
- **Shared task lists** — invite colleagues by username; all members can add, edit, and complete tasks
- **Real-time sync** — changes propagate instantly via Socket.io + Redis Pub/Sub
- **User search & invite** — search users by username to share lists with them
- **Task management** — create, edit inline, toggle completion, delete
- **Member management** — list owners can remove members

---

## Architecture

```
Browser ──▶ Nginx (port 80)
                │
          ┌─────┴─────┐
          │           │
    Node App 1   Node App 2
    (port 3000)  (port 3000)
          │           │
          ├── Redis ──┘  (Pub/Sub cross-node sync)
          │
      PostgreSQL
```

- **Nginx** — edge load balancer, round-robins HTTP + WebSocket traffic
- **Node.js** — stateless Express servers with Socket.io
- **Redis** — Pub/Sub backplane for cross-instance real-time events
- **PostgreSQL** — persistent relational storage

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19, Tailwind CSS 4, Socket.io Client, React Router, Vite |
| Backend | Node.js, Express, Socket.io, JWT, bcrypt |
| Infrastructure | Docker, Docker Compose, Nginx, Redis (Alpine), PostgreSQL 16 |

---

## Getting Started

### Prerequisites
- **Docker Desktop** (for cluster mode)
- **Node.js LTS** (for local dev mode)

### Option A: Docker Cluster (production-like)

```bash
docker compose down -v
docker compose up --build
```

This spins up:
- 2 Node.js app instances behind Nginx on port 80
- Redis for real-time sync
- PostgreSQL 16 with auto-schema initialization

### Option B: Local Dev Mode

**1. Start PostgreSQL** locally and create the database from `.env`:
```bash
createdb world
psql -U postgres -d world -f init.sql
```

**2. Start the backend:**
```bash
npm install
cp .env.example .env   # edit credentials
node index.js          # runs on port 3000
```

**3. Start the frontend (separate terminal):**
```bash
cd frontend
npm install
npm run dev            # runs on port 5173, proxies API to :3000
```

---

## Environment Variables

| Variable | Description |
|----------|-------------|
| `POSTGRES_USER` | PostgreSQL user |
| `POSTGRES_PASSWORD` | PostgreSQL password |
| `POSTGRES_DB` | PostgreSQL database name |
| `JWT_SECRET` | Secret key for signing JWT tokens |
| `NODE_INTERNAL_PORT` | Backend port (default 3000) |
| `REDIS_INTERNAL_PORT` | Redis port (default 6379) |

---

## API Endpoints

### Auth
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/signup` | Register a new user |
| `POST` | `/login` | Login, returns JWT |

### Lists
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/lists` | Get all lists (owned + shared) |
| `POST` | `/lists` | Create a list (`type`: `private` or `shared`) |
| `GET` | `/lists/:id` | Get list with tasks and members |
| `DELETE` | `/lists/:id` | Delete a list (owner only) |
| `POST` | `/lists/:id/share` | Share list with a user by username |
| `DELETE` | `/lists/:id/members/:userId` | Remove a member (owner only) |

### Tasks
| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/lists/:id/tasks` | Add a task to a list |
| `PUT` | `/tasks/:id` | Update task (text, completed) |
| `DELETE` | `/tasks/:id` | Delete a task |

### Users
| Method | Route | Description |
|--------|-------|-------------|
| `GET` | `/users/search?q=` | Search users by username |

---

## Project Structure

```
├── index.js              # Backend server
├── init.sql              # Database schema
├── docker-compose.yml    # Multi-service orchestration
├── Dockerfile            # Node.js container
├── nginx/
│   └── nginx.conf        # Load balancer config
├── frontend/
│   ├── src/
│   │   ├── api/client.js           # API wrapper with auth
│   │   ├── context/SocketContext.jsx
│   │   ├── pages/AuthPage.jsx      # Login / Signup
│   │   ├── pages/Dashboard.jsx     # Main app layout
│   │   ├── components/Sidebar.jsx  # List sidebar
│   │   ├── components/ListView.jsx # Task list view
│   │   ├── components/TaskItem.jsx # Single task row
│   │   ├── components/CreateListDialog.jsx
│   │   └── components/ShareDialog.jsx
│   └── ...
└── .env
```

---

## Potential Future Enhancements

- Task due dates and priority levels
- Activity log per list (who did what)
- Push notifications / toast alerts
- Dark/light theme toggle
- Mobile responsive sidebar
- TypeScript migration
- Unit and E2E tests
