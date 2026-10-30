// Shared opening timings; Chapter 2 content retains its original relative cue spacing.
export const CHAPTER1_START_MS = 0;
export const CHAPTER1_END_MS = 56925;
export const CHAPTER2_START_MS = 56925;
export const CHAPTER2_END_MS = 99925;
export const PHOTO_PROMPT_MS = 98425;
export const PHOTO_CHECKPOINT_MS = 99925;

export const CHAPTER2_NARRATION_END_DEADLINE_MS = 97675;
export const CHAPTER2_PHOTO_SILENCE_MS = 750;

// Final measured timings, in absolute milliseconds from server startedAt.
export const CHAPTER2_NARRATION = Object.freeze([
  Object.freeze({ id: '01', start: 62425, duration: 3_750, end: 66175 }),
  Object.freeze({ id: '02', start: 66325, duration: 4_925, end: 71250 }),
  Object.freeze({ id: '03', start: 71350, duration: 2_875, end: 74225 }),
  Object.freeze({ id: '04', start: 74325, duration: 2_550, end: 76875 }),
  Object.freeze({ id: '05', start: 77025, duration: 3_575, end: 80600 }),
  Object.freeze({ id: '06', start: 80800, duration: 1_075, end: 81875 }),
  Object.freeze({ id: '07', start: 81875, duration: 750, end: 82625 }),
  Object.freeze({ id: '08', start: 82625, duration: 750, end: 83375 }),
  Object.freeze({ id: '09', start: 83525, duration: 3_425, end: 86950 }),
  Object.freeze({ id: '10', start: 87150, duration: 2_550, end: 89700 }),
  Object.freeze({ id: '11', start: 89800, duration: 2_150, end: 91950 }),
  Object.freeze({ id: '12', start: 92050, duration: 2_325, end: 94375 }),
  Object.freeze({ id: '13', start: 94550, duration: 3_125, end: 97675 }),
]);
