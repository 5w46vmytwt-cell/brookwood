# Halloween 2026 player interface

Local visual review on `feat/halloween-2026-mobile-ui`. No production release.

The player page uses `mobile.css` and `mobile-ui.js`. TV styles and API handlers are unchanged. All existing inline game scripts, controls, IDs, action handlers, polling and phone chapter renderers are retained. The presentation adapter observes their DOM output, highlights native selections, displays a not-submitted hint, and derives connectivity from the browser and existing network error messages. It never makes requests, reads credentials, schedules polling, or confirms a game action.

## Audited player states

| Surface | States and interactions |
| --- | --- |
| Join | Name input, keyboard Enter, duplicate-submit guard, validation/network errors, restored/invalid session |
| Lobby | Player identity, alive/hearts, native partner picker, confirm pairing, paired name, inventory, ready/not-ready, waiting, errors |
| Opening | Existing fullscreen waiting message, phone instructions; shared shell retained |
| Group photograph | Confirm button, in-flight disabled control, server-confirmed status/count, complete, retry |
| Private messages | Locked message, open, intentional black reveal, unread content, read confirmation, read/waiting, refresh |
| Physical package | Native retriever vote, selected/unsubmitted, sending, recorded/waiting, result, selected player's package confirmation |
| Casting | Intro/rules/host wait, role/setup/question, eligible dropdown, private vote, recorded/waiting, winner and final cast |
| Maze | Shared lives, host-ready wait, preparation/memory/answer/result/silence/expired states, token vote, selected retriever, waiting/return/complete |
| Investigation | TV/podcast wait, three-theory dropdown including descriptions, private vote, envelope retriever vote, exclusions reflected by existing renderer, selected/host retrieval wait, complete |
| Chapter 8 | Every existing Chapter 8 phase uses the unchanged watch-TV player state; no phone audio, puzzle controls or host controls |
| Shared | Error banners, offline/reconnecting indicator, native dropdown menu, focus/pressed/disabled/selected/confirmed styling, reduced motion, safe areas, landscape and keyboard layout |

No player room-code input, team chooser separate from partner selection, custom dialog, toast, textarea, radio/checkbox, typed-answer interface or phone countdown is present in the current implementation. No new gameplay controls, chapter counts, future activity names, or timers were introduced. Native select controls keep the operating system's menu. Reusable tokens also style standard textarea/radio/checkbox elements if needed later.

## Review and validation

Run `node --test tests/mobile-ui.test.js` and the relevant phone cases in `tests/client.test.js`. `node scripts/verify-mobile-ui-browser.mjs` runs the actual join page with isolated browser fixture responses (no production access) and captures representative states at 390×844, 412×915 and 320×640. It exercises existing handlers and records overflow/touch-target checks, native dropdown selection, voting confirmation, messages, error/recovery, Chapter 8 waiting, refresh and reduced motion. Screenshots/report are saved to `logs/mobile-ui/` (not committed).

Cross-browser limits: automated rendering uses installed Chromium; iOS Safari, Samsung Internet and Firefox have not been run on physical devices. Native select menus may render outside browser screenshots; the rehearsal captures the open menu where supported and separately verifies actual keyboard selection. Standard HTML/CSS, solid surfaces, system fonts, feature-query fallbacks and reduced-motion rules avoid reliance on platform-specific effects.

### Completed local checks

- New preservation/design checks: 2/2 passed. The original inline gameplay scripts match production baseline `4e14889` exactly after line-ending normalization; all prior control IDs remain.
- Existing targeted player/client checks: 24 passed. One additional case (`phone stays unchanged while TV renders the authoritative aggregate photo checkpoint`, `tests/client.test.js:415`) fails in its TV mock because `BrookwoodTV.chapter7Checkpoints` is missing. Re-running with baseline `4e14889` player HTML reproduced the same failure. No unrelated fixture or TV code was changed.
- Browser: 49 screenshots/layout checks across 390×844, 412×915, 320×640 and 844×390 landscape passed. Native menus were visibly open and keyboard-selectable. Actual join/pair/vote handlers exercised selection, rejected submission, in-flight disabled state, authoritative confirmation, and refresh without rejoining. All existing phone renderers were displayed, including casting, maze, both investigation votes, private messages and Chapter 8 waiting. No horizontal overflow, clipped horizontal controls, sub-44px controls, browser exceptions or phone media elements were found. Reduced-motion styling passed.
- Production build passed: 252 static files; API and browser syntax verified. No full regression suite or cinematic/media rehearsal was run.
- Review images: `logs/mobile-ui/390-welcome.png`, `390-lobby.png`, `390-dropdown-open.png`, `390-voting-selected.png`, `390-message.png`, `390-waiting.png`, `390-reconnecting.png`; corresponding `320-` and `412-` images cover small phones and Android sizing. Full assertions are in `logs/mobile-ui/report.json`.

No implementation gaps remain in the audited current player surfaces. Physical-device cross-browser review remains outstanding. Changes are local and uncommitted; no deployment, production API mutation, media modification or environment change was performed.
