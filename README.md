# SecureChat – End-to-End Encrypted Chat Application

A private friends-only real-time chat app with end-to-end encryption. The server **never** sees plaintext messages.

## Architecture

```
┌─────────────────┐     WebSocket + REST     ┌──────────────────┐     ┌──────────┐
│   Next.js App   │ ◄──────────────────────► │  Fastify Server  │ ◄──►│ MongoDB  │
│  (Frontend)     │                           │  (Backend API)   │     │          │
│  Port 3000      │                           │  Port 4000       │     │ Port     │
│                 │                           │  + Socket.IO     │     │ 27017    │
└─────────────────┘                           └──────────────────┘     └──────────┘
```

**Key principle:** Encryption keys are generated on the client. The private key never leaves the user's browser. The server only stores public keys and encrypted ciphertext.

## Encryption Flow

1. **Registration:** Client generates an X25519 key pair using `tweetnacl`. The public key is sent to the server; the private key stays in `localStorage`.
2. **Sending a message:** The sender encrypts the plaintext using `nacl.box(message, nonce, recipientPublicKey, senderSecretKey)`, producing ciphertext + a random nonce.
3. **Transmission:** Only `encryptedPayload`, `nonce`, `senderId`, `receiverId`, `conversationId`, and timestamps are sent to the server.
4. **Receiving a message:** The recipient decrypts using `nacl.box.open(ciphertext, nonce, senderPublicKey, recipientSecretKey)`.
5. **Server-side:** The server stores ciphertext only. It is cryptographically impossible for the server to read message content.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 15, TypeScript, Tailwind CSS, shadcn/ui, lucide-react, Zustand |
| Backend | Node.js, Fastify, TypeScript, Mongoose, Socket.IO |
| Database | MongoDB |
| Encryption | tweetnacl (NaCl X25519 + XSalsa20-Poly1305) |
| Auth | JWT (access + refresh tokens), bcrypt |
| Realtime | Socket.IO |
| DevOps | Docker, docker-compose |

## Project Structure

```
├── backend/
│   ├── src/
│   │   ├── config/          # env, db connection
│   │   ├── middleware/       # auth middleware
│   │   ├── models/          # Mongoose schemas
│   │   ├── routes/          # Fastify route handlers
│   │   ├── services/        # Business logic
│   │   ├── socket/          # Socket.IO setup
│   │   ├── utils/           # JWT, errors
│   │   ├── validators/      # Zod schemas
│   │   ├── app.ts           # Fastify app builder
│   │   ├── server.ts        # Entry point
│   │   └── seed.ts          # Test data seeder
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── frontend/
│   ├── src/
│   │   ├── app/             # Next.js App Router pages
│   │   ├── components/      # React components (ui, chat, friends)
│   │   ├── lib/             # api client, crypto, socket, utils
│   │   ├── store/           # Zustand stores
│   │   └── types/           # TypeScript types
│   ├── Dockerfile
│   ├── package.json
│   └── tsconfig.json
├── docker-compose.yml
└── README.md
```

## Local Development Setup

### Prerequisites
- Node.js 20+
- MongoDB (local or Docker)
- npm

### 1. Clone and install

```bash
# Backend
cd backend
cp .env.example .env
npm install

# Frontend
cd ../frontend
cp .env.example .env.local
npm install
```

### 2. Start MongoDB

```bash
# Option A: Docker
docker run -d -p 27017:27017 --name mongo mongo:7

# Option B: Local MongoDB
mongod
```

### 3. Seed test data

```bash
cd backend
npm run seed
```

### 4. Start the servers

```bash
# Terminal 1 - Backend
cd backend
npm run dev

# Terminal 2 - Frontend
cd frontend
npm run dev
```

### 5. Open the app

Visit **http://localhost:3000**

## Docker Compose (Full Stack)

```bash
docker-compose up --build
```

Frontend: http://localhost:3000
Backend API: http://localhost:4000

## Test Users

After running `npm run seed` in the backend:

| User | Email | Password | Notes |
|------|-------|----------|-------|
| alice | alice@example.com | password123 | Friends with Bob |
| bob | bob@example.com | password123 | Friends with Alice |
| charlie | charlie@example.com | password123 | No friends yet |

> **Note:** Test users don't have encryption keys pre-set. On first login, the app generates a key pair and uploads the public key.

## API Endpoints

### Auth
- `POST /api/auth/register` – Register new user
- `POST /api/auth/login` – Login
- `POST /api/auth/refresh` – Refresh tokens
- `POST /api/auth/logout` – Logout
- `GET /api/auth/me` – Get current user

### Users
- `GET /api/users/search?q=` – Search users
- `GET /api/users/profile/:id` – Get user profile

### Friends
- `POST /api/friends/request/:userId` – Send friend request
- `POST /api/friends/request/:requestId/accept` – Accept
- `POST /api/friends/request/:requestId/reject` – Reject
- `DELETE /api/friends/request/:requestId/cancel` – Cancel
- `GET /api/friends/requests/incoming` – Incoming requests
- `GET /api/friends/requests/outgoing` – Outgoing requests
- `GET /api/friends/list` – Friends list

### Conversations
- `POST /api/conversations/direct/:friendId` – Get/create conversation
- `GET /api/conversations` – List conversations
- `GET /api/conversations/:id/messages` – Get messages

### Messages
- `POST /api/messages` – Send encrypted message
- `PATCH /api/messages/:id/delivered` – Mark delivered
- `PATCH /api/messages/:id/read` – Mark read

## Socket Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `users:online` | Server → Client | List of online user IDs on connect |
| `user:online` | Server → Client | User came online |
| `user:offline` | Server → Client | User went offline |
| `message:send` | Client → Server | Send message to recipient |
| `message:new` | Server → Client | New message received |
| `message:delivered` | Bidirectional | Message delivery confirmation |
| `message:read` | Bidirectional | Message read confirmation |
| `typing:start` | Bidirectional | User started typing |
| `typing:stop` | Bidirectional | User stopped typing |

## Security Features

- End-to-end encryption with NaCl (X25519 key exchange + XSalsa20-Poly1305)
- Private keys never leave the client
- Server stores only ciphertext
- JWT with refresh token rotation
- bcrypt password hashing (12 rounds)
- Zod request validation
- CORS configuration
- Rate limiting on all routes
- Helmet security headers
- Auth middleware on protected routes
- Friends-only messaging (enforced server-side)

## Known Limitations & Future Improvements

### Current Limitations
- **Key backup:** If a user clears localStorage, they lose their private key and can't decrypt old messages. Future: key export/import.
- **Multi-device:** Each device generates its own keypair. Messages encrypted for one device can't be read on another. Future: multi-device key sync.
- **Group chat:** MVP is 1-to-1 only. Future: group conversations with shared symmetric keys.
- **Message persistence on decrypt failure:** If the sender's public key changes, old messages can't be decrypted.
- **File sharing:** Text only for MVP. Future: encrypted file/image sharing.
- **Push notifications:** No push notifications. Future: Web Push or mobile integration.
- **Password recovery:** No forgot password flow. Future: email-based reset.

### Future Improvements
- Message search (client-side after decryption)
- Message deletion / disappearing messages
- User blocking
- Group chats with forward secrecy
- Voice/video calls with WebRTC
- Mobile apps (React Native)
- Key backup with passphrase encryption
- Read receipt toggle (privacy option)
- Message reactions
