import { useEffect, useState } from "react";
import { getWindowPhase } from "./window-time";
import "./arched-window.css";

function formatLocalTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

type ArchedWindowProps = {
  reduced?: boolean;
};

export function ArchedWindow({ reduced = false }: ArchedWindowProps) {
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
      className={`arched-window${reduced ? " arched-window--reduced" : ""}`}
      data-phase={phase}
      role="img"
      aria-label={`Arched cafe window showing ${phase}, local time ${localTime}`}
      data-testid="cafe-arched-window"
    >
      <svg
        className="arched-window__art"
        viewBox="0 -16 180 176"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="arched-window-view">
            <path d="M29 93V65a61 61 0 0 1 122 0v28z" />
          </clipPath>
          <linearGradient id="window-day-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#82b9ce" />
            <stop offset="1" stopColor="#d6d9b2" />
          </linearGradient>
          <linearGradient id="window-dawn-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#8c91bd" />
            <stop offset=".58" stopColor="#e8a17c" />
            <stop offset="1" stopColor="#f4d49a" />
          </linearGradient>
          <linearGradient id="window-dusk-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#666b9a" />
            <stop offset=".62" stopColor="#d17f73" />
            <stop offset="1" stopColor="#efb477" />
          </linearGradient>
          <linearGradient id="window-night-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#293b5e" />
            <stop offset="1" stopColor="#60778b" />
          </linearGradient>
        </defs>

        <g clipPath="url(#arched-window-view)">
          <rect className="window-sky window-sky--dawn" x="20" y="0" width="140" height="112" fill="url(#window-dawn-sky)" />
          <rect className="window-sky window-sky--day" x="20" y="0" width="140" height="112" fill="url(#window-day-sky)" />
          <rect className="window-sky window-sky--dusk" x="20" y="0" width="140" height="112" fill="url(#window-dusk-sky)" />
          <rect className="window-sky window-sky--night" x="20" y="0" width="140" height="112" fill="url(#window-night-sky)" />

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
          <path d="M20 89h140v24H20z" fill="#9aaf92" />
          <path d="M20 95h140v18H20z" fill="#819a81" />
          <path d="M20 91h20v-8h7v8h14v-6h7v6h19v-10h8v10h13v-7h8v7h22v-5h7v5h15v10H20z" fill="#71896f" />
          <path d="M20 105h140v8H20z" fill="#687d68" />
          <path d="M35 97h8v8h-8zm35-2h8v10h-8zm49 1h7v9h-7z" fill="#c5c698" opacity=".6" />
          <path d="M28 72h8v2h-8zm96 14h8v2h-8z" fill="#f1dcc1" opacity=".62" />
        </g>

        {/* Deep sill and layered white-painted trim */}
        <path d="M18 88h144v15H18z" fill="#65574b" />
        <path d="M21 91h138v9H21z" fill="#f6f0df" />
        <path d="M24 94h132v4H24z" fill="#d5cbbc" />
        <path d="M18 101h144v8H18z" fill="#8b7762" />
        <path d="M14 107h152v8H14z" fill="#d8d2c7" />
        <path d="M10 114h160v10H10z" fill="#f8f4e9" />
        <path d="M14 124h152v4H14z" fill="#aaa093" />
        <path d="M22 92h5v10h-5zm131 0h5v10h-5z" fill="#ffffff" />

        {/* Thick arched casing, inset reveal, and muntins */}
        <path d="M14 94V65a76 76 0 0 1 152 0v29h-9V65a67 67 0 0 0-134 0v29z" fill="#9d988f" />
        <path d="M18 91V65a72 72 0 0 1 144 0v26h-7V65a65 65 0 0 0-130 0v26z" fill="#fffdf2" />
        <path d="M25 89V65a65 65 0 0 1 130 0v24h-4V65a61 61 0 0 0-122 0v24z" fill="#e2ded2" />
        <path d="M87 17h6v72h-6z" fill="#f6f2e7" />
        <path d="M29 60h122v6H29z" fill="#f6f2e7" />
        <path d="M89 18h2v69h-2zM31 62h118v2H31z" fill="#fff" opacity=".75" />
        <path d="M17 65h5v25h-5zm141 0h5v25h-5z" fill="#fff" />
        <path d="M16 89h148v4H16z" fill="#c7c0b4" />
        <path d="M10 128h160v5H10z" fill="#75604e" />
        <path d="M7 132h166v8H7z" fill="#f4efe4" />
        <path d="M12 140h156v4H12z" fill="#c7beb0" />
        <path d="M14 145h152v5H14z" fill="#6c5745" />

        <path d="M18 65a72 72 0 0 1 144 0" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M21 67v21M159 67v21" stroke="#bdb5a8" strokeWidth="2" />
        <path d="M24 151h132" stroke="#4f4238" strokeWidth="2" opacity=".32" />
      </svg>
      <span className="arched-window__glint" aria-hidden="true" />
    </div>
  );
}
