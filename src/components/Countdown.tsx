import { useEffect, useState } from "react";
import { TOURNAMENT } from "../lib/tournament";
import { useT } from "../lib/i18n";

// Tournament starts at 16:00 local Munich time. We bake CEST (UTC+2) into the target.
const TARGET_MS = new Date(`${TOURNAMENT.dateISO}T${TOURNAMENT.startTime}:00+02:00`).getTime();
const ESTIMATED_END_MS = TARGET_MS + TOURNAMENT.durationHours * 60 * 60 * 1000;

type Parts = { d: number; h: number; m: number; s: number };

function partsFromDiff(ms: number): Parts {
  const safe = Math.max(0, ms);
  return {
    d: Math.floor(safe / 86_400_000),
    h: Math.floor((safe % 86_400_000) / 3_600_000),
    m: Math.floor((safe % 3_600_000) / 60_000),
    s: Math.floor((safe % 60_000) / 1000),
  };
}

export default function Countdown() {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = TARGET_MS - now;
  const finished = now > ESTIMATED_END_MS;
  const live = now > TARGET_MS && now <= ESTIMATED_END_MS;
  const parts = partsFromDiff(diff);

  const stateLabel = finished
    ? t("countdownFinished")
    : live
      ? t("countdownLive")
      : t("countdownSubtitle");
  const stateClass = finished
    ? "bg-on-surface-variant"
    : live
      ? "bg-secondary animate-pulse-glow"
      : "bg-primary animate-pulse";

  return (
    <div className="relative col-span-12 overflow-hidden border-2 border-secondary bg-deep-void p-6 sm:p-8 md:col-span-4">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-10" />
      <div className="relative">
        <div className="mb-4 flex items-center gap-2">
          <span className={`h-3 w-3 rounded-full ${stateClass}`} />
          <p className="label-caps text-secondary">{t("countdownHeadline")}</p>
        </div>
        <p className="label-caps mb-4 text-on-surface-variant sm:mb-5">
          {stateLabel}
        </p>

        {!live && !finished && (
          <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
            <Cell value={parts.d} label={t("countdownDays")} />
            <Cell value={parts.h} label={t("countdownHours")} />
            <Cell value={parts.m} label={t("countdownMinutes")} />
            <Cell value={parts.s} label={t("countdownSeconds")} />
          </div>
        )}

        {live && (
          <p className="font-display text-headline-md uppercase leading-none text-stadium-white sm:text-display-md">
            Live now
          </p>
        )}

        {finished && (
          <p className="font-display text-headline-md uppercase leading-none text-stadium-white sm:text-display-md">
            GG · WP
          </p>
        )}
      </div>
    </div>
  );
}

function Cell({ value, label }: { value: number; label: string }) {
  return (
    <div className="border-2 border-outline-variant bg-surface-container px-1 py-2 text-center sm:px-2 sm:py-3">
      <p className="font-display text-2xl uppercase leading-none text-stadium-white tabular-nums sm:text-headline-md">
        {String(value).padStart(2, "0")}
      </p>
      <p className="mt-1 font-mono text-[9px] uppercase tracking-widest text-on-surface-variant sm:text-[10px]">
        {label}
      </p>
    </div>
  );
}
