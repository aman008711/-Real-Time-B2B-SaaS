# Real-Time B2B SaaS Collaboration Workspace

A highly scalable, real-time collaboration platform combining team communication (Slack-like) with document editing (Notion-like). 

This repository uses a split monorepo architecture managed via **npm workspaces** for `/client` and `/server`.

---

## 🛠️ Architecture & Technology Stack

### Backend (`/server`)
* **Core**: Node.js, Express.js, TypeScript
* **Authentication**: JSON Web Tokens (JWT) for stateless sessions, `bcryptjs` for salted password hashing.
* **Architecture**: Interface-driven UserRepository pattern (ready to swap mock data store with SQL/NoSQL databases in subsequent weeks).

### Frontend (`/client`)
* **Core**: React 19, Vite 8, TypeScript
* **Styling**: Tailwind CSS v4 configured via the official `@tailwindcss/vite` compiler plugin.
* **Typography**: Clean, premium Google Font `Outfit`.
* **Routing**: `react-router-dom` with authentication-based route guards for page protection.

---

## 📁 Repository Structure

```
├── client/                 # React 19 + Vite Frontend application
│   ├── src/
│   │   ├── pages/          # Login, Register, and Dashboard UI pages
│   │   ├── services/       # Native fetch client with auto JWT Authorization header inject
│   │   ├── main.tsx        # React entrypoint
│   │   └── index.css       # Tailwind CSS v4 imports & Outfit font styles
│   └── package.json
│
├── server/                 # Express + TypeScript Backend server
│   ├── src/
│   │   ├── controllers/    # Request logic & Zod schema validation inputs
│   │   ├── middleware/     # JWT authentication and Role-Based Access Control (RBAC) guards
│   │   ├── models/         # User domain interfaces and mock in-memory database
│   │   ├── routes/         # Endpoint paths definitions
│   │   └── index.ts        # Server bootstrap script, CORS config & error boundaries
│   └── package.json
│
├── package.json            # Monorepo workspaces settings
└── README.md
```

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js**: `v18.x` or higher
* **npm**: `v9.x` or higher

### 📥 Installation
To install dependencies for the entire project (both client and server) in one step, run from the repository root:
```bash
npm install
```

### ⚙️ Environmental Configuration
Create a `.env` file inside the `/server` directory to configure the environment:
```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_signature_key
```

---

## 🏃 Running the Applications

You can run applications individually or concurrently using workspace scripts.

### Root Workspace Commands (Recommended)
Run these commands from the repository root:
* **Start Server Dev**: `npm run server:dev`
* **Start Client Dev**: `npm run client:dev`

### Individual Project Commands
#### Backend Server
```bash
cd server
npm run dev
```
Runs on `http://localhost:5000`. You can inspect the health check endpoint at `http://localhost:5000/health`.

#### Frontend Client
```bash
cd client
npm run dev
```
Runs on `http://localhost:5173`.

---

## 🏗️ Production Builds

Verify compilation and prepare optimized builds using these commands:
* **Build Server**: `npm run server:build` (Outputs compiled JS inside `server/dist/`)
* **Build Client**: `npm run client:build` (Outputs static bundle inside `client/dist/`)
* **Or Build All**: Run `npm run build` within each subdirectory respectively.

---

## 🧪 Flow Verification

### Week 1 Flow Verification
The system registration, session persistence, role permissions, and route guards were verified successfully:
1. **Route Guard**: Direct access to `http://localhost:5173/` redirects to `/login` without a token.
2. **Registration**: Supports creating accounts with automatic schema validation (via Zod) and role definition (Admin vs Member).
3. **Login**: Authenticates users using hashed credentials, signs a JWT (valid for 7 days), and stores it in `localStorage`.
4. **Dashboard Control**: Displays the sidebar workspace layout, rendering administrative panels (e.g. workspace settings, user management) exclusively for `admin` role members.
5. **Logout**: Safely clears tokens and redirects the browser session to `/login`.

### Week 2 Flow Verification
Workspace navigation, channel selection, and messages rendering were successfully verified:
1. **Workspace Management**: Users can dynamically create new workspaces and list all workspaces they belong to.
2. **Channel-Based Messaging**: Message routing, persistence in MongoDB, and population of sender details are active for default channels (`#general`, `#engineering-sync`, `#design-assets`). Access is protected to ensure only workspace members can read/write messages.
3. **User Profile Display**: Integrated clean serialization (using `.toJSON()`) in the auth controller to reliably display the authenticated user's name, role, and avatar initials in the sidebar footer.
4. **Logout UX Styling**: Redesigned the logout button to utilize a warning-red interface (`bg-red-50 text-red-500 hover:bg-red-100/80`) for enhanced visual affordance.