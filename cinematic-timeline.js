// Locked timing contract only; no Chapter 2 playback or automatic phase transitions.
export const CHAPTER1_START_MS = 0;
export const CHAPTER1_END_MS = 44_000;
export const CHAPTER2_START_MS = 44_000;
export const CHAPTER2_END_MS = 88_000;
export const PHOTO_PROMPT_MS = 86_500;
export const PHOTO_CHECKPOINT_MS = 88_000;

export const CHAPTER2_NARRATION_END_DEADLINE_MS = 85_750;
export const CHAPTER2_PHOTO_SILENCE_MS = 750;

// Final measured timings, in absolute milliseconds from server startedAt.
export const CHAPTER2_NARRATION = Object.freeze([
  Object.freeze({ id: '01', start: 50_500, duration: 3_750, end: 54_250 }),
  Object.freeze({ id: '02', start: 54_400, duration: 4_925, end: 59_325 }),
  Object.freeze({ id: '03', start: 59_425, duration: 2_875, end: 62_300 }),
  Object.freeze({ id: '04', start: 62_400, duration: 2_550, end: 64_950 }),
  Object.freeze({ id: '05', start: 65_100, duration: 3_575, end: 68_675 }),
  Object.freeze({ id: '06', start: 68_875, duration: 1_075, end: 69_950 }),
  Object.freeze({ id: '07', start: 69_950, duration: 750, end: 70_700 }),
  Object.freeze({ id: '08', start: 70_700, duration: 750, end: 71_450 }),
  Object.freeze({ id: '09', start: 71_600, duration: 3_425, end: 75_025 }),
  Object.freeze({ id: '10', start: 75_225, duration: 2_550, end: 77_775 }),
  Object.freeze({ id: '11', start: 77_875, duration: 2_150, end: 80_025 }),
  Object.freeze({ id: '12', start: 80_125, duration: 2_325, end: 82_450 }),
  Object.freeze({ id: '13', start: 82_625, duration: 3_125, end: 85_750 }),
]);
