import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { TOURNAMENT } from "../lib/tournament";
import { useSettings } from "../lib/hooks";

/**
 * Printable "Turniermodus" sheet — open with /print/turniermodus and use the
 * browser's print dialog (cmd+P) to save as PDF. A4-optimized, dark theme
 * that prints in color when "Background graphics" is enabled in the dialog.
 */
export default function PrintTurniermodus() {
  const settings = useSettings();
  const [params] = useSearchParams();

  // Auto-open print dialog on load when ?auto=1 is set.
  useEffect(() => {
    if (params.get("auto") === "1") {
      const t = setTimeout(() => window.print(), 300);
      return () => clearTimeout(t);
    }
  }, [params]);

  const target = settings?.set_target ?? 6;
  const twoLead = settings?.set_two_game_lead ?? true;
  const courts = settings?.total_courts ?? 3;
  const roundsPerTeam = settings?.rounds_per_team ?? 4;
  const setRuleSummary = `First to ${target}${twoLead ? " · 2-Spiele-Vorsprung" : " · ohne Vorsprung"}`;

  // Per-match estimate in minutes — rough heuristic.
  const minutesPerMatch =
    target === 4 ? 14 : target === 5 ? 18 : 22;

  // Total time calculation (Box-Liga, rough):
  // - Each team plays roundsPerTeam counted games; total counted games
  //   ~ teams*roundsPerTeam/2. With `courts` courts we get roughly
  //   ceil(games/courts) slots; assume ~10 teams as a planning baseline.
  const planningTeams = 10;
  const countedGames = Math.ceil((planningTeams * roundsPerTeam) / 2);
  const leagueSlots = Math.ceil(countedGames / courts);
  // + 1 finals wave per division (final + 3rd), single set.
  const finalWaves = 2;
  const totalWaves = leagueSlots + finalWaves;
  const playMinutes = totalWaves * minutesPerMatch;
  const switchMinutes = totalWaves * 3;
  const totalMinutes = Math.round(playMinutes + switchMinutes);
  const totalH = Math.floor(totalMinutes / 60);
  const totalM = totalMinutes % 60;
  const totalDisplay = `${totalH}:${totalM.toString().padStart(2, "0")}`;

  return (
    <div className="print-root">
      <style>{styles}</style>

      {/* Page 1 — Hero + Format */}
      <section className="page">
        <header className="hero">
          <p className="eyebrow">Turniermodus</p>
          <h1 className="display">
            Hillsong<br />
            Padel Cup<br />
            <span className="accent">2026</span>
          </h1>
          <p className="lede">
            Box-Liga in zwei Divisionen (Ober &amp; Unter) · feste Anzahl
            Spiele je Team · Spassspiele fuellen freie Courts · Divisions-Finale
            + Spiel um Platz 3.
          </p>
          <div className="meta">
            <div>
              <p className="label">Spieltag</p>
              <p className="meta-val">18. Juli 2026 · 16:00</p>
            </div>
            <div>
              <p className="label">Venue</p>
              <p className="meta-val">{TOURNAMENT.venue.name}</p>
            </div>
            <div>
              <p className="label">Plaetze</p>
              <p className="meta-val">{courts}</p>
            </div>
            <div>
              <p className="label">Dauer geplant</p>
              <p className="meta-val accent">~{totalDisplay}h</p>
            </div>
          </div>
        </header>

        <h2 className="section-h">Format auf einen Blick</h2>
        <ol className="bigsteps">
          <li>
            <span className="step-num">01</span>
            <div>
              <p className="step-title">Zwei Divisionen</p>
              <p>
                Alle Teams werden nach Spielstaerke in zwei Divisionen geteilt
                (Ober = staerkere Haelfte, Unter = Rest). So spielt jeder gegen
                aehnlich starke Gegner.
              </p>
            </div>
          </li>
          <li>
            <span className="step-num">02</span>
            <div>
              <p className="step-title">Box-Liga · {roundsPerTeam} Spiele je Team</p>
              <p>
                Innerhalb der Division spielt jedes Team {roundsPerTeam}{" "}
                verschiedene Gegner. Der Spielplan verteilt die Partien mit
                Mindestpause auf {courts} Courts; freie Court-Zellen werden mit
                Spassspielen (zaehlen nicht) gefuellt.
              </p>
            </div>
          </li>
          <li>
            <span className="step-num">03</span>
            <div>
              <p className="step-title">Divisions-Finals</p>
              <p>
                Pro Division: Platz 1 vs 2 im Finale, Platz 3 vs 4 um Bronze.
                Ein Satz pro Finale, damit das Zeitfenster haelt.
              </p>
            </div>
          </li>
        </ol>
      </section>

      {/* Page 2 — Punkte, Sätze */}
      <section className="page">
        <h2 className="section-h">Punkte &amp; Tabelle</h2>
        <div className="cards">
          <div className="card">
            <p className="label">Sieg</p>
            <p className="card-val accent">3</p>
            <p className="muted">Punkte</p>
          </div>
          <div className="card">
            <p className="label">Niederlage</p>
            <p className="card-val">0</p>
            <p className="muted">Punkte</p>
          </div>
          <div className="card">
            <p className="label">Tiebreaker</p>
            <p className="card-val small">+/-</p>
            <p className="muted">Game-Differenz, dann Games-For</p>
          </div>
        </div>

        <h2 className="section-h mt">Set-Regel</h2>
        <div className="rule-box">
          <p className="rule-summary">{setRuleSummary}</p>
          <p className="rule-body">
            Ein Satz ist gewonnen, wenn ein Team{" "}
            <strong>mindestens {target} Spiele</strong> erreicht
            {twoLead ? (
              <>
                {" "}und dabei <strong>mindestens 2 Spiele Vorsprung</strong> hat.
                Bei Gleichstand am Limit (z.&nbsp;B. {target}-{target}) wird
                weitergespielt, bis der Vorsprung erreicht ist — kein Tiebreak.
              </>
            ) : (
              <>
                . Wer als Erstes {target} Spiele hat, gewinnt den Satz —
                unabhängig vom Stand des Gegners.
              </>
            )}
          </p>
          <p className="rule-meta">
            Liga-Spiele + Finals: <strong>Ein Satz</strong> &nbsp;·&nbsp;
            Spassspiele zaehlen nicht fuer die Tabelle
          </p>
        </div>

        <h2 className="section-h mt">Zeitplan grob</h2>
        <table className="schedule">
          <thead>
            <tr>
              <th>Phase</th>
              <th className="num">Wellen</th>
              <th className="num">Zeit</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Box-Liga (beide Divisionen)</td>
              <td className="num">{leagueSlots}</td>
              <td className="num">{leagueSlots * minutesPerMatch} min</td>
            </tr>
            <tr>
              <td>Divisions-Finals + Platz 3</td>
              <td className="num">{finalWaves}</td>
              <td className="num">{finalWaves * minutesPerMatch} min</td>
            </tr>
            <tr className="total">
              <td>Gesamt inkl. Wechselzeit</td>
              <td className="num">{totalWaves}</td>
              <td className="num">~{totalDisplay}h</td>
            </tr>
          </tbody>
        </table>
        <p className="muted small">
          Basierend auf ~{planningTeams} Teams, {courts} Courts,{" "}
          {roundsPerTeam} Spiele je Team. Spielzeit ≈ {Math.round(playMinutes)}{" "}
          min, Wechselzeit ≈ {switchMinutes} min (3&nbsp;min ×{" "}
          {totalWaves} Wellen). Einzelmatch ≈ {minutesPerMatch} min bei
          aktueller Set-Regel ({setRuleSummary}).
        </p>
      </section>

      {/* Page 3 — Spieler-Sicht */}
      <section className="page">
        <h2 className="section-h">Was Spieler am Tag sehen</h2>
        <div className="players">
          <div className="player-block">
            <p className="step-num small">A</p>
            <p className="player-title">Live-Tabelle &amp; Bracket</p>
            <p>
              Auf der Public-Seite findest du jederzeit die aktuelle Tabelle
              (Punkte, Spiele, Game-Differenz) und ab dem K.&nbsp;o. das
              komplette Bracket inklusive Halbfinals, Finale und 3.&nbsp;Platz.
            </p>
          </div>
          <div className="player-block">
            <p className="step-num small">B</p>
            <p className="player-title">Live-Board pro Court</p>
            <p>
              Pro Court eine Karte: <em>„Jetzt"</em> mit laufendem Spielstand
              und LIVE-Indikator, sowie <em>„Als Nächstes"</em> mit dem
              kommenden Match. Realtime — sobald ein Spiel-Ergebnis eingetragen
              wird, springt die Anzeige.
            </p>
          </div>
          <div className="player-block">
            <p className="step-num small">C</p>
            <p className="player-title">QR-Code am Tisch</p>
            <p>
              Ein QR-Code am Anmelde-/Score-Tisch führt direkt auf die Public
              URL. Kein App-Download nötig — das Handy bleibt während der
              ganzen Veranstaltung dein Live-Tracker.
            </p>
          </div>
        </div>

        <h2 className="section-h mt">Spielregeln &amp; Verhalten</h2>
        <ul className="rules">
          <li>
            Jeder Court hat ein Schiedsgericht-light: das gegnerische Team zählt
            mit. Im Streitfall: Nachspielen.
          </li>
          <li>
            Game won → ein Team meldet sich am Score-Tisch oder wird vom Admin
            mitgezählt. Eingabe live im Modal.
          </li>
          <li>
            Wenn ein Court früher fertig ist: nicht warten. Direkt das
            nächste Match starten — Auto-Advance generiert die nächste Runde
            automatisch, sobald die laufende komplett ist.
          </li>
          <li>
            Fair Play, kein Coaching von außen, Wasser mitbringen, Spaß haben.
          </li>
        </ul>

        <footer className="page-footer">
          <p className="label">Hillsong Padel Cup 2026 · Turniermodus</p>
          <p className="muted small">
            Generiert aus dem Live-System — Set-Regel und Zeitabschätzung
            spiegeln die aktuelle Konfiguration.
          </p>
        </footer>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------- Styles */

const styles = `
  @page { size: A4; margin: 0; }

  html, body {
    background: #131313;
    margin: 0;
    padding: 0;
  }

  @media print {
    html, body {
      background: #131313 !important;
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    .print-root {
      print-color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
  }

  .print-root {
    background: #131313;
    color: #f1efe9;
    font-family: 'Hanken Grotesk', system-ui, sans-serif;
    min-height: 100vh;
  }

  .page {
    width: 210mm;
    min-height: 297mm;
    padding: 18mm 18mm 14mm;
    margin: 0 auto;
    box-sizing: border-box;
    page-break-after: always;
    break-after: page;
    background: #131313;
    position: relative;
    /* Spacer to fill remaining page so dark bg covers when content is short. */
    display: flex;
    flex-direction: column;
  }
  .page > :last-child { margin-bottom: auto; }
  .page:last-child {
    page-break-after: auto;
    break-after: auto;
  }
  /* Keep heavy blocks together where possible */
  .schedule, .cards, .players, .rule-box, .bigsteps li {
    break-inside: avoid;
    page-break-inside: avoid;
  }

  .hero {
    border-left: 6px solid #93ccff;
    padding-left: 14mm;
    margin-bottom: 16mm;
  }
  .eyebrow {
    font-family: 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    font-size: 11px;
    color: #93ccff;
    margin: 0 0 6mm 0;
  }
  .display {
    font-family: 'Anton', 'Bebas Neue', sans-serif;
    font-style: italic;
    text-transform: uppercase;
    line-height: 0.85;
    letter-spacing: -0.01em;
    font-size: 72px;
    margin: 0 0 7mm 0;
    color: #ffffff;
  }
  .accent { color: #93ccff; }
  .lede {
    font-size: 16px;
    line-height: 1.45;
    color: #c9c5b9;
    max-width: 140mm;
    margin: 0 0 8mm 0;
  }
  .meta {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 6mm;
    border-top: 2px solid #3f4850;
    padding-top: 5mm;
  }
  .label {
    font-family: 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.15em;
    font-size: 9px;
    color: #8a857a;
    margin: 0 0 2mm 0;
  }
  .meta-val {
    font-family: 'Anton', sans-serif;
    text-transform: uppercase;
    font-size: 18px;
    margin: 0;
  }
  .meta-val.accent { color: #93ccff; }

  .section-h {
    font-family: 'Anton', sans-serif;
    text-transform: uppercase;
    font-style: italic;
    font-size: 36px;
    line-height: 1;
    margin: 0 0 6mm 0;
    color: #ffffff;
    letter-spacing: -0.005em;
  }
  .section-h.mt { margin-top: 12mm; }

  .bigsteps {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .bigsteps li {
    display: grid;
    grid-template-columns: 22mm 1fr;
    gap: 6mm;
    padding: 6mm 0;
    border-top: 2px solid #3f4850;
    align-items: start;
  }
  .bigsteps li:last-child { border-bottom: 2px solid #3f4850; }
  .step-num {
    font-family: 'Anton', sans-serif;
    font-style: italic;
    font-size: 60px;
    line-height: 0.85;
    color: #93ccff;
  }
  .step-num.small {
    font-size: 28px;
    color: #4edea3;
  }
  .step-title {
    font-family: 'Anton', sans-serif;
    text-transform: uppercase;
    font-size: 22px;
    margin: 0 0 2mm 0;
    color: #ffffff;
  }
  .bigsteps p {
    font-size: 13px;
    line-height: 1.5;
    color: #c9c5b9;
    margin: 0;
  }

  .cards {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 5mm;
    margin-bottom: 4mm;
  }
  .card {
    border: 2px solid #3f4850;
    background: #1c1c1c;
    padding: 6mm;
    box-shadow: 6px 6px 0 #93ccff;
  }
  .card-val {
    font-family: 'Anton', sans-serif;
    font-style: italic;
    font-size: 80px;
    line-height: 0.85;
    margin: 3mm 0 2mm 0;
    color: #ffffff;
  }
  .card-val.accent { color: #93ccff; }
  .card-val.small { font-size: 42px; }
  .muted { color: #8a857a; font-size: 11px; margin: 0; }

  .rule-box {
    border: 2px solid #93ccff;
    padding: 6mm;
    background: rgba(147, 204, 255, 0.05);
    margin-bottom: 4mm;
  }
  .rule-summary {
    font-family: 'Anton', sans-serif;
    text-transform: uppercase;
    font-size: 28px;
    margin: 0 0 4mm 0;
    color: #93ccff;
  }
  .rule-body {
    font-size: 13px;
    line-height: 1.55;
    color: #c9c5b9;
    margin: 0 0 4mm 0;
  }
  .rule-meta {
    font-family: 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 10px;
    color: #ffb869;
    margin: 0;
  }

  .schedule {
    width: 100%;
    border-collapse: collapse;
    margin-bottom: 3mm;
  }
  .schedule th, .schedule td {
    padding: 3mm 4mm;
    text-align: left;
    border-top: 2px solid #3f4850;
    font-size: 13px;
  }
  .schedule th {
    font-family: 'Space Mono', monospace;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    font-size: 9px;
    color: #8a857a;
    border-top: none;
    border-bottom: 2px solid #3f4850;
  }
  .schedule td.num, .schedule th.num { text-align: right; font-variant-numeric: tabular-nums; }
  .schedule tr.total td {
    border-top: 2px solid #93ccff;
    font-family: 'Anton', sans-serif;
    text-transform: uppercase;
    font-size: 18px;
    color: #ffffff;
    padding-top: 4mm;
  }
  .small { font-size: 11px; }

  .players {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: 6mm;
  }
  .player-block {
    border: 2px solid #3f4850;
    background: #1c1c1c;
    padding: 5mm;
  }
  .player-title {
    font-family: 'Anton', sans-serif;
    text-transform: uppercase;
    font-size: 16px;
    margin: 2mm 0 3mm 0;
    color: #ffffff;
  }
  .player-block p:last-child {
    font-size: 12px;
    line-height: 1.5;
    color: #c9c5b9;
    margin: 0;
  }

  .rules {
    list-style: none;
    margin: 0;
    padding: 0;
  }
  .rules li {
    padding: 3mm 0 3mm 8mm;
    border-top: 2px solid #3f4850;
    font-size: 13px;
    line-height: 1.5;
    color: #c9c5b9;
    position: relative;
  }
  .rules li::before {
    content: "→";
    position: absolute;
    left: 0;
    color: #4edea3;
  }
  .rules li:last-child { border-bottom: 2px solid #3f4850; }

  .page-footer {
    margin-top: 16mm;
    padding-top: 4mm;
    border-top: 2px solid #3f4850;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 4mm;
    align-items: end;
  }
  .page-footer .label { color: #93ccff; }

  /* Screen-only helper banner — hidden when printing */
  @media screen {
    .print-root::before {
      content: "Tipp: cmd/ctrl + P · Hintergrundgrafiken aktivieren · Als PDF speichern";
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: 8px 16px;
      background: #ffb869;
      color: #131313;
      font-family: 'Space Mono', monospace;
      font-size: 11px;
      text-transform: uppercase;
      letter-spacing: 0.12em;
      text-align: center;
      z-index: 1000;
    }
    .print-root { padding-top: 36px; }
  }

  @media print {
    .print-root::before { display: none; }
    .print-root { padding-top: 0 !important; }
  }
`;
