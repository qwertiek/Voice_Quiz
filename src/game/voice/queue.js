import { EVENT_TYPES } from './contract';
import { GAME_PHASES } from '../states';

export const VOICE_QUEUE_MODES = {
  BLOCKING: 'blocking',
  REPLACEABLE: 'replaceable',
  TRANSIENT: 'transient',
};

export const getVoiceEventQueueMode = (eventType) => {
  if (eventType === EVENT_TYPES.GAME_STARTED || eventType === EVENT_TYPES.ANSWER_RESULT) {
    return VOICE_QUEUE_MODES.BLOCKING;
  }

  if (
    eventType === EVENT_TYPES.QUESTION_PROMPT ||
    eventType === EVENT_TYPES.SCORE_REPORT ||
    eventType === EVENT_TYPES.RESULT_PROMPT
  ) {
    return VOICE_QUEUE_MODES.REPLACEABLE;
  }

  return VOICE_QUEUE_MODES.TRANSIENT;
};

export const enqueueVoiceEventWithPolicy = (queue, nextEvent) => {
  const nextMode = getVoiceEventQueueMode(nextEvent.eventType);

  if (nextMode === VOICE_QUEUE_MODES.BLOCKING) {
    return [
      ...queue.filter((event) => getVoiceEventQueueMode(event.eventType) === VOICE_QUEUE_MODES.BLOCKING),
      nextEvent,
    ];
  }

  if (nextMode === VOICE_QUEUE_MODES.REPLACEABLE) {
    return [
      ...queue.filter((event) => getVoiceEventQueueMode(event.eventType) === VOICE_QUEUE_MODES.BLOCKING),
      nextEvent,
    ];
  }

  return [
    ...queue.filter((event) => getVoiceEventQueueMode(event.eventType) !== VOICE_QUEUE_MODES.TRANSIENT),
    nextEvent,
  ];
};

export const isVoiceEventStale = (event, game) => {
  const payload = event && event.payload ? event.payload : {};

  if (!event || !game) {
    return false;
  }

  if (
    payload.gameSessionId &&
    game &&
    game.gameSessionId &&
    payload.gameSessionId !== game.gameSessionId
  ) {
    return true;
  }

  if (event.eventType === EVENT_TYPES.GAME_STARTED) {
    return payload.phase && payload.phase !== game.phase;
  }

  if (event.eventType === EVENT_TYPES.QUESTION_PROMPT) {
    return (
      game.phase !== GAME_PHASES.QUESTION ||
      (Number.isInteger(payload.questionIndex) && payload.questionIndex !== game.currentQuestionIndex)
    );
  }

  if (event.eventType === EVENT_TYPES.RESULT_PROMPT) {
    return game.phase !== GAME_PHASES.RESULT;
  }

  if (event.eventType === EVENT_TYPES.ANSWER_RESULT) {
    return false;
  }

  if (event.eventType === EVENT_TYPES.INVALID_ACTION) {
    return payload.phase && payload.phase !== game.phase;
  }

  return false;
};
