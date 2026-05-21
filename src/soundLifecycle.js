let lifecycleHandlersBound = false;

export function bindSoundLifecycleResumeHandlers(sound) {
    if (lifecycleHandlersBound || typeof window === 'undefined' || typeof document === 'undefined') return;
    lifecycleHandlersBound = true;

    const resumeAudio = () => {
        resumeSoundAfterPageReturn(sound);
    };
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') resumeAudio();
    });
    window.addEventListener('pageshow', resumeAudio);
    window.addEventListener('focus', resumeAudio);
}

export async function resumeSoundAfterPageReturn(sound) {
    if (!sound.ctx) return;
    await sound.resume();
    if (!sound.ctx || sound.ctx.state !== 'running') return;

    if (sound.isPlaying && sound.currentPattern && !sound.schedulerId) {
        sound.nextNoteTime = sound.ctx.currentTime + 0.1;
        sound.scheduler();
    }
}
