import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { useSettings } from "../lib/hooks";
import { useT } from "../lib/i18n";

const SOUND_KEY = "padel-cup-timer-sound";
const PRESETS = [10, 12, 14, 15] as const;
const LEAD_IN_MS = 5000; // whistle, then 5s get-ready before the clock runs

// Markers we fire exactly once per run.
type Marker = "start" | "half" | "twomin" | "end";

/* ------------------------------------------------ Announcement clips */
// One shared <audio> element whose `src` is swapped per clip. It gets unlocked
// by the very first gesture play (the Start whistle). Only ONE element is ever
// played, so there is no audible multi-clip "priming" burst, and it is the most
// reliable approach on iOS Safari. Cues never overlap (they play one at a time).

const CLIP_URLS = {
  whistle: "/audio/whistle.wav",
  halftime: "/audio/halftime.mp3",
  twomin: "/audio/twominutes.mp3",
  end1: "/audio/end1.mp3",
  end2: "/audio/end2.mp3",
  end3: "/audio/end3.mp3",
  announce1: "/audio/announce1.mp3",
  announce2: "/audio/announce2.mp3",
  announce3: "/audio/announce3.mp3",
  announce4: "/audio/announce4.mp3",
  cheer1: "/audio/cheer1.mp3",
  cheer2: "/audio/cheer2.mp3",
  cheer3: "/audio/cheer3.mp3",
} as const;
type ClipKey = keyof typeof CLIP_URLS;

let sharedAudio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement | null {
  if (typeof window === "undefined") return null;
  if (!sharedAudio) {
    sharedAudio = new Audio();
    sharedAudio.preload = "auto";
  }
  return sharedAudio;
}

function playClip(key: ClipKey, onended?: () => void) {
  const a = getAudio();
  if (!a) {
    onended?.();
    return;
  }
  a.onended = onended ?? null;
  try {
    a.src = CLIP_URLS[key];
    a.currentTime = 0;
  } catch {
    /* ignore */
  }
  void a.play().catch(() => {
    onended?.();
  });
}

// Random one of the three end announcements.
function playEndClip() {
  const keys: ClipKey[] = ["end1", "end2", "end3"];
  playClip(keys[Math.floor(Math.random() * keys.length)]);
}

// End: always the whistle; then the spruch only if withSpruch is true.
function playEndSequence(withSpruch: boolean) {
  if (!withSpruch) {
    playClip("whistle");
    return;
  }
  let done = false;
  const go = () => {
    if (done) return;
    done = true;
    playEndClip();
  };
  playClip("whistle", go);
  // Fallback in case the 'ended' event does not fire.
  window.setTimeout(go, 3500);
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
  const [leadIn, setLeadIn] = useState(0); // seconds left in the get-ready phase
  const [soundOn, setSoundOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem(SOUND_KEY) !== "off";
  });
  // End announcement (spruch) can be turned off separately -> then only the
  // whistle sounds at the end. Halftime + 2-min are unaffected by this.
  const [endAnnounceOn, setEndAnnounceOn] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.localStorage.getItem("padel-cup-timer-endann") !== "off";
  });

  const startAtRef = useRef<number | null>(null);
  const totalSecRef = useRef(14 * 60);
  const firedRef = useRef<Set<Marker>>(new Set());
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const endAnnRef = useRef(endAnnounceOn);
  endAnnRef.current = endAnnounceOn;

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

  useEffect(() => {
    window.localStorage.setItem(
      "padel-cup-timer-endann",
      endAnnounceOn ? "on" : "off",
    );
  }, [endAnnounceOn]);

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
      const nowMs = Date.now();
      // Lead-in phase: whistle already sounded, clock held at full until start.
      if (nowMs < startAt) {
        setLeadIn(Math.ceil((startAt - nowMs) / 1000));
        setRemaining(total);
        return;
      }
      setLeadIn(0);
      const elapsed = (nowMs - startAt) / 1000;
      const rem = total - elapsed;
      setRemaining(rem > 0 ? rem : 0);

      const fired = firedRef.current;
      // Halftime.
      if (!fired.has("half") && elapsed >= total / 2 && rem > 1) {
        fired.add("half");
        cue(() => playClip("halftime"));
      }
      // Two minutes remaining (only meaningful if match is longer than 2 min).
      if (!fired.has("twomin") && total > 120 && rem <= 120 && rem > 1) {
        fired.add("twomin");
        cue(() => playClip("twomin"));
      }
      // End: whistle always; spruch only if the end-announcement toggle is on.
      if (!fired.has("end") && rem <= 0) {
        fired.add("end");
        cue(() => playEndSequence(endAnnRef.current));
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
    const total = minutes * 60;
    totalSecRef.current = total;
    firedRef.current = new Set<Marker>(["start"]);
    startAtRef.current = Date.now() + LEAD_IN_MS; // clock runs after lead-in
    setRemaining(total);
    setLeadIn(Math.ceil(LEAD_IN_MS / 1000));
    setFinished(false);
    setRunning(true);
    cue(() => playClip("whistle")); // whistle immediately on start
  }

  function handleReset() {
    setRunning(false);
    setFinished(false);
    setLeadIn(0);
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
        <div className="flex flex-wrap items-center gap-2">
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
          <button
            onClick={() => setEndAnnounceOn((v) => !v)}
            className={`label-caps inline-flex items-center gap-2 border-2 px-3 py-1.5 transition-colors ${
              endAnnounceOn
                ? "border-primary text-primary hover:bg-primary hover:text-on-primary-container"
                : "border-outline-variant text-on-surface-variant hover:border-primary hover:text-primary"
            }`}
          >
            {endAnnounceOn ? t("timerEndAnnOn") : t("timerEndAnnOff")}
          </button>
        </div>
      </header>

      {/* Countdown */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-8">
        <p className="label-caps text-on-surface-variant">
          {leadIn > 0
            ? t("timerGetReady")
            : t("timerMinutesSet", { min: minutes })}
        </p>
        <div
          className={`select-none font-display uppercase leading-none tracking-tight ${
            finished
              ? "text-tertiary"
              : leadIn > 0
                ? "text-secondary"
                : running
                  ? "text-primary"
                  : "text-stadium-white"
          }`}
          style={{ fontSize: "clamp(5rem, 20vw, 22rem)" }}
        >
          {finished
            ? t("timerTimeUp")
            : leadIn > 0
              ? String(leadIn)
              : fmt(remaining)}
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

        {/* Manual announcement buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="label-caps mr-1 text-on-surface-variant">
            {t("timerAnnHeading")}
          </span>
          {(
            [
              { key: "announce1" as const, label: t("timerAnn1") },
              { key: "announce2" as const, label: t("timerAnn2") },
              { key: "announce3" as const, label: t("timerAnn3") },
              { key: "announce4" as const, label: t("timerAnn4") },
            ]
          ).map((a) => (
            <button
              key={a.key}
              onClick={() => playClip(a.key)}
              className="label-caps border-2 border-secondary px-4 py-2 text-secondary transition-colors hover:bg-secondary hover:text-deep-void"
            >
              {a.label}
            </button>
          ))}
        </div>

        {/* Cheer buttons */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="label-caps mr-1 text-on-surface-variant">
            {t("timerCheerHeading")}
          </span>
          {(
            [
              { key: "cheer1" as const, label: t("timerCheer1") },
              { key: "cheer2" as const, label: t("timerCheer2") },
              { key: "cheer3" as const, label: t("timerCheer3") },
            ]
          ).map((c) => (
            <button
              key={c.key}
              onClick={() => playClip(c.key)}
              className="label-caps border-2 border-tertiary px-4 py-2 text-tertiary transition-colors hover:bg-tertiary hover:text-deep-void"
            >
              {c.label}
            </button>
          ))}
        </div>
        <p className="max-w-lg text-center font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
          {t("timerIosHint")}
        </p>
      </footer>
    </div>
  );
}
