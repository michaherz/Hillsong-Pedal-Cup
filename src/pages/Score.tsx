import { useEffect, useRef, useState } from "react";
import { QRCodeCanvas, QRCodeSVG } from "qrcode.react";
import type { Session } from "@supabase/supabase-js";
import { ADMIN_EMAIL, supabase } from "../lib/supabase";
import { type Team } from "../lib/database.types";
import { useSettings, useTeams } from "../lib/hooks";
import { TOURNAMENT } from "../lib/tournament";
import { useT } from "../lib/i18n";

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
      <div className="grid min-h-full place-items-center text-sm text-neutral-500">
        {t("loadingShort")}
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
      setError(`${authError.message} (Email: ${ADMIN_EMAIL})`);
      setPin("");
    }
  }

  return (
    <div className="grid min-h-full place-items-center bg-neutral-100 px-5">
      <form onSubmit={submit} className="card w-full max-w-sm p-8">
        <div className="mb-6 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-court-50 text-court-600">
            <LockIcon />
          </div>
          <h1 className="mt-4 text-xl font-semibold">{t("scoreMode")}</h1>
          <p className="mt-1 text-sm text-neutral-500">{t("pinPrompt")}</p>
        </div>
        <input
          type="password"
          inputMode="numeric"
          autoFocus
          autoComplete="off"
          className="input text-center text-2xl tracking-[0.4em]"
          placeholder="••••"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
        />
        {error && (
          <p className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-center text-sm text-red-700">
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
  const publicUrl = typeof window !== "undefined" ? window.location.origin : "";

  return (
    <div className="min-h-full bg-neutral-50">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500" />
            <p className="text-sm font-semibold">{t("scoreMode")}</p>
            <span className="ml-2 hidden text-xs text-neutral-400 sm:inline">
              {TOURNAMENT.name}
            </span>
          </div>
          <button onClick={onSignOut} className="btn-ghost text-sm">
            {t("signOut")}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-6">
        <div className="grid gap-6 lg:grid-cols-3">
          <RegistrationToggle
            open={settings?.registration_open ?? true}
            disabled={!settings}
          />
          <PublicLinkCard url={publicUrl} />
          <TeamCountCard
            count={(teams ?? []).filter((t) => t.status === "active").length}
          />
        </div>

        <section className="card">
          <header className="flex items-center justify-between border-b border-neutral-100 px-5 py-4">
            <h2 className="text-base font-semibold">
              {t("adminTeamsHeading")}
            </h2>
            <p className="text-xs text-neutral-500">
              {t("adminTotal", { count: teams?.length ?? 0 })}
            </p>
          </header>
          <AdminTeamTable teams={teams} />
        </section>

        <section className="card p-6">
          <h2 className="text-base font-semibold">{t("bracketHeading")}</h2>
          <p className="mt-1 text-sm text-neutral-500">{t("bracketBody")}</p>
        </section>
      </main>
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
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {t("cardRegistration")}
      </p>
      <p className="mt-1 text-2xl font-bold">
        {open ? t("cardOpen") : t("cardClosed")}
      </p>
      <button
        onClick={toggle}
        disabled={disabled || busy}
        className={
          open ? "btn-secondary mt-4 w-full" : "btn-primary mt-4 w-full"
        }
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
    <div className="card flex items-center gap-4 p-5">
      <div className="rounded-lg bg-white p-2 ring-1 ring-neutral-200">
        <QRCodeSVG value={url || "https://"} size={72} />
      </div>
      <QRCodeCanvas
        value={url || "https://"}
        size={1024}
        marginSize={4}
        ref={canvasRef}
        style={{ display: "none" }}
      />
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wider text-neutral-500">
          {t("publicLink")}
        </p>
        <p className="mt-0.5 truncate text-sm font-medium">{url}</p>
        <div className="mt-2 -ml-2 flex gap-1">
          <button onClick={copy} className="btn-ghost px-2 text-xs">
            {copied ? t("copied") : t("copy")}
          </button>
          <button onClick={download} className="btn-ghost px-2 text-xs">
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
    <div className="card p-5">
      <p className="text-xs uppercase tracking-wider text-neutral-500">
        {t("activeTeams")}
      </p>
      <p className="mt-1 text-2xl font-bold">{count}</p>
      <p className="mt-2 text-xs text-neutral-500">
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
    return <div className="p-6 text-sm text-neutral-500">{t("adminLoadingTeams")}</div>;
  }
  if (teams.length === 0) {
    return <div className="p-6 text-sm text-neutral-500">{t("adminNoTeams")}</div>;
  }
  return (
    <ul className="divide-y divide-neutral-100">
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
      <li className="bg-court-50/40 p-4">
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
            <button onClick={() => setEditing(false)} className="btn-ghost">
              {t("adminCancel")}
            </button>
            <button onClick={save} disabled={busy} className="btn-primary">
              {busy ? "…" : t("adminSave")}
            </button>
          </div>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-4 p-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-100 text-sm font-semibold text-neutral-600">
        {index + 1}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold">{team.team_name}</p>
        <p className="truncate text-xs text-neutral-500">
          {team.player_1} · {team.player_2} · {skillLabel[team.skill_level]}
        </p>
      </div>
      <div className="flex shrink-0 gap-1">
        <button
          onClick={() => setEditing(true)}
          className="btn-ghost text-xs"
        >
          {t("adminEdit")}
        </button>
        <button
          onClick={remove}
          disabled={busy}
          className="btn-ghost text-xs text-red-600 hover:bg-red-50"
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
      <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
    </svg>
  );
}
