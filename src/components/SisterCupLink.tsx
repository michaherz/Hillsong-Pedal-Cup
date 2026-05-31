import { TOURNAMENT } from "../lib/tournament";

export default function SisterCupLink() {
  if (!TOURNAMENT.sisterCup?.url) return null;
  return (
    <a
      href={TOURNAMENT.sisterCup.url}
      target="_blank"
      rel="noopener noreferrer"
      className="label-caps inline-flex shrink-0 items-center gap-1 border-2 border-outline-variant px-2 py-1 text-on-surface-variant transition-colors hover:border-secondary hover:text-secondary sm:px-3"
      aria-label={`${TOURNAMENT.sisterCup.label} (öffnet in neuem Tab)`}
    >
      <span className="hidden sm:inline">{TOURNAMENT.sisterCup.label}</span>
      <span className="sm:hidden">⚽</span>
      <span aria-hidden>↗</span>
    </a>
  );
}
