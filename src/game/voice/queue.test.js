import { GAME_PHASES } from '../states';
import { EVENT_TYPES } from './contract';
import {
  VOICE_QUEUE_MODES,
  enqueueVoiceEventWithPolicy,
  getVoiceEventQueueMode,
  isVoiceEventStale,
} from './queue';

describe('voice queue policy', () => {
  test('stale guard keeps events when game state is temporarily unavailable', () => {
    expect(
      isVoiceEventStale(
        {
          eventType: EVENT_TYPES.QUESTION_PROMPT,
          payload: { phase: GAME_PHASES.QUESTION, questionIndex: 0 },
        },
        null
      )
    ).toBe(false);
  });

  test('classifies voice events by queue mode', () => {
    expect(getVoiceEventQueueMode(EVENT_TYPES.GAME_STARTED)).toBe(VOICE_QUEUE_MODES.BLOCKING);
    expect(getVoiceEventQueueMode(EVENT_TYPES.ANSWER_RESULT)).toBe(VOICE_QUEUE_MODES.BLOCKING);
    expect(getVoiceEventQueueMode(EVENT_TYPES.QUESTION_PROMPT)).toBe(VOICE_QUEUE_MODES.REPLACEABLE);
    expect(getVoiceEventQueueMode(EVENT_TYPES.SCORE_REPORT)).toBe(VOICE_QUEUE_MODES.REPLACEABLE);
    expect(getVoiceEventQueueMode(EVENT_TYPES.RESULT_PROMPT)).toBe(VOICE_QUEUE_MODES.REPLACEABLE);
    expect(getVoiceEventQueueMode(EVENT_TYPES.INVALID_ACTION)).toBe(VOICE_QUEUE_MODES.TRANSIENT);
  });

  test('blocking event drops queued replaceable and transient events', () => {
    const queue = [
      { eventType: EVENT_TYPES.QUESTION_PROMPT, payload: {} },
      { eventType: EVENT_TYPES.INVALID_ACTION, payload: {} },
    ];

    const nextQueue = enqueueVoiceEventWithPolicy(queue, {
      eventType: EVENT_TYPES.ANSWER_RESULT,
      payload: {},
    });

    expect(nextQueue).toEqual([{ eventType: EVENT_TYPES.ANSWER_RESULT, payload: {} }]);
  });

  test('replaceable event keeps blocking events but replaces other non-blocking events', () => {
    const queue = [
      { eventType: EVENT_TYPES.ANSWER_RESULT, payload: {} },
      { eventType: EVENT_TYPES.QUESTION_PROMPT, payload: { questionIndex: 0 } },
      { eventType: EVENT_TYPES.INVALID_ACTION, payload: {} },
    ];

    const nextQueue = enqueueVoiceEventWithPolicy(queue, {
      eventType: EVENT_TYPES.SCORE_REPORT,
      payload: {},
    });

    expect(nextQueue).toEqual([
      { eventType: EVENT_TYPES.ANSWER_RESULT, payload: {} },
      { eventType: EVENT_TYPES.SCORE_REPORT, payload: {} },
    ]);
  });

  test('stale question prompt is dropped when question index changed', () => {
    const event = {
      eventType: EVENT_TYPES.QUESTION_PROMPT,
      payload: {
        phase: GAME_PHASES.QUESTION,
        questionIndex: 0,
      },
    };

    expect(
      isVoiceEventStale(event, {
        phase: GAME_PHASES.QUESTION,
        currentQuestionIndex: 1,
      })
    ).toBe(true);
  });

  test('answer result is kept even when question index already changed', () => {
    const event = {
      eventType: EVENT_TYPES.ANSWER_RESULT,
      payload: {
        questionIndex: 1,
      },
    };

    expect(
      isVoiceEventStale(event, {
        phase: GAME_PHASES.RESULT,
        currentQuestionIndex: 2,
      })
    ).toBe(false);
  });

  test('phase-matched invalid action is kept', () => {
    const event = {
      eventType: EVENT_TYPES.INVALID_ACTION,
      payload: {
        phase: GAME_PHASES.FEEDBACK,
      },
    };

    expect(
      isVoiceEventStale(event, {
        phase: GAME_PHASES.FEEDBACK,
        currentQuestionIndex: 0,
      })
    ).toBe(false);
  });

  test('result prompt is stale outside result phase', () => {
    const event = {
      eventType: EVENT_TYPES.RESULT_PROMPT,
      payload: {
        phase: GAME_PHASES.RESULT,
      },
    };

    expect(
      isVoiceEventStale(event, {
        phase: GAME_PHASES.QUESTION,
        currentQuestionIndex: 0,
      })
    ).toBe(true);
  });
});
