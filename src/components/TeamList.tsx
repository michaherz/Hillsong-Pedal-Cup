import { useT } from "../lib/i18n";
import type { Team } from "../lib/database.types";

export default function TeamList({ teams }: { teams: Team[] | null }) {
  const t = useT();

  if (teams === null) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="border-2 border-outline-variant bg-surface-container p-5"
          >
            <div className="h-3 w-24 animate-pulse bg-surface-bright" />
            <div className="mt-3 h-4 w-40 animate-pulse bg-surface-bright" />
            <div className="mt-2 h-3 w-32 animate-pulse bg-surface-bright" />
          </div>
        ))}
      </div>
    );
  }

  const active = teams.filter((t) => t.status === "active");
  if (active.length === 0) {
    return (
      <div className="border-2 border-dashed border-outline-variant bg-surface-container p-10 text-center">
        <p className="font-display text-headline-sm uppercase text-on-surface-variant">
          {t("listEmptyCard")}
        </p>
      </div>
    );
  }

  return (
    <ol className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {active.map((team, idx) => (
        <li
          key={team.id}
          className="group relative border-2 border-outline-variant bg-surface-container p-5 transition-all hover:border-primary hover:shadow-hard-sm"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="font-mono text-label-caps tracking-[0.12em] text-on-surface-variant">
              #{String(idx + 1).padStart(2, "0")}
            </span>
            <SkillBadge level={team.skill_level} />
          </div>
          <p className="mt-3 truncate font-display text-headline-sm uppercase text-stadium-white sm:text-headline-md">
            {team.team_name}
          </p>
          <p className="mt-1 truncate font-body text-body-sm text-on-surface-variant">
            {team.player_1} · {team.player_2}
          </p>
        </li>
      ))}
    </ol>
  );
}

function SkillBadge({ level }: { level: Team["skill_level"] }) {
  const t = useT();
  const styles: Record<Team["skill_level"], string> = {
    beginner: "border-secondary text-secondary",
    intermediate: "border-tertiary text-tertiary",
    advanced: "border-error text-error",
  };
  const labels: Record<Team["skill_level"], string> = {
    beginner: t("skillBeginner"),
    intermediate: t("skillIntermediate"),
    advanced: t("skillAdvanced"),
  };
  return (
    <span
      className={`label-caps shrink-0 border-2 px-2 py-0.5 ${styles[level]}`}
    >
      {labels[level]}
    </span>
  );
}
