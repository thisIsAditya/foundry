# Mobile frontend architecture (Expo / React Native)

Implements the mobile half of `plan/06-web-and-mobile-experience.md` on Expo SDK 57 (React Native 0.86, React 19.2.3 — see `00-tech-stack-and-versions.md` §4). The system design is identical to web; only the presentation layer differs, per `plan/01-system-architecture.md` §2 ("Experience layer").

## 1. Why Expo managed workflow

- One TypeScript codebase produces iOS and Android builds via EAS Build, with no local Xcode/Android Studio dependency for day-to-day development.
- Expo Router gives file-based routing that mirrors the mental model of Next.js App Router used in `apps/web`, minimizing context-switching for whoever implements both.
- OTA updates (`expo-updates`) allow shipping JS-only fixes (copy, minor logic, non-native-module bugs) without an app-store review cycle — important for a small team's iteration speed.

## 2. Navigation structure

Matches `01-monorepo-and-project-structure.md` §3.

```
(auth)/                 # Unauthenticated stack: sign-in (Google OAuth + "use an access key instead")
(app)/                  # Authenticated tab navigator
  ├── desk              # Founder Desk (mobile next-action view, plan/06 §6)
  ├── evidence           # Evidence Library (capture-first: camera/file picker prominent)
  ├── approvals          # Approval queue (badge count from push/poll)
  ├── pack/[section]      # Pack section browser (read-first; edits deep-link to web for complex forms)
  └── more                # Workspace switcher, settings, provider connections, sign-out
```

Root `_layout.tsx` wraps the navigator in, in order: `SafeAreaProvider` → `ThemeProvider` (tokens from `@foundry/ui-native`) → `AuthProvider` (session/token state) → `TRPCProvider` (see §4) → the Expo Router `Slot`.

## 3. Screen-to-procedure mapping

Identical procedures to `02-web-frontend-architecture.md` §3 — mobile calls the **same tRPC router**, just through a Bearer-token link instead of a cookie link. There is no separate mobile API. Where a screen needs a mobile-specific read shape (e.g., a denormalized "next action" card), that shape is still served by the same procedure (`project.getDeskSummary`) — the procedure returns the general read model and the mobile screen renders a subset, rather than the backend maintaining parallel mobile-only endpoints.

Exception: the initial authentication handshake, which is platform-specific by necessity (see §5).

## 4. tRPC client wiring

```ts
// apps/mobile/lib/trpc.ts
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import type { AppRouter } from '@foundry/api-contracts';
import { authClient } from './auth';

export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: `${API_BASE_URL}/api/trpc`,
      headers() {
        // Better Auth's Expo client stores the session cookie in expo-secure-store;
        // it is attached manually because native fetch does not share a cookie jar
        // with the auth client's own requests.
        const cookie = authClient.getCookie();
        return cookie ? { Cookie: cookie } : {};
      },
      async fetch(url, options) {
        // credentials: 'omit' avoids the duplicate-cookie issue that occurs when
        // native fetch's own cookie handling collides with the manually set header.
        return fetch(url, { ...options, credentials: 'omit' });
      },
    }),
  ],
});
```

Query/mutation hooks are generated the same way as web via `@trpc/tanstack-react-query`, so screen-level code (`useQuery`, `useMutation` call shapes) is nearly copy-identical between `apps/web` and `apps/mobile` — this is the payoff of sharing `packages/api-contracts`.

## 5. Authentication on mobile

Mobile uses **Better Auth's official Expo integration** (`@better-auth/expo` server plugin + `@better-auth/expo/client`'s `expoClient`) rather than a bespoke token system. This is the same Better Auth server (`lib/auth.ts`, `09-authentication-and-security.md` §2) the web app talks to — mobile is just another client of it, not a parallel auth backend.

```ts
// apps/mobile/lib/auth.ts
import { createAuthClient } from 'better-auth/react';
import { expoClient } from '@better-auth/expo/client';
import * as SecureStore from 'expo-secure-store';

export const authClient = createAuthClient({
  baseURL: API_BASE_URL,
  plugins: [
    expoClient({
      scheme: 'foundry',       // apps/mobile/app.config.ts `scheme`
      storagePrefix: 'foundry',
      storage: SecureStore,     // Keychain/Keystore-backed, never AsyncStorage
    }),
  ],
});

export const { useSession, signIn, signOut } = authClient;
```

Flow:

1. Founders sign in with **Google OAuth**: `signIn.social({ provider: 'google' })` opens an in-app browser session (the Expo plugin handles the OAuth redirect and deep-links back into the app via the `foundry://` scheme registered in `trustedOrigins` on the server).
2. Admin/test accounts use the **API-key** path instead, reachable only via a "use an access key instead" link (never shown as a primary option, so it cannot be mistaken for the founder sign-up path): the field calls `POST /api/auth/verify-access-key` once, purely to validate the key and fetch a display name for the welcome screen (`05-api-and-backend-architecture.md` §8). The key itself — not a session token — is then written to `expo-secure-store` and attached as an `x-api-key` header on every subsequent tRPC request; Better Auth's `apiKey` plugin verifies it per-request (`enableSessionForAPIKeys: true`), so there is no separate sign-in call and no session to keep fresh.
3. For the Google OAuth path, the Expo plugin stores the session cookie in `expo-secure-store` and keeps it fresh automatically; there is no separate access/refresh token pair to manage, rotate, or invalidate ourselves.
4. Every tRPC request attaches whichever credential is active — the stored session cookie via `authClient.getCookie()` (§4) for OAuth users, or the stored `x-api-key` value for admin/test users — as the appropriate header. This is the one Expo-specific wrinkle Better Auth's own docs call out for cookies, since native `fetch` does not share a cookie jar with the auth client.
5. Sign-out calls `authClient.signOut()` (OAuth) or simply clears the stored key from `expo-secure-store` (API-key path); both land back on `(auth)/sign-in`.

Because both web and mobile hit the exact same Better Auth server config, there is only one place (`lib/auth.ts` in `apps/web`) that defines session rules, OAuth scopes, and the API-key policy — mobile inherits it for free instead of needing its own `AuthService`.

## 6. Streaming on mobile

React Native's `fetch` does not reliably support incremental `ReadableStream` consumption on all engines the way browsers do. Mobile therefore consumes the same SSE endpoint (`/api/stream/[projectId]`) through `react-native-sse` (a polyfilled `EventSource`) rather than raw `fetch`, decoding the identical `StreamEvent` union from `@foundry/api-contracts` used by web (`02-web-frontend-architecture.md` §6). If connectivity drops, the client reconnects with `Last-Event-ID` and the server replays from Redis (see `07-caching-queues-and-streaming.md` §4) so no events are silently lost.

## 7. Push notifications

- `expo-notifications` registers a push token on sign-in; the token is stored via `notification.registerEndpoint` (mirrors `NotificationEndpoint` entity in `plan/03` §3).
- Server-triggered notification classes (from `plan/06` §12 "notification policy"): approval requested, sprint completed/blocked, artifact ready, budget threshold reached.
- Tapping a notification deep-links via Expo Router's linking config directly to the relevant screen (`approvals`, `sprint/[sprintId]`, `artifact/[artifactId]`) using the same route names as in-app navigation — no separate deep-link route table to maintain.

## 8. File capture and upload

Mobile is the primary capture surface for interview recordings/notes and quick document photos (per `plan/06` "mobile-first principles"):

1. `expo-image-picker` / `expo-document-picker` / `expo-camera` produce a local file URI.
2. Client calls `evidence.createUploadIntent` (same tRPC procedure as web) to get a presigned S3 PUT URL.
3. Client `PUT`s the file bytes directly to S3 (never through the API server), then calls `evidence.confirmUpload`.
4. The ingestion pipeline (`packages/document-intelligence`, run in `apps/worker`) takes over from there — identical to the web upload path described in `plan/01-system-architecture.md` §4 "Document ingestion".

## 9. Offline and low-connectivity behavior

- TanStack Query's cache persists to `expo-secure-store`-backed storage is **not** used (too small/slow for query cache); instead use `@tanstack/query-async-storage-persister` backed by `expo-file-system` for a lightweight offline read cache of the last-seen Founder Desk and Pack summary.
- Mutations attempted while offline are queued client-side with the same idempotency-key pattern as web (`02-web-frontend-architecture.md` §7) and flushed on reconnect; the UI must show a clear "pending — will sync" state rather than silently failing (per `plan/01` reliability rule: "a stale mutation must be rejected or explicitly rebased").
- Approvals and sprint-control actions (approve/reject/pause/stop) are **not** queued offline — they require a live round trip, and the UI disables them with an explicit "reconnect to approve" message, since these are exactly the side-effecting actions the domain layer must validate against the current pack version.

## 10. Native module footprint

Keep the native module surface minimal to keep EAS builds fast and reduce upgrade risk:

| Capability | Module |
|---|---|
| Secure session storage | `expo-secure-store` (used by `@better-auth/expo/client`'s `expoClient`) |
| Push notifications | `expo-notifications` |
| File/camera capture | `expo-image-picker`, `expo-document-picker`, `expo-camera` |
| In-app OAuth browser | `expo-web-browser` (used internally by `@better-auth/expo` for the Google OAuth round trip — the app never opens or manages this browser session directly) |
| Biometric unlock (optional, later) | `expo-local-authentication` |

Do not add a native module outside the Expo SDK unless a feature explicitly requires it (e.g., a future on-device local-model connector) — every Expo SDK module here is guaranteed to work with EAS Build without custom native configuration.

## 11. Parity checklist with web

Before a feature is considered "done" per `plan/06` §11 (responsive parity rules), confirm:

- The same tRPC procedure and read-model type is used on both clients.
- The same status vocabulary (`not started`, `draft`, `evidence required`, …) renders with the same meaning, using shared enum-to-label mapping from `@foundry/domain`.
- The same stream event types drive equivalent (not necessarily pixel-identical) UI feedback.
- Any action available on mobile that requires a large form (e.g., detailed MoneyRules editing) either has a mobile-appropriate simplified form or explicitly deep-links to the web app with a clear "continue on web" affordance — never a silently missing feature.
