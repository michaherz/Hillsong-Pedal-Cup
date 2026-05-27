import { TOURNAMENT } from "../lib/tournament";

export default function VenueCard() {
  return (
    <div className="card overflow-hidden">
      <div className="relative h-48 sm:h-60">
        <img
          src="/pineapple-park.jpg"
          alt="Casa Padel Pineapple Park München"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent p-4 text-white">
          <p className="text-[11px] uppercase tracking-wider opacity-80">
            Venue
          </p>
          <p className="text-lg font-semibold leading-tight">
            {TOURNAMENT.venue.name}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div>
          <p className="text-sm text-neutral-700">
            {TOURNAMENT.venue.address}
          </p>
          <p className="mt-2 text-sm text-neutral-500">
            <span className="font-medium text-neutral-700">Padel-Plätze:</span>{" "}
            {TOURNAMENT.venue.courtsHint}
          </p>
        </div>

        <a
          href="/site-map.png"
          target="_blank"
          rel="noreferrer"
          className="group block overflow-hidden rounded-xl ring-1 ring-neutral-200 transition hover:ring-neutral-300"
        >
          <img
            src="/site-map.png"
            alt="Lageplan Pineapple Park — Padel-Plätze in Bereich 6"
            className="w-full bg-white"
          />
          <div className="flex items-center justify-between border-t border-neutral-100 bg-neutral-50 px-3 py-2 text-xs">
            <span className="font-medium text-neutral-700">
              Lageplan Pineapple Park
            </span>
            <span className="text-neutral-500 group-hover:text-court-600">
              Vergrößern →
            </span>
          </div>
        </a>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <a
            href={TOURNAMENT.venue.appleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-primary"
          >
            Apple Karten
          </a>
          <a
            href={TOURNAMENT.venue.googleMapsUrl}
            target="_blank"
            rel="noreferrer"
            className="btn-secondary"
          >
            Google Maps
          </a>
        </div>
      </div>
    </div>
  );
}
