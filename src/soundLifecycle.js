let lifecycleHandlersBound = false;
let needsGestureResume = false;

export function bindSoundLifecycleResumeHandlers(sound) {
    if (lifecycleHandlersBound || typeof window === 'undefined' || typeof document === 'undefined') return;
    lifecycleHandlersBound = true;

    const resumeAudio = () => {
        needsGestureResume = true;
        resumeSoundAfterPageReturn(sound);
    };
    const resumeFromGesture = () => {
        if (!needsGestureResume || !sound.ctx || sound.ctx.state === 'running') return;
        resumeSoundAfterPageReturn(sound, { userGesture: true });
    };
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') resumeAudio();
    });
    window.addEventListener('pageshow', resumeAudio);
    window.addEventListener('focus', resumeAudio);
    ['touchend', 'pointerup', 'mousedown', 'keydown', 'click'].forEach(eventName => {
        document.addEventListener(eventName, resumeFromGesture, { capture: true });
    });
}

export async function resumeSoundAfterPageReturn(sound, { userGesture = false } = {}) {
    if (!sound.ctx) return;
    if (userGesture) {
        await sound.activateFromUserGesture();
    } else {
        await sound.resume();
    }
    if (!sound.ctx || sound.ctx.state !== 'running') {
        needsGestureResume = true;
        return;
    }
    needsGestureResume = false;

    if (sound.isPlaying && sound.currentPattern && !sound.schedulerId) {
        sound.nextNoteTime = sound.ctx.currentTime + 0.1;
        sound.scheduler();
    }
}
