import { useEffect, useState } from "react";
import { ScenePreview } from "./_ScenePreview";
import { getWindowPhase } from "./_shared/window-time";
import "./CounterAligned.css";

function localTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function CounterWindow() {
  const [now, setNow] = useState(() => new Date());
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const refresh = () => setNow(new Date());
    const interval = window.setInterval(refresh, 30_000);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);

  const phase = getWindowPhase(now);

  return (
    <div
      className={`counter-aligned-window${reduced ? " counter-aligned-window--reduced" : ""}`}
      data-phase={phase}
      role="img"
      aria-label={`Tall counter-side cafe window showing ${phase}, local time ${localTime(now)}`}
      data-testid="cafe-arched-window"
    >
      <svg
        className="counter-aligned-window__art"
        viewBox="0 -16 180 280"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="counter-window-view">
            <path d="M29 214V65a61 61 0 0 1 122 0v149z" />
          </clipPath>
          <linearGradient id="counter-window-day-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#82b9ce" />
            <stop offset="1" stopColor="#d6d9b2" />
          </linearGradient>
          <linearGradient id="counter-window-dawn-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#8c91bd" />
            <stop offset=".58" stopColor="#e8a17c" />
            <stop offset="1" stopColor="#f4d49a" />
          </linearGradient>
          <linearGradient id="counter-window-dusk-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#666b9a" />
            <stop offset=".62" stopColor="#d17f73" />
            <stop offset="1" stopColor="#efb477" />
          </linearGradient>
          <linearGradient id="counter-window-night-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#293b5e" />
            <stop offset="1" stopColor="#60778b" />
          </linearGradient>
        </defs>

        <g clipPath="url(#counter-window-view)">
          <rect className="window-sky window-sky--dawn" x="20" y="0" width="140" height="220" fill="url(#counter-window-dawn-sky)" />
          <rect className="window-sky window-sky--day" x="20" y="0" width="140" height="220" fill="url(#counter-window-day-sky)" />
          <rect className="window-sky window-sky--dusk" x="20" y="0" width="140" height="220" fill="url(#counter-window-dusk-sky)" />
          <rect className="window-sky window-sky--night" x="20" y="0" width="140" height="220" fill="url(#counter-window-night-sky)" />

          <g className="window-sun">
            <circle cx="123" cy="48" r="12" fill="#fff0bd" />
            <path d="M116 45h3v3h-3zm8-5h3v4h-3zm3 12h4v3h-4z" fill="#fff8d7" />
          </g>
          <g className="window-moon">
            <path d="M119 31a13 13 0 1 0 14 19 11 11 0 0 1-14-19z" fill="#e9e3c0" />
            <path d="M139 48h3v3h-3zM106 26h2v2h-2z" fill="#f8edc5" />
          </g>
          <g className="window-stars" fill="#f8edc5">
            <path d="M52 27h3v3h-3zM79 16h2v2h-2zM99 37h2v2h-2zM143 25h2v2h-2z" />
          </g>

          <g className="window-cloud window-cloud--one" fill="#f0dfca">
            <path d="M27 57h8v-7h5v-5h10v4h5v8h7v7H27z" />
            <path d="M32 54h7v-4h5v5h-5v4h-7z" fill="#fff0dc" />
          </g>
          <g className="window-cloud window-cloud--two" fill="#f2dfcb">
            <path d="M100 68h8v-6h5v-5h9v4h5v7h7v7h-34z" />
          </g>

          <path d="M20 139h140v75H20z" fill="#9aaf92" />
          <path d="M20 150h140v64H20z" fill="#819a81" />
          <path d="M20 145h20v-8h7v8h14v-6h7v6h19v-10h8v10h13v-7h8v7h22v-5h7v5h15v10H20z" fill="#71896f" />
          <path d="M20 185h140v29H20z" fill="#687d68" />
          <path d="M35 158h8v12h-8zm35-3h8v15h-8zm49 2h7v14h-7z" fill="#c5c698" opacity=".6" />
          <path d="M28 124h8v2h-8zm96 14h8v2h-8z" fill="#f1dcc1" opacity=".62" />
          <path d="M20 204h140v10H20z" fill="#71896f" />
        </g>

        {/* The original rounded head now flows into long shopfront glazing. */}
        <path d="M14 215V65a76 76 0 0 1 152 0v150h-9V65a67 67 0 0 0-134 0v150z" fill="#9d988f" />
        <path d="M18 211V65a72 72 0 0 1 144 0v146h-7V65a65 65 0 0 0-130 0v146z" fill="#fffdf2" />
        <path d="M25 207V65a65 65 0 0 1 130 0v142h-4V65a61 61 0 0 0-122 0v142z" fill="#e2ded2" />

        {/* Deep rectangular panes with a strong center stile and one broad rail. */}
        <path d="M87 17h6v190h-6z" fill="#f6f2e7" />
        <path d="M89 18h2v187h-2z" fill="#fff" opacity=".75" />
        <path d="M29 139h122v6H29z" fill="#f6f2e7" />
        <path d="M31 141h118v2H31z" fill="#fff" opacity=".75" />
        <path d="M17 65h5v142h-5zm141 0h5v142h-5z" fill="#fff" />
        <path d="M16 207h148v4H16z" fill="#c7c0b4" />

        {/* Deep white-painted counter sill echoes the café's pale plaster trim. */}
        <path d="M18 211h144v12H18z" fill="#65574b" />
        <path d="M21 213h138v7H21z" fill="#f6f0df" />
        <path d="M24 216h132v3H24z" fill="#d5cbbc" />
        <path d="M14 223h152v7H14z" fill="#8b7762" />
        <path d="M10 229h160v10H10z" fill="#f8f4e9" />
        <path d="M14 239h152v4H14z" fill="#aaa093" />
        <path d="M10 243h160v5H10z" fill="#75604e" />
        <path d="M7 247h166v7H7z" fill="#f4efe4" />
        <path d="M12 254h156v4H12z" fill="#c7beb0" />
        <path d="M14 258h152v5H14z" fill="#6c5745" />

        <path d="M18 65a72 72 0 0 1 144 0" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M21 67v138M159 67v138" stroke="#bdb5a8" strokeWidth="2" />
        <path d="M22 259h136" stroke="#4f4238" strokeWidth="2" opacity=".32" />
      </svg>
      <span className="counter-aligned-window__glint" aria-hidden="true" />
    </div>
  );
}

export function CounterAligned() {
  return <ScenePreview className="counter-aligned-scene" windowContent={<CounterWindow />} />;
}

export default CounterAligned;
