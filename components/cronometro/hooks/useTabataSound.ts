import { useRef, useCallback } from "react";

export function useTabataSound(enabled: boolean) {
  const audioCtxRef = useRef<AudioContext | null>(null);

  const getContext = useCallback(() => {
    if (!audioCtxRef.current || audioCtxRef.current.state === "closed") {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    return audioCtxRef.current;
  }, []);

  const playBeep = useCallback(
    (
      frequency: number,
      duration: number,
      type: OscillatorType = "sine",
      volume = 0.3,
    ) => {
      if (!enabled) return;
      try {
        const ctx = getContext();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.frequency.value = frequency;
        osc.type = type;
        gain.gain.setValueAtTime(volume, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.01,
          ctx.currentTime + duration,
        );
        osc.start(ctx.currentTime);
        osc.stop(ctx.currentTime + duration);
      } catch {
        // AudioContext not available — silent fail
      }
    },
    [enabled, getContext],
  );

  const countdownTick = useCallback(() => playBeep(880, 0.1), [playBeep]);

  const countdownLast = useCallback(
    () => playBeep(1100, 0.2, "square"),
    [playBeep],
  );

  const workStart = useCallback(
    () => playBeep(1200, 0.3, "square"),
    [playBeep],
  );

  const restStart = useCallback(() => playBeep(600, 0.3, "sine"), [playBeep]);

  const finished = useCallback(() => {
    playBeep(800, 0.15);
    setTimeout(() => playBeep(1000, 0.15), 200);
    setTimeout(() => playBeep(1200, 0.3), 400);
  }, [playBeep]);

  return { countdownTick, countdownLast, workStart, restStart, finished };
}
