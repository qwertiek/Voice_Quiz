export const OPTION_LABELS = {
  1: '1',
  2: '2',
  3: '3',
  4: '4',
};

export const ANSWER_OPTION_ORDER = ['1', '2', '3', '4'];

export const VOICE_COMMANDS_BY_PHASE = {
  question: ['1', '2', '3', '4', 'Повтори вопрос', 'Мой счёт'],
  feedback: ['Мой счёт', 'Новая игра'],
  result: ['Сыграть ещё', 'Мой счёт', 'Новая игра'],
};

export const getVoiceSuggestionsForPhase = (phase) =>
  VOICE_COMMANDS_BY_PHASE[phase] || VOICE_COMMANDS_BY_PHASE.question;

export const getVoiceCommandChips = (phase) =>
  VOICE_COMMANDS_BY_PHASE[phase] || VOICE_COMMANDS_BY_PHASE.question;

export const VOICE_PHRASES = {
  welcome: (totalQuestions) =>
    `Добро пожаловать в Голосовой Квиз. В игре ${totalQuestions} вопросов.`,
  repeatQuestionPending:
    'Ответ уже принят. Сейчас я озвучу следующий вопрос.',
  gameFinished: (score, totalQuestions) =>
    `Игра завершена. У вас ${score} правильных ответов из ${totalQuestions}. Скажите: сыграть ещё.`,
  scoreReport: (score, answeredCount, totalQuestions) =>
    `Сейчас у вас ${score} правильных ответов из ${answeredCount}. Всего в игре ${totalQuestions} вопросов.`,
  correctAnswer: 'Верно.',
  wrongAnswer: (optionLabel, optionText) =>
    `Неверно. Правильный ответ: ${optionLabel} — ${optionText}.`,
  unknownOption: 'Назовите один из вариантов: 1, 2, 3 или 4.',
  finalScore: (score, totalQuestions) =>
    `Вы ответили правильно на ${score} из ${totalQuestions} вопросов.`,
  questionPrompt: (index, totalQuestions, question, options) =>
    `Вопрос ${index} из ${totalQuestions}. ${question} Вариант 1: ${options[1]}. Вариант 2: ${options[2]}. Вариант 3: ${options[3]}. Вариант 4: ${options[4]}. Ответьте: 1, 2, 3 или 4.`,
};
