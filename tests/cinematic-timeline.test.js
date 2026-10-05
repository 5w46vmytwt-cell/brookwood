import test from 'node:test';
import assert from 'node:assert/strict';
import {
  CHAPTER1_START_MS, CHAPTER1_END_MS, CHAPTER2_START_MS, CHAPTER2_END_MS,
  PHOTO_PROMPT_MS, PHOTO_CHECKPOINT_MS, CHAPTER2_NARRATION_END_DEADLINE_MS,
  CHAPTER2_PHOTO_SILENCE_MS, CHAPTER2_NARRATION,
} from '../cinematic-timeline.js';

test('timeline: chapter, photo, and narration deadline boundaries remain locked', () => {
  assert.equal(CHAPTER1_START_MS, 0);
  assert.equal(CHAPTER1_END_MS, 44_000);
  assert.equal(CHAPTER2_START_MS, 44_000);
  assert.equal(CHAPTER2_END_MS, 88_000);
  assert.equal(PHOTO_PROMPT_MS, 86_500);
  assert.equal(PHOTO_CHECKPOINT_MS, 88_000);
  assert.equal(CHAPTER2_NARRATION_END_DEADLINE_MS, 85_750);
  assert.equal(CHAPTER2_PHOTO_SILENCE_MS, 750);
  assert.equal(PHOTO_CHECKPOINT_MS, CHAPTER2_END_MS);
});

test('timeline: all 13 measured narration entries and their order remain locked', () => {
  assert.equal(CHAPTER2_NARRATION.length, 13);
  assert.deepEqual(CHAPTER2_NARRATION.map(clip => clip.id), [
    '01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13',
  ]);
  assert.deepEqual(CHAPTER2_NARRATION, [
  { id: '01', start: 50_500, duration: 3_750, end: 54_250 },
  { id: '02', start: 54_400, duration: 4_925, end: 59_325 },
  { id: '03', start: 59_425, duration: 2_875, end: 62_300 },
  { id: '04', start: 62_400, duration: 2_550, end: 64_950 },
  { id: '05', start: 65_100, duration: 3_575, end: 68_675 },
  { id: '06', start: 68_875, duration: 1_075, end: 69_950 },
  { id: '07', start: 69_950, duration: 750, end: 70_700 },
  { id: '08', start: 70_700, duration: 750, end: 71_450 },
  { id: '09', start: 71_600, duration: 3_425, end: 75_025 },
  { id: '10', start: 75_225, duration: 2_550, end: 77_775 },
  { id: '11', start: 77_875, duration: 2_150, end: 80_025 },
  { id: '12', start: 80_125, duration: 2_325, end: 82_450 },
  { id: '13', start: 82_625, duration: 3_125, end: 85_750 },
  ]);
});

test('timeline: narration is frozen, internally consistent, ordered, and nonoverlapping', () => {
  assert(Object.isFrozen(CHAPTER2_NARRATION));
  for (const [index, clip] of CHAPTER2_NARRATION.entries()) {
    assert(Object.isFrozen(clip), `clip ${clip.id} must be frozen`);
    assert.equal(clip.start + clip.duration, clip.end, `clip ${clip.id} duration`);
    assert(clip.start >= CHAPTER2_START_MS);
    assert(clip.end <= CHAPTER2_END_MS);
    if (index > 0) {
      const previous = CHAPTER2_NARRATION[index - 1];
      assert(previous.start <= clip.start, `clip ${clip.id} start order`);
      assert(previous.end <= clip.start, `clip ${clip.id} must not overlap`);
    }
  }
});

test('timeline: clips 06, 07, and 08 preserve intentional zero-gap transitions', () => {
  assert.equal(CHAPTER2_NARRATION[5].end, 69_950);
  assert.equal(CHAPTER2_NARRATION[6].start, 69_950);
  assert.equal(CHAPTER2_NARRATION[5].end, CHAPTER2_NARRATION[6].start);
  assert.equal(CHAPTER2_NARRATION[6].end, 70_700);
  assert.equal(CHAPTER2_NARRATION[7].start, 70_700);
  assert.equal(CHAPTER2_NARRATION[6].end, CHAPTER2_NARRATION[7].start);
});

test('timeline: clip 13 meets the deadline with exactly 750 ms before the photo prompt', () => {
  const finalClip = CHAPTER2_NARRATION[12];
  assert.equal(finalClip.start, 82_625);
  assert.equal(finalClip.duration, 3_125);
  assert.equal(finalClip.end, 85_750);
  assert.equal(finalClip.end, CHAPTER2_NARRATION_END_DEADLINE_MS);
  assert.equal(PHOTO_PROMPT_MS - finalClip.end, 750);
  assert.equal(PHOTO_PROMPT_MS - CHAPTER2_NARRATION_END_DEADLINE_MS,
    CHAPTER2_PHOTO_SILENCE_MS);
  assert(finalClip.end < PHOTO_PROMPT_MS);
});
