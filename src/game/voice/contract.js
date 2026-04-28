export const ACTION_TYPES = {
  SELECT_OPTION: 'select_option',
  REPEAT_QUESTION: 'repeat_question',
  CURRENT_SCORE: 'current_score',
  RESTART_GAME: 'restart_game',
};

export const EVENT_TYPES = {
  GAME_STARTED: 'game_started',
  QUESTION_PROMPT: 'question_prompt',
  ANSWER_RESULT: 'answer_result',
  SCORE_REPORT: 'score_report',
  RESULT_PROMPT: 'result_prompt',
  INVALID_ACTION: 'invalid_action',
};

export const INVALID_ACTION_REASONS = {
  RESULT: 'result',
  FEEDBACK_PENDING: 'feedback_pending',
  UNKNOWN_OPTION: 'unknown_option',
};

const isPlainObject = (value) => value && typeof value === 'object' && !Array.isArray(value);
const SUPPORTED_OPTIONS = ['1', '2', '3', '4'];

export const getIncomingAction = (event) => {
  if (!isPlainObject(event)) {
    return null;
  }

  return event.smart_app_data || event.action || null;
};

export const validateIncomingAction = (action) => {
  if (!isPlainObject(action) || typeof action.type !== 'string') {
    return false;
  }

  if (
    action.type === ACTION_TYPES.REPEAT_QUESTION ||
    action.type === ACTION_TYPES.CURRENT_SCORE ||
    action.type === ACTION_TYPES.RESTART_GAME
  ) {
    return true;
  }

  if (action.type === ACTION_TYPES.SELECT_OPTION) {
    return typeof action.option === 'string' && SUPPORTED_OPTIONS.includes(action.option.toUpperCase());
  }

  return false;
};

export const validateOutgoingEvent = (eventType, payload) => {
  if (
    typeof eventType !== 'string' ||
    !isPlainObject(payload) ||
    typeof payload.phrase !== 'string' ||
    !payload.phrase.trim()
  ) {
    return false;
  }

  if (payload.suggestions && !Array.isArray(payload.suggestions)) {
    return false;
  }

  if (payload.voiceTurnId !== undefined && !Number.isInteger(payload.voiceTurnId)) {
    return false;
  }

  if (payload.phase !== undefined && typeof payload.phase !== 'string') {
    return false;
  }

  return (
    eventType === EVENT_TYPES.GAME_STARTED ||
    eventType === EVENT_TYPES.QUESTION_PROMPT ||
    eventType === EVENT_TYPES.ANSWER_RESULT ||
    eventType === EVENT_TYPES.SCORE_REPORT ||
    eventType === EVENT_TYPES.RESULT_PROMPT ||
    eventType === EVENT_TYPES.INVALID_ACTION
  );
};

export const getActionSignature = (action) => {
  if (!validateIncomingAction(action)) {
    return '';
  }

  return JSON.stringify({
    type: action.type,
    option: typeof action.option === 'string' ? action.option.toUpperCase() : '',
  });
};
