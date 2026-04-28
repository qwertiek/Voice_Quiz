import { QUIZ_QUESTIONS } from '../../data/questions';
import { GAME_PHASES } from '../states';
import {
  applyAnswer,
  advanceToNextQuestion,
  createGameStartedEvent,
  createInitialGameState,
  createInvalidActionEvent,
  createQuestionPromptEvent,
  createResultPromptEvent,
  createScoreReportEvent,
  pickSessionQuestions,
  toAssistantState,
} from './gameEngine';
import { EVENT_TYPES, INVALID_ACTION_REASONS } from '../voice/contract';

const keepOrderRandom = () => 0.999999;
const createOrderedGame = () => createInitialGameState(QUIZ_QUESTIONS, { random: keepOrderRandom });

describe('gameEngine', () => {
  test('toAssistantState exposes intro state before the game starts', () => {
    const assistantState = toAssistantState(null);

    expect(assistantState.phase).toBe(GAME_PHASES.INTRO);
    expect(assistantState.screen).toBe(GAME_PHASES.INTRO);
    expect(assistantState.item_selector.items).toHaveLength(0);
    expect(assistantState.voice.commands).toEqual([]);
  });

  test('createInitialGameState starts a fresh random 10-question session', () => {
    const game = createOrderedGame();

    expect(game.questions).toHaveLength(10);
    expect(game.currentQuestionIndex).toBe(0);
    expect(game.score).toBe(0);
    expect(game.phase).toBe(GAME_PHASES.QUESTION);
    expect(typeof game.gameSessionId).toBe('string');
    expect(game.selectedOption).toBeNull();
    expect(game.revealedCorrectOption).toBeNull();
  });

  test('createInitialGameState uses requested question count', () => {
    const game = createInitialGameState(QUIZ_QUESTIONS, {
      questionCount: 5,
      random: keepOrderRandom,
    });

    expect(game.questions).toHaveLength(5);
    expect(new Set(game.questions.map((question) => question.id)).size).toBe(5);
  });

  test('pickSessionQuestions returns a shuffled subset without mutating source questions', () => {
    const sourceIds = QUIZ_QUESTIONS.map((question) => question.id);
    const sessionQuestions = pickSessionQuestions(QUIZ_QUESTIONS, 10, keepOrderRandom);

    expect(sessionQuestions).toHaveLength(10);
    expect(new Set(sessionQuestions.map((question) => question.id)).size).toBe(10);
    expect(QUIZ_QUESTIONS.map((question) => question.id)).toEqual(sourceIds);
  });

  test('toAssistantState exposes numeric selectors only in question phase', () => {
    const game = createOrderedGame();
    const assistantState = toAssistantState(game);

    expect(assistantState.game).toBeUndefined();
    expect(assistantState.phase).toBe(GAME_PHASES.QUESTION);
    expect(assistantState.screen).toBe(GAME_PHASES.QUESTION);
    expect(assistantState.item_selector.items).toHaveLength(4);
    expect(assistantState.voice.commands).toContain('1');
    expect(assistantState.quiz.game_session_id).toBe(game.gameSessionId);

    const feedbackState = toAssistantState({
      ...game,
      phase: GAME_PHASES.FEEDBACK,
    });

    expect(feedbackState.item_selector.items).toHaveLength(0);
  });

  test('createGameStartedEvent includes welcome and first question prompt', () => {
    const game = createOrderedGame();
    const event = createGameStartedEvent(game);

    expect(event.eventType).toBe(EVENT_TYPES.GAME_STARTED);
    expect(event.payload.phrase).toContain('Добро пожаловать в Голосовой Квиз');
    expect(event.payload.phrase).toContain('Вопрос 1 из 10.');
    expect(event.payload.suggestions).toContain('1');
  });

  test('applyAnswer handles correct non-final answer and enters feedback phase', () => {
    const game = createOrderedGame();
    const result = applyAnswer(game, '3');

    expect(result.game.score).toBe(1);
    expect(result.game.phase).toBe(GAME_PHASES.FEEDBACK);
    expect(result.game.selectedOption).toBe('3');
    expect(result.game.revealedCorrectOption).toBe('3');
    expect(result.event.eventType).toBe(EVENT_TYPES.ANSWER_RESULT);
    expect(result.event.payload.status).toBe('correct');
    expect(result.event.payload.includesNextQuestion).toBe(true);
    expect(result.event.payload.nextQuestionIndex).toBe(1);
    expect(result.event.payload.phrase).toContain('Верно.');
    expect(result.event.payload.phrase).toContain('Вопрос 2 из 10.');
    expect(result.feedback).toEqual({
      text: 'Верно.',
      tone: 'success',
    });
    expect(result.celebrationType).toBe('success');
  });

  test('applyAnswer handles wrong final answer and finishes game', () => {
    const game = {
      ...createOrderedGame(),
      currentQuestionIndex: 9,
      score: 4,
    };
    const result = applyAnswer(game, '1');

    expect(result.game.score).toBe(4);
    expect(result.game.phase).toBe(GAME_PHASES.RESULT);
    expect(result.event.payload.status).toBe('wrong');
    expect(result.event.payload.phrase).toContain('Вы ответили правильно на 4 из 10 вопросов.');
    expect(result.feedback.text).toContain('Правильный ответ');
    expect(result.celebrationType).toBeNull();
  });

  test('applyAnswer rejects unknown option via invalid action event', () => {
    const game = createOrderedGame();
    const result = applyAnswer(game, '9');

    expect(result.game).toBe(game);
    expect(result.event.eventType).toBe(EVENT_TYPES.INVALID_ACTION);
    expect(result.event.payload.reason).toBe(INVALID_ACTION_REASONS.UNKNOWN_OPTION);
    expect(result.feedback).toBeNull();
  });

  test('advanceToNextQuestion moves game back to question phase and clears selection', () => {
    const game = {
      ...createOrderedGame(),
      score: 1,
      selectedOption: '3',
      revealedCorrectOption: '3',
      phase: GAME_PHASES.FEEDBACK,
    };

    const result = advanceToNextQuestion(game);

    expect(result.game.currentQuestionIndex).toBe(1);
    expect(result.game.phase).toBe(GAME_PHASES.QUESTION);
    expect(result.game.selectedOption).toBeNull();
    expect(result.game.revealedCorrectOption).toBeNull();
    expect(result.event.eventType).toBe(EVENT_TYPES.QUESTION_PROMPT);
    expect(result.event.payload.phrase).toContain('Вопрос 2 из 10.');
  });

  test('non-final answer phrase carries feedback and next question in one TTS event', () => {
    const game = createOrderedGame();
    const result = applyAnswer(game, '3');

    expect(result.includesNextQuestion).toBe(true);
    expect(result.event.payload.phrase).toContain('Верно.');
    expect(result.event.payload.phrase).toContain(game.questions[1].question);
  });

  test('createScoreReportEvent reports full question count on result screen', () => {
    const game = {
      ...createOrderedGame(),
      score: 7,
      phase: GAME_PHASES.RESULT,
    };

    const event = createScoreReportEvent(game);

    expect(event.eventType).toBe(EVENT_TYPES.SCORE_REPORT);
    expect(event.payload.phrase).toBe(
      'Сейчас у вас 7 правильных ответов из 10. Всего в игре 10 вопросов.'
    );
  });

  test('createInvalidActionEvent returns phase-aware phrases', () => {
    const game = createOrderedGame();
    const feedbackEvent = createInvalidActionEvent(
      { ...game, phase: GAME_PHASES.FEEDBACK },
      INVALID_ACTION_REASONS.FEEDBACK_PENDING
    );
    const resultEvent = createResultPromptEvent({ ...game, phase: GAME_PHASES.RESULT });
    const questionEvent = createQuestionPromptEvent(game);

    expect(feedbackEvent.payload.phrase).toContain('Ответ уже принят');
    expect(resultEvent.eventType).toBe(EVENT_TYPES.RESULT_PROMPT);
    expect(resultEvent.payload.phrase).toContain('Игра завершена');
    expect(questionEvent.payload.phrase).toContain('Вопрос 1 из 10.');
  });
});
