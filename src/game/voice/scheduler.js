import {
  VOICE_QUEUE_MODES,
  enqueueVoiceEventWithPolicy,
  getVoiceEventQueueMode,
  isVoiceEventStale,
} from './queue';

export const VOICE_EVENT_POLICIES = {
  ENQUEUE: 'enqueue',
  REPLACE: 'replace',
  INTERRUPT: 'interrupt',
};

export class VoiceEventScheduler {
  constructor({
    getGameState,
    sendPayload,
    onError,
    onTrace,
    maxPendingEvents,
    ackTimeoutMs,
    retryDelayMs,
    minBlockingSettleMs = 0,
    getSettleDelayMs,
  }) {
    this.getGameState = getGameState;
    this.sendPayload = sendPayload;
    this.onError = onError;
    this.onTrace = onTrace;
    this.maxPendingEvents = maxPendingEvents;
    this.ackTimeoutMs = ackTimeoutMs;
    this.retryDelayMs = retryDelayMs;
    this.minBlockingSettleMs = minBlockingSettleMs;
    this.getSettleDelayMs = getSettleDelayMs;

    this.ready = false;
    this.isSending = false;
    this.pendingEvents = [];
    this.voiceTurnId = 0;
    this.currentTurnId = 0;
    this.retryTimer = null;
    this.ackTimer = null;
    this.releaseTimer = null;
    this.currentEvent = null;
    this.currentSettle = null;
  }

  trace(status, event = null, extra = {}) {
    if (typeof this.onTrace === 'function') {
      this.onTrace({
        status,
        eventType: event && event.eventType,
        voiceTurnId: event && event.payload && event.payload.voiceTurnId,
        ...extra,
      });
    }
  }

  setReady(value) {
    this.ready = Boolean(value);
    this.trace(this.ready ? 'ready' : 'not_ready');
    if (this.ready) {
      this.flush();
    }
  }

  enqueue(event, { policy = VOICE_EVENT_POLICIES.ENQUEUE } = {}) {
    if (policy === VOICE_EVENT_POLICIES.INTERRUPT) {
      this.interrupt({ clearPending: true });
    } else if (policy === VOICE_EVENT_POLICIES.REPLACE) {
      this.clear();
    }

    this.pendingEvents = enqueueVoiceEventWithPolicy(this.pendingEvents, event);
    if (this.pendingEvents.length > this.maxPendingEvents) {
      this.pendingEvents = this.pendingEvents.slice(-this.maxPendingEvents);
    }

    if (
      this.currentSettle &&
      this.currentEvent &&
      getVoiceEventQueueMode(event.eventType) === VOICE_QUEUE_MODES.BLOCKING &&
      getVoiceEventQueueMode(this.currentEvent.eventType) !== VOICE_QUEUE_MODES.BLOCKING
    ) {
      this.currentSettle();
    }

    this.trace('queued', event, { policy, pendingCount: this.pendingEvents.length });
    this.flush();
  }

  clear() {
    this.pendingEvents = [];
    this.trace('cleared');
  }

  interrupt({ clearPending = true } = {}) {
    this.voiceTurnId += 1;
    this.currentTurnId = 0;

    if (clearPending) {
      this.clear();
    }

    if (this.ackTimer) {
      clearTimeout(this.ackTimer);
      this.ackTimer = null;
    }

    if (this.releaseTimer) {
      clearTimeout(this.releaseTimer);
      this.releaseTimer = null;
    }

    this.currentEvent = null;
    this.currentSettle = null;
    this.isSending = false;
    this.trace('interrupted', null, { clearPending });

    if (!clearPending) {
      this.flush();
    }
  }

  dispose() {
    this.interrupt({ clearPending: true });

    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
      this.retryTimer = null;
    }
  }

  scheduleRetry() {
    if (this.retryTimer || !this.pendingEvents.length) {
      return;
    }

    this.retryTimer = setTimeout(() => {
      this.retryTimer = null;
      this.flush();
    }, this.retryDelayMs);
  }

  flush() {
    if (!this.ready || this.isSending || !this.pendingEvents.length) {
      return;
    }

    let event = null;
    const game = this.getGameState();
    while (this.pendingEvents.length) {
      const nextEvent = this.pendingEvents.shift();
      if (!isVoiceEventStale(nextEvent, game)) {
        event = nextEvent;
        break;
      }

      this.trace('dropped_stale', nextEvent);
    }

    if (!event) {
      return;
    }

    const turnId = this.voiceTurnId + 1;
    this.voiceTurnId = turnId;
    this.currentTurnId = turnId;
    const eventToSend = {
      ...event,
      payload: {
        ...(event.payload && typeof event.payload === 'object' ? event.payload : {}),
        voiceTurnId: turnId,
      },
    };

    this.isSending = true;
    this.currentEvent = eventToSend;
    let settled = false;
    const sentAt = Date.now();
    const minimumSettleMs =
      getVoiceEventQueueMode(eventToSend.eventType) === VOICE_QUEUE_MODES.BLOCKING
        ? this.getBlockingSettleDelay(eventToSend)
        : 0;

    const finishSettle = () => {
      if (settled || turnId !== this.currentTurnId) {
        this.trace('ignored_stale_settle', eventToSend, { currentTurnId: this.currentTurnId });
        return;
      }

      settled = true;
      this.isSending = false;
      this.currentEvent = null;
      this.currentSettle = null;

      if (this.ackTimer) {
        clearTimeout(this.ackTimer);
        this.ackTimer = null;
      }

      if (this.releaseTimer) {
        clearTimeout(this.releaseTimer);
        this.releaseTimer = null;
      }

      this.trace('settled', eventToSend);
      this.flush();
    };

    const settle = () => {
      if (turnId !== this.currentTurnId) {
        this.trace('ignored_stale_callback', eventToSend, { currentTurnId: this.currentTurnId });
        return;
      }

      if (settled || this.releaseTimer) {
        return;
      }

      const elapsedMs = Date.now() - sentAt;
      const remainingMs = minimumSettleMs - elapsedMs;
      if (remainingMs > 0) {
        this.releaseTimer = setTimeout(() => {
          this.releaseTimer = null;
          finishSettle();
        }, remainingMs);
        return;
      }

      finishSettle();
    };

    this.currentSettle = settle;
    this.ackTimer = setTimeout(() => {
      this.ackTimer = null;
      settle();
    }, this.ackTimeoutMs);

    try {
      this.trace('sent', eventToSend);
      this.sendPayload(eventToSend, settle);
    } catch (error) {
      if (this.ackTimer) {
        clearTimeout(this.ackTimer);
        this.ackTimer = null;
      }

      settled = true;
      this.isSending = false;
      this.currentEvent = null;
      this.currentSettle = null;
      this.currentTurnId = 0;
      this.pendingEvents.unshift(event);

      if (typeof this.onError === 'function') {
        this.onError(error, eventToSend);
      }

      this.trace('send_error', eventToSend);
      this.scheduleRetry();
    }
  }

  getBlockingSettleDelay(event) {
    if (typeof this.getSettleDelayMs === 'function') {
      const delayMs = this.getSettleDelayMs(event);
      if (Number.isFinite(delayMs) && delayMs >= 0) {
        return delayMs;
      }
    }

    return this.minBlockingSettleMs;
  }
}
