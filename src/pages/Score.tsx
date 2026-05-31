import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import type { Session } from "@supabase/supabase-js";
import { ADMIN_EMAIL, supabase } from "../lib/supabase";
import { type Team } from "../lib/database.types";
import { useMatches, useSettings, useTeams } from "../lib/hooks";
import { TOURNAMENT } from "../lib/tournament";
import { useT } from "../lib/i18n";
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
        <header className="flex items-center justify-between border-2 border-outline-variant bg-surface-container px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="h-2.5 w-2.5 animate-pulse-glow rounded-full bg-secondary" />
            <p className="font-display text-headline-sm uppercase text-stadium-white">
              {t("scoreMode")}
            </p>
            <span className="ml-2 hidden label-caps text-on-surface-variant sm:inline">
              {TOURNAMENT.name}
            </span>
          </div>
          <button
            onClick={onSignOut}
            className="label-caps text-on-surface-variant transition-colors hover:text-primary"
          >
            {t("signOut")}
          </button>
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

        <section className="border-2 border-outline-variant bg-surface-container">
          <header className="flex items-center justify-between border-b-2 border-outline-variant px-5 py-4">
            <h2 className="font-display text-headline-sm uppercase text-stadium-white">
              {t("adminTeamsHeading")}
            </h2>
            <p className="label-caps text-on-surface-variant">
              {t("adminTotal", { count: teams?.length ?? 0 })}
            </p>
          </header>
          <AdminTeamTable teams={teams} />
        </section>

        {settings && teams && matches && (
          <TournamentPanel
            teams={teams}
            matches={matches}
            settings={settings}
          />
        )}
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

function AdminTeamTable({ teams }: { teams: Team[] | null }) {
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
        <AdminTeamRow key={team.id} team={team} index={idx} />
      ))}
    </ul>
  );
}

function AdminTeamRow({ team, index }: { team: Team; index: number }) {
  const t = useT();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.team_name);
  const [p1, setP1] = useState(team.player_1);
  const [p2, setP2] = useState(team.player_2);
  const [skill, setSkill] = useState(team.skill_level);
  const [busy, setBusy] = useState(false);

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

  async function remove() {
    if (!confirm(t("confirmDelete", { name: team.team_name }))) return;
    setBusy(true);
    await supabase.from("teams").delete().eq("id", team.id);
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
    <li className="flex items-center gap-4 p-4">
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
        </p>
        <p className="truncate font-body text-body-sm text-on-surface-variant">
          {team.player_1} · {team.player_2} · {skillLabel[team.skill_level]}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="label-caps px-2 py-1 text-on-surface-variant transition-colors hover:text-primary"
        >
          {t("adminEdit")}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="label-caps px-2 py-1 text-error transition-colors hover:text-stadium-white"
        >
          {t("adminDelete")}
        </button>
      </div>
    </li>
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
