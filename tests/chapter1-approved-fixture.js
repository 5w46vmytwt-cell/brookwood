// Frozen approved visual formulas, retained as an independent regression oracle.
  const clamp = value => Math.max(0, Math.min(1, value));
  const fade = (t, start, end) => clamp((t - start) / (end - start));
  const hold = (t, enter, entered, leave, left) => fade(t, enter, entered) * (1 - fade(t, leave, left));
  function frameAt(elapsed) {
    const t = elapsed - 4;
    return {
      chapterTime: t,
      title: elapsed >= 0 && elapsed < 4 ? 1 - fade(elapsed, 3.4, 4) : 0,
      date: hold(t, 2, 3, 8, 9) * (t >= 5 && t < 8 ? .985 + .015 * Math.sin(t * 23) : 1),
      farm: hold(t, 8, 10, 19, 20.2),
      farmScale: 1 + .055 * clamp((t - 8) / 12.2),
      farmLabel: hold(t, 12, 13, 19, 20),
      poster: hold(t, 19, 20.2, 24, 25),
      time: hold(t, 24, 25, 29, 32),
      friends: hold(t, 27, 28, 29, 32),
      flash: t >= 32 && t < 32.12 ? 1 : 0,
      group: t >= 32.12 && t < 40 ? (1 - .55 * fade(t, 35, 38)) * (1 - fade(t, 38, 39)) : 0,
      final: hold(t, 38.7, 39.2, 39.5, 40),
      done: t >= 40
    };
  }


export {frameAt};
