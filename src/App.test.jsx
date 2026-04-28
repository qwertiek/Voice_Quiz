const { App } = require('./App');
const { QUIZ_QUESTIONS } = require('./data/questions');
const { createInitialGameState } = require('./game/engine/gameEngine');
const { ACTION_TYPES, EVENT_TYPES } = require('./game/voice/contract');
const { VOICE_EVENT_POLICIES } = require('./game/voice/scheduler');
const { REPEAT_QUESTION_SEND_DELAY_MS } = require('./game/config');

const createAppForUnitTest = () => {
  const assistant = {
    on: jest.fn(),
    sendData: jest.fn(() => jest.fn()),
  };
  const app = new App({ assistant });
  app.setState = (update, callback) => {
    const nextState = typeof update === 'function' ? update(app.state) : update;
    app.state = {
      ...app.state,
      ...nextState,
    };
    if (callback) {
      callback();
    }
  };
  return app;
};

describe('App assistant actions', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  test('repeat_question sends current question prompt as interrupt after command settles', () => {
    const app = createAppForUnitTest();
    app.state.game = createInitialGameState(QUIZ_QUESTIONS, { questionCount: 3 });
    app.voiceScheduler.enqueue = jest.fn();

    app.dispatchAssistantAction({ type: ACTION_TYPES.REPEAT_QUESTION });

    expect(app.voiceScheduler.enqueue).not.toHaveBeenCalled();

    jest.advanceTimersByTime(REPEAT_QUESTION_SEND_DELAY_MS);

    expect(app.voiceScheduler.enqueue).toHaveBeenCalledTimes(1);
    expect(app.voiceScheduler.enqueue).toHaveBeenCalledWith(
      expect.objectContaining({
        eventType: EVENT_TYPES.QUESTION_PROMPT,
        payload: expect.objectContaining({
          phase: 'question',
          questionIndex: 0,
        }),
      }),
      { policy: VOICE_EVENT_POLICIES.INTERRUPT }
    );
  });

  test('restart_game returns Canvas to intro screen', () => {
    const app = createAppForUnitTest();
    app.state.game = createInitialGameState(QUIZ_QUESTIONS, { questionCount: 3 });
    app.voiceScheduler.interrupt = jest.fn();

    app.dispatchAssistantAction({ type: ACTION_TYPES.RESTART_GAME });

    expect(app.state.game).toBeNull();
    expect(app.getStateForAssistant().game.phase).toBe('intro');
    expect(app.voiceScheduler.interrupt).toHaveBeenCalledWith({ clearPending: true });
  });
});
