# Chapter 8 - final cinematic sound design

Implementation on feat/chapter8-final-cinematic; the user approved committing and releasing this completed sound integration through the existing GitHub/main/Vercel workflow. Deployment status must be verified separately. This extends the existing finale; the puzzle, lobby, Chapters 1-7, media bytes, authorization, Redis configuration, players and synchronization remain intact. Previously completed persisted runs are not replayed automatically.

## Preserved story

The existing photo checkpoint and seventeen clues are unchanged. Completed-puzzle Continue plays the full reaction, then automatically enters this finale. All sixteen wife clips remain in order, at full volume. Wife-15 introduces the news BEFORE the broadcast; wife-16 starts only AFTER native news completion and its black transition. The unchanged 62.480-second report still confirms Daniel Reeve's lone arrest at the southwest Brandon school construction site. No new explanation or dialogue is added.

## Audio inventory and source selection

All eight requested assets exist and decode in Chrome. WAVs are supported 16/24-bit PCM at 44.1 kHz; MP3 formats were validated from contiguous MPEG frames. Inspection used decoded waveforms/energy envelopes, local speech/non-speech transcription and metadata. The security voice says exactly: Warning. Security breach detected. Garage door open. Non-speech transcription labels are unreliable for effects and were not treated as dialogue. Whistle analysis identifies phrases around source 3-5.6, 7.4-10 and 11.4-15 seconds with real intervening pauses.

| Effect | Actual filename | Full duration (s) | Selected source window (s) |
| --- | --- | --- | --- |
| notification | security-notification.wav | 1.896 | 0.000 - 1.896 |
| alarm | garage-breach.wav | 4.910 | 0.000 - 4.910 |
| announcement | garage-security-voice.mp3 | 4.598 | 0.000 - 4.598 |
| door | interior-door-open.wav | 2.679 | 0.000 - 2.679 |
| whistle | intruder-whistling.wav | 15.943 | 2.800 - 14.200 |
| sirens | police-sirens.mp3 | 31.584 | 0.000 - 20.000 |
| running | running-footsteps.mp3 | 6.060 | 0.350 - 5.350 |
| slam | door-slam.mp3 | 2.520 | 1.150 - 2.520 |
| impact | ch6_sfx_scream.mp3 | 3.312 | 0.200 - 0.850 |
| doorbell | assets/chapter4/audio/doorbell.mp3 | 3.024 | 0.000 - 3.024, twice |

No requested asset is missing or format-unusable. The reused Chapter 6 sound is a scream/sting: only its sharp 0.200-0.850-second excerpt plays at 24%, with a short tail fade. Earlier chapters and that file are unchanged. Running/slam peaks approach full scale, so playback is attenuated rather than destructively normalized. A human rehearsal on the actual party speakers is recommended.

## Final nominal timeline

Times are seconds from finale entry after the puzzle reaction. Nominal total: 334.496 seconds (previously 308.054). Full recordings and news retain native playing/ended gates. Partial effects stop at their selected source boundary through the existing TV frame scheduler and use the same authenticated completion gate. Loading, autoplay recovery and polling can extend actual running time; narration is never compressed or timed out.

| Cue | Nominal start - end (s) | Visual |
| --- | --- | --- |
| handoff | 0.000 - 1.600 | black |
| wife-01 | 1.600 - 30.282 | party |
| wife-02 | 30.282 - 39.269 | party |
| wife-03 | 39.269 - 45.695 | party |
| wife-04 | 45.695 - 58.129 | grid |
| grid-driveway | 58.129 - 59.029 | grid |
| motion-notification | 59.029 - 60.925 | driveway |
| wife-05 | 60.925 - 72.811 | driveway |
| grid-side | 72.811 - 73.711 | grid |
| wife-06 | 73.711 - 89.985 | side |
| grid-backyard | 89.985 - 90.885 | grid |
| wife-07 | 90.885 - 103.006 | backyard |
| grid-porch | 103.006 - 103.906 | grid |
| doorbell-before | 103.906 - 106.930 | porch |
| wife-08 | 106.930 - 117.927 | porch |
| doorbell-after | 117.927 - 120.951 | porch |
| grid-garage | 120.951 - 121.851 | grid |
| garage-alarm-lead | 121.851 - 122.851 | garage |
| garage-announcement | 122.851 - 127.449 | garage |
| garage-alarm-release | 127.449 - 128.449 | garage |
| wife-09 | 128.449 - 140.570 | garage |
| wife-10 | 140.570 - 153.082 | garage |
| wife-11 | 153.082 - 158.803 | garage |
| interior-door | 158.803 - 161.482 | garage |
| whistle-approach | 161.482 - 172.882 | garage -> living at +3.500s |
| living-silence | 172.882 - 176.382 | living |
| intruder-reveal | 176.382 - 177.082 | scare |
| signal-break | 177.082 - 177.932 | lost |
| wife-12 | 177.932 - 182.608 | lost |
| wife-13 | 182.608 - 191.281 | lost |
| escape-running | 191.281 - 196.281 | lost |
| escape-slam | 196.281 - 197.651 | lost |
| escape-settle | 197.651 - 200.151 | living |
| wife-14 | 200.151 - 207.073 | living |
| quiet-after-escape | 207.073 - 209.073 | living |
| wife-15 | 209.073 - 214.872 | news-intro |
| news-black | 214.872 - 215.872 | black |
| breaking-news | 215.872 - 278.352 | news |
| news-out | 278.352 - 279.852 | black |
| wife-16 | 279.852 - 331.496 | party |
| ending | 331.496 - 334.496 | ending |

Additional synchronized layers:

- Alarm: nominal 121.851-128.449. Starts at 30%; security announcement begins approximately one second later at 72%. Alarm ducks smoothly to 7.5%. One finite, owned repeat of its 4.910-second source maintains the bed through the voice, including the source's natural gap. A one-second release fades it out before wife-09. This is not an unmanaged background loop.
- Sirens: nominal 182.608-202.608, anchored to wife-13's persisted native start. Source 0-20 seconds rises from 8% toward 42% over twelve seconds and fades over seconds 16-20. One element continues through running, slam and settling, ending during the early reassurance, well before news.
- Scare sting: nominal 176.382-177.032; source 0.200-0.850 at 24%, ending before the warning. Late refresh cannot replay it.

## Creative sequence

MOTION DETECTED / DRIVEWAY uses the existing CCTV label treatment. Its 1.896-second notification finishes before wife-05. Both full doorbells still bracket wife-08. The alarm and full automated announcement precede wife-09 without competing spoken dialogue.

Wife-09, wife-10 and wife-11 finish on the garage camera. The interior latch/door then has its own clear beat. One whistle element plays source 2.800-14.200 exactly once, retaining every natural pause. It starts distant on the garage feed, switches to the visibly empty living room after 3.500 seconds without seeking/restarting, and grows from 14% toward 80% while its low-pass opens from 1 kHz to 6.5 kHz. The source itself is quiet. No narration or ambience plays over this approach. It cuts abruptly at the selected phrase; no trailing audio is played or filled.

The empty-room image must decode and be visible before its persisted 3.500-second silent deadline is armed. All media are silent. The prepared masked-intruder image and short sting then execute once in an absolute window, followed by existing interference, SIGNAL LOST and wife-12's hide warning. A refresh inside the window continues only the remainder; a refresh afterward cannot replay it.

After the warning, sirens rise beneath wife-13. Five seconds of running follows, immediately followed by one slam/decay, settling and the full wife-14 reassurance. Wife-15, native news completion, wife-16 and the Happy Halloween ending remain intact.

## Engine and recovery

chapter8-sound-design.js borrows BrookwoodAudio.Player's preloaded media and the single TV scheduler. It owns finite layers/filtering with no new timers or RAFs. Nested finale state persists garage/siren anchors; Redis transport/key/configuration and player state are unchanged. Refresh reconstructs source offsets and envelopes, including the finite alarm repeat. Whistle gain and cutoff follow its recording offset.

Only effects receive gain envelopes, ducking or filtering; wife narration and news remain untouched. Puzzle ambience still fades out during handoff. All effects are excluded from silence and news. Exit/reset/replay pauses owned media, discards layers, disconnects/closes the whistle AudioContext and releases view handlers/DOM. Phones never instantiate this TV-only controller.

The existing authenticated ENABLE AUDIO / RESUME action also resumes a blocked filter context/effects. Normal activated playback needs no story clicks. Web Audio suspension waits for recovery rather than silently skipping the whistle. Older TVs without AudioContext retain native whistle/gain playback but cannot provide filtering. Keep the TV foregrounded.

## Files changed in this sound pass

- chapter8-sound-design.js: source windows, finite layers, envelopes and filtering.
- chapter8-finale-timing.js and chapter8-finale.js: new canonical cues, same-element playback, camera switch, recovery and cleanup.
- api/_chapter8-finale.js: sound anchors/validation only, with shared Redis logic untouched.
- scripts/measure-chapter8-finale.mjs and chapter8-finale-media.json: 35 media references, measured formats/lengths/SHA-256, including eight new effects and reused sting.
- tests/chapter8-sound-design.test.js, tests/chapter8-finale.test.js, tests/chapter8-finale-view.test.js and scripts/verify-chapter8-finale-browser.mjs: timing, bounds, voice order, continuity, fades, refresh and browser checks.
- This document. Earlier working-tree finale integration remains uncommitted.

## Local preview

Run npm run dev, open http://127.0.0.1:3000/tv, press Ctrl+Shift+C, authenticate and choose CHAPTER 8 - FINAL CINEMATIC. EMPTY ROOM / SCARE and FINAL NEWS entries remain available; the full finale entry is needed to hear the complete approach. No production game is started or reset.

node scripts/verify-chapter8-finale-browser.mjs --built rehearses the built TV plus silent phone against the isolated-memory server. It records all native narration/effect events, whistle volume/filter/camera continuity, alarm ducking, silent deadline, one scare, full news and wife-16. Refreshes occur during narration, silence and news. Reports/screenshots stay under ignored logs/.

## Final local validation

- Chapter 8 focused tests: 51/51 passed; combined Chapter 7/8 regressions: 140/140 passed.
- Full npm test: 608 passed, 16 failed (624 total). The exact same sixteen historical TV-mock failure names were reproduced using unchanged HEAD tv.html. Those existing mocks lack chapter7Checkpoints/document.body. No new failures were introduced or historical tests rewritten.
- Production build passed: 232 static files; native API/browser syntax and asset imports verified.
- Built-TV full-speed browser rehearsal passed all 41 cues, all sixteen full-volume wife narration completions, both original doorbells, all new sound effects and one sting/scare. Recorded alarm-to-announcement separation was 1216 ms; running-to-slam separation was 5058 ms. Whistle source positions increased continuously from 2.800 to 14.163 seconds across the camera switch, gain rose from 0.14 to 0.80, filtering opened to 6500 Hz and no second whistle playback occurred. The initial filter node starts at its native 350-Hz default before the first scheduler update approaches the configured 1-kHz starting cutoff.
- The silent hold remained exactly 3500 persisted milliseconds across refresh. Native news duration/completion was 62.480 seconds; wife-16 followed it. Refreshes during wife-06, silence and news recovered correctly. Twelve player identities were preserved; phones created no audio; browser exceptions: zero.
- git diff --check passed. No production requests, Redis writes/resets, environment changes, commits, pushes or deployments were performed. The unrelated untracked Chapter 1 narration remains untouched.
- Remaining limitations: existing sixteen baseline mock failures, browser audio activation/foreground requirements, older-TV filtering fallback and the need for a human mix rehearsal on the actual speakers.
