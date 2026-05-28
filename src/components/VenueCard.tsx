import { TOURNAMENT } from "../lib/tournament";
import { useT } from "../lib/i18n";

export default function VenueCard() {
  const t = useT();
  return (
    <div className="border-2 border-outline-variant bg-surface-container">
      <div className="relative h-56 overflow-hidden border-b-2 border-outline-variant sm:h-72">
        <img
          src="/pineapple-park.jpg"
          alt="Casa Padel Pineapple Park"
          className="absolute inset-0 h-full w-full object-cover transition-all duration-700 hover:scale-105"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-deep-void via-deep-void/30 to-transparent p-4 text-stadium-white sm:p-6">
          <p className="label-caps text-secondary">{t("venueLabel")}</p>
          <p className="font-display text-headline-md uppercase leading-tight sm:text-display-md">
            {TOURNAMENT.venue.name}
          </p>
        </div>
      </div>

      <div className="space-y-6 p-6 sm:p-8">
        <div>
          <p className="font-body text-body-md text-on-surface sm:text-body-lg">
            {TOURNAMENT.venue.address}
          </p>
          <p className="mt-3 font-body text-body-sm text-on-surface-variant sm:text-body-md">
            <span className="label-caps mr-2 text-primary">
              {t("courtsLabel")}
            </span>
            {t("courtsHint")}
          </p>
        </div>

        <a
          href="/site-map.png"
          target="_blank"
          rel="noreferrer"
          className="group block border-2 border-outline-variant transition-all hover:border-primary"
        >
          <img
            src="/site-map.png"
            alt={t("siteMapTitle")}
            className="w-full bg-stadium-white"
          />
          <div className="flex items-center justify-between border-t-2 border-outline-variant bg-surface-container-high px-4 py-3">
            <span className="label-caps text-on-surface">
              {t("siteMapTitle")}
            </span>
            <span className="label-caps text-on-surface-variant transition-colors group-hover:text-primary">
              {t("enlarge")}
            </span>
          </div>
        </a>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <a
            href={TOURNAMENT.venue.appleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary w-full"
          >
            {t("appleMaps")}
          </a>
          <a
            href={TOURNAMENT.venue.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-ghost w-full"
          >
            {t("googleMaps")}
          </a>
        </div>
      </div>
    </div>
  );
}
