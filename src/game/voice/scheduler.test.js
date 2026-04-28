import { EVENT_TYPES } from './contract';
import { GAME_PHASES } from '../states';
import { VOICE_EVENT_POLICIES, VoiceEventScheduler } from './scheduler';

describe('VoiceEventScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  test('blocking event interrupts current non-blocking event', () => {
    const sent = [];
    const scheduler = new VoiceEventScheduler({
      getGameState: () => ({
        phase: GAME_PHASES.QUESTION,
        currentQuestionIndex: 0,
        gameSessionId: 'session-1',
      }),
      sendPayload: (event) => {
        sent.push(event.eventType);
      },
      maxPendingEvents: 8,
      ackTimeoutMs: 1000,
      retryDelayMs: 1000,
    });

    scheduler.setReady(true);
    scheduler.enqueue({
      eventType: EVENT_TYPES.QUESTION_PROMPT,
      payload: { phase: GAME_PHASES.QUESTION, questionIndex: 0, gameSessionId: 'session-1' },
    });
    scheduler.enqueue({
      eventType: EVENT_TYPES.ANSWER_RESULT,
      payload: { phase: GAME_PHASES.FEEDBACK, questionIndex: 0, gameSessionId: 'session-1' },
    });

    expect(sent).toEqual([EVENT_TYPES.QUESTION_PROMPT, EVENT_TYPES.ANSWER_RESULT]);
  });

  test('stale event from previous session is skipped', () => {
    const sent = [];
    const scheduler = new VoiceEventScheduler({
      getGameState: () => ({
        phase: GAME_PHASES.QUESTION,
        currentQuestionIndex: 0,
        gameSessionId: 'session-2',
      }),
      sendPayload: (event, settle) => {
        sent.push(event.eventType);
        settle();
      },
      maxPendingEvents: 8,
      ackTimeoutMs: 1000,
      retryDelayMs: 1000,
    });

    scheduler.setReady(true);
    scheduler.enqueue({
      eventType: EVENT_TYPES.QUESTION_PROMPT,
      payload: { phase: GAME_PHASES.QUESTION, questionIndex: 0, gameSessionId: 'session-1' },
    });
    scheduler.enqueue({
      eventType: EVENT_TYPES.QUESTION_PROMPT,
      payload: { phase: GAME_PHASES.QUESTION, questionIndex: 0, gameSessionId: 'session-2' },
    });

    expect(sent).toEqual([EVENT_TYPES.QUESTION_PROMPT]);
  });

  test('blocking event waits for minimum settle window before flushing next event', () => {
    const sent = [];
    const scheduler = new VoiceEventScheduler({
      getGameState: () => ({
        phase: GAME_PHASES.QUESTION,
        currentQuestionIndex: 1,
        gameSessionId: 'session-1',
      }),
      sendPayload: (event, settle) => {
        sent.push(event.eventType);
        settle();
      },
      maxPendingEvents: 8,
      ackTimeoutMs: 5000,
      retryDelayMs: 1000,
      minBlockingSettleMs: 2500,
    });

    scheduler.setReady(true);
    scheduler.enqueue({
      eventType: EVENT_TYPES.ANSWER_RESULT,
      payload: { phase: GAME_PHASES.FEEDBACK, questionIndex: 0, gameSessionId: 'session-1' },
    });
    scheduler.enqueue({
      eventType: EVENT_TYPES.QUESTION_PROMPT,
      payload: { phase: GAME_PHASES.QUESTION, questionIndex: 1, gameSessionId: 'session-1' },
    });

    expect(sent).toEqual([EVENT_TYPES.ANSWER_RESULT]);

    jest.advanceTimersByTime(2499);
    expect(sent).toEqual([EVENT_TYPES.ANSWER_RESULT]);

    jest.advanceTimersByTime(1);
    expect(sent).toEqual([EVENT_TYPES.ANSWER_RESULT, EVENT_TYPES.QUESTION_PROMPT]);
  });

  test('blocking event can use event-specific settle delay', () => {
    const sent = [];
    const scheduler = new VoiceEventScheduler({
      getGameState: () => ({
        phase: GAME_PHASES.QUESTION,
        currentQuestionIndex: 1,
        gameSessionId: 'session-1',
      }),
      sendPayload: (event, settle) => {
        sent.push(event.eventType);
        settle();
      },
      getSettleDelayMs: (event) => (event.eventType === EVENT_TYPES.ANSWER_RESULT ? 1800 : 0),
      maxPendingEvents: 8,
      ackTimeoutMs: 5000,
      retryDelayMs: 1000,
      minBlockingSettleMs: 2500,
    });

    scheduler.setReady(true);
    scheduler.enqueue({
      eventType: EVENT_TYPES.ANSWER_RESULT,
      payload: { phase: GAME_PHASES.FEEDBACK, questionIndex: 0, gameSessionId: 'session-1' },
    });
    scheduler.enqueue({
      eventType: EVENT_TYPES.QUESTION_PROMPT,
      payload: { phase: GAME_PHASES.QUESTION, questionIndex: 1, gameSessionId: 'session-1' },
    });

    jest.advanceTimersByTime(1799);
    expect(sent).toEqual([EVENT_TYPES.ANSWER_RESULT]);

    jest.advanceTimersByTime(1);
    expect(sent).toEqual([EVENT_TYPES.ANSWER_RESULT, EVENT_TYPES.QUESTION_PROMPT]);
  });


  test('interrupt releases a stuck current event so the next voice event is sent immediately', () => {
    const sent = [];
    const scheduler = new VoiceEventScheduler({
      getGameState: () => ({
        phase: GAME_PHASES.QUESTION,
        currentQuestionIndex: 0,
        gameSessionId: 'session-1',
      }),
      sendPayload: (event) => {
        sent.push(event.eventType);
      },
      maxPendingEvents: 8,
      ackTimeoutMs: 5000,
      retryDelayMs: 1000,
      minBlockingSettleMs: 2500,
    });

    scheduler.setReady(true);
    scheduler.enqueue({
      eventType: EVENT_TYPES.GAME_STARTED,
      payload: { phase: GAME_PHASES.QUESTION, questionIndex: 0, gameSessionId: 'session-1' },
    });

    expect(sent).toEqual([EVENT_TYPES.GAME_STARTED]);

    scheduler.interrupt({ clearPending: true });
    scheduler.enqueue({
      eventType: EVENT_TYPES.SCORE_REPORT,
      payload: { phase: GAME_PHASES.QUESTION, questionIndex: 0, gameSessionId: 'session-1' },
    });

    expect(sent).toEqual([EVENT_TYPES.GAME_STARTED, EVENT_TYPES.SCORE_REPORT]);
  });

  test('stale callback from interrupted event is ignored', () => {
    const sent = [];
    const settles = [];
    const traces = [];
    const scheduler = new VoiceEventScheduler({
      getGameState: () => ({
        phase: GAME_PHASES.QUESTION,
        currentQuestionIndex: 0,
        gameSessionId: 'session-1',
      }),
      sendPayload: (event, settle) => {
        sent.push({
          eventType: event.eventType,
          voiceTurnId: event.payload.voiceTurnId,
        });
        settles.push(settle);
      },
      onTrace: (entry) => traces.push(entry.status),
      maxPendingEvents: 8,
      ackTimeoutMs: 5000,
      retryDelayMs: 1000,
      minBlockingSettleMs: 2500,
    });

    scheduler.setReady(true);
    scheduler.enqueue({
      eventType: EVENT_TYPES.GAME_STARTED,
      payload: { phase: GAME_PHASES.QUESTION, questionIndex: 0, gameSessionId: 'session-1' },
    });
    scheduler.enqueue(
      {
        eventType: EVENT_TYPES.ANSWER_RESULT,
        payload: { phase: GAME_PHASES.FEEDBACK, questionIndex: 0, gameSessionId: 'session-1' },
      },
      { policy: VOICE_EVENT_POLICIES.INTERRUPT }
    );

    expect(sent).toEqual([
      { eventType: EVENT_TYPES.GAME_STARTED, voiceTurnId: 1 },
      { eventType: EVENT_TYPES.ANSWER_RESULT, voiceTurnId: 3 },
    ]);

    settles[0]();

    expect(traces).toContain('ignored_stale_callback');
    expect(sent).toHaveLength(2);
  });
});
