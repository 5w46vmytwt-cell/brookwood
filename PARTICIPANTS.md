# Participants and test lobbies — October 31, 2026

Normal games require 6–25 independent participants. Real and simulated identities count equally. Registration and test additions use the existing Redis CAS mutation and shared MAX_PLAYERS=25; START separately requires MIN_START_PLAYERS=6 and a locked room. Read validation still accepts smaller historical active sessions, avoiding invalidation of existing saved games. Pairing and readiness remain unnecessary.

## Host test controls

In the TV lobby, sign in with the existing host PIN. Use minus/plus to choose the quantity, then ADD TEST PLAYERS. The host-only feedback shows current participants and remaining slots. Additions preserve all existing identities and tokens, choose unused Test 1A / Test 1B-style names, and allocate independent UUIDs and private tokens. The lobby lock button remains disabled below six participants to avoid locking an undersized room. The selector clamps to remaining slots and disables while submitting, when full, or after locking. Existing 2-real + 10-simulated workflows remain supported, as do 6 or 25 entirely simulated participants.

The existing authenticated host endpoint processes additions; there are no client-only participants or new credentials. A fill carries its generation and request UUID. Its prepared identities survive CAS retries, and persisted testFillId markers make retries idempotent without extra Redis keys. Reset invalidates stale fill requests. Capacity is checked inside each CAS retry, including races with real joins and other additions. Unspecified-count legacy helpers retain their ten-player default; the lobby UI always sends an explicit quantity.

LOCK ROOM and START FINAL SESSION retain their authorization and progression. The five-R reset shortcut and Ctrl+Shift+C shortcut are unchanged. No production session is reset during validation or deployment.

## Messages

The server-only pool has exactly 25 distinct messages. Six existing templates were refined for unsettling house/footstep imagery and to remove partner-dependent or movement instructions. Template IDs are preserved. Existing assigned body/title snapshots are never rewritten or reshuffled. New sessions use the existing crypto.randomInt Fisher–Yates shuffle and assign a subset without replacement; 25 participants receive every template exactly once. Player ID/token checks and opened/read confirmations are unchanged; the browser never imports the template pool.

## Six-player casting

Six unique roles and no-self-voting conflict in the final round of a six-person session: after five winners, the sole remaining candidate cannot vote for anyone else. Fresh casting runs store eligibilityVersion 2. Voters without a legal non-self candidate abstain; the other five still submit real ballots. The candidate's phone explains that the other players are voting and hides the submit action. Counts use the actual voter quorum. No self-ballot, duplicate role, automatic role assignment, skipped vote, or altered tie-break is introduced. Groups of seven or more retain their usual electorate and rules.

The existing progression endpoint also recovers an unfinished version-1 six-person final round once. It preserves all five completed roles, ballots, and narration clocks. If the five legal ballots were already recorded, the sole candidate wins from those actual ballots and the normal result hold begins at finalization. Other saved results are not migrated or changed. The TV requests this recovery through its existing scheduler/polling path.

Maze and cast-review checkpoints now accept six participants and construct legal five-ballot final rounds rather than fabricating a self-vote. The Maze simulated-vote helper supports all-simulated rooms; mixed rooms still wait for real ballots. Physical retriever exclusions, group lives, all five timers, photo host confirmation, Chapter 7 elections, puzzle rules, and Chapter 8 media remain unchanged.

## Focused validation

- 35 core focused tests plus one existing phone-casting regression passed: 6 simulated; 2 real + 4 simulated; 6 real; 2 real + 10 simulated; 2 real + 18 simulated; 2 real + 23 simulated; 25 simulated; 26th-player rejection; additive and concurrent fills; repeated-request idempotency; reset fencing; old message snapshots; six-player recovery; authentication; unchanged reset shortcut.
- The seven complete state-flow scenarios advance authoritative media gates with an isolated clock through photo, private messages, package voting, all casting rounds, all Maze games, retriever selection/return, Chapter 7 envelope/photo, Chapter 8 puzzle, finale and terminal completion. This does not replay the full media library or touch production Redis.
- Existing focused coverage verifies casting image/overlay preservation, the audio-completion allowance, all five START timers, short wife introduction and FINAL10 credits compatibility.
- Browser rehearsal: host-only quantity UI, additive fills to 25, mobile/720p/1080p layout without overflow or button overlap, real-phone token recovery, lock/start, automatic recovery of the six-person final cast, no self-vote, silent phones and no browser exceptions. Report: logs/participants-25-browser.json. Screenshots: logs/ch8-25-player-lobby-{1920,1280,390}.png.
- Production build and read-only deployment checks follow validation. No media, Redis configuration, environment values, production sessions, reset shortcuts, or cinematic timings are changed.
