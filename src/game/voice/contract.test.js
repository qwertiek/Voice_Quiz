import {
  ACTION_TYPES,
  EVENT_TYPES,
  getActionSignature,
  getIncomingAction,
  validateIncomingAction,
  validateOutgoingEvent,
} from './contract';

describe('voice contract', () => {
  test('getIncomingAction reads smart_app_data and legacy action wrappers', () => {
    const action = { type: ACTION_TYPES.SELECT_OPTION, option: '1' };

    expect(getIncomingAction({ smart_app_data: action })).toBe(action);
    expect(getIncomingAction({ action })).toBe(action);
    expect(getIncomingAction(null)).toBeNull();
  });

  test('validateIncomingAction accepts supported actions', () => {
    expect(validateIncomingAction({ type: ACTION_TYPES.REPEAT_QUESTION })).toBe(true);
    expect(validateIncomingAction({ type: ACTION_TYPES.CURRENT_SCORE })).toBe(true);
    expect(validateIncomingAction({ type: ACTION_TYPES.RESTART_GAME })).toBe(true);
    expect(validateIncomingAction({ type: ACTION_TYPES.SELECT_OPTION, option: '1' })).toBe(true);
  });

  test('validateIncomingAction rejects malformed actions', () => {
    expect(validateIncomingAction(null)).toBe(false);
    expect(validateIncomingAction({})).toBe(false);
    expect(validateIncomingAction({ type: ACTION_TYPES.SELECT_OPTION })).toBe(false);
    expect(validateIncomingAction({ type: ACTION_TYPES.SELECT_OPTION, option: 'Z' })).toBe(false);
    expect(validateIncomingAction({ type: 'unknown_action' })).toBe(false);
  });

  test('validateOutgoingEvent accepts event payloads with phrase and optional suggestions', () => {
    expect(
      validateOutgoingEvent(EVENT_TYPES.GAME_STARTED, {
        phrase: 'Начинаем игру.',
        suggestions: ['1', '2'],
        phase: 'question',
        voiceTurnId: 1,
      })
    ).toBe(true);

    expect(
      validateOutgoingEvent(EVENT_TYPES.RESULT_PROMPT, {
        phrase: 'Игра завершена.',
      })
    ).toBe(true);
  });

  test('validateOutgoingEvent rejects malformed payloads', () => {
    expect(validateOutgoingEvent(EVENT_TYPES.SCORE_REPORT, null)).toBe(false);
    expect(validateOutgoingEvent(EVENT_TYPES.SCORE_REPORT, { suggestions: [] })).toBe(false);
    expect(
      validateOutgoingEvent(EVENT_TYPES.SCORE_REPORT, {
        phrase: 'ok',
        suggestions: '1',
      })
    ).toBe(false);
    expect(
      validateOutgoingEvent(EVENT_TYPES.SCORE_REPORT, {
        phrase: 'ok',
        voiceTurnId: '1',
      })
    ).toBe(false);
    expect(validateOutgoingEvent(EVENT_TYPES.SCORE_REPORT, { phrase: '   ' })).toBe(false);
    expect(validateOutgoingEvent('unknown_event', { phrase: 'ok' })).toBe(false);
  });

  test('getActionSignature normalizes option payload', () => {
    expect(getActionSignature({ type: ACTION_TYPES.SELECT_OPTION, option: '1' })).toBe(
      JSON.stringify({
        type: ACTION_TYPES.SELECT_OPTION,
        option: '1',
      })
    );

    expect(getActionSignature({ type: ACTION_TYPES.REPEAT_QUESTION })).toBe(
      JSON.stringify({
        type: ACTION_TYPES.REPEAT_QUESTION,
        option: '',
      })
    );
  });

  test('getActionSignature returns empty string for invalid action', () => {
    expect(getActionSignature({ type: 'bad' })).toBe('');
  });
});
