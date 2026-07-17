import { useEffect, useMemo, useState } from "react";
import { TOURNAMENT } from "../lib/tournament";
import { useT } from "../lib/i18n";
import PadelRacketsArt from "./PadelRacketsArt";

// Tournament start baked to CEST (UTC+2). Date/time can be overridden via settings.
function computeTargets(dateISO: string, startTime: string) {
  const target = new Date(`${dateISO}T${startTime}:00+02:00`).getTime();
  return { target, end: target + TOURNAMENT.durationHours * 60 * 60 * 1000 };
}

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

export default function Countdown({
  dateISO = TOURNAMENT.dateISO,
  startTime = TOURNAMENT.startTime,
}: { dateISO?: string; startTime?: string } = {}) {
  const t = useT();
  const [now, setNow] = useState(() => Date.now());
  const { target: TARGET_MS, end: ESTIMATED_END_MS } = useMemo(
    () => computeTargets(dateISO, startTime),
    [dateISO, startTime],
  );

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
    <div className="relative col-span-12 flex flex-col overflow-hidden border-2 border-secondary bg-deep-void p-6 sm:p-8 md:col-span-4">
      <div className="bg-dots pointer-events-none absolute inset-0 opacity-10" />

      {/* Mobile only: small rackets in top-right corner */}
      <PadelRacketsArt className="absolute right-3 top-3 h-12 w-auto text-secondary opacity-50 md:hidden" />

      <div className="relative flex h-full flex-col">
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

        {/* Desktop only: large rackets fill empty space below cells */}
        {!live && !finished && (
          <div className="mt-auto hidden flex-1 items-end justify-center pt-6 md:flex">
            <PadelRacketsArt className="h-32 w-auto text-secondary opacity-70 lg:h-40" />
          </div>
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
