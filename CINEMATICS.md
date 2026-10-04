# TV cinematic architecture

`cinematic-engine.js` resolves a declarative timeline and renders its layers.
`chapter1.js` contains `chapter1Timeline`, including the four-second opening and
the historical sequence. `tv.html` supplies server state and owns the existing
overlay/lobby flow. `chapter1.css` remains unchanged.

All `at`, `end`, fade ranges, and movement ranges are absolute milliseconds from
server `startedAt`. Cue windows are inclusive at start and exclusive at end.
Linear opacity ramps multiply together; flicker and darkening are deterministic
modifiers. Images/text are bound once to the existing DOM. Each animation frame
resolves `Date.now() - startedAt`; state polling cannot restart a transition or
add another animation loop. The flash is simply the 36000–36120ms visual window.

To define another chapter, supply its own `id`, `end`, optional `sections`, and
`cues` to `BrookwoodTimeline.Renderer`. Each cue groups its timing, type, visual
target, asset/text, and transitions together. Optional future metadata can live
on that same cue; fields without visual implementations are ignored. No audio,
phone events, or game events are implemented or dispatched in this version.

Approved regression formulas are frozen in
`tests/chapter1-approved-fixture.js`. Tests compare every visual property at every
millisecond, including additional fractional boundary samples. The existing
seconds-based `frameAt`/`Cinematic` adapters remain for regression-test continuity;
the TV uses the reusable engine directly.
