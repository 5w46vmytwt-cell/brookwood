# Chapter 1 media

Add the supplied images here, using these exact filenames:

- `brookwood-farm.png`
- `brookwood-poster.png`
- `brookwood-group.png`

Optional audio (not supplied or generated):

- `narration.mp3`: one 40-second track starting at Chapter 1 00:00, after the
  four-second opening title. Spoken cues begin at 00:02, 00:05, 00:08, 00:12,
  00:15, 00:19, 00:24, 00:27, 00:29, and 00:35, matching the supplied script.
- `wind.mp3`: quiet looping ambience throughout Chapter 1.
- `creak.mp3`: cue at 00:15.
- `shutter.mp3`: photographic flash cue at 00:32.
- `impact.mp3`: restrained cue at 00:38.

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

Missing media is optional: visuals keep their own server-timestamp clock, missing
images stay black, and missing/blocked audio stays silent. No replacement images
or synthesized narration are included. Reloads seek narration to the current
Chapter 1 offset; past one-shot effects are not replayed. A browser may require a
new user gesture for audio after a reload. The host Start interaction attempts to
unlock audio before the API request. The visual sequence never waits for audio.

Timeline: 0–4 seconds is the existing opening (now October 31, 1996), including
its fade to black. Chapter 1 then runs for 40 seconds and holds on black. No
server phase changes or Chapter 2 are triggered.
