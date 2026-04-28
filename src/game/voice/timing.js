import {
  ANSWER_FEEDBACK_DELAY_BASE_MS,
  ANSWER_FEEDBACK_DELAY_MAX_MS,
  ANSWER_FEEDBACK_DELAY_MIN_MS,
  ANSWER_FEEDBACK_DELAY_PER_CHAR_MS,
  VOICE_BLOCKING_MIN_SETTLE_MS,
  VOICE_PROMPT_LOCK_BASE_MS,
  VOICE_PROMPT_LOCK_MAX_MS,
  VOICE_PROMPT_LOCK_MIN_MS,
  VOICE_PROMPT_LOCK_PER_CHAR_MS,
} from '../config';
import { EVENT_TYPES } from './contract';

const clamp = (value, min, max) => Math.min(Math.max(value, min), max);

export const estimatePhraseDurationMs = (
  phrase,
  {
    baseMs,
    perCharMs,
    minMs,
    maxMs,
  }
) => {
  const normalizedPhrase = typeof phrase === 'string' ? phrase.trim() : '';
  return clamp(baseMs + normalizedPhrase.length * perCharMs, minMs, maxMs);
};

export const getPromptVoiceDurationMs = (phrase) =>
  estimatePhraseDurationMs(phrase, {
    baseMs: VOICE_PROMPT_LOCK_BASE_MS,
    perCharMs: VOICE_PROMPT_LOCK_PER_CHAR_MS,
    minMs: VOICE_PROMPT_LOCK_MIN_MS,
    maxMs: VOICE_PROMPT_LOCK_MAX_MS,
  });

export const getAnswerFeedbackVoiceDurationMs = (phrase) =>
  estimatePhraseDurationMs(phrase, {
    baseMs: ANSWER_FEEDBACK_DELAY_BASE_MS,
    perCharMs: ANSWER_FEEDBACK_DELAY_PER_CHAR_MS,
    minMs: ANSWER_FEEDBACK_DELAY_MIN_MS,
    maxMs: ANSWER_FEEDBACK_DELAY_MAX_MS,
  });

export const getVoiceEventSettleDelayMs = (event) => {
  const payload = event && event.payload && typeof event.payload === 'object'
    ? event.payload
    : {};
  const phrase = typeof payload.phrase === 'string' ? payload.phrase : '';

  if (event && event.eventType === EVENT_TYPES.ANSWER_RESULT) {
    return getAnswerFeedbackVoiceDurationMs(phrase);
  }

  if (event && event.eventType === EVENT_TYPES.GAME_STARTED) {
    return getPromptVoiceDurationMs(phrase);
  }

  return VOICE_BLOCKING_MIN_SETTLE_MS;
};
