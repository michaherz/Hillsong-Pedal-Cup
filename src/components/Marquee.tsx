type Props = {
  text: string;
  reverse?: boolean;
  variant?: "primary" | "void";
};

export default function Marquee({ text, reverse, variant = "primary" }: Props) {
  // text already contains " • " separators; we just append one more after each repetition
  // so the loop is seamless (last item's separator equals the first item's lead-in).
  const segment = `${text} • `;
  const items = Array.from({ length: 8 }, (_, i) => i);
  const containerClass =
    variant === "primary"
      ? "border-y-4 border-deep-void bg-primary"
      : "border-y-4 border-primary bg-deep-void";
  const textClass =
    variant === "primary" ? "text-deep-void" : "text-primary";

  // Alternate tilt direction: fwd marquee leans up-left, reverse leans up-right.
  const tiltDeg = reverse ? 1.6 : -1.6;

  return (
    // Wrapper has NO overflow clip — the rotated band is allowed to extend its
    // tilted corners into the surrounding sections. z-10 keeps it visually on top
    // so it never gets covered by adjacent content. The vertical margin gives
    // the rotated overhang some breathing room before it reaches actual content.
    <div className="relative z-10 my-4 sm:my-6">
      <div
        className={`relative -mx-[8%] overflow-hidden py-5 sm:py-6 ${containerClass}`}
        style={{
          transform: `rotate(${tiltDeg}deg)`,
          transformOrigin: "center",
        }}
      >
        <div
          className={`marquee-track ${reverse ? "animate-marquee-rev" : "animate-marquee"}`}
          style={{ animationDuration: "var(--marquee-dur, 90s)" }}
        >
          {items.map((i) => (
            <span
              key={i}
              className={`whitespace-pre font-display text-marquee uppercase ${textClass}`}
            >
              {segment}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
