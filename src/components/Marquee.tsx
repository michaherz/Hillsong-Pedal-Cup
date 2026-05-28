type Props = {
  text: string;
  reverse?: boolean;
  variant?: "primary" | "void";
};

export default function Marquee({ text, reverse, variant = "primary" }: Props) {
  const segment = ` ${text} • `;
  // Repeat enough to cover wide screens; the animation translates -50% so we need the content rendered twice.
  const items = Array.from({ length: 8 }, (_, i) => i);
  const containerClass =
    variant === "primary"
      ? "border-y-4 border-deep-void bg-primary"
      : "border-y-4 border-primary bg-deep-void";
  const textClass =
    variant === "primary" ? "text-deep-void" : "text-primary";
  return (
    <section className={`w-full overflow-hidden py-6 ${containerClass}`}>
      <div
        className={`marquee-track ${reverse ? "animate-marquee-rev" : "animate-marquee"}`}
      >
        {items.map((i) => (
          <span
            key={i}
            className={`whitespace-nowrap font-display text-marquee uppercase ${textClass}`}
          >
            {segment}
          </span>
        ))}
      </div>
    </section>
  );
}
