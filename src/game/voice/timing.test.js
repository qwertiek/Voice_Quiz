import { EVENT_TYPES } from './contract';
import {
  getAnswerFeedbackVoiceDurationMs,
  getPromptVoiceDurationMs,
  getVoiceEventSettleDelayMs,
} from './timing';

describe('voice timing', () => {
  test('answer feedback duration has a practical minimum for short replies', () => {
    expect(getAnswerFeedbackVoiceDurationMs('Верно.')).toBe(1400);
  });

  test('answer result settle delay uses the same duration as UI feedback delay', () => {
    const event = {
      eventType: EVENT_TYPES.ANSWER_RESULT,
      payload: {
        phrase: 'Неверно. Правильный ответ: 2 — Фёдор Достоевский.',
      },
    };

    expect(getVoiceEventSettleDelayMs(event)).toBe(
      getAnswerFeedbackVoiceDurationMs(event.payload.phrase)
    );
  });

  test('game started settle delay uses prompt duration', () => {
    const event = {
      eventType: EVENT_TYPES.GAME_STARTED,
      payload: {
        phrase: 'Добро пожаловать в Голосовой Квиз. Вопрос 1 из 10.',
      },
    };

    expect(getVoiceEventSettleDelayMs(event)).toBe(getPromptVoiceDurationMs(event.payload.phrase));
  });
});
