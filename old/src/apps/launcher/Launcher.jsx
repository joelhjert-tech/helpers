import "./launcher.css";
import { toolApps } from "../toolRegistry";

// Distinct visual identity per card, keyed by app id.
const CARD_THEME = {
  "cutscene-maker": {
    className: "moon-card moon-card--film",
    kicker: "Director's Desk",
    blurb: "Block actors, write the command timeline, and test the scene live.",
    cta: "Open Cutscene Maker",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="6" y="12" width="36" height="24" rx="2" />
        <g className="film-perf">
          <rect x="9" y="15" width="4" height="4" />
          <rect x="9" y="29" width="4" height="4" />
          <rect x="35" y="15" width="4" height="4" />
          <rect x="35" y="29" width="4" height="4" />
        </g>
        <polygon points="20,18 32,24 20,30" className="film-play" />
      </svg>
    ),
  },
  "schedule-maker": {
    className: "moon-card moon-card--map",
    kicker: "Village Planner",
    blurb: "Plan one NPC's whole day and watch the route play out on the map.",
    cta: "Open Schedule Maker",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <circle cx="24" cy="24" r="16" className="clock-face" />
        <line x1="24" y1="24" x2="24" y2="13" />
        <line x1="24" y1="24" x2="32" y2="27" />
        <circle cx="24" cy="24" r="1.8" className="clock-pin" />
      </svg>
    ),
  },
  "animation-portrait-maker": {
    className: "moon-card moon-card--canvas",
    kicker: "Artist Studio",
    blurb: "Build portraits, expressions, and animations on the workbench.",
    cta: "Open Animation & Portrait Maker",
    icon: (
      <svg viewBox="0 0 48 48" aria-hidden="true">
        <rect x="10" y="8" width="28" height="32" rx="2" className="canvas-frame" />
        <circle cx="24" cy="20" r="5" className="canvas-head" />
        <path d="M15 36 q9 -10 18 0" className="canvas-body" />
        <path d="M34 10 l6 -4 1 5 z" className="canvas-brush" />
      </svg>
    ),
  },
};

export default function Launcher({ onOpen, onValidateProject, onOpenProjectFolder, onSettings, pixelLabStatus = "PixelLab: not connected" }) {
  return (
    <main className="launcher">
      <header className="launcher__hero">
        <p className="launcher__eyebrow">Moon Village Tools</p>
        <h1>Pick your workbench</h1>
        <span>Three focused makers. Each one is its own app, built for one job.</span>
      </header>

      <section className="launcher__grid" aria-label="Moon Village tool launcher">
        {toolApps.map((app) => {
          const theme = CARD_THEME[app.id] ?? { className: "moon-card", kicker: app.shortTitle, blurb: app.purpose, cta: `Open ${app.title}`, icon: null };
          return (
            <article key={app.id} className={theme.className}>
              <div className="moon-card__icon">{theme.icon}</div>
              <p className="moon-card__kicker">{theme.kicker}</p>
              <h2>{app.title}</h2>
              <p className="moon-card__blurb">{theme.blurb}</p>
              <ul className="moon-card__focus">
                {app.focus.slice(0, 3).map((item) => <li key={item}>{item}</li>)}
              </ul>
              <button type="button" className="moon-card__cta" onClick={() => onOpen(app)}>{theme.cta}</button>
            </article>
          );
        })}
      </section>

      <footer className="launcher__footer">
        <button type="button" onClick={onSettings}>Settings</button>
        <button type="button" onClick={onValidateProject}>Validate Project</button>
        <button type="button" onClick={onOpenProjectFolder}>Open Project Folder</button>
        <span className="launcher__pixellab" title={pixelLabStatus}>{pixelLabStatus}</span>
      </footer>
    </main>
  );
}
