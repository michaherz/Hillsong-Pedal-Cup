import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import type { Database, Division, Match, Team } from "../lib/database.types";
import { useT } from "../lib/i18n";

type MatchUpdate = Database["public"]["Tables"]["matches"]["Update"];
type MatchInsert = Database["public"]["Tables"]["matches"]["Insert"];

type Props = {
  teams: Team[];
  matches: Match[];
  courts: number;
  onClose: () => void;
};

/**
 * Admin match editor. Writes directly to the matches table (RLS allows
 * authenticated all). Lets the admin swap either team, change court/wave,
 * toggle walkover, delete a match and add a new one. Collisions on
 * (wave, court) are validated before writing.
 */
export default function MatchEditor({ teams, matches, courts, onClose }: Props) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const sorted = useMemo(
    () =>
      [...matches].sort((a, b) => {
        if (a.phase !== b.phase) return a.phase === "league" ? -1 : 1;
        if ((a.wave ?? 0) !== (b.wave ?? 0)) return (a.wave ?? 0) - (b.wave ?? 0);
        return a.court - b.court;
      }),
    [matches],
  );

  function collides(
    wave: number | null,
    court: number,
    exceptId: string | null,
  ): boolean {
    return matches.some(
      (m) =>
        m.id !== exceptId &&
        m.wave === wave &&
        m.court === court,
    );
  }

  async function patch(id: string, fields: MatchUpdate) {
    setBusy(true);
    setError(null);
    const { error: e } = await supabase
      .from("matches")
      .update(fields)
      .eq("id", id);
    setBusy(false);
    if (e) setError(e.message);
  }

  async function moveMatch(m: Match, wave: number, court: number) {
    if (collides(wave, court, m.id)) {
      setError(t("editorCollision"));
      return;
    }
    await patch(m.id, { wave, court });
  }

  async function removeMatch(m: Match) {
    if (!confirm(t("editorConfirmDelete"))) return;
    setBusy(true);
    setError(null);
    const { error: e } = await supabase.from("matches").delete().eq("id", m.id);
    setBusy(false);
    if (e) setError(e.message);
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-deep-void/85 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative max-h-[90vh] w-full max-w-3xl overflow-y-auto border-2 border-primary bg-surface-container shadow-hard"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between border-b-2 border-outline-variant bg-deep-void px-5 py-3">
          <p className="label-caps text-primary">{t("matchEditorTitle")}</p>
          <button
            onClick={onClose}
            className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface-variant transition-colors hover:border-stadium-white hover:text-stadium-white"
          >
            ✕
          </button>
        </header>

        {error && (
          <p className="border-b-2 border-error bg-error-container/40 px-5 py-2 text-sm text-error">
            {error}
          </p>
        )}

        <div className="space-y-2 p-5">
          {sorted.map((m) => (
            <EditorRow
              key={m.id}
              match={m}
              teams={teams}
              courts={courts}
              busy={busy}
              onPatch={(fields) => patch(m.id, fields)}
              onMove={(wave, court) => moveMatch(m, wave, court)}
              onDelete={() => removeMatch(m)}
            />
          ))}

          {adding ? (
            <AddMatchForm
              teams={teams}
              courts={courts}
              busy={busy}
              onCancel={() => setAdding(false)}
              onSubmit={async (row) => {
                if (collides(row.wave, row.court, null)) {
                  setError(t("editorCollision"));
                  return;
                }
                setBusy(true);
                setError(null);
                const { error: e } = await supabase.from("matches").insert(row);
                setBusy(false);
                if (e) {
                  setError(e.message);
                  return;
                }
                setAdding(false);
              }}
            />
          ) : (
            <button
              onClick={() => setAdding(true)}
              className="mt-2 w-full border-2 border-dashed border-outline-variant px-3 py-2 label-caps text-on-surface-variant transition-colors hover:border-primary hover:text-primary"
            >
              {t("editorAddMatch")}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function EditorRow({
  match,
  teams,
  courts,
  busy,
  onPatch,
  onMove,
  onDelete,
}: {
  match: Match;
  teams: Team[];
  courts: number;
  busy: boolean;
  onPatch: (fields: MatchUpdate) => void;
  onMove: (wave: number, court: number) => void;
  onDelete: () => void;
}) {
  const t = useT();
  const activeTeams = teams.filter((tt) => tt.status === "active");
  return (
    <div className="border-2 border-outline-variant bg-surface-container-high p-3">
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="font-mono label-caps text-on-surface-variant">
          {match.phase === "final" ? "FINAL" : "LIGA"}
          {match.is_fun ? " · FUN" : ""}
          {match.division ? ` · ${match.division.toUpperCase()}` : ""}
        </span>
        <button
          onClick={onDelete}
          disabled={busy}
          className="label-caps px-2 py-1 text-error transition-colors hover:text-stadium-white disabled:opacity-40"
        >
          {t("adminDelete")}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <TeamSelect
          label="A"
          value={match.team_a_id}
          teams={activeTeams}
          onChange={(id) => onPatch({ team_a_id: id })}
        />
        <TeamSelect
          label="B"
          value={match.team_b_id}
          teams={activeTeams}
          onChange={(id) => onPatch({ team_b_id: id })}
        />
      </div>

      <div className="mt-2 grid grid-cols-3 items-end gap-2">
        <label className="block">
          <span className="label-caps mb-1 block text-on-surface-variant">
            {t("editorWave")}
          </span>
          <input
            type="number"
            min={1}
            value={match.wave ?? 1}
            disabled={busy}
            onChange={(e) =>
              onMove(Math.max(1, parseInt(e.target.value, 10) || 1), match.court)
            }
            className="input"
          />
        </label>
        <label className="block">
          <span className="label-caps mb-1 block text-on-surface-variant">
            {t("editorCourt")}
          </span>
          <select
            className="input"
            value={match.court}
            disabled={busy}
            onChange={(e) =>
              onMove(match.wave ?? 1, parseInt(e.target.value, 10))
            }
          >
            {Array.from({ length: Math.max(courts, match.court) }, (_, i) => i + 1).map(
              (c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ),
            )}
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={match.is_walkover}
            disabled={busy}
            onChange={(e) =>
              onPatch(
                e.target.checked
                  ? { is_walkover: true, status: "done" }
                  : { is_walkover: false },
              )
            }
          />
          <span className="label-caps text-on-surface-variant">
            {t("walkoverBadge")}
          </span>
        </label>
      </div>
    </div>
  );
}

function TeamSelect({
  label,
  value,
  teams,
  onChange,
}: {
  label: string;
  value: string | null;
  teams: Team[];
  onChange: (id: string | null) => void;
}) {
  const t = useT();
  return (
    <label className="block">
      <span className="label-caps mb-1 block text-on-surface-variant">
        {t("teamSide", { side: label })}
      </span>
      <select
        className="input"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : e.target.value)}
      >
        <option value="">{t("editorNoTeam")}</option>
        {teams.map((tt) => (
          <option key={tt.id} value={tt.id}>
            {tt.team_name}
          </option>
        ))}
      </select>
    </label>
  );
}

type NewMatchRow = MatchInsert;

function AddMatchForm({
  teams,
  courts,
  busy,
  onCancel,
  onSubmit,
}: {
  teams: Team[];
  courts: number;
  busy: boolean;
  onCancel: () => void;
  onSubmit: (row: NewMatchRow) => Promise<void>;
}) {
  const t = useT();
  const activeTeams = teams.filter((tt) => tt.status === "active");
  const [teamA, setTeamA] = useState<string | null>(null);
  const [teamB, setTeamB] = useState<string | null>(null);
  const [wave, setWave] = useState(1);
  const [court, setCourt] = useState(1);
  const [division, setDivision] = useState<Division>("ober");
  const [isFun, setIsFun] = useState(false);

  return (
    <div className="border-2 border-primary/50 bg-deep-void p-3">
      <p className="label-caps mb-2 text-primary">{t("editorAddMatch")}</p>
      <div className="grid grid-cols-2 gap-2">
        <TeamSelect label="A" value={teamA} teams={activeTeams} onChange={setTeamA} />
        <TeamSelect label="B" value={teamB} teams={activeTeams} onChange={setTeamB} />
      </div>
      <div className="mt-2 grid grid-cols-4 items-end gap-2">
        <label className="block">
          <span className="label-caps mb-1 block text-on-surface-variant">
            {t("editorWave")}
          </span>
          <input
            type="number"
            min={1}
            value={wave}
            onChange={(e) => setWave(Math.max(1, parseInt(e.target.value, 10) || 1))}
            className="input"
          />
        </label>
        <label className="block">
          <span className="label-caps mb-1 block text-on-surface-variant">
            {t("editorCourt")}
          </span>
          <select
            className="input"
            value={court}
            onChange={(e) => setCourt(parseInt(e.target.value, 10))}
          >
            {Array.from({ length: Math.max(courts, 1) }, (_, i) => i + 1).map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="label-caps mb-1 block text-on-surface-variant">
            {t("editorDivision")}
          </span>
          <select
            className="input"
            value={division}
            onChange={(e) => setDivision(e.target.value as Division)}
          >
            <option value="ober">{t("divisionOber")}</option>
            <option value="unter">{t("divisionUnter")}</option>
          </select>
        </label>
        <label className="flex items-center gap-2 pb-2">
          <input
            type="checkbox"
            checked={isFun}
            onChange={(e) => setIsFun(e.target.checked)}
          />
          <span className="label-caps text-on-surface-variant">
            {t("funBadge")}
          </span>
        </label>
      </div>
      <div className="mt-3 flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface hover:border-primary"
        >
          {t("adminCancel")}
        </button>
        <button
          onClick={() =>
            onSubmit({
              round: 1,
              wave,
              court,
              team_a_id: teamA,
              team_b_id: teamB,
              phase: "league",
              division,
              is_fun: isFun,
              bracket_pos: null,
              score_a: null,
              score_b: null,
              status: "scheduled",
              played_at: null,
            })
          }
          disabled={busy}
          className="btn-sm"
        >
          {busy ? "…" : t("adminSave")}
        </button>
      </div>
    </div>
  );
}
