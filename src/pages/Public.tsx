import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { supabase } from "../lib/supabase";
import { TOURNAMENT } from "../lib/tournament";
import { type SkillLevel, SKILL_LABELS } from "../lib/database.types";
import { formatEventDate, useLang, useT } from "../lib/i18n";
import { useSettings, useTeams, useMatches } from "../lib/hooks";
import TeamList from "../components/TeamList";
import VenueCard from "../components/VenueCard";
import InfoCards from "../components/InfoCards";
import LanguageToggle from "../components/LanguageToggle";
import Marquee from "../components/Marquee";
import Countdown from "../components/Countdown";
import PublicTournament from "../components/PublicTournament";

const SKILL_OPTIONS: SkillLevel[] = ["beginner", "intermediate", "advanced"];

export default function Public() {
  const t = useT();
  const teams = useTeams();
  const settings = useSettings();
  const matches = useMatches();
  const registrationOpen = settings?.registration_open ?? null;
  const phase = settings?.tournament_phase ?? "registration";

  const activeCount = useMemo(
    () => (teams ?? []).filter((t) => t.status === "active").length,
    [teams],
  );

  return (
    <div className="min-h-full overflow-x-hidden bg-background">
      <TopNav />

      <main className="pt-16 sm:pt-24">
        <Hero registrationOpen={registrationOpen} />

        <Marquee text={t("marqueeBanner1")} />

        <BentoStats teamCount={activeCount} />

        <RegistrationSection
          registrationOpen={registrationOpen}
          activeCount={activeCount}
        />

        <TeamsSection teams={teams} count={activeCount} />

        {phase !== "registration" && teams && matches && (
          <PublicTournament teams={teams} matches={matches} phase={phase} />
        )}

        <Marquee text={t("marqueeBanner2")} variant="void" reverse />

        <InfoSection />

        <VenueSection />

        <FooterSection />
      </main>
    </div>
  );
}

/* ------------------------------ TOP NAV ------------------------------ */

function TopNav() {
  return (
    <header className="fixed top-0 z-40 w-full border-b-2 border-outline-variant bg-background/95 backdrop-blur">
      <div className="mx-auto flex w-full max-w-[1440px] items-center justify-between gap-3 px-4 py-3 sm:px-8 md:px-12 md:py-4">
        <a href="#top" className="flex min-w-0 shrink items-center gap-2 sm:gap-3 md:gap-4">
          <img
            src="/hillsong-logo.png"
            alt="Hillsong"
            className="h-8 w-8 shrink-0 sm:h-10 sm:w-10 md:h-12 md:w-12"
          />
          <span className="truncate font-display text-lg uppercase tracking-tight text-primary sm:text-2xl md:text-3xl lg:text-display-md">
            Padel Cup 2026
          </span>
        </a>
        <div className="flex shrink-0 items-center gap-2 sm:gap-4 md:gap-6">
          <nav className="hidden gap-5 lg:flex lg:gap-8">
            <NavLink href="#register">Register</NavLink>
            <NavLink href="#teams">Teams</NavLink>
            <NavLink href="#venue">Venue</NavLink>
          </nav>
          <LanguageToggle />
          <a
            href="#register"
            className="hidden whitespace-nowrap border-2 border-stadium-white bg-primary px-3 py-1.5 font-display text-xs uppercase tracking-wider text-on-primary-container shadow-hard-sm transition-all hover:-translate-x-0.5 hover:-translate-y-0.5 md:inline-flex md:px-4 md:py-2 md:text-sm"
          >
            Join Now
          </a>
        </div>
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="font-display text-headline-sm uppercase tracking-wider text-on-surface transition-colors hover:text-primary"
    >
      {children}
    </a>
  );
}

/* ------------------------------ HERO ------------------------------ */

function Hero({ registrationOpen }: { registrationOpen: boolean | null }) {
  const t = useT();
  const { lang } = useLang();
  const headRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    const el = headRef.current;
    if (!el) return;

    // Touch devices: keep the static rotate(-2deg) — no parallax, no stale transforms.
    const hasFineHover =
      typeof window !== "undefined" &&
      window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    function reset() {
      if (el) el.style.transform = "rotate(-2deg)";
    }

    if (!hasFineHover) {
      reset();
      return;
    }

    function onMove(e: MouseEvent) {
      if (!el) return;
      const x = (window.innerWidth / 2 - e.pageX) / 60;
      const y = (window.innerHeight / 2 - e.pageY) / 60;
      el.style.transform = `rotate(-2deg) translate(${x}px, ${y}px)`;
    }

    window.addEventListener("mousemove", onMove);
    window.addEventListener("resize", reset);
    window.addEventListener("orientationchange", reset);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("resize", reset);
      window.removeEventListener("orientationchange", reset);
    };
  }, []);

  const dotClass =
    registrationOpen === null
      ? "bg-stadium-white/40 animate-pulse"
      : registrationOpen
        ? "bg-secondary animate-pulse-glow"
        : "bg-tertiary";
  const stateLabel =
    registrationOpen === null
      ? t("regLoading")
      : registrationOpen
        ? t("regOpen")
        : t("regClosed");

  return (
    <section
      id="top"
      className="relative flex flex-col items-center bg-surface pt-4 pb-6 sm:pt-12 sm:pb-16"
    >
      <div className="flex w-full max-w-[1440px] flex-col items-center px-5 sm:px-12">
        <div className="hero-curve">
          <h1
            ref={headRef}
            className="hero-curve-text whitespace-nowrap font-display uppercase italic leading-none text-stadium-white"
            style={{
              transform: "rotate(-2deg)",
              fontSize: "clamp(38px, min(11vw, 14vh), 120px)",
            }}
          >
            THIS IS OUR&nbsp;<span className="text-primary">SUMMER</span>
          </h1>
        </div>

        <div className="relative -mt-1 mb-2 w-full sm:-mt-16 sm:mb-20">
          <div
            aria-hidden
            className="absolute -top-3 -left-1 h-12 w-12 border-l-4 border-t-4 border-secondary opacity-50 sm:-top-10 sm:-left-10 sm:h-40 sm:w-40"
          />
          <div
            aria-hidden
            className="absolute -bottom-3 -right-1 h-12 w-12 border-r-4 border-b-4 border-primary opacity-50 sm:-bottom-10 sm:-right-10 sm:h-40 sm:w-40"
          />

          <div className="panel relative z-10 p-2 sm:p-4">
            <img
              src="/pineapple-park.jpg"
              alt="Casa Padel Pineapple Park"
              loading="eager"
              decoding="async"
              fetchPriority="high"
              className="aspect-[4/3] w-full bg-surface-container-high object-cover transition-all duration-700 sm:aspect-[1.85] sm:grayscale sm:hover:grayscale-0"
            />

            <div className="absolute bottom-3 left-3 right-3 panel-void p-3 shadow-hard-sm sm:bottom-10 sm:left-10 sm:right-auto sm:max-w-md sm:p-6 sm:shadow-hard">
              <div className="mb-1.5 flex items-center gap-2 sm:mb-2">
                <span className={`h-2 w-2 rounded-full ${dotClass}`} />
                <p className="label-caps text-secondary sm:text-label-caps-lg">
                  {stateLabel}
                </p>
              </div>
              <h2 className="mb-2 font-display text-2xl uppercase leading-none text-stadium-white sm:mb-3 sm:text-display-md">
                Hillsong Padel Cup
              </h2>
              <p className="font-body text-body-sm text-on-surface-variant sm:text-body-lg">
                {formatEventDate(TOURNAMENT.dateISO, lang)} ·{" "}
                {TOURNAMENT.startTime} · {TOURNAMENT.venue.name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------ BENTO STATS ------------------------------ */

function BentoStats({ teamCount }: { teamCount: number }) {
  const t = useT();
  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-12 sm:py-28">
      <div className="grid grid-cols-12 gap-4 sm:gap-6">
        <Reveal className="group relative col-span-12 overflow-hidden border-2 border-outline-variant bg-surface-container p-6 sm:p-10 md:col-span-8">
          <div
            aria-hidden
            className="absolute top-0 right-0 h-32 w-32 translate-x-16 -translate-y-16 rotate-45 bg-secondary opacity-10 transition-transform duration-500 group-hover:scale-150"
          />
          <span className="label-caps-lg inline-block rounded-full border-2 border-primary px-3 py-1 text-primary">
            {t("bentoPremiumLabel")}
          </span>
          <h3 className="mt-6 font-display text-display-md uppercase leading-none text-stadium-white sm:text-display-lg">
            {t("bentoPrimaryHeadline")}
          </h3>
          <p className="mt-4 max-w-xl font-body text-body-md text-on-surface-variant sm:text-body-lg">
            {t("bentoPrimaryBody")}
          </p>
          <div className="mt-8 flex flex-wrap gap-3 sm:mt-12 sm:gap-4">
            <a href="#register" className="btn-secondary">
              {t("bentoCtaRegister")}
            </a>
            <a href="#venue" className="btn-ghost">
              {t("bentoCtaVenue")}
            </a>
          </div>
        </Reveal>

        <Countdown />

        <StatTile
          icon="schedule"
          accent="text-primary"
          headline={TOURNAMENT.startTime}
          label={t("bentoStatStart")}
        />
        <StatTile
          icon="groups"
          accent="text-secondary"
          headline={teamCount.toString()}
          label={t("bentoStatTeams")}
        />
        <StatTile
          icon="sports_tennis"
          accent="text-tertiary"
          headline={TOURNAMENT.courts.toString()}
          label={t("bentoStatCourts")}
        />
      </div>
    </section>
  );
}

function StatTile({
  icon,
  accent,
  headline,
  label,
}: {
  icon: string;
  accent: string;
  headline: string;
  label: string;
}) {
  return (
    <Reveal className="col-span-12 border-2 border-outline-variant bg-surface-container-high p-6 transition-all hover:border-primary sm:col-span-6 md:col-span-4 sm:p-8">
      <div className="mb-3 flex items-center gap-3 sm:mb-4 sm:gap-4">
        <span className={`material-symbols-outlined text-3xl sm:text-4xl ${accent}`}>
          {icon}
        </span>
        <h4 className="font-display text-headline-sm uppercase text-stadium-white sm:text-headline-md">
          {headline}
        </h4>
      </div>
      <p className="label-caps text-on-surface-variant">{label}</p>
    </Reveal>
  );
}

/* ------------------------------ REGISTRATION ------------------------------ */

function RegistrationSection({
  registrationOpen,
  activeCount,
}: {
  registrationOpen: boolean | null;
  activeCount: number;
}) {
  const t = useT();
  return (
    <section
      id="register"
      className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 pb-16 sm:scroll-mt-28 sm:px-12 sm:pb-24"
    >
      <SectionHeading
        eyebrow={t("registerEyebrow")}
        title={t("registerHeading")}
      />
      {registrationOpen === null ? (
        <Reveal>
          <div className="panel p-8">
            <div className="h-4 w-40 animate-pulse bg-surface-bright" />
            <div className="mt-3 h-3 w-64 animate-pulse bg-surface-bright" />
          </div>
        </Reveal>
      ) : registrationOpen ? (
        <RegistrationForm />
      ) : (
        <Reveal>
          <div className="panel-pop p-8 sm:p-10">
            <h3 className="font-display text-headline-md uppercase text-stadium-white">
              {t("closedHeading")}
            </h3>
            <p className="mt-2 font-body text-body-md text-on-surface-variant sm:text-body-lg">
              {t("closedBody", { count: activeCount })}
            </p>
          </div>
        </Reveal>
      )}
    </section>
  );
}

function RegistrationForm() {
  const t = useT();
  const [teamName, setTeamName] = useState("");
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [skill, setSkill] = useState<SkillLevel>("intermediate");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const skillLabel: Record<SkillLevel, string> = {
    beginner: t("skillBeginner"),
    intermediate: t("skillIntermediate"),
    advanced: t("skillAdvanced"),
  };

  const valid =
    teamName.trim().length >= 2 &&
    player1.trim().length >= 2 &&
    player2.trim().length >= 2;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setError(null);
    const { error: insertError } = await supabase.from("teams").insert({
      team_name: teamName.trim(),
      player_1: player1.trim(),
      player_2: player2.trim(),
      skill_level: skill,
    });
    setSubmitting(false);
    if (insertError) {
      setError(insertError.message);
      return;
    }
    setSuccess(true);
    setTeamName("");
    setPlayer1("");
    setPlayer2("");
    setSkill("intermediate");
    setTimeout(() => setSuccess(false), 4000);
  }

  return (
    <Reveal>
      <form onSubmit={submit} className="panel-pop p-6 sm:p-10">
        <div className="space-y-5">
          <div>
            <label className="label-caps mb-2 block text-on-surface-variant" htmlFor="team_name">
              {t("teamName")}
            </label>
            <input
              id="team_name"
              className="input-line"
              placeholder={t("teamNamePh")}
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              maxLength={60}
              required
            />
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <div>
              <label className="label-caps mb-2 block text-on-surface-variant" htmlFor="player_1">
                {t("player1")}
              </label>
              <input
                id="player_1"
                className="input-line"
                placeholder={t("playerPh")}
                value={player1}
                onChange={(e) => setPlayer1(e.target.value)}
                maxLength={60}
                required
              />
            </div>
            <div>
              <label className="label-caps mb-2 block text-on-surface-variant" htmlFor="player_2">
                {t("player2")}
              </label>
              <input
                id="player_2"
                className="input-line"
                placeholder={t("playerPh")}
                value={player2}
                onChange={(e) => setPlayer2(e.target.value)}
                maxLength={60}
                required
              />
            </div>
          </div>
          <div>
            <span className="label-caps mb-3 block text-on-surface-variant">
              {t("skillLabel")}
            </span>
            <div className="grid grid-cols-3 gap-2 border-2 border-outline-variant p-1">
              {SKILL_OPTIONS.map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => setSkill(opt)}
                  className={`px-3 py-3 font-display text-sm uppercase tracking-wider transition-all sm:text-headline-sm ${
                    skill === opt
                      ? "bg-primary text-on-primary-container"
                      : "text-on-surface-variant hover:text-stadium-white"
                  }`}
                >
                  {skillLabel[opt]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {error && (
          <p className="mt-5 border-2 border-error bg-error-container/40 px-4 py-3 font-body text-sm text-error">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-5 border-2 border-secondary bg-secondary/10 px-4 py-3 font-body text-sm text-secondary">
            {t("successMsg")}
          </p>
        )}

        <div className="mt-8 flex justify-end">
          <button
            type="submit"
            disabled={!valid || submitting}
            className="btn-primary"
          >
            {submitting ? t("submitting") : t("registerBtn")}
          </button>
        </div>
      </form>
    </Reveal>
  );
}

/* ------------------------------ TEAMS ------------------------------ */

function TeamsSection({
  teams,
  count,
}: {
  teams: Awaited<ReturnType<typeof useTeams>>;
  count: number;
}) {
  const t = useT();
  return (
    <section
      id="teams"
      className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 pb-16 sm:scroll-mt-28 sm:px-12 sm:pb-24"
    >
      <SectionHeading
        eyebrow={t("teamsEyebrow")}
        title={t("listHeading")}
        meta={count > 0 ? `${count}` : undefined}
      />
      <Reveal>
        <TeamList teams={teams} />
      </Reveal>
    </section>
  );
}

/* ------------------------------ INFO ------------------------------ */

function InfoSection() {
  const t = useT();
  return (
    <section className="mx-auto w-full max-w-[1440px] px-5 py-20 sm:px-12 sm:py-28">
      <SectionHeading
        eyebrow={t("infoEyebrow")}
        title={t("infoHeading")}
      />
      <Reveal>
        <InfoCards />
      </Reveal>
    </section>
  );
}

/* ------------------------------ VENUE ------------------------------ */

function VenueSection() {
  const t = useT();
  return (
    <section
      id="venue"
      className="mx-auto w-full max-w-[1440px] scroll-mt-24 px-5 pt-4 pb-20 sm:scroll-mt-28 sm:px-12 sm:pt-8 sm:pb-32"
    >
      <SectionHeading
        eyebrow={t("venueEyebrow")}
        title={t("venueHeading")}
      />
      <Reveal>
        <VenueCard />
      </Reveal>
    </section>
  );
}

/* ------------------------------ FOOTER ------------------------------ */

function FooterSection() {
  return (
    <footer className="border-t-2 border-outline-variant bg-deep-void py-16 sm:py-24">
      <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-8 px-5 sm:px-12 md:flex-row md:items-end md:justify-between">
        <div>
          <span className="font-display text-display-md uppercase tracking-tight text-on-surface sm:text-display-lg">
            Padel Cup 2026
          </span>
          <p className="label-caps mt-3 text-on-surface-variant">
            © 2026 HILLSONG PADEL CUP · MUNICH
          </p>
        </div>
        <div className="flex gap-6 text-on-surface-variant">
          <a
            href={TOURNAMENT.whatsappUrl}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-secondary"
            aria-label="WhatsApp Group"
          >
            <span className="material-symbols-outlined text-3xl">chat</span>
          </a>
          <a
            href={TOURNAMENT.venue.appleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-primary"
            aria-label="Apple Maps"
          >
            <span className="material-symbols-outlined text-3xl">map</span>
          </a>
          <a
            href={TOURNAMENT.venue.website}
            target="_blank"
            rel="noreferrer"
            className="transition-colors hover:text-tertiary"
            aria-label="Casa Padel Website"
          >
            <span className="material-symbols-outlined text-3xl">stadium</span>
          </a>
        </div>
      </div>
    </footer>
  );
}

/* ------------------------------ HELPERS ------------------------------ */

function SectionHeading({
  eyebrow,
  title,
  meta,
}: {
  eyebrow: string;
  title: string;
  meta?: string;
}) {
  return (
    <Reveal className="mb-6 flex items-end justify-between sm:mb-10">
      <div>
        <p className="label-caps-lg text-primary">{eyebrow}</p>
        <h2 className="mt-2 font-display text-display-md uppercase leading-none text-stadium-white sm:text-display-lg">
          {title}
        </h2>
      </div>
      {meta && (
        <span className="font-display text-display-md leading-none text-on-surface-variant sm:text-display-lg">
          {meta}
        </span>
      )}
    </Reveal>
  );
}

function Reveal({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === "undefined") {
      el.classList.add("in");
      return;
    }
    // Fire as soon as any pixel enters viewport, with a 100px lead-in so animation
    // starts before the user actually sees it (avoids "pop-in" feel).
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          el.classList.add("in");
          obs.disconnect();
        }
      },
      { threshold: 0, rootMargin: "0px 0px -100px 0px" },
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return (
    <div ref={ref} className={`reveal ${className}`}>
      {children}
    </div>
  );
}

// Avoid unused import error if SKILL_LABELS not directly referenced
void SKILL_LABELS;
