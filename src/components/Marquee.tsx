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
    // Outer clip box — slightly taller than the band so the rotated edges blend cleanly.
    <div className="relative my-2 overflow-hidden py-2 sm:my-3 sm:py-3">
      <div
        className={`-mx-[6%] py-5 sm:py-6 ${containerClass}`}
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
