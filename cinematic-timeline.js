// Shared opening timings; Chapter 2 content retains its original relative cue spacing.
export const CHAPTER1_START_MS = 0;
export const CHAPTER1_END_MS = 48925;
export const CHAPTER2_START_MS = 48925;
export const CHAPTER2_END_MS = 90925;
export const PHOTO_PROMPT_MS = 89425;
export const PHOTO_CHECKPOINT_MS = 90925;

export const CHAPTER2_NARRATION_END_DEADLINE_MS = 88675;
export const CHAPTER2_PHOTO_SILENCE_MS = 750;

// Final measured timings, in absolute milliseconds from server startedAt.
export const CHAPTER2_NARRATION = Object.freeze([
  Object.freeze({ id: '01', start: 53425, duration: 3_750, end: 57175 }),
  Object.freeze({ id: '02', start: 57325, duration: 4_925, end: 62250 }),
  Object.freeze({ id: '03', start: 62350, duration: 2_875, end: 65225 }),
  Object.freeze({ id: '04', start: 65325, duration: 2_550, end: 67875 }),
  Object.freeze({ id: '05', start: 68025, duration: 3_575, end: 71600 }),
  Object.freeze({ id: '06', start: 71800, duration: 1_075, end: 72875 }),
  Object.freeze({ id: '07', start: 72875, duration: 750, end: 73625 }),
  Object.freeze({ id: '08', start: 73625, duration: 750, end: 74375 }),
  Object.freeze({ id: '09', start: 74525, duration: 3_425, end: 77950 }),
  Object.freeze({ id: '10', start: 78150, duration: 2_550, end: 80700 }),
  Object.freeze({ id: '11', start: 80800, duration: 2_150, end: 82950 }),
  Object.freeze({ id: '12', start: 83050, duration: 2_325, end: 85375 }),
  Object.freeze({ id: '13', start: 85550, duration: 3_125, end: 88675 }),
]);
