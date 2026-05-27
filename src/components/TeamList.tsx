import { SKILL_LABELS, type Team } from "../lib/database.types";

export default function TeamList({ teams }: { teams: Team[] | null }) {
  if (teams === null) {
    return (
      <div className="card divide-y divide-neutral-100">
        {[0, 1, 2].map((i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <div className="h-10 w-10 animate-pulse rounded-full bg-neutral-100" />
            <div className="flex-1 space-y-2">
              <div className="h-3 w-32 animate-pulse rounded bg-neutral-100" />
              <div className="h-3 w-48 animate-pulse rounded bg-neutral-100" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const active = teams.filter((t) => t.status === "active");
  if (active.length === 0) {
    return (
      <div className="card flex items-center justify-center p-10 text-sm text-neutral-500">
        Noch keine Teams angemeldet.
      </div>
    );
  }

  return (
    <ol className="card divide-y divide-neutral-100">
      {active.map((team, idx) => (
        <li key={team.id} className="flex items-center gap-4 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-court-50 text-sm font-semibold text-court-700">
            {idx + 1}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <p className="truncate text-base font-semibold text-neutral-900">
                {team.team_name}
              </p>
              <SkillBadge level={team.skill_level} />
            </div>
            <p className="mt-0.5 truncate text-sm text-neutral-500">
              {team.player_1} · {team.player_2}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SkillBadge({ level }: { level: Team["skill_level"] }) {
  const styles: Record<Team["skill_level"], string> = {
    beginner: "bg-emerald-50 text-emerald-700 ring-emerald-100",
    intermediate: "bg-amber-50 text-amber-700 ring-amber-100",
    advanced: "bg-rose-50 text-rose-700 ring-rose-100",
  };
  return (
    <span
      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ring-1 ring-inset ${styles[level]}`}
    >
      {SKILL_LABELS[level]}
    </span>
  );
}
