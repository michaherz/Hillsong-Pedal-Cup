import { QRCodeSVG } from "qrcode.react";
import { MeshGradient } from "@paper-design/shaders-react";
import { useT } from "../lib/i18n";

const PADEL_CUP = {
  name: "Padel Cup",
  url: "https://hillsong-pedal-cup.vercel.app",
  date: "18.07.2026",
  venue: "Casa Padel · Pineapple Park",
};

const FOOTBALL_CUP = {
  name: "Football Cup",
  url: "https://hillsong-soccer-cup.vercel.app",
  date: "11.07.2026",
  venue: "SV München-Laim",
};

const MESH_COLORS = [
  "#0a2240",
  "#1c66b8",
  "#93ccff",
  "#ff8a3d",
  "#d85114",
];

export default function PosterSlide() {
  const t = useT();
  return (
    <div className="poster-root">
      <style>{styles}</style>

      <div className="poster" id="poster-canvas">
        <div className="bg-shader" aria-hidden>
          <MeshGradient
            className="absolute inset-0 w-full h-full"
            colors={MESH_COLORS}
            speed={0.05}
            distortion={0.6}
            swirl={0.4}
            grainMixer={0.35}
            grainOverlay={0.2}
          />
        </div>

        <div className="bg-vignette" aria-hidden />

        <h1 className="hero-headline">
          <span className="hero-line-1">This is our</span>
          <span className="hero-line-2">Summer</span>
        </h1>

        <div className="content content-left">
          <Half
            cup={PADEL_CUP}
            scanLabel={t("posterScanLabel")}
            dateLabel={t("posterDateLabel")}
          />
        </div>
        <div className="content content-right">
          <Half
            cup={FOOTBALL_CUP}
            scanLabel={t("posterScanLabel")}
            dateLabel={t("posterDateLabel")}
          />
        </div>
      </div>
    </div>
  );
}

function Half({
  cup,
  scanLabel,
  dateLabel,
}: {
  cup: typeof PADEL_CUP;
  scanLabel: string;
  dateLabel: string;
}) {
  return (
    <div className="half-inner">
      <h2 className="cup-name">{cup.name}</h2>
      <div className="qr-wrap">
        <QRCodeSVG
          value={cup.url}
          size={320}
          bgColor="#ffffff"
          fgColor="#000000"
          marginSize={2}
          level="M"
        />
      </div>
      <p className="scan-cta">↓ {scanLabel}</p>
      <div className="meta">
        <p className="meta-line">
          <span className="meta-label">{dateLabel}</span>
          <span className="meta-value">{cup.date}</span>
        </p>
        <p className="meta-venue">{cup.venue}</p>
      </div>
    </div>
  );
}

const styles = `
.poster-root {
  min-height: 100vh;
  background: #000;
  color: #fff;
  font-family: ui-sans-serif, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.poster {
  position: relative;
  width: min(100vw, calc(100vh * 16 / 9));
  aspect-ratio: 16 / 9;
  background: #000;
  overflow: hidden;
}

.bg-shader {
  position: absolute;
  inset: 0;
  z-index: 0;
}
.bg-shader > * { position: absolute; inset: 0; width: 100%; height: 100%; }

.bg-vignette {
  position: absolute;
  inset: 0;
  z-index: 1;
  pointer-events: none;
  background:
    radial-gradient(ellipse 90% 70% at 50% 50%, transparent 55%, rgba(0,0,0,0.35) 100%);
}

.hero-headline {
  position: absolute;
  top: 4%;
  left: 0;
  right: 0;
  margin: 0;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  font-family: "Bebas Neue", "Anton", "Oswald", "Impact", system-ui, sans-serif;
  text-transform: uppercase;
  font-style: italic;
  font-weight: 900;
  line-height: 0.9;
  letter-spacing: 0.005em;
  text-align: center;
  color: #ffffff;
  pointer-events: none;
}
.hero-line-1 {
  font-size: clamp(24px, 3.4vw, 60px);
  letter-spacing: 0.05em;
}
.hero-line-2 {
  font-size: clamp(54px, 8.5vw, 160px);
  margin-top: -0.05em;
  padding-right: 0.12em;
}

.content {
  position: absolute;
  top: 58%;
  transform: translateY(-50%);
  width: 38%;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2;
}
.content-left { left: 11%; }
.content-right { right: 11%; }

.half-inner {
  width: 100%;
  max-width: 560px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.4vh;
}

.cup-name {
  font-family: "Bebas Neue", "Anton", "Oswald", "Impact", system-ui, sans-serif;
  font-size: clamp(26px, 3.4vw, 58px);
  line-height: 1;
  letter-spacing: 0.01em;
  text-transform: uppercase;
  margin: 0;
  font-weight: 900;
  color: #ffffff;
}

.qr-wrap {
  background: #fff;
  padding: 14px;
  border: 6px solid #000;
  box-shadow:
    10px 10px 0 0 rgba(0,0,0,0.55),
    0 0 60px rgba(0,0,0,0.35);
}
.qr-wrap svg {
  display: block;
  width: clamp(170px, 16.5vw, 320px);
  height: clamp(170px, 16.5vw, 320px);
}

.scan-cta {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(13px, 1.25vw, 20px);
  letter-spacing: 0.28em;
  text-transform: uppercase;
  font-weight: 800;
  margin: 0.4vh 0 0;
  color: #ffffff;
  background: rgba(0,0,0,0.55);
  padding: 7px 16px;
  border: 2px solid rgba(255,255,255,0.85);
}

.meta {
  margin-top: 0.4vh;
  display: flex;
  flex-direction: column;
  gap: 4px;
  color: #ffffff;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
}
.meta-line {
  display: flex;
  gap: 0.7em;
  align-items: baseline;
  justify-content: center;
  margin: 0;
  font-size: clamp(13px, 1.15vw, 18px);
}
.meta-label {
  letter-spacing: 0.22em;
  text-transform: uppercase;
  opacity: 0.85;
  font-weight: 700;
}
.meta-value { font-weight: 800; }
.meta-venue {
  margin: 0;
  font-size: clamp(12px, 1.05vw, 17px);
  opacity: 0.95;
  font-weight: 700;
}
`;
