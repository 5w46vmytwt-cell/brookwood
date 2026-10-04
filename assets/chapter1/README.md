# Chapter 1 media

Add the supplied images here, using these exact filenames:

- `brookwood-farm.png`
- `brookwood-poster.png`
- `brookwood-group.png`

This version is visual-only. No audio sources are referenced, loaded, or played.
Future narration, ambience, or effect metadata may accompany a timeline cue, but
the visual engine does not interpret or dispatch it.

Narration script and offsets:

| Chapter time | Narration |
| --- | --- |
| 00:02 | October 31st, 1996. |
| 00:05 | Thirty years ago tonight... |
| 00:08 | Before Brookwood had streets... before the houses... |
| 00:12 | There was only Brookwood Farm. |
| 00:15 | That Halloween, the farm opened its doors for something new. |
| 00:19 | A haunted house. |
| 00:24 | At 9:30 PM, the final group arrived. |
| 00:27 | Thirteen friends. |
| 00:29 | They took one photograph before going inside. |
| 00:35 | It would be the last photograph ever taken of them. |

Visuals keep their own server-timestamp clock; missing images stay black. No
replacement images are included. Reloads resolve the current cue state directly,
including the flash only if the clock falls within its 120ms window. See
`CINEMATICS.md` and `chapter1Timeline` in `chapter1.js` for the cue architecture.

Timeline: 0–4 seconds is the existing opening (now October 31, 1996), including
its fade to black. Chapter 1 then runs for 40 seconds and holds on black. No
server phase changes or Chapter 2 are triggered.
