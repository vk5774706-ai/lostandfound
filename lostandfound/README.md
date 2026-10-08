# 🎓 College Lost & Found Portal — Full-Stack (PERN / MERN + Supabase PostgreSQL)

A modern full-stack web application for college campuses to report lost belongings, list found items, handle claim verification, and chat in real-time.

---

## 🏗️ Architecture Overview

The application has been migrated from Firebase to a **full-stack Express + Node.js backend** with **Supabase PostgreSQL** and a **React (Vite) frontend**:

```
lostandfound/
├── server/                      # 🚀 Node.js + Express REST API & WebSocket Server
│   ├── config/supabase.js       # Supabase client SDK initialization & fallback logic
│   ├── database/
│   │   ├── schema.sql           # Complete PostgreSQL schema (tables, indexes, seed data)
│   │   └── db.js                # Unified database data access layer
│   ├── middleware/auth.js       # JWT authentication & session verification
│   ├── routes/
│   │   ├── auth.js              # Register, Login, Google OAuth, /me endpoint
│   │   ├── items.js             # Items CRUD & case resolution
│   │   ├── claims.js            # Claim submission, approvals & notifications
│   │   ├── messages.js          # Live chat messages per claim
│   │   └── resolved.js          # Resolved cases history log
│   ├── server.js                # Express app + Socket.io server
│   ├── .env                     # Server environment variables
│   └── package.json
│
├── lostandfound/                # ⚛️ React 19 + Vite Frontend Client
│   ├── src/
│   │   ├── api/
│   │   │   ├── apiClient.js     # REST API client with JWT bearer auth
│   │   │   └── socket.js        # Socket.io client for real-time messaging
│   │   ├── components/          # Navbar, ChatModal, ItemCard, Layout, etc.
│   │   ├── context/             # AuthContext (JWT) & ThemeContext (Dark/Light)
│   │   └── pages/               # Home, Dashboard, ItemDetails, PostItem, ResolvedItems, Login
│   ├── .env                     # VITE_API_BASE_URL & VITE_SOCKET_URL
│   └── package.json
│
└── README.md                    # Documentation & setup guide
```

---

## ⚡ Quick Start

### 1. Install Dependencies

In the root directory, or in each folder:

```bash
# Terminal 1: Backend
cd server
npm install

# Terminal 2: Frontend
cd lostandfound
npm install
```

### 2. Configure Supabase PostgreSQL (Optional but Recommended)

1. Go to [supabase.com](https://supabase.com) and create a free project.
2. In the Supabase Dashboard, open **SQL Editor**.
3. Copy the entire contents of [`server/database/schema.sql`](file:///c:/Users/musth/Downloads/lostandfound/server/database/schema.sql) and paste it into the SQL Editor, then click **Run**.
4. Go to **Project Settings** ➔ **API**:
   - Copy **Project URL**
   - Copy **Project API Key** (`service_role` or `anon`)
5. Open [`server/.env`](file:///c:/Users/musth/Downloads/lostandfound/server/.env) and set:
   ```env
   PORT=5000
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-supabase-service-role-or-anon-key
   JWT_SECRET=your_super_secret_jwt_key
   ```

> 💡 **Note**: If you don't configure Supabase keys right away, the backend automatically boots in **Local Memory Fallback Mode** with sample seed data so you can test all features instantly without crashes!

### 3. Run the Development Servers

**Run Server (Port 5000):**
```bash
cd server
npm run dev
```

**Run Frontend (Port 5173):**
```bash
cd lostandfound
npm run dev
```

Open your browser at: **`http://localhost:5173`**

---

## 📡 REST API Reference

| Method | Endpoint | Description | Protected |
|---|---|---|---|
| `GET` | `/api/health` | Server health check & DB status | No |
| `POST` | `/api/auth/register` | Register new user (username, email, password) | No |
| `POST` | `/api/auth/login` | Login with email and password | No |
| `POST` | `/api/auth/google` | Google sign-in payload | No |
| `GET` | `/api/auth/me` | Get current logged-in user profile | **Yes (JWT)** |
| `GET` | `/api/items` | List active items (`?tab=all\|lost\|found\|my_posts&category=...&search=...`) | No |
| `GET` | `/api/items/:id` | Get item details by ID | No |
| `POST` | `/api/items` | Create new lost or found item | **Yes (JWT)** |
| `PUT` | `/api/items/:id/resolve` | Mark item as resolved & archive claims | **Yes (JWT)** |
| `POST` | `/api/claims` | Submit claim / contact request to owner | **Yes (JWT)** |
| `GET` | `/api/claims/item/:itemId` | Get claims for an item | **Yes (JWT)** |
| `GET` | `/api/claims/notifications` | Get pending claims for logged-in user | **Yes (JWT)** |
| `PUT` | `/api/claims/:id/status` | Update claim status (`accepted` / `rejected`) | **Yes (JWT)** |
| `GET` | `/api/messages/:claimId` | Get chat messages for an accepted claim | **Yes (JWT)** |
| `POST` | `/api/messages` | Send message in real-time chat | **Yes (JWT)** |
| `GET` | `/api/resolved` | Get history of resolved items | No |

---

## 💬 Real-Time Features (Socket.io)

- **Instant Chat**: Owners and finders can chat inside `ChatModal.jsx` over WebSocket rooms (`claim_${claimId}`).
- **Live Notifications**: New claims trigger immediate red badge updates in `Navbar.jsx` (`user_${userId}`).
- **Live Approval Updates**: When a claim is accepted or declined, the status updates on the claimer's screen without refreshing.
