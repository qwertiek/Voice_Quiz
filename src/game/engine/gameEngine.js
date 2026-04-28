import { GAME_PHASES, FEEDBACK_KIND } from '../states';
import { EVENT_TYPES, INVALID_ACTION_REASONS } from '../voice/contract';
import {
  ANSWER_OPTION_ORDER,
  OPTION_LABELS,
  VOICE_PHRASES,
  getVoiceCommandChips,
  getVoiceSuggestionsForPhase,
} from '../voicePhrases';

const getCurrentQuestion = (game) => game.questions[game.currentQuestionIndex] || null;
const createGameSessionId = () => `quiz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const DEFAULT_QUESTION_COUNT = 10;

export const shuffleQuestions = (questions, random = Math.random) => {
  const shuffled = [...questions];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
};

export const pickSessionQuestions = (
  questions,
  count = DEFAULT_QUESTION_COUNT,
  random = Math.random
) => shuffleQuestions(questions, random).slice(0, Math.min(count, questions.length));

export const createInitialGameState = (questions, options = {}) => ({
  gameSessionId: createGameSessionId(),
  questions: pickSessionQuestions(questions, options.questionCount, options.random),
  currentQuestionIndex: 0,
  score: 0,
  selectedOption: null,
  revealedCorrectOption: null,
  phase: GAME_PHASES.QUESTION,
});

export const toAssistantState = (game) => {
  if (!game) {
    return {
      phase: GAME_PHASES.INTRO,
      screen: GAME_PHASES.INTRO,
      item_selector: {
        items: [],
        ignored_words: [],
      },
      quiz: {
        phase: GAME_PHASES.INTRO,
      },
      voice: {
        commands: [],
      },
    };
  }

  const phase = game.phase;
  const currentQuestion = getCurrentQuestion(game);
  const canSelectOption = phase === GAME_PHASES.QUESTION && Boolean(currentQuestion);

  return {
    phase,
    screen: phase,
    item_selector: {
      items: canSelectOption
        ? ANSWER_OPTION_ORDER.map((optionKey, index) => ({
            number: index + 1,
            id: optionKey,
            title: `${OPTION_LABELS[optionKey]} ${currentQuestion.options[optionKey]}`,
          }))
        : [],
      ignored_words: [
        'вариант',
        'ответ',
        'выбери',
        'выбираю',
        'номер',
        'один',
        'два',
        'три',
        'четыре',
        'повтори',
        'вопрос',
        'мой',
        'счет',
        'счёт',
        'начать',
        'заново',
        'новая',
        'игра',
        'сыграть',
        'еще',
        'ещё',
      ],
    },
    quiz: {
      game_session_id: game.gameSessionId,
      current_question_index: game.currentQuestionIndex,
      total_questions: game.questions.length,
      score: game.score,
      phase,
      selected_option: game.selectedOption || '',
      revealed_correct_option: game.revealedCorrectOption || '',
    },
    voice: {
      commands: getVoiceCommandChips(phase),
    },
  };
};

const createEvent = (eventType, payload) => ({
  eventType,
  payload,
});

export const createGameStartedEvent = (game) => {
  if (game.phase === GAME_PHASES.RESULT) {
    return createEvent(EVENT_TYPES.GAME_STARTED, {
      phrase: VOICE_PHRASES.gameFinished(game.score, game.questions.length),
      suggestions: getVoiceSuggestionsForPhase(GAME_PHASES.RESULT),
      phase: GAME_PHASES.RESULT,
      gameSessionId: game.gameSessionId,
      questionIndex: game.currentQuestionIndex,
    });
  }

  const currentQuestion = getCurrentQuestion(game);
  const intro = VOICE_PHRASES.welcome(game.questions.length);
  const prompt = currentQuestion
    ? VOICE_PHRASES.questionPrompt(
        game.currentQuestionIndex + 1,
        game.questions.length,
        currentQuestion.question,
        currentQuestion.options
      )
    : '';

  return createEvent(EVENT_TYPES.GAME_STARTED, {
    phrase: `${intro} ${prompt}`.trim(),
    suggestions: getVoiceSuggestionsForPhase(game.phase),
    phase: game.phase,
    gameSessionId: game.gameSessionId,
    questionIndex: game.currentQuestionIndex,
  });
};

export const createQuestionPromptEvent = (game) => {
  const currentQuestion = getCurrentQuestion(game);
  if (!currentQuestion) {
    return createResultPromptEvent(game);
  }

  return createEvent(EVENT_TYPES.QUESTION_PROMPT, {
    phrase: VOICE_PHRASES.questionPrompt(
      game.currentQuestionIndex + 1,
      game.questions.length,
      currentQuestion.question,
      currentQuestion.options
    ),
    suggestions: getVoiceSuggestionsForPhase(game.phase),
    phase: game.phase,
    gameSessionId: game.gameSessionId,
    questionIndex: game.currentQuestionIndex,
  });
};

export const createResultPromptEvent = (game) =>
  createEvent(EVENT_TYPES.RESULT_PROMPT, {
    phrase: VOICE_PHRASES.gameFinished(game.score, game.questions.length),
    suggestions: getVoiceSuggestionsForPhase(GAME_PHASES.RESULT),
    phase: GAME_PHASES.RESULT,
    gameSessionId: game.gameSessionId,
    questionIndex: game.currentQuestionIndex,
  });

export const createScoreReportEvent = (game) => {
  const answeredCount =
    game.phase === GAME_PHASES.RESULT
      ? game.questions.length
      : game.phase === GAME_PHASES.FEEDBACK
        ? game.currentQuestionIndex + 1
        : game.currentQuestionIndex;

  return createEvent(EVENT_TYPES.SCORE_REPORT, {
    phrase: VOICE_PHRASES.scoreReport(game.score, answeredCount, game.questions.length),
    suggestions: getVoiceSuggestionsForPhase(game.phase),
    phase: game.phase,
    gameSessionId: game.gameSessionId,
    questionIndex: game.currentQuestionIndex,
  });
};

export const createInvalidActionEvent = (game, reason) => {
  if (reason === INVALID_ACTION_REASONS.RESULT) {
    return createResultPromptEvent(game);
  }

  if (reason === INVALID_ACTION_REASONS.FEEDBACK_PENDING) {
    return createEvent(EVENT_TYPES.INVALID_ACTION, {
      reason,
      phrase: VOICE_PHRASES.repeatQuestionPending,
      suggestions: getVoiceSuggestionsForPhase(GAME_PHASES.FEEDBACK),
      phase: GAME_PHASES.FEEDBACK,
      gameSessionId: game.gameSessionId,
      questionIndex: game.currentQuestionIndex,
    });
  }

  return createEvent(EVENT_TYPES.INVALID_ACTION, {
    reason: INVALID_ACTION_REASONS.UNKNOWN_OPTION,
    phrase: VOICE_PHRASES.unknownOption,
    suggestions: getVoiceSuggestionsForPhase(GAME_PHASES.QUESTION),
    phase: GAME_PHASES.QUESTION,
    gameSessionId: game.gameSessionId,
    questionIndex: game.currentQuestionIndex,
  });
};

export const applyAnswer = (game, option) => {
  const question = getCurrentQuestion(game);
  if (!question || !OPTION_LABELS[option]) {
    return {
      game,
      event: createInvalidActionEvent(game, INVALID_ACTION_REASONS.UNKNOWN_OPTION),
      feedback: null,
      celebrationType: null,
    };
  }

  const isCorrect = question.correctOption === option;
  const nextScore = isCorrect ? game.score + 1 : game.score;
  const isLastQuestion = game.currentQuestionIndex === game.questions.length - 1;
  const nextQuestion = isLastQuestion ? null : game.questions[game.currentQuestionIndex + 1];
  const feedbackText = isCorrect
    ? VOICE_PHRASES.correctAnswer
    : VOICE_PHRASES.wrongAnswer(
        OPTION_LABELS[question.correctOption],
        question.options[question.correctOption]
      );
  const nextPhase = isLastQuestion ? GAME_PHASES.RESULT : GAME_PHASES.FEEDBACK;
  const nextQuestionPhrase = nextQuestion
    ? VOICE_PHRASES.questionPrompt(
        game.currentQuestionIndex + 2,
        game.questions.length,
        nextQuestion.question,
        nextQuestion.options
      )
    : '';
  const nextGame = {
    ...game,
    score: nextScore,
    selectedOption: option,
    revealedCorrectOption: question.correctOption,
    phase: nextPhase,
  };
  const finalPhrase = isLastQuestion
    ? `${feedbackText} ${VOICE_PHRASES.finalScore(nextScore, game.questions.length)}`
    : `${feedbackText} ${nextQuestionPhrase}`.trim();

  return {
    game: nextGame,
    event: createEvent(EVENT_TYPES.ANSWER_RESULT, {
      status: isCorrect ? 'correct' : 'wrong',
      phrase: finalPhrase,
      suggestions: getVoiceSuggestionsForPhase(nextPhase),
      phase: nextPhase,
      score: nextScore,
      gameSessionId: game.gameSessionId,
      questionIndex: game.currentQuestionIndex,
      nextQuestionIndex: nextQuestion ? game.currentQuestionIndex + 1 : undefined,
      selectedOption: option,
      correctOption: question.correctOption,
      includesNextQuestion: Boolean(nextQuestion),
    }),
    feedback: {
      text: feedbackText,
      tone: isCorrect ? FEEDBACK_KIND.SUCCESS : FEEDBACK_KIND.ERROR,
    },
    celebrationType: isCorrect ? (isLastQuestion ? 'finish' : 'success') : null,
    includesNextQuestion: Boolean(nextQuestion),
  };
};

export const advanceToNextQuestion = (game) => {
  const nextIndex = game.currentQuestionIndex + 1;
  if (nextIndex >= game.questions.length) {
    const nextGame = {
      ...game,
      phase: GAME_PHASES.RESULT,
    };

    return {
      game: nextGame,
      event: createResultPromptEvent(nextGame),
    };
  }

  const nextGame = {
    ...game,
    currentQuestionIndex: nextIndex,
    selectedOption: null,
    revealedCorrectOption: null,
    phase: GAME_PHASES.QUESTION,
  };

  return {
    game: nextGame,
    event: createQuestionPromptEvent(nextGame),
  };
};
