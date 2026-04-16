import { useEffect, useRef } from "react";

export function useWakeLock(active: boolean) {
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);

  useEffect(() => {
    if (
      !active ||
      typeof navigator === "undefined" ||
      !("wakeLock" in navigator)
    )
      return;

    let released = false;

    navigator.wakeLock
      .request("screen")
      .then((sentinel) => {
        if (released) {
          sentinel.release();
          return;
        }
        wakeLockRef.current = sentinel;
        sentinel.addEventListener("release", () => {
          wakeLockRef.current = null;
        });
      })
      .catch(() => {
        // Wake Lock not supported or permission denied — silent fail
      });

    return () => {
      released = true;
      wakeLockRef.current?.release();
      wakeLockRef.current = null;
    };
  }, [active]);
}
