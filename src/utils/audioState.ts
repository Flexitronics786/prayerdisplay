// Simple event emitter for audio state to coordinate between
// prayer alerts and KeepAwake mechanisms (especially on Firestick)

export const AUDIO_EVENTS = {
    ALERT_STARTED: 'prayer-alert-started',
    ALERT_ENDED: 'prayer-alert-ended'
};

export const notifyAlertStarted = () => document.dispatchEvent(new Event(AUDIO_EVENTS.ALERT_STARTED));
export const notifyAlertEnded = () => document.dispatchEvent(new Event(AUDIO_EVENTS.ALERT_ENDED));
