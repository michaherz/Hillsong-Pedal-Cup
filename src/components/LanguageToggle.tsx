import { useLang } from "../lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="fixed right-4 top-20 z-40 flex border-2 border-stadium-white bg-deep-void/95 font-mono text-label-caps shadow-hard-sm backdrop-blur-md sm:right-6">
      <button
        type="button"
        aria-pressed={lang === "de"}
        onClick={() => setLang("de")}
        className={`px-3 py-2 uppercase tracking-wider transition-all ${
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
        className={`px-3 py-2 uppercase tracking-wider transition-all ${
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
