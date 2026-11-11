import { useEffect, useState } from "react";
import { getWindowPhase } from "./_shared/window-time";
import { ScenePreview } from "./_ScenePreview";
import "./TallClassic.css";

function formatLocalTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function TallClassicWindow({ reduced = false }: { reduced?: boolean }) {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  const phase = getWindowPhase(now);
  const localTime = formatLocalTime(now);

  return (
    <div
      className={`tall-classic-window${reduced ? " tall-classic-window--reduced" : ""}`}
      data-phase={phase}
      role="img"
      aria-label={`Arched cafe window showing ${phase}, local time ${localTime}`}
      data-testid="cafe-arched-window"
    >
      <svg
        className="tall-classic-window__art"
        viewBox="0 0 180 212"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="tall-classic-view">
            <path d="M29 171V65a61 61 0 0 1 122 0v106z" />
          </clipPath>
          <linearGradient id="tall-classic-day" x2="0" y2="1">
            <stop offset="0" stopColor="#82b9ce" />
            <stop offset="1" stopColor="#d6d9b2" />
          </linearGradient>
          <linearGradient id="tall-classic-dawn" x2="0" y2="1">
            <stop offset="0" stopColor="#8c91bd" />
            <stop offset=".58" stopColor="#e8a17c" />
            <stop offset="1" stopColor="#f4d49a" />
          </linearGradient>
          <linearGradient id="tall-classic-dusk" x2="0" y2="1">
            <stop offset="0" stopColor="#666b9a" />
            <stop offset=".62" stopColor="#d17f73" />
            <stop offset="1" stopColor="#efb477" />
          </linearGradient>
          <linearGradient id="tall-classic-night" x2="0" y2="1">
            <stop offset="0" stopColor="#293b5e" />
            <stop offset="1" stopColor="#60778b" />
          </linearGradient>
        </defs>

        <g clipPath="url(#tall-classic-view)">
          <rect className="tall-classic-sky tall-classic-sky--dawn" x="20" y="0" width="140" height="174" fill="url(#tall-classic-dawn)" />
          <rect className="tall-classic-sky tall-classic-sky--day" x="20" y="0" width="140" height="174" fill="url(#tall-classic-day)" />
          <rect className="tall-classic-sky tall-classic-sky--dusk" x="20" y="0" width="140" height="174" fill="url(#tall-classic-dusk)" />
          <rect className="tall-classic-sky tall-classic-sky--night" x="20" y="0" width="140" height="174" fill="url(#tall-classic-night)" />

          <g className="tall-classic-sun">
            <circle cx="123" cy="48" r="12" fill="#fff0bd" />
            <path d="M116 45h3v3h-3zm8-5h3v4h-3zm3 12h4v3h-4z" fill="#fff8d7" />
          </g>
          <g className="tall-classic-moon">
            <path d="M119 31a13 13 0 1 0 14 19 11 11 0 0 1-14-19z" fill="#e9e3c0" />
            <path d="M139 48h3v3h-3zM106 26h2v2h-2z" fill="#f8edc5" />
          </g>
          <g className="tall-classic-stars" fill="#f8edc5">
            <path d="M52 27h3v3h-3zM79 16h2v2h-2zM99 37h2v2h-2zM143 25h2v2h-2z" />
          </g>

          <g className="tall-classic-cloud tall-classic-cloud--one" fill="#f0dfca">
            <path d="M27 57h8v-7h5v-5h10v4h5v8h7v7H27z" />
            <path d="M32 54h7v-4h5v5h-5v4h-7z" fill="#fff0dc" />
          </g>
          <g className="tall-classic-cloud tall-classic-cloud--two" fill="#f2dfcb">
            <path d="M100 68h8v-6h5v-5h9v4h5v7h7v7h-34z" />
          </g>

          <path d="M20 132h140v42H20z" fill="#9aaf92" />
          <path d="M20 139h140v35H20z" fill="#819a81" />
          <path d="M20 134h20v-8h7v8h14v-6h7v6h19v-10h8v10h13v-7h8v7h22v-5h7v5h15v12H20z" fill="#71896f" />
          <path d="M20 157h140v17H20z" fill="#687d68" />
          <path d="M35 143h8v14h-8zm35-2h8v16h-8zm49 1h7v15h-7z" fill="#c5c698" opacity=".6" />
          <path d="M28 89h8v2h-8zm96 14h8v2h-8z" fill="#f1dcc1" opacity=".62" />
        </g>

        {/* The familiar round-headed sash stays intact; the lower lights simply run longer. */}
        <path d="M18 168h144v15H18z" fill="#65574b" />
        <path d="M21 171h138v9H21z" fill="#f6f0df" />
        <path d="M24 174h132v4H24z" fill="#d5cbbc" />
        <path d="M18 181h144v8H18z" fill="#8b7762" />
        <path d="M14 187h152v8H14z" fill="#d8d2c7" />
        <path d="M10 194h160v10H10z" fill="#f8f4e9" />
        <path d="M14 204h152v4H14z" fill="#aaa093" />
        <path d="M22 172h5v10h-5zm131 0h5v10h-5z" fill="#fff" />

        <path d="M14 171V65a76 76 0 0 1 152 0v106h-9V65a67 67 0 0 0-134 0v106z" fill="#9d988f" />
        <path d="M18 168V65a72 72 0 0 1 144 0v103h-7V65a65 65 0 0 0-130 0v103z" fill="#fffdf2" />
        <path d="M25 166V65a65 65 0 0 1 130 0v101h-4V65a61 61 0 0 0-122 0v101z" fill="#e2ded2" />

        {/* Two tall lower panes under the original arched upper lights. */}
        <path d="M87 17h6v149h-6z" fill="#f6f2e7" />
        <path d="M29 91h122v6H29z" fill="#f6f2e7" />
        <path d="M29 131h122v5H29z" fill="#f6f2e7" />
        <path d="M89 18h2v146h-2zM31 93h118v2H31zM31 133h118v2H31z" fill="#fff" opacity=".75" />
        <path d="M17 65h5v101h-5zm141 0h5v101h-5z" fill="#fff" />
        <path d="M16 168h148v4H16z" fill="#c7c0b4" />

        <path d="M10 208h160v4H10z" fill="#75604e" />
        <path d="M7 211h166v1H7z" fill="#f4efe4" />
        <path d="M18 65a72 72 0 0 1 144 0" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M21 67v99M159 67v99" stroke="#bdb5a8" strokeWidth="2" />
        <path d="M24 212h132" stroke="#4f4238" strokeWidth="2" opacity=".32" />
      </svg>
      <span className="tall-classic-window__glint" aria-hidden="true" />
    </div>
  );
}

export function TallClassic() {
  return (
    <ScenePreview
      className="tall-classic-variant"
      windowContent={<TallClassicWindow />}
    />
  );
}
