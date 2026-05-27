import { useLang } from "../lib/i18n";

export default function LanguageToggle() {
  const { lang, setLang } = useLang();
  return (
    <div className="fixed right-4 top-4 z-50 flex rounded-full bg-white/85 p-1 text-xs font-semibold ring-1 ring-black/10 shadow-sm backdrop-blur-md">
      <button
        type="button"
        aria-pressed={lang === "de"}
        onClick={() => setLang("de")}
        className={`rounded-full px-3 py-1.5 transition ${
          lang === "de"
            ? "bg-court-500 text-white shadow-sm"
            : "text-neutral-600 hover:text-neutral-900"
        }`}
      >
        DE
      </button>
      <button
        type="button"
        aria-pressed={lang === "en"}
        onClick={() => setLang("en")}
        className={`rounded-full px-3 py-1.5 transition ${
          lang === "en"
            ? "bg-court-500 text-white shadow-sm"
            : "text-neutral-600 hover:text-neutral-900"
        }`}
      >
        EN
      </button>
    </div>
  );
}
