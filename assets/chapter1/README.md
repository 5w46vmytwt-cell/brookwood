# Chapter 1 media

Add the supplied images here, using these exact filenames:

- `brookwood-farm.png`
- `brookwood-poster.png`
- `brookwood-group.png`

Original narration WAVs live in `audio/narration-01.wav` through
`audio/narration-10.wav`. The separate audio player consumes their absolute
server-clock cue metadata in `chapter1.js`; the visual resolver stays pure.
`audio/brookwood-background.wav` is the persistent looping TV score.
`audio/sfx-camera-shutter.wav` is the only synchronized SFX, at absolute 36000ms.
Both source WAVs are played unchanged; see `CINEMATICS.md` for ducking and
refresh behavior. No additional sounds are played.

Narration script and absolute starts from server startedAt:

| Start ms | Narration |
| --- | --- |
| 5000 | October 31st, 1996. |
| 9000 | Thirty years ago tonight... |
| 12000 | Before Brookwood had streets... before the houses... |
| 16000 | There was only Brookwood Farm. |
| 19000 | That Halloween, the farm opened its doors for something new. |
| 23500 | A haunted house. |
| 27900 | At 9:30 PM, the final group arrived. |
| 31950 | Thirteen friends. |
| 33725 | They took one photograph before going inside. |
| 39000 | It would be the last photograph ever taken of them. |

Visuals keep their own server-timestamp clock; missing images stay black. No
replacement images are included. Reloads resolve the current cue state directly,
including the flash only if the clock falls within its 120ms window. See
`CINEMATICS.md` and `chapter1Timeline` in `chapter1.js` for the cue architecture.

Timeline: 0–4 seconds is the existing opening (now October 31, 1996), including
its fade to black. Chapter 1 then runs for 40 seconds and holds on black. No
server phase changes or Chapter 2 are triggered.
