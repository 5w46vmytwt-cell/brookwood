// Relative to the separate authoritative chapter3.startedAt.
export const CHAPTER3_NARRATION_START_MS=3250;
export const CHAPTER3_NARRATION_DURATION_MS=6150;
export const CHAPTER3_VIBRATION_START_MS=14600;
export const CHAPTER3_VIBRATION_DURATION_MS=2450;
export const PRIVATE_MESSAGES_MS=12600;
export const PRIVATE_CHECKPOINT_MS=14600;
export const CHAPTER3_SECOND_NOTIFICATION_MS=CHAPTER3_VIBRATION_START_MS+CHAPTER3_VIBRATION_DURATION_MS+400;
// Both 2.45-second alerts, their natural gap, then one readable second.
export const PRIVATE_MESSAGE_HOLD_END_MS=Math.max(PRIVATE_CHECKPOINT_MS+3000,CHAPTER3_SECOND_NOTIFICATION_MS+CHAPTER3_VIBRATION_DURATION_MS+1000);
export const messageCompletionAt=c=>Math.max(c.completedAt,c.startedAt+PRIVATE_MESSAGE_HOLD_END_MS);
export const chapter3Phases=['chapter3-opening','private-messages','private-messages-complete'];
