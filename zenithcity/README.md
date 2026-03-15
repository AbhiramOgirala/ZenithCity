# 🏙️ ZenithCity — Gamified Fitness Platform

> **Transform your workouts into a thriving city empire.** Every rep builds a building. Every km expands your territory. Every week brings new battles for dominance.

---

## ✨ Features

| Feature | Description |
|---|---|
| 🤖 AI Pose Detection | MediaPipe runs on-device at 15+ FPS — no video uploaded |
| 🏗️ City Building | Earn points, construct buildings, upgrade to level 3 |
| 📉 City Decline | 7 days inactive = buildings start decaying (5%/day) |
| 🗺️ GPS Territory | Run/walk to expand territory (50 pts/km, max 10,000 sqm) |
| ⚔️ Territory Battles | Weekly competitions — top 10% win bonus territory |
| 🏆 Leaderboards | Weekly / Monthly / All-time with privacy mode |
| 🔴 Real-time | WebSocket live updates via Socket.io |
| 📊 Dashboard | 12-week charts, city stats, battle countdown |

---

## 🏗️ Tech Stack

### Frontend
- **React 18** + TypeScript + Vite
- **Redux Toolkit** — state management
- **Three.js** + React Three Fiber — 3D city visualization
- **Framer Motion** — animations & transitions
- **Recharts** — data visualization
- **Tailwind CSS** — custom design system (Orbitron + Exo 2 fonts)
- **Socket.io-client** — real-time updates

### Backend
- **Node.js** + Express + TypeScript
- **Supabase** (PostgreSQL 14) — primary database
- **Redis 7** — leaderboard caching (falls back to in-memory)
- **Socket.io** — WebSocket server
- **JWT** — authentication
- **bcryptjs** — password hashing

### Infrastructure
- **Docker** + docker-compose
- **Nginx** — frontend serving + reverse proxy

---

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- A [Supabase](https://supabase.com) project (free tier works)
- Redis (optional — auto-falls back to in-memory)

### 1. Clone & Configure

```bash
git clone <repo>
cd zenithcity
cp .env.example .env
# Edit .env with your Supabase URL and keys
```

### 2. Set Up Database

Go to your Supabase project → SQL Editor → run the schema from:
```
backend/src/config/database.ts  (DB_SCHEMA constant)
```

Or use the Supabase CLI:
```bash
supabase db execute --file backend/src/config/database.ts
```

### 3. Install & Run (Development)

**Backend:**
```bash
cd backend
npm install
cp .env.example .env  # fill in values
npm run dev
# Runs on http://localhost:3001
```

**Frontend:**
```bash
cd frontend
npm install
npm run dev
# Runs on http://localhost:5173
```

### 4. Docker (Production)

```bash
# Copy and fill .env
cp .env.example .env

# Build and start all services
docker-compose up --build

# App available at http://localhost
```

---

## 📁 Project Structure

```
zenithcity/
├── backend/
│   ├── src/
│   │   ├── config/
│   │   │   ├── database.ts     # Supabase client + DB schema SQL
│   │   │   └── redis.ts        # Redis with in-memory fallback
│   │   ├── jobs/
│   │   │   └── cityDecline.ts  # Scheduled city health decay
│   │   ├── middleware/
│   │   │   └── auth.ts         # JWT middleware
│   │   ├── routes/
│   │   │   ├── auth.ts         # POST /register /login  GET/PUT /profile
│   │   │   ├── workouts.ts     # POST /start  PUT /:id/complete  GET /history
│   │   │   ├── cities.ts       # GET /my-city  POST /buildings  PUT upgrades
│   │   │   ├── leaderboards.ts # GET /:type (all-time|weekly|monthly)
│   │   │   ├── battles.ts      # GET /upcoming  POST /:id/join
│   │   │   ├── points.ts       # GET /balance /transactions
│   │   │   ├── dashboard.ts    # GET / (aggregated stats)
│   │   │   └── feedback.ts     # POST / GET /history (form feedback)
│   │   ├── types/index.ts      # All TypeScript interfaces
│   │   ├── utils/points.ts     # Points formulas + Haversine GPS
│   │   └── index.ts            # Express app + Socket.io server
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Layout.tsx          # Sidebar nav + header
│   │   │   ├── City3D.tsx          # Three.js 3D city renderer
│   │   │   ├── WorkoutHistory.tsx  # Recent sessions list
│   │   │   └── ui/
│   │   │       ├── ToastContainer.tsx
│   │   │       ├── LoadingSpinner.tsx
│   │   │       └── StatCard.tsx
│   │   ├── hooks/
│   │   │   ├── useSocket.ts     # Real-time WebSocket events
│   │   │   └── useAppHooks.ts   # Typed Redux hooks
│   │   ├── pages/
│   │   │   ├── AuthPage.tsx        # Login + Register
│   │   │   ├── DashboardPage.tsx   # Overview + charts
│   │   │   ├── WorkoutPage.tsx     # Start/complete workouts + camera
│   │   │   ├── CityPage.tsx        # 3D city + building management
│   │   │   ├── LeaderboardPage.tsx # Rankings with podium
│   │   │   ├── BattlesPage.tsx     # Territory battles
│   │   │   └── ProfilePage.tsx     # Settings + privacy
│   │   ├── services/
│   │   │   ├── api.ts           # Fetch wrapper with JWT
│   │   │   └── socket.ts        # Socket.io client
│   │   ├── store/
│   │   │   ├── index.ts         # Redux store
│   │   │   └── slices/
│   │   │       ├── authSlice.ts
│   │   │       ├── citySlice.ts
│   │   │       ├── workoutSlice.ts
│   │   │       ├── leaderboardSlice.ts
│   │   │       ├── battleSlice.ts
│   │   │       ├── dashboardSlice.ts
│   │   │       └── uiSlice.ts
│   │   ├── utils/formatters.ts
│   │   ├── index.css            # Tailwind + custom design system
│   │   └── App.tsx
│   ├── tailwind.config.js
│   ├── vite.config.ts
│   └── package.json
│
├── docker-compose.yml
├── .env.example
└── README.md
```

---

## 🔌 API Reference

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create account + initialize city |
| POST | `/api/auth/login` | Get JWT token |
| GET | `/api/auth/profile` | Get user profile |
| PUT | `/api/auth/profile` | Update username/settings |

### Workouts
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/workouts/start` | Begin a workout session |
| PUT | `/api/workouts/:id/complete` | Complete + earn points |
| GET | `/api/workouts/history` | Paginated workout history |
| GET | `/api/workouts/:id` | Session details + GPS + feedback |

### City
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cities/my-city` | City + all buildings |
| POST | `/api/cities/buildings` | Construct building (deducts points) |
| PUT | `/api/cities/buildings/:id/upgrade` | Upgrade building level |
| PUT | `/api/cities/buildings/:id/repair` | Repair damaged building |
| POST | `/api/cities/expand-territory` | Spend points for territory |

### Leaderboards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leaderboards/all-time` | Global all-time rankings |
| GET | `/api/leaderboards/weekly` | Last 7 days |
| GET | `/api/leaderboards/monthly` | Last 30 days |

### Battles
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/battles/upcoming` | All upcoming/active battles |
| GET | `/api/battles/:id` | Battle details + live rankings |
| POST | `/api/battles/:id/join` | Enroll in battle |
| POST | `/api/battles` | Create battle (admin) |

### Points
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/points/balance` | Current balance (Redis cached) |
| GET | `/api/points/transactions` | Transaction history |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard` | All stats in one call |

---

## 🧮 Points Formula

```
Cardio (plank, jumping jack, general cardio):   10 pts/min
Strength (squat, pushup, lunge):                 2 pts/valid rep
GPS (running, walking):                         50 pts/km
Manual mode (no camera):                        70% of above

Building costs:
  House     100 pts  │  Park      300 pts
  Apartment 500 pts  │  Stadium 5,000 pts
  Office  1,000 pts  │

Upgrades: base_cost × 1.5^level (max level 3)
Territory: 1,000 pts = 100 sqm  (max 10,000 sqm)
Repair:    200 pts per damaged building
```

---

## 🌐 WebSocket Events

| Event | Direction | Payload |
|-------|-----------|---------|
| `city:building_complete` | Server→Client | `{ building_type, city }` |
| `city:decline_warning` | Server→Client | — |
| `leaderboard:rank_change` | Server→Client | `{ new_rank }` |
| `battle:rank_update` | Server→Client | `{ rank, battle_id }` |
| `workout:points_update` | Client→Server | `{ userId, points }` |

---

## 🗄️ Database Schema

10 tables: `users`, `cities`, `buildings`, `workout_sessions`, `gps_routes`, `gps_coordinates`, `points_transactions`, `territory_battles`, `battle_participants`, `form_feedback_history`

Full schema SQL is in `backend/src/config/database.ts` → `DB_SCHEMA` constant.

---

## 📐 Architecture Decisions

- **Redis optional** — `cache` abstraction falls back to in-memory `Map` if Redis is unavailable. The app runs fully without Redis (just no distributed caching).
- **AI on-device** — MediaPipe processes camera frames locally. No video data leaves the browser.
- **GPS tracking** — Haversine formula calculates distances from browser Geolocation API coordinates.
- **City decline** — Scheduled job runs every 24h; marks cities inactive after 7 days and reduces building health by 5%/day.
- **Monorepo** — Frontend and backend are separate npm workspaces but share this repository for ease of development.

---

## 🔒 Privacy & Security

- All camera frames processed client-side, deleted after workout
- Anonymous leaderboard mode (toggle in Profile)
- Passwords hashed with bcrypt (12 rounds)
- JWT tokens with 7-day expiry
- Helmet.js security headers on all API responses
- CORS restricted to configured `FRONTEND_URL`

