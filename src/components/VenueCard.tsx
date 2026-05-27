import { TOURNAMENT } from "../lib/tournament";

export default function VenueCard() {
  return (
    <a
      href={TOURNAMENT.venue.mapsUrl}
      target="_blank"
      rel="noreferrer noopener"
      className="card group block overflow-hidden transition hover:shadow-md"
    >
      <div className="relative h-40 bg-gradient-to-br from-court-400 to-court-700">
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg, transparent 0 18px, rgba(255,255,255,.4) 18px 19px), repeating-linear-gradient(90deg, transparent 0 32px, rgba(255,255,255,.4) 32px 33px)",
          }}
        />
        <div className="absolute inset-x-0 bottom-0 p-4 text-white">
          <p className="text-xs uppercase tracking-wider opacity-80">Venue</p>
          <p className="text-lg font-semibold">{TOURNAMENT.venue.name}</p>
        </div>
      </div>
      <div className="p-5">
        <p className="text-sm text-neutral-600">{TOURNAMENT.venue.address}</p>
        <p className="mt-3 text-sm font-medium text-court-600 group-hover:text-court-700">
          In Apple Karten öffnen →
        </p>
      </div>
    </a>
  );
}
