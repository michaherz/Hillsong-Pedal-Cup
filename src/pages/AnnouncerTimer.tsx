import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useSettings } from "../lib/hooks";
import { useT } from "../lib/i18n";

const SOUND_KEY = "padel-cup-timer-sound";
const PRESETS = [10, 12, 14, 15] as const;

// Markers we fire exactly once per run.
type Marker = "start" | "half" | "twomin" | "end";

/* ---------------------------------------------------------- Web Audio helper */

let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const AC =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!AC) return null;
  if (!audioCtx) audioCtx = new AC();
  return audioCtx;
}

// Two short ~880Hz beeps.
function playStartTone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  [0, 0.28].forEach((offset) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(880, now + offset);
    gain.gain.setValueAtTime(0.0001, now + offset);
    gain.gain.exponentialRampToValueAtTime(0.35, now + offset + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.2);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + offset);
    osc.stop(now + offset + 0.22);
  });
}

// Longer, lower horn: 440Hz sliding down to 220Hz.
function playEndTone() {
  const ctx = getAudioContext();
  if (!ctx) return;
  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(440, now);
  osc.frequency.linearRampToValueAtTime(220, now + 1.4);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(0.4, now + 0.05);
  gain.gain.setValueAtTime(0.4, now + 1.1);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.6);
  osc.connect(gain).connect(ctx.destination);
  osc.start(now);
  osc.stop(now + 1.65);
}

function speak(text: string) {
  if (typeof window === "undefined") return;
  if (!("speechSynthesis" in window)) return;
  const u = new SpeechSynthesisUtterance(text);
  u.lang = "de-DE";
  u.rate = 0.95;
  window.speechSynthesis.speak(u);
}

function fmt(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  const mm = Math.floor(s / 60);
  const ss = s % 60;
  return `${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
}

/* ---------------------------------------------------------- Component */

export default function AnnouncerTimer() {
  const t = useT();
  const settings = useSettings();

  const [minutes, setMinutes] = useState(14);
  const [minutesTouched, setMinutesTouched] = useState(false);
  const [running, setRunning] = useState(false);
  const [finished, setFinished] = useState(false);
  const [remaining, setRemaining] = useState(14 * 60);
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  });

  const startAtRef = useRef<number | null>(null);
  const totalSecRef = useRef(14 * 60);
  const firedRef = useRef<Set<Marker>>(new Set());
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;

  // Adopt settings.match_minutes as the default until the user edits it.
  useEffect(() => {
    if (minutesTouched || running || finished) return;
    const m = settings?.match_minutes ?? 14;
    if (m > 0) {
      setMinutes(m);
      setRemaining(m * 60);
      totalSecRef.current = m * 60;
    }
  }, [settings?.match_minutes, minutesTouched, running, finished]);

  useEffect(() => {
    window.localStorage.setItem(SOUND_KEY, soundOn ? "on" : "off");
  }, [soundOn]);

  const cue = useCallback((fn: () => void) => {
    if (soundRef.current) fn();
  }, []);

  // Persist minutes to settings so scoring timer + schedule stay in sync.
  const persistMinutes = useCallback((n: number) => {
    void supabase.from("settings").update({ match_minutes: n }).eq("id", 1);
  }, []);

  const applyMinutes = useCallback(
    (n: number) => {
      if (running) return;
      const clamped = Math.min(90, Math.max(1, Math.round(n)));
      setMinutesTouched(true);
      setMinutes(clamped);
      setRemaining(clamped * 60);
      setFinished(false);
      totalSecRef.current = clamped * 60;
      persistMinutes(clamped);
    },
    [running, persistMinutes],
  );

  // Tick: recompute remaining from stored start timestamp (drift-robust).
  useEffect(() => {
    if (!running) return;
    const total = totalSecRef.current;

    const tick = () => {
      const startAt = startAtRef.current;
      if (startAt == null) return;
      const elapsed = (Date.now() - startAt) / 1000;
      const rem = total - elapsed;
      setRemaining(rem > 0 ? rem : 0);

      const fired = firedRef.current;
      // Halftime.
      if (!fired.has("half") && elapsed >= total / 2 && rem > 1) {
        fired.add("half");
        cue(() => speak("Halbzeit"));
      }
      // Two minutes remaining (only meaningful if match is longer than 2 min).
      if (!fired.has("twomin") && total > 120 && rem <= 120 && rem > 1) {
        fired.add("twomin");
        cue(() => speak("Noch zwei Minuten"));
      }
      // End.
      if (!fired.has("end") && rem <= 0) {
        fired.add("end");
        cue(() => {
          playEndTone();
          speak("Zeit");
        });
        setRunning(false);
        setFinished(true);
        setRemaining(0);
      }
    };

    const id = window.setInterval(tick, 250);
    tick();
    return () => window.clearInterval(id);
  }, [running, cue]);

  function handleStart() {
    // Unlock iOS audio INSIDE the tap handler.
    const ctx = getAudioContext();
    if (ctx && ctx.state === "suspended") void ctx.resume();
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      // Prime the speech engine with a near-silent utterance.
      const prime = new SpeechSynthesisUtterance(" ");
      prime.lang = "de-DE";
      prime.volume = 0;
      window.speechSynthesis.speak(prime);
    }

    const total = minutes * 60;
    totalSecRef.current = total;
    firedRef.current = new Set<Marker>(["start"]);
    startAtRef.current = Date.now();
    setRemaining(total);
    setFinished(false);
    setRunning(true);
    cue(() => playStartTone());
  }

  function handleReset() {
    setRunning(false);
    setFinished(false);
    startAtRef.current = null;
    firedRef.current = new Set();
    totalSecRef.current = minutes * 60;
    setRemaining(minutes * 60);
  }

  const canEditMinutes = !running;

  return (
    <div className="flex min-h-screen flex-col bg-deep-void text-stadium-white">
      {/* Header */}
      <header className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-outline-variant px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              running ? "animate-pulse-glow bg-secondary" : "bg-on-surface-variant"
            }`}
          />
          <h1 className="font-display text-headline-sm uppercase text-stadium-white sm:text-headline-md">
            {t("timerScreenTitle")}
          </h1>
        </div>
        <button
          onClick={() => setSoundOn((v) => !v)}
          className={`label-caps inline-flex items-center gap-2 border-2 px-3 py-1.5 transition-colors ${
            soundOn
              ? "border-secondary text-secondary hover:bg-secondary hover:text-deep-void"
              : "border-tertiary text-tertiary hover:bg-tertiary hover:text-deep-void"
          }`}
        >
          {soundOn ? t("timerSoundOn") : t("timerSoundOff")}
        </button>
      </header>

      {/* Countdown */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        <p className="label-caps text-on-surface-variant">
          {t("timerMinutesSet", { min: minutes })}
        </p>
        <div
          className={`select-none font-display uppercase leading-none tracking-tight ${
            finished
              ? "text-tertiary"
              : running
                ? "text-primary"
                : "text-stadium-white"
          }`}
          style={{ fontSize: "clamp(5rem, 20vw, 22rem)" }}
        >
          {finished ? t("timerTimeUp") : fmt(remaining)}
        </div>

        {/* Minutes control (only when not running) */}
        {canEditMinutes && (
          <div className="flex flex-col items-center gap-3">
            <p className="label-caps text-on-surface-variant">
              {t("timerMinutesLabel")}
            </p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => applyMinutes(minutes - 1)}
                className="border-2 border-outline-variant px-4 py-2 font-display text-headline-md text-stadium-white transition-colors hover:border-primary hover:text-primary"
                aria-label="-1"
              >
                -
              </button>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                max={90}
                value={minutes}
                onChange={(e) => {
                  const n = parseInt(e.target.value, 10);
                  if (!Number.isNaN(n)) applyMinutes(n);
                }}
                className="w-24 border-2 border-outline-variant bg-surface-container px-2 py-2 text-center font-display text-headline-md text-stadium-white focus:border-primary focus:outline-none"
              />
              <button
                onClick={() => applyMinutes(minutes + 1)}
                className="border-2 border-outline-variant px-4 py-2 font-display text-headline-md text-stadium-white transition-colors hover:border-primary hover:text-primary"
                aria-label="+1"
              >
                +
              </button>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  onClick={() => applyMinutes(p)}
                  className={`label-caps border-2 px-4 py-1.5 transition-colors ${
                    minutes === p
                      ? "border-primary bg-primary text-on-primary-container"
                      : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
                  }`}
                >
                  {t("timerPreset", { min: p })}
                </button>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Controls */}
      <footer className="flex flex-col items-center gap-3 border-t-2 border-outline-variant px-5 py-6 sm:px-8">
        <div className="flex flex-wrap items-center justify-center gap-3">
          {!running && (
            <button onClick={handleStart} className="btn-primary text-headline-md">
              {t("timerStartBtn")}
            </button>
          )}
          <button onClick={handleReset} className="btn-ghost">
            {t("timerRestartBtn")}
          </button>
        </div>
        <p className="max-w-lg text-center font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
          {t("timerIosHint")}
        </p>
      </footer>
    </div>
  );
}
