import { QRCodeSVG } from "qrcode.react";
import { useT } from "../lib/i18n";

const PADEL_CUP = {
  name: "Padel Cup",
  year: "2026",
  url: "https://hillsong-pedal-cup.vercel.app",
  date: "18.07.2026",
  venue: "Casa Padel · Pineapple Park",
  primary: "#93ccff",
};

const FOOTBALL_CUP = {
  name: "Football Cup",
  year: "2026",
  url: "https://hillsong-soccer-cup.vercel.app",
  date: "11.07.2026",
  venue: "SV München-Laim",
  primary: "#ff8a3d",
};

export default function PosterSlide() {
  const t = useT();
  return (
    <div className="poster-root">
      <style>{styles}</style>
      <div className="poster" id="poster-canvas">
        <div className="banner banner-top" aria-hidden>
          <div className="banner-track">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i}>
                SCAN &amp; ANMELDEN · THIS IS OUR SUMMER · REGISTER NOW ·{" "}
              </span>
            ))}
          </div>
        </div>

        <div className="diagonal-bg" aria-hidden />

        <div className="half half-left">
          <Half cup={PADEL_CUP} scanLabel={t("posterScanLabel")} eyebrow={t("posterEyebrow")} dateLabel={t("posterDateLabel")} />
        </div>

        <div className="half half-right">
          <Half cup={FOOTBALL_CUP} scanLabel={t("posterScanLabel")} eyebrow={t("posterEyebrow")} dateLabel={t("posterDateLabel")} />
        </div>

        <div className="banner banner-bottom" aria-hidden>
          <div className="banner-track reverse">
            {Array.from({ length: 12 }).map((_, i) => (
              <span key={i}>
                HILLSONG MUNICH · SUMMER 2026 · GAME ON · OWN THE COURT ·{" "}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function Half({
  cup,
  scanLabel,
  eyebrow,
  dateLabel,
}: {
  cup: typeof PADEL_CUP;
  scanLabel: string;
  eyebrow: string;
  dateLabel: string;
}) {
  return (
    <div className="half-inner">
      <p className="eyebrow" style={{ color: cup.primary }}>
        {eyebrow}
      </p>
      <h1 className="cup-name" style={{ color: cup.primary }}>
        {cup.name}
        <br />
        <span className="year">{cup.year}</span>
      </h1>
      <div className="qr-wrap" style={{ borderColor: cup.primary }}>
        <QRCodeSVG
          value={cup.url}
          size={320}
          bgColor="#ffffff"
          fgColor="#000000"
          marginSize={2}
          level="M"
        />
      </div>
      <p className="scan-cta" style={{ color: cup.primary }}>
        ↓ {scanLabel}
      </p>
      <div className="meta">
        <p className="meta-line">
          <span className="meta-label">{dateLabel}</span>
          <span className="meta-value">{cup.date}</span>
        </p>
        <p className="meta-line">
          <span className="meta-value meta-venue">{cup.venue}</span>
        </p>
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
  background: #0a0a0a;
  overflow: hidden;
}

.diagonal-bg {
  position: absolute;
  inset: 0;
  background:
    linear-gradient(135deg, rgba(147, 204, 255, 0.05) 0%, rgba(147, 204, 255, 0.18) 49.6%, rgba(255, 138, 61, 0.18) 50.4%, rgba(255, 138, 61, 0.05) 100%);
  pointer-events: none;
}

.half {
  position: absolute;
  top: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 5% 4%;
  z-index: 1;
}
.half-left {
  left: 0;
  right: 0;
  clip-path: polygon(0 0, 56% 0, 44% 100%, 0 100%);
  background: linear-gradient(135deg, rgba(147, 204, 255, 0.06), rgba(147, 204, 255, 0.18));
  border-right: 4px solid #93ccff;
}
.half-right {
  left: 0;
  right: 0;
  clip-path: polygon(56% 0, 100% 0, 100% 100%, 44% 100%);
  background: linear-gradient(135deg, rgba(255, 138, 61, 0.06), rgba(255, 138, 61, 0.18));
}
.half-inner {
  width: 38%;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 1.2vh;
}
.half-left .half-inner { margin-right: 14%; }
.half-right .half-inner { margin-left: 14%; }

.eyebrow {
  font-size: clamp(10px, 0.9vw, 14px);
  letter-spacing: 0.32em;
  text-transform: uppercase;
  font-weight: 700;
  margin: 0;
}

.cup-name {
  font-family: "Bebas Neue", "Anton", "Oswald", "Impact", system-ui, sans-serif;
  font-size: clamp(40px, 6.5vw, 110px);
  line-height: 0.92;
  letter-spacing: -0.01em;
  text-transform: uppercase;
  font-style: italic;
  margin: 0;
  font-weight: 900;
  text-shadow: 0 4px 20px rgba(0,0,0,0.4);
}
.cup-name .year {
  display: inline-block;
  background: #fff;
  color: #000;
  padding: 0 0.2em;
  -webkit-text-fill-color: #000;
  font-style: normal;
}

.qr-wrap {
  background: #fff;
  padding: 14px;
  border: 4px solid;
  box-shadow: 8px 8px 0 0 rgba(0,0,0,0.5);
}
.qr-wrap svg {
  display: block;
  width: clamp(160px, 17vw, 320px);
  height: clamp(160px, 17vw, 320px);
}

.scan-cta {
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  font-size: clamp(12px, 1.1vw, 18px);
  letter-spacing: 0.28em;
  text-transform: uppercase;
  font-weight: 700;
  margin: 0.6vh 0 0;
}

.meta {
  margin-top: 0.6vh;
  display: flex;
  flex-direction: column;
  gap: 4px;
  font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  color: rgba(255, 255, 255, 0.86);
}
.meta-line {
  display: flex;
  gap: 0.8em;
  align-items: baseline;
  justify-content: center;
  margin: 0;
  font-size: clamp(11px, 1vw, 16px);
}
.meta-label {
  letter-spacing: 0.2em;
  text-transform: uppercase;
  color: rgba(255,255,255,0.5);
}
.meta-value { font-weight: 700; }
.meta-venue { font-size: clamp(11px, 0.95vw, 15px); color: rgba(255,255,255,0.7); }

.banner {
  position: absolute;
  left: 0;
  right: 0;
  height: 6.5%;
  overflow: hidden;
  display: flex;
  align-items: center;
  z-index: 2;
  background: #fff;
  color: #000;
  border-top: 3px solid #000;
  border-bottom: 3px solid #000;
}
.banner-top {
  top: 4%;
  transform: rotate(-1.5deg);
  margin-left: -2%;
  width: 104%;
}
.banner-bottom {
  bottom: 4%;
  transform: rotate(1.5deg);
  margin-left: -2%;
  width: 104%;
  background: #000;
  color: #fff;
  border-color: #fff;
}
.banner-track {
  display: flex;
  white-space: nowrap;
  font-family: "Bebas Neue", "Anton", "Oswald", "Impact", system-ui, sans-serif;
  font-style: italic;
  font-size: clamp(14px, 1.6vw, 24px);
  letter-spacing: 0.04em;
  font-weight: 900;
  text-transform: uppercase;
  animation: scroll 30s linear infinite;
}
.banner-track.reverse { animation: scroll-reverse 30s linear infinite; }

@keyframes scroll {
  from { transform: translateX(0); }
  to { transform: translateX(-50%); }
}
@keyframes scroll-reverse {
  from { transform: translateX(-50%); }
  to { transform: translateX(0); }
}

@media print {
  @page { size: A4 landscape; margin: 0; }
  html, body { background: #0a0a0a !important; }
  .poster-root { min-height: auto; }
  .poster { width: 297mm; height: 210mm; aspect-ratio: auto; }
  .banner-track { animation: none; }
  * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
}
`;
