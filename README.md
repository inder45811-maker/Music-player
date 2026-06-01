# Resonate — Social Music Player & Playlist Management

A unified **social music player** built with **SvelteKit + TypeScript + Prisma/PostgreSQL**.
Users link their **Spotify, SoundCloud, YouTube and Apple Music** accounts, post the
music/videos they love into an **Instagram-style feed**, and follow, like, share
and discover across an integrated social graph.

> This repository is a production-oriented blueprint. External provider
> integrations (player SDKs, OAuth apps) require real API credentials — see
> `.env.example`.

---

## 1. Tech stack

| Concern        | Choice                                                            |
| -------------- | ----------------------------------------------------------------- |
| Framework      | SvelteKit 2 (server `load`, form actions, `+server.ts` endpoints) |
| Language       | TypeScript (strict)                                               |
| Database       | PostgreSQL via Prisma                                             |
| Auth           | Email/password (Argon2id) + Sign-in with Google / Apple           |
| Music APIs     | Spotify, SoundCloud, YouTube Data API v3, Apple MusicKit          |
| Deploy adapter | `@sveltejs/adapter-node`                                          |

---

## 2. Project layout

```
prisma/
  schema.prisma                # Full relational schema (see §3)
src/
  hooks.server.ts              # Session auth, CSRF guard, security headers
  app.d.ts                     # Typed App.Locals (user/session)
  lib/
    types.ts                   # Client/server DTOs (no secrets)
    stores/                    # Svelte stores: player, feed, notifications
    components/                # UnifiedMediaPlayer, Feed, FeedPost, …
    server/                    # Server-only modules (never bundled to client)
      db.ts                    #   Prisma singleton
      crypto.ts                #   tokens, hashing, AES-GCM token vault, HMAC
      password.ts              #   Argon2id hashing + policy
      session.ts               #   opaque-token sessions (hash-at-rest)
      privacy.ts               #   block + visibility matrix enforcement
      posts.ts                 #   feed assembly + DTO serialization
      hashtags.ts              #   hashtag/mention parsing + linking
      notifications.ts         #   notification engine
      search.ts                #   internal + external unified search
      email.ts                 #   verification / reset transport
      guard.ts                 #   requireUser / requireVerified helpers
      oauth/
        providers.ts           #   music provider OAuth config (secrets server-side)
        proxy.ts               #   music account federation proxy
        social.ts              #   Google/Apple login
  routes/
    +layout.svelte             # Nav + persistent player + notification poller
    +page.server.ts            # SSR feed (privacy filtered)
    auth/                      # login / register pages
    u/[username]/              # profile + relationship management
    settings/connections/      # link music accounts
    notifications/             # notification center
    api/                       # all JSON + OAuth endpoints
```

---

## 3. Database schema (highlights)

See [`prisma/schema.prisma`](prisma/schema.prisma) for the fully-commented source.

- **User** — credentials, profile, and a **granular privacy matrix**
  (`profileVisibility`, `postVisibility`, `activityVisibility`, `isPrivate`).
- **SocialAccount / MusicAccount** — federated identities; music tokens are
  **AES-256-GCM encrypted at rest**. Client secrets never persist here.
- **Session / VerificationToken** — only **SHA-256 hashes** of tokens are stored.
- **Follow** — directed edge with `@@unique([followerId, followingId])` and
  `acceptedAt` for private-account follow requests.
- **Block** — severs visibility/interaction in both directions.
- **Post / Hashtag / PostHashtag** — media-centric posts + a hashtag system.
- **Like** — `@@unique([userId, postId])` enforces **one like per user**.
- **Share** — a **fully relational, append-only ledger**: every share action is
  a row carrying `destination`, `campaign`, `surface`, `postAuthorId`,
  `sessionRef` and `metadata` for deep marketing/influencer analytics.
  **Deliberately not a counter.**
- **Notification** — social events for the notification engine.

---

## 4. Security model

- **Secrets isolation** — provider **client secrets** are read only from
  `$env/static/private` inside `src/lib/server/**` and never reach the browser
  bundle. All music auth flows route through the **backend OAuth proxy**.
- **Sessions** — opaque 256-bit cookie tokens; DB stores only the hash.
  `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- **Passwords** — Argon2id (memory-hard) + strength policy; login uses a
  constant-time path to resist account enumeration.
- **CSRF** — SvelteKit origin checking for forms + a `csrfGuard` hook for JSON
  mutations.
- **CORS / headers** — strict CSP allow-listing only the required player SDK
  origins, plus HSTS, `nosniff`, `X-Frame-Options`, `Referrer-Policy`.
- **Data isolation** — every cross-user read funnels through `privacy.ts`
  (`canView`, `isBlockedBetween`) so blocks and visibility levels are enforced
  consistently.
- **Token vault** — provider access/refresh tokens sealed with AES-256-GCM.

---

## 5. Getting started

```bash
cp .env.example .env          # fill in DATABASE_URL, SESSION_SECRET, API creds
npm install
npm run db:migrate            # create the schema
npm run dev                   # http://localhost:5173
```

### Key endpoints

| Method               | Path                              | Purpose                          |
| -------------------- | --------------------------------- | -------------------------------- |
| POST                 | `/api/auth/register` `/login`     | Email/password auth              |
| POST                 | `/api/auth/verify-email`          | Confirm email                    |
| POST                 | `/api/auth/password-reset`        | Request / confirm reset          |
| GET                  | `/api/auth/social/:p/start`       | Google/Apple login               |
| GET                  | `/api/oauth/:p/start` `/callback` | Link a music account (proxy)     |
| GET/POST             | `/api/posts`                      | Feed / create post               |
| POST/DELETE          | `/api/posts/:id/like`             | Like / unlike                    |
| POST                 | `/api/posts/:id/share`            | Record a granular share event    |
| POST/DELETE/PATCH    | `/api/follows`                    | Follow / unfollow / accept       |
| POST/DELETE          | `/api/blocks`                     | Block / unblock                  |
| GET/PATCH            | `/api/notifications`              | Poll / mark read                 |
| GET                  | `/api/search?q=`                  | Unified discovery search         |
| GET                  | `/api/analytics/shares`           | Marketing analytics on shares    |
```
