import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import type { Session } from "@supabase/supabase-js";
import { ADMIN_EMAIL, supabase } from "../lib/supabase";
import { type Settings, type Team, type Match, type Division, type Database } from "../lib/database.types";
import { useMatches, useSettings, useTeams } from "../lib/hooks";
import { TOURNAMENT } from "../lib/tournament";
import { useT } from "../lib/i18n";
import { resetTournament } from "../lib/demo-mode";
import TournamentPanel from "../components/TournamentPanel";

export default function Score() {
  const t = useT();
  const [session, setSession] = useState<Session | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoaded(true);
    });
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => subscription.unsubscribe();
  }, []);

  if (!loaded) {
    return (
      <div className="grid min-h-full place-items-center bg-background text-on-surface-variant">
        <p className="label-caps">{t("loadingShort")}</p>
      </div>
    );
  }
  if (!session) return <SignInGate />;
  return <Admin onSignOut={() => supabase.auth.signOut()} />;
}

function SignInGate() {
  const t = useT();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!ADMIN_EMAIL) {
      setError("VITE_ADMIN_EMAIL is not set.");
      return;
    }
    setLoading(true);
    setError(null);
    const { error: authError } = await supabase.auth.signInWithPassword({
      email: ADMIN_EMAIL,
      password: pin,
    });
    setLoading(false);
    if (authError) {
      console.error("Auth error", authError);
      setError(`${authError.message}`);
      setPin("");
    }
  }

  return (
    <div className="grid min-h-full place-items-center bg-background px-5">
      <form onSubmit={submit} className="panel-pop w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center border-2 border-primary text-primary">
            <LockIcon />
          </div>
          <h1 className="mt-4 font-display text-headline-md uppercase text-stadium-white">
            {t("scoreMode")}
          </h1>
          <p className="label-caps mt-2 text-on-surface-variant">
            {t("pinPrompt")}
          </p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          autoComplete="off"
          className="input text-center text-2xl tracking-[0.5em]"
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {error && (
          <p className="mt-3 border-2 border-error bg-error-container/40 px-3 py-2 text-center text-sm text-error">
            {error}
          </p>
        )}
        <button
          type="submit"
          disabled={pin.length < 4 || loading}
          className="btn-primary mt-6 w-full"
        >
          {loading ? t("checking") : t("unlock")}
        </button>
      </form>
    </div>
  );
}

function Admin({ onSignOut }: { onSignOut: () => void }) {
  const t = useT();
  const teams = useTeams();
  const settings = useSettings();
  const matches = useMatches();
  const publicUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-full bg-background">
      <div className="mx-auto max-w-5xl space-y-4 px-5 py-5 sm:px-8 sm:py-8">
        <header className="flex flex-wrap items-center justify-between gap-3 border-2 border-outline-variant bg-surface-container px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 animate-pulse-glow rounded-full bg-secondary" />
            <p className="font-display text-headline-sm uppercase text-stadium-white">
              {t("scoreMode")}
            </p>
            <span className="ml-2 hidden label-caps text-on-surface-variant sm:inline">
              {TOURNAMENT.name}
            </span>
          </div>
          <div className="flex items-center gap-2 sm:gap-3">
            <a
              href="/poster"
              target="_blank"
              rel="noopener noreferrer"
              className="label-caps inline-flex items-center gap-2 border-2 border-secondary px-3 py-1.5 text-secondary transition-colors hover:bg-secondary hover:text-deep-void"
              title={t("printPosterSlideHint")}
            >
              ▢ {t("printPosterSlide")}
            </a>
            <button
              onClick={onSignOut}
              className="label-caps text-on-surface-variant transition-colors hover:text-primary"
            >
              {t("signOut")}
            </button>
          </div>
        </header>

        <div className="grid gap-4 lg:grid-cols-3">
          <RegistrationToggle
            open={settings?.registration_open ?? true}
            disabled={!settings}
          />
          <PublicLinkCard url={publicUrl} />
          <TeamCountCard
            count={(teams ?? []).filter((t) => t.status === "active").length}
          />
        </div>

        {settings && <SetRuleCard settings={settings} />}
        {settings && (
          <ModeAndVisibilityCard
            settings={settings}
            scheduleExists={(matches ?? []).length > 0}
          />
        )}
        {settings && <PriceCard settings={settings} />}
        {settings && <TournamentConfigCard settings={settings} />}

        <section className="border-2 border-outline-variant bg-surface-container">
          <header className="flex items-center justify-between border-b-2 border-outline-variant px-5 py-4">
            <h2 className="font-display text-headline-sm uppercase text-stadium-white">
              {t("adminTeamsHeading")}
            </h2>
            <p className="label-caps text-on-surface-variant">
              {t("adminTotal", { count: teams?.length ?? 0 })}
            </p>
          </header>
          <AdminTeamTable
            teams={teams}
            matches={matches}
            phase={settings?.tournament_phase ?? "registration"}
            showDivision={(settings?.tournament_mode ?? "box") === "box"}
          />
        </section>

        {settings && teams && matches && (
          <TournamentPanel
            teams={teams}
            matches={matches}
            settings={settings}
          />
        )}

        {settings && <DangerZone />}
      </div>
    </div>
  );
}

function RegistrationToggle({
  open,
  disabled,
}: {
  open: boolean;
  disabled: boolean;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    await supabase
      .from("settings")
      .update({ registration_open: !open })
      .eq("id", 1);
    setBusy(false);
  }
  return (
    <div className="border-2 border-outline-variant bg-surface-container p-5">
      <p className="label-caps text-on-surface-variant">
        {t("cardRegistration")}
      </p>
      <p className="mt-2 font-display text-display-md uppercase leading-none text-stadium-white">
        {open ? t("cardOpen") : t("cardClosed")}
      </p>
      <button
        onClick={toggle}
        disabled={disabled || busy}
        className={`${open ? "btn-ghost" : "btn-primary"} mt-4 w-full`}
      >
        {busy ? "…" : open ? t("closeReg") : t("openReg")}
      </button>
    </div>
  );
}

function PublicLinkCard({ url }: { url: string }) {
  const t = useT();
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  function copy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  function download() {
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) return;
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "padel-cup-2026-qr.png";
      link.click();
      setTimeout(() => URL.revokeObjectURL(link.href), 1000);
    }, "image/png");
  }

  return (
    <div className="border-2 border-outline-variant bg-surface-container p-5">
      <p className="label-caps text-on-surface-variant">{t("publicLink")}</p>
      <p className="mt-2 truncate font-mono text-body-sm text-stadium-white">
        {url}
      </p>
      <div className="mt-4 flex items-center gap-4">
        <div className="shrink-0 border-2 border-stadium-white bg-stadium-white p-1.5">
          <QRCodeSVG value={url || "https://"} size={64} />
        </div>
        <QRCodeCanvas
          value={url || "https://"}
          size={1024}
          marginSize={4}
          ref={canvasRef}
          style={{ display: "none" }}
        />
        <div className="flex flex-col gap-2">
          <button
            onClick={copy}
            className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            {copied ? t("copied") : t("copy")}
          </button>
          <button
            onClick={download}
            className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface transition-colors hover:border-primary hover:text-primary"
          >
            {t("download")}
          </button>
        </div>
      </div>
    </div>
  );
}

function TeamCountCard({ count }: { count: number }) {
  const t = useT();
  return (
    <div className="border-2 border-outline-variant bg-surface-container p-5">
      <p className="label-caps text-on-surface-variant">{t("activeTeams")}</p>
      <p className="mt-2 font-display text-display-md uppercase leading-none text-stadium-white">
        {count}
      </p>
      <p className="mt-2 label-caps text-on-surface-variant">
        {t("target", {
          courts: TOURNAMENT.courts,
          hours: TOURNAMENT.durationHours,
        })}
      </p>
    </div>
  );
}

function SetRuleCard({ settings }: { settings: Settings }) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const target = settings.set_target ?? 6;
  const twoLead = settings.set_two_game_lead ?? true;

  async function update(patch: Partial<Pick<Settings, "set_target" | "set_two_game_lead">>) {
    if (busy) return;
    setBusy(true);
    await supabase.from("settings").update(patch).eq("id", 1);
    setBusy(false);
  }

  function openPrint() {
    window.open("/print/turniermodus?auto=1", "_blank", "noopener,noreferrer");
  }

  return (
    <div className="border-2 border-outline-variant bg-surface-container p-5">
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="label-caps text-on-surface-variant">
            {t("setRuleHeading")}
          </p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
            {t("setRuleHint")}
          </p>
        </div>
        <p className="font-display text-headline-sm uppercase text-stadium-white">
          {twoLead
            ? t("setRuleSummaryLead", { target })
            : t("setRuleSummaryNoLead", { target })}
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <p className="label-caps mb-2 text-on-surface-variant">
            {t("setRuleTargetLabel")}
          </p>
          <div className="grid grid-cols-3 border-2 border-outline-variant p-1">
            {[4, 5, 6].map((n) => (
              <button
                key={n}
                onClick={() => update({ set_target: n })}
                disabled={busy}
                className={`px-3 py-2 font-display text-headline-sm uppercase transition-all ${
                  target === n
                    ? "bg-primary text-on-primary-container"
                    : "text-on-surface-variant hover:text-stadium-white"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
        <div>
          <p className="label-caps mb-2 text-on-surface-variant">
            {t("setRuleLeadLabel")}
          </p>
          <div className="grid grid-cols-2 border-2 border-outline-variant p-1">
            <button
              onClick={() => update({ set_two_game_lead: true })}
              disabled={busy}
              className={`px-3 py-2 font-display text-headline-sm uppercase transition-all ${
                twoLead
                  ? "bg-primary text-on-primary-container"
                  : "text-on-surface-variant hover:text-stadium-white"
              }`}
            >
              An
            </button>
            <button
              onClick={() => update({ set_two_game_lead: false })}
              disabled={busy}
              className={`px-3 py-2 font-display text-headline-sm uppercase transition-all ${
                !twoLead
                  ? "bg-primary text-on-primary-container"
                  : "text-on-surface-variant hover:text-stadium-white"
              }`}
            >
              Aus
            </button>
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3 border-t-2 border-outline-variant pt-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
          {t("printTurniermodusHint")}
        </p>
        <button
          onClick={openPrint}
          className="label-caps inline-flex items-center gap-2 border-2 border-tertiary px-3 py-1.5 text-tertiary transition-colors hover:bg-tertiary hover:text-deep-void"
        >
          ⇩ {t("printTurniermodus")}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Mode + visibility */

function ModeAndVisibilityCard({
  settings,
  scheduleExists,
}: {
  settings: Settings;
  scheduleExists: boolean;
}) {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const mode = settings.tournament_mode ?? "box";
  const publicLive = settings.public_live ?? false;

  async function update(
    patch: Database["public"]["Tables"]["settings"]["Update"],
  ) {
    if (busy) return;
    setBusy(true);
    await supabase.from("settings").update(patch).eq("id", 1);
    setBusy(false);
  }

  return (
    <div className="border-2 border-outline-variant bg-surface-container p-5">
      {/* Tournament mode */}
      <div className="flex items-baseline justify-between gap-3">
        <div>
          <p className="label-caps text-on-surface-variant">{t("modeHeading")}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
            {scheduleExists ? t("modeLockedHint") : t("modeHint")}
          </p>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-3">
        {(
          [
            { key: "box" as const, label: t("modeBox"), desc: t("modeBoxDesc") },
            { key: "swiss" as const, label: t("modeSwiss"), desc: t("modeSwissDesc") },
          ]
        ).map((opt) => {
          const active = mode === opt.key;
          return (
            <button
              key={opt.key}
              onClick={() => update({ tournament_mode: opt.key })}
              disabled={busy || scheduleExists}
              className={`border-2 p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-primary bg-primary/10"
                  : "border-outline-variant hover:border-primary"
              }`}
            >
              <span
                className={`block font-display text-headline-sm uppercase ${
                  active ? "text-primary" : "text-stadium-white"
                }`}
              >
                {opt.label}
              </span>
              <span className="mt-1 block font-body text-body-sm text-on-surface-variant">
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Public visibility */}
      <div className="mt-5 border-t-2 border-outline-variant pt-5">
        <div className="flex items-baseline justify-between gap-3">
          <div>
            <p className="label-caps text-on-surface-variant">
              {t("publicVisibleHeading")}
            </p>
            <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
              {t("publicVisibleHint")}
            </p>
          </div>
          <span
            className={`shrink-0 label-caps border-2 px-2 py-1 ${
              publicLive
                ? "border-secondary bg-secondary/15 text-secondary"
                : "border-tertiary bg-tertiary/15 text-tertiary"
            }`}
          >
            {publicLive ? t("publicVisibleOn") : t("publicVisibleOff")}
          </span>
        </div>
        <button
          onClick={() => update({ public_live: !publicLive })}
          disabled={busy}
          className={`${publicLive ? "btn-ghost" : "btn-primary"} mt-3 w-full`}
        >
          {busy ? "…" : publicLive ? t("publicHide") : t("publicShow")}
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------- Danger zone */

function DangerZone() {
  const t = useT();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  async function onReset() {
    if (!confirm(t("resetConfirm"))) return;
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error: e } = await resetTournament();
    setBusy(false);
    if (e) {
      setError(e);
      return;
    }
    setInfo(t("resetDone"));
  }

  return (
    <section className="border-2 border-error/50 bg-error/5 p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <div>
          <p className="label-caps text-error">{t("resetHeading")}</p>
          <p className="mt-1 max-w-2xl font-body text-body-sm text-on-surface-variant">
            {t("resetHint")}
          </p>
        </div>
        <button
          onClick={onReset}
          disabled={busy}
          className="border-2 border-error px-3 py-1.5 label-caps text-error transition-colors hover:bg-error hover:text-stadium-white disabled:opacity-40"
        >
          {busy ? "…" : t("resetButton")}
        </button>
      </div>
      {error && (
        <p className="mt-3 border-2 border-error bg-error-container/40 px-3 py-2 text-sm text-error">
          {error}
        </p>
      )}
      {info && !error && (
        <p className="mt-3 border-2 border-secondary bg-secondary/10 px-3 py-2 text-sm text-secondary">
          {info}
        </p>
      )}
    </section>
  );
}

function AdminTeamTable({
  teams,
  matches,
  phase,
  showDivision,
}: {
  teams: Team[] | null;
  matches: Match[] | null;
  phase: Settings["tournament_phase"];
  showDivision: boolean;
}) {
  const t = useT();
  if (teams === null) {
    return (
      <div className="p-6 label-caps text-on-surface-variant">
        {t("adminLoadingTeams")}
      </div>
    );
  }
  if (teams.length === 0) {
    return (
      <div className="p-6 label-caps text-on-surface-variant">
        {t("adminNoTeams")}
      </div>
    );
  }
  return (
    <ul className="divide-y-2 divide-outline-variant">
      {teams.map((team, idx) => (
        <AdminTeamRow
          key={team.id}
          team={team}
          index={idx}
          phase={phase}
          matches={matches ?? []}
          showDivision={showDivision}
        />
      ))}
    </ul>
  );
}

function AdminTeamRow({
  team,
  index,
  phase,
  matches,
  showDivision,
}: {
  team: Team;
  index: number;
  phase: Settings["tournament_phase"];
  matches: Match[];
  showDivision: boolean;
}) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.team_name);
  const [p1, setP1] = useState(team.player_1);
  const [p2, setP2] = useState(team.player_2);
  const [skill, setSkill] = useState(team.skill_level);
  const [busy, setBusy] = useState(false);

  const scheduleExists = phase !== "registration";
  const withdrawn = team.status === "withdrawn";

  const skillLabel: Record<Team["skill_level"], string> = {
    beginner: t("skillBeginner"),
    intermediate: t("skillIntermediate"),
    advanced: t("skillAdvanced"),
  };

  async function save() {
    setBusy(true);
    await supabase
      .from("teams")
      .update({
        team_name: name.trim(),
        player_1: p1.trim(),
        player_2: p2.trim(),
        skill_level: skill,
      })
      .eq("id", team.id);
    setBusy(false);
    setEditing(false);
  }

  // Hard delete — only allowed before a schedule exists.
  async function remove() {
    if (!confirm(t("confirmDelete", { name: team.team_name }))) return;
    setBusy(true);
    await supabase.from("teams").delete().eq("id", team.id);
    setBusy(false);
  }

  // Soft-withdraw: mark team withdrawn, turn its counted matches into walkovers,
  // delete its fun games. Reversible via reactivate (but walkovers stay done).
  async function withdraw() {
    if (!confirm(t("confirmWithdraw", { name: team.team_name }))) return;
    setBusy(true);
    await supabase.from("teams").update({ status: "withdrawn" }).eq("id", team.id);

    if (scheduleExists) {
      const involved = matches.filter(
        (m) =>
          (m.team_a_id === team.id || m.team_b_id === team.id) &&
          m.status !== "done",
      );
      for (const m of involved) {
        if (m.is_fun) {
          // Fun games with a withdrawn team: delete.
          await supabase.from("matches").delete().eq("id", m.id);
          continue;
        }
        // Counted match: opponent wins by walkover.
        const opponentPresent =
          (m.team_a_id === team.id ? m.team_b_id : m.team_a_id) != null;
        if (opponentPresent) {
          await supabase
            .from("matches")
            .update({
              is_walkover: true,
              status: "done",
              played_at: new Date().toISOString(),
            })
            .eq("id", m.id);
        }
      }
    }
    setBusy(false);
  }

  async function reactivate() {
    setBusy(true);
    await supabase.from("teams").update({ status: "active" }).eq("id", team.id);
    setBusy(false);
  }

  async function setDivision(division: Division | null) {
    setBusy(true);
    await supabase.from("teams").update({ division }).eq("id", team.id);
    setBusy(false);
  }

  if (editing) {
    return (
      <li className="bg-surface-container-high p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          <input
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <input
            className="input"
            value={p1}
            onChange={(e) => setP1(e.target.value)}
          />
          <input
            className="input"
            value={p2}
            onChange={(e) => setP2(e.target.value)}
          />
        </div>
        <div className="mt-3 flex items-center justify-between">
          <select
            className="input max-w-xs"
            value={skill}
            onChange={(e) =>
              setSkill(e.target.value as Team["skill_level"])
            }
          >
            <option value="beginner">{skillLabel.beginner}</option>
            <option value="intermediate">{skillLabel.intermediate}</option>
            <option value="advanced">{skillLabel.advanced}</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => setEditing(false)}
              className="label-caps border-2 border-outline-variant px-3 py-1.5 text-on-surface hover:border-primary"
            >
              {t("adminCancel")}
            </button>
            <button onClick={save} disabled={busy} className="btn-sm">
              {busy ? "…" : t("adminSave")}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li
      className={`flex items-center gap-4 p-4 ${
        withdrawn ? "opacity-50" : ""
      }`}
    >
      <span className="w-10 shrink-0 font-mono text-label-caps text-on-surface-variant">
        #{String(index + 1).padStart(2, "0")}
      </span>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 truncate font-display text-headline-sm uppercase text-stadium-white">
          {team.team_name}
          {team.is_demo && (
            <span className="label-caps shrink-0 border-2 border-tertiary bg-tertiary/15 px-1.5 py-0 text-[10px] text-tertiary">
              {t("demoBadge")}
            </span>
          )}
          {withdrawn && (
            <span className="label-caps shrink-0 border-2 border-error bg-error/15 px-1.5 py-0 text-[10px] text-error">
              {t("withdrawnBadge")}
            </span>
          )}
        </p>
        <p className="truncate font-body text-body-sm text-on-surface-variant">
          {team.player_1} · {team.player_2} · {skillLabel[team.skill_level]}
        </p>
        {/* Division control (Box-Liga only) */}
        {showDivision && (
          <div className="mt-2 flex items-center gap-1">
            <span className="label-caps mr-1 text-on-surface-variant">
              {t("divisionLabel")}
            </span>
            {(
              [
                { key: null, label: t("divisionAuto") },
                { key: "ober" as const, label: t("divisionOber") },
                { key: "unter" as const, label: t("divisionUnter") },
              ] as const
            ).map((opt) => (
              <button
                key={String(opt.key)}
                onClick={() => setDivision(opt.key)}
                disabled={busy}
                className={`label-caps border-2 px-2 py-0.5 text-[10px] transition-colors ${
                  team.division === opt.key
                    ? "border-primary bg-primary text-on-primary-container"
                    : "border-outline-variant text-on-surface-variant hover:border-primary"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-1">
        <button
          onClick={() => setEditing(true)}
          className="label-caps px-2 py-1 text-on-surface-variant transition-colors hover:text-primary"
        >
          {t("adminEdit")}
        </button>
        {withdrawn ? (
          <button
            onClick={reactivate}
            disabled={busy}
            className="label-caps px-2 py-1 text-secondary transition-colors hover:text-stadium-white"
          >
            {t("reactivate")}
          </button>
        ) : (
          <button
            onClick={withdraw}
            disabled={busy}
            className="label-caps px-2 py-1 text-error transition-colors hover:text-stadium-white"
          >
            {t("withdrawTeam")}
          </button>
        )}
        {!scheduleExists && (
          <button
            onClick={remove}
            disabled={busy}
            className="label-caps px-2 py-1 text-on-surface-variant transition-colors hover:text-error"
          >
            {t("adminDelete")}
          </button>
        )}
      </div>
    </li>
  );
}

/* ---------------------------------------------------------- Runtime config */

function PriceCard({ settings }: { settings: Settings }) {
  const t = useT();
  const [local, setLocal] = useState(String(settings.total_cost ?? 480));
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    setLocal(String(settings.total_cost ?? 480));
  }, [settings.total_cost]);

  async function save() {
    if (busy) return;
    let n = parseFloat(local);
    if (Number.isNaN(n) || n < 0) n = settings.total_cost ?? 480;
    setBusy(true);
    setSaved(false);
    await supabase.from("settings").update({ total_cost: n }).eq("id", 1);
    setLocal(String(n));
    setBusy(false);
    setSaved(true);
  }

  return (
    <div className="border-2 border-primary bg-surface-container p-5">
      <p className="label-caps text-primary">{t("priceCardHeading")}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
        {t("priceCardHint")}
      </p>
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <label className="block">
          <span className="label-caps mb-1 block text-on-surface-variant">
            {t("priceCardAmount")}
          </span>
          <input
            type="number"
            className="input w-40"
            min={0}
            step={10}
            value={local}
            disabled={busy}
            onChange={(e) => {
              setLocal(e.target.value);
              setSaved(false);
            }}
          />
        </label>
        <button onClick={save} disabled={busy} className="btn-sm">
          {busy ? "..." : t("priceCardSave")}
        </button>
        {saved && !busy && (
          <span className="label-caps text-secondary">{t("priceCardSaved")}</span>
        )}
      </div>
    </div>
  );
}

function TournamentConfigCard({ settings }: { settings: Settings }) {
  const t = useT();
  const [busy, setBusy] = useState(false);

  async function update(patch: Database["public"]["Tables"]["settings"]["Update"]) {
    if (busy) return;
    setBusy(true);
    await supabase.from("settings").update(patch).eq("id", 1);
    setBusy(false);
  }

  return (
    <div className="border-2 border-outline-variant bg-surface-container p-5">
      <p className="label-caps text-on-surface-variant">{t("configHeading")}</p>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-[0.12em] text-on-surface-variant">
        {t("configHint")}
      </p>
      <div className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <NumberField
          label={t("configTotalCost")}
          value={settings.total_cost ?? 480}
          min={0}
          step={10}
          busy={busy}
          onCommit={(v) => update({ total_cost: v })}
        />
        <NumberField
          label={t("configTotalCourts")}
          value={settings.total_courts ?? 3}
          min={1}
          max={10}
          busy={busy}
          onCommit={(v) => update({ total_courts: v })}
        />
        <NumberField
          label={t("configRoundsPerTeam")}
          value={settings.rounds_per_team ?? 4}
          min={1}
          max={12}
          busy={busy}
          onCommit={(v) => update({ rounds_per_team: v })}
        />
        <NumberField
          label={t("configMinRest")}
          value={settings.min_rest_slots ?? 2}
          min={0}
          max={5}
          busy={busy}
          onCommit={(v) => update({ min_rest_slots: v })}
        />
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <label className="block">
          <span className="label-caps mb-1 block text-on-surface-variant">
            {t("configEventDate")}
          </span>
          <input
            type="date"
            className="input"
            defaultValue={settings.event_date ?? TOURNAMENT.dateISO}
            disabled={busy}
            onBlur={(e) => update({ event_date: e.target.value || null })}
          />
        </label>
        <label className="block">
          <span className="label-caps mb-1 block text-on-surface-variant">
            {t("configStartTime")}
          </span>
          <input
            type="time"
            className="input"
            defaultValue={settings.start_time ?? TOURNAMENT.startTime}
            disabled={busy}
            onBlur={(e) => update({ start_time: e.target.value || null })}
          />
        </label>
      </div>
    </div>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step = 1,
  busy,
  onCommit,
}: {
  label: string;
  value: number;
  min?: number;
  max?: number;
  step?: number;
  busy: boolean;
  onCommit: (v: number) => void;
}) {
  const [local, setLocal] = useState(String(value));
  useEffect(() => setLocal(String(value)), [value]);
  return (
    <label className="block">
      <span className="label-caps mb-1 block text-on-surface-variant">
        {label}
      </span>
      <input
        type="number"
        className="input"
        min={min}
        max={max}
        step={step}
        value={local}
        disabled={busy}
        onChange={(e) => setLocal(e.target.value)}
        onBlur={() => {
          let n = parseFloat(local);
          if (Number.isNaN(n)) n = value;
          if (min != null) n = Math.max(min, n);
          if (max != null) n = Math.min(max, n);
          if (n !== value) onCommit(n);
          setLocal(String(n));
        }}
      />
    </label>
  );
}

function LockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="3" y="11" width="18" height="11" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
