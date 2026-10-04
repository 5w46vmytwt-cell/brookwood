# Brookwood — The Final Session (Pre-game Lobby)

Manual Vercel package for the existing `project-4c89w` project.

## Routes
- `/tv` — TV lobby / host screen
- `/join` — player phone join/status screen
- Room code: `1031`

## Features
- 12-player cast
- Duplicate-name protection
- Couple/partner pairing
- Private phone status (ALIVE, 3 hearts, partner, inventory, ready)
- TV cast board with partner + readiness
- Host-only Start Final Session and Reset Lobby
- Start requires exactly 12 players, six couples, everyone ready
- Synchronized opening transition on TV and phones
- Redis state key is versioned (`brookwood:1031:v3:state`) so old test state does not carry over

## Vercel / Upstash environment variables
The app accepts either naming convention:
- `KV_REST_API_URL` + `KV_REST_API_TOKEN`
- or `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`

Optional:
- `HOST_KEY` — host password. If absent, prototype fallback is `1031`.

The existing project already has Upstash connected; keep those environment variables in place when replacing the deployment.

## Concurrent state updates

The v3 Redis key is unchanged. Lobby mutations use optimistic locking: a Lua
`EVAL` compares the exact state snapshot and writes the replacement atomically.
Conflicts retry against the latest state, rechecking all lobby rules. Each write
has a unique revision, and reset assigns a new generation. Requests from an old
generation are rejected rather than retried into the new lobby. No process-local
lock is used. Existing v3 data without these fields remains readable.

Redis REST requests have timeouts, and HTTP/Redis errors return a generic 503
response rather than exposing internal diagnostics. Network failures are not
automatically retried because a write may already have committed.

The phone uses one polling loop. TV and phone display connection errors and
recover on subsequent successful polls. QR joining points only to `/join`.

## Checks

Run `npm test` with Node 18 or newer. Tests use an in-memory Redis REST substitute
implementing the Lua compare-and-set contract; they do not contact a live database.
They cover forced overlapping joins, pairing/readiness, stale writes and reads
around reset, fresh-lobby startup, authentication, error handling, polling, and
syntax. Validate the actual Redis/Vercel integration before deployment.
