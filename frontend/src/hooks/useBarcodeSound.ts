"use client";

import { useCallback, useRef } from "react";

export function useBarcodeSound() {
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio when the scanner opens.
  const unlockAudio = useCallback(async () => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new AudioContext();
      }

      if (audioContextRef.current.state === "suspended") {
        await audioContextRef.current.resume();
      }
    } catch (error) {
      console.error("Unable to initialize scanner sound:", error);
    }
  }, []);

  // Generate a deeper, richer scanner tone.

  const playTone = useCallback(
    (
      frequency: number,
      startTime: number,
      duration: number,
      volume = 0.3,
      endFrequency?: number,
    ) => {
      const context = audioContextRef.current;

      if (!context || context.state !== "running") return;

      const oscillator = context.createOscillator();
      const secondOscillator = context.createOscillator();
      const gain = context.createGain();

      oscillator.type = "triangle";
      oscillator.frequency.setValueAtTime(frequency, startTime);

      // Optional descending pitch.
      if (endFrequency) {
        oscillator.frequency.exponentialRampToValueAtTime(
          endFrequency,
          startTime + duration,
        );
      }

      secondOscillator.type = "sine";
      secondOscillator.frequency.setValueAtTime(frequency * 1.5, startTime);

      gain.gain.setValueAtTime(0.0001, startTime);
      gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

      oscillator.connect(gain);
      secondOscillator.connect(gain);
      gain.connect(context.destination);

      oscillator.start(startTime);
      secondOscillator.start(startTime);

      oscillator.stop(startTime + duration);
      secondOscillator.stop(startTime + duration);
    },
    [],
  );

  // Realistic retail POS success beep.
  const playSuccess = useCallback(() => {
    const context = audioContextRef.current;

    if (!context || context.state !== "running") return;

    playTone(2700, context.currentTime, 0.12, 0.22);
  }, [playTone]);

  // Low-pitched double "donk" error sound.
  const playError = useCallback(() => {
    const context = audioContextRef.current;

    if (!context || context.state !== "running") return;

    const now = context.currentTime;

    playTone(250, now, 0.18, 0.35, 150);
    playTone(250, now + 0.25, 0.18, 0.35, 150);
  }, [playTone]);

  return {
    unlockAudio,
    playSuccess,
    playError,
  };
}
