# Real-Time B2B SaaS Collaboration Workspace

A highly scalable, real-time collaboration platform combining team communication (Slack-like) with document editing (Notion-like). 

This repository utilizes a split monorepo architecture managed via **npm workspaces** for `/client` and `/server`.

---

## 🛠️ Architecture & Technology Stack

### Backend (`/server`)
* **Core Runtime**: Node.js, Express.js, TypeScript
* **Database**: MongoDB (Mongoose schemas, indexing, and validation)
* **Real-time Sync**: Socket.IO v4 (rooms, events, connections)
* **Caching & Scaling**: Redis (profile cache, pub/sub presence, fail-proof fallback in-memory adapters)
* **Security**: `helmet` (HTTP header protection), `bcryptjs` (salted password hashing), `jsonwebtoken` (stateless JWT auth)

### Frontend (`/client`)
* **Core SPA**: React 19, Vite 8 (Rolldown + Oxc compiler), TypeScript
* **Styling**: Tailwind CSS v4 configured via `@tailwindcss/vite`
* **Real-time Gateway**: Socket.IO Client v4
* **Build Optimizations**: `vite-plugin-remove-console` (strips debug console statements during production compilation)

---

## 📁 Repository Structure

```text
├── client/                     # React 19 + Vite Frontend application
│   ├── src/
│   │   ├── pages/              # Login, Register, and Dashboard SPA interfaces
│   │   ├── services/           # Native fetch api clients with auto JWT injection
│   │   ├── types/              # TypeScript definitions for Sockets, Profiles, and Messages
│   │   └── main.tsx            # React bootstrap entrypoint
│   ├── Dockerfile              # Multi-stage production build container (Nginx based)
│   └── nginx.conf              # SPA Client path rewriting fallback proxy
│
├── server/                     # Express + TypeScript Backend server
│   ├── src/
│   │   ├── config/             # DB, Redis, and ENV configuration binders
│   │   ├── controllers/        # Request/Response orchestration & API logic
│   │   ├── middleware/         # Auth filters, error boundaries, RBAC guards
│   │   ├── models/             # Mongoose DB models (User, Workspace, Message)
│   │   ├── routes/             # REST Endpoint paths
│   │   ├── types/              # Socket events interface types & Zod schemas
│   │   └── index.ts            # Server entry launcher
│   └── Dockerfile              # Production runner container (non-root node user configuration)
│
├── docker-compose.yml          # Container orchestration (MongoDB, Redis, Server, Frontend)
├── package.json                # Monorepo workspace configuration
└── README.md
```

---

## 🚀 Getting Started

### 📋 Prerequisites
* **Node.js**: `v18.x` or higher
* **npm**: `v9.x` or higher
* **Docker Desktop**: Recommended for container orchestration.

### 📥 Local Installation
To install dependencies for the entire monorepo in a single step, execute from the repository root:
```bash
npm install
```

### ⚙️ Environment Configuration
Create a `.env` file inside the `/server` directory:
```env
PORT=5000
JWT_SECRET=your_super_secret_jwt_signature_key
MONGO_URI=mongodb://127.0.0.1:27017/slacknotion
CLIENT_ORIGIN=http://localhost:5173
```

---

## 🏃 Running Locally

You can run applications individually or concurrently using workspace commands.

### Monorepo Workspaces Scripts (Recommended)
Run these commands from the repository root:
* **Start Server Dev**: `npm run server:dev` (runs on `http://localhost:5000`)
* **Start Client Dev**: `npm run client:dev` (runs on `http://localhost:5173`)
* **Build Server**: `npm run server:build` (outputs to `/server/dist/`)
* **Build Client**: `npm run client:build` (outputs to `/client/dist/`)

---

## 🐳 Running with Docker Compose

A pre-configured `docker-compose.yml` orchestrates the entire stack (Frontend, Backend, MongoDB, and Redis) with database storage persistence.

### Command to Launch:
Execute this command from the repository root:
```bash
docker-compose up --build
```

### Container Services Configuration:
* **Frontend (`frontend`)**: Serves compiled React assets via Nginx on port `5173`.
* **Backend (`backend`)**: Serves Express API & Socket.IO server on port `5000`.
* **MongoDB (`mongodb`)**: Stores workspaces, messages, threads, and user records. Persisted in `mongodb_data` volume.
* **Redis (`redis`)**: Serves caching requests and presence synchronization. Persisted in `redis_data` volume.

---

## 📡 WebSocket Protocols & Events Dictionary

Communication between clients and servers occurs over WebSockets via Socket.IO.

### Client-to-Server Events (Emitted by Client)

#### 1. `join_channel`
Joins a channel room for workspace messaging.
* **Payload Schema**:
  ```typescript
  {
    workspaceId: string; // ObjectId string representation
    channel: string;      // Channel name, e.g. "general"
  }
  ```

#### 2. `leave_channel`
Leaves a channel room.
* **Payload Schema**: Same as `join_channel`.

#### 3. `send_message`
Emits a new chat message or thread reply.
* **Payload Schema**:
  ```typescript
  {
    workspaceId: string;
    channel: string;
    text: string;
    parentMessageId?: string; // Optional: If provided, marks message as thread reply
  }
  ```

#### 4. `typing_start` / `typing_stop`
Notifies that the user has started or stopped typing in a channel.
* **Payload Schema**:
  ```typescript
  {
    workspaceId: string;
    channel: string;
  }
  ```

#### 5. `toggle_reaction`
Toggles an emoji reaction on a specific message.
* **Payload Schema**:
  ```typescript
  {
    workspaceId: string;
    channel: string;
    messageId: string;
    emoji: string; // Unicode emoji character, e.g. "👍"
  }
  ```

#### 6. `sync_messages`
Requests messages created after a client disconnected to reconcile sync state.
* **Payload Schema**:
  ```typescript
  {
    workspaceId: string;
    channel: string;
    lastMessageCreatedAt: string; // ISO DateTime string
  }
  ```

#### 7. `delete_message`
Deletes a message or reply. Enforces permissions (requires sender ownership or admin roles).
* **Payload Schema**:
  ```typescript
  {
    workspaceId: string;
    channel: string;
    messageId: string;
  }
  ```

---

### Server-to-Client Events (Listened by Client)

#### 1. `message_received`
Broadcasts a new message or reply to members inside the channel room.
* **Payload Schema**:
  ```typescript
  {
    id: string;
    workspaceId: string;
    channel: string;
    text: string;
    senderId: string;
    parentMessageId?: string;
    reactions: { emoji: string; users: string[] }[];
    createdAt: string; // ISO date string
    sender: {
      id: string;
      username: string;
      email: string;
      role: string;
    };
  }
  ```

#### 2. `user_typing`
Broadcasts typing notifications in the channel.
* **Payload Schema**:
  ```typescript
  {
    username: string;
    channel: string;
    isTyping: boolean;
  }
  ```

#### 3. `user_presence`
Broadcasts user online status changes.
* **Payload Schema**:
  ```typescript
  {
    userId: string;
    username: string;
    status: 'online' | 'offline';
  }
  ```

#### 4. `reaction_updated`
Broadcasts updated reactions list on a message.
* **Payload Schema**:
  ```typescript
  {
    messageId: string;
    reactions: { emoji: string; users: string[] }[]; // List of users per emoji
  }
  ```

#### 5. `missed_messages`
Returns the list of messages client missed during offline disconnect.
* **Payload Schema**:
  ```typescript
  {
    channel: string;
    messages: MessagePayload[]; // Array of message objects
  }
  ```

#### 6. `message_deleted`
Broadcasts message removal from feed.
* **Payload Schema**:
  ```typescript
  {
    messageId: string;
  }
  ```

---

## 🔒 Security & Build Optimizations

1. **Helmet HTTP Headers Setup**: Express backend enforces HTTP headers security policies (`app.use(helmet())`) to protect against common web threats.
2. **Production Bundle Log Stripping**: Production builds compiled with Vite 8 discard debug console calls (`console.log`, `console.info`, `console.debug`, `console.trace`) using `vite-plugin-remove-console`, leaving critical error tracking intact.

---

## 🛠️ Contribution & Push Guidelines

Developers working on this repository should adhere to standard workflow rules:

### Git Flow & Commit Rules:
* Work on feature branches branched off `main`.
* Use semantic prefix commit descriptions (e.g. `Feature: <description>`, `UI: <description>`, `Optimization: <description>`, `Testing: <description>`).

### Pushing Code:
Prior to submitting code changes, verify compiler safety locally:
```bash
# Verify client build
npm run client:build

# Verify server build
npm run server:build

# Add, commit, and push
git add .
git commit -m "Semantic prefix: Short descriptive title"
git push origin main
```