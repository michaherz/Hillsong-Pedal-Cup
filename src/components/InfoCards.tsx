import { TOURNAMENT } from "../lib/tournament";
import { useT } from "../lib/i18n";

export default function InfoCards() {
  const t = useT();
  return (
    <div className="grid gap-4 sm:gap-6 md:grid-cols-2">
      <a
        href={TOURNAMENT.whatsappUrl}
        target="_blank"
        rel="noreferrer"
        className="group relative overflow-hidden border-2 border-secondary bg-deep-void p-6 transition-all hover:-translate-x-1 hover:-translate-y-1 hover:shadow-hard-secondary sm:p-8"
      >
        <div className="bg-dots pointer-events-none absolute inset-0 opacity-10" />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-secondary">
              chat
            </span>
            <p className="label-caps-lg text-secondary">
              {t("whatsappTitle")}
            </p>
          </div>
          <h3 className="mt-4 font-display text-headline-md uppercase text-stadium-white">
            Stay in the loop
          </h3>
          <p className="mt-2 font-body text-body-md text-on-surface-variant sm:text-body-lg">
            {t("whatsappBody")}
          </p>
          <p className="mt-4 font-display text-headline-sm uppercase text-secondary transition-colors group-hover:text-stadium-white">
            {t("whatsappCta")} →
          </p>
        </div>
      </a>

      <div className="relative overflow-hidden border-2 border-tertiary bg-surface-container p-6 sm:p-8">
        <div
          aria-hidden
          className="pointer-events-none absolute -top-10 -right-10 h-40 w-40 rotate-12 border-2 border-tertiary opacity-20"
        />
        <div className="relative">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-tertiary">
              sports_tennis
            </span>
            <p className="label-caps-lg text-tertiary">{t("rentTitle")}</p>
          </div>
          <h3 className="mt-4 font-display text-headline-md uppercase text-stadium-white">
            Bring or borrow
          </h3>
          <p className="mt-2 font-body text-body-md text-on-surface-variant sm:text-body-lg">
            {t("rentBody")}
          </p>
        </div>
      </div>
    </div>
  );
}
