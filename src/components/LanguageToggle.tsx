import { useLang } from "../lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="flex border-2 border-stadium-white bg-deep-void font-mono text-[10px] uppercase tracking-[0.12em] sm:text-label-caps">
      <button
        type="button"
        aria-pressed={lang === "de"}
        onClick={() => setLang("de")}
        className={`px-2 py-1.5 transition-colors sm:px-3 sm:py-2 ${
          lang === "de"
            ? "bg-primary text-on-primary-container"
            : "text-on-surface-variant hover:text-stadium-white"
        }`}
      >
        DE
      </button>
      <div className="w-0.5 bg-stadium-white" />
      <button
        type="button"
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
        className={`px-2 py-1.5 transition-colors sm:px-3 sm:py-2 ${
          lang === "en"
            ? "bg-primary text-on-primary-container"
            : "text-on-surface-variant hover:text-stadium-white"
        }`}
      >
        EN
      </button>
    </div>
  );
}
