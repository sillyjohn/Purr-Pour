import { useEffect, useState } from "react";
import { ScenePreview } from "./_ScenePreview";
import { getWindowPhase } from "./_shared/window-time";
import "./HighArch.css";

function formatLocalTime(date: Date): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function HighArchWindow() {
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
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);

  const phase = getWindowPhase(now);

  return (
    <div
      className={`high-arch-window${reduced ? " high-arch-window--reduced" : ""}`}
      data-phase={phase}
      role="img"
      aria-label={`Tall arched cafe window showing ${phase}, local time ${formatLocalTime(now)}`}
      data-testid="cafe-arched-window"
    >
      <svg
        className="high-arch-window__art"
        viewBox="0 0 180 268"
        preserveAspectRatio="none"
        shapeRendering="crispEdges"
        aria-hidden="true"
      >
        <defs>
          <clipPath id="high-arch-window-view">
            <path d="M29 202V80a61 61 0 0 1 122 0v122z" />
          </clipPath>
          <linearGradient id="high-arch-day-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#82b9ce" />
            <stop offset="1" stopColor="#d6d9b2" />
          </linearGradient>
          <linearGradient id="high-arch-dawn-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#8c91bd" />
            <stop offset=".58" stopColor="#e8a17c" />
            <stop offset="1" stopColor="#f4d49a" />
          </linearGradient>
          <linearGradient id="high-arch-dusk-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#666b9a" />
            <stop offset=".62" stopColor="#d17f73" />
            <stop offset="1" stopColor="#efb477" />
          </linearGradient>
          <linearGradient id="high-arch-night-sky" x2="0" y2="1">
            <stop offset="0" stopColor="#293b5e" />
            <stop offset="1" stopColor="#60778b" />
          </linearGradient>
        </defs>

        <g clipPath="url(#high-arch-window-view)">
          <rect className="high-arch-window__sky high-arch-window__sky--dawn" x="20" y="0" width="140" height="206" fill="url(#high-arch-dawn-sky)" />
          <rect className="high-arch-window__sky high-arch-window__sky--day" x="20" y="0" width="140" height="206" fill="url(#high-arch-day-sky)" />
          <rect className="high-arch-window__sky high-arch-window__sky--dusk" x="20" y="0" width="140" height="206" fill="url(#high-arch-dusk-sky)" />
          <rect className="high-arch-window__sky high-arch-window__sky--night" x="20" y="0" width="140" height="206" fill="url(#high-arch-night-sky)" />

          <g className="high-arch-window__sun">
            <circle cx="123" cy="54" r="12" fill="#fff0bd" />
            <path d="M116 51h3v3h-3zm8-5h3v4h-3zm3 12h4v3h-4z" fill="#fff8d7" />
          </g>
          <g className="high-arch-window__moon">
            <path d="M119 37a13 13 0 1 0 14 19 11 11 0 0 1-14-19z" fill="#e9e3c0" />
            <path d="M139 54h3v3h-3zM106 32h2v2h-2z" fill="#f8edc5" />
          </g>
          <g className="high-arch-window__stars" fill="#f8edc5">
            <path d="M52 33h3v3h-3zM79 22h2v2h-2zM99 43h2v2h-2zM143 31h2v2h-2z" />
          </g>

          <g className="high-arch-window__cloud high-arch-window__cloud--one" fill="#f0dfca">
            <path d="M25 72h8v-7h5v-5h10v4h5v8h7v7H25z" />
            <path d="M30 69h7v-4h5v5h-5v4h-7z" fill="#fff0dc" />
          </g>
          <g className="high-arch-window__cloud high-arch-window__cloud--two" fill="#f2dfcb">
            <path d="M102 95h8v-6h5v-5h9v4h5v7h7v7h-34z" />
          </g>
          <path d="M20 164h140v42H20z" fill="#9aaf92" />
          <path d="M20 174h140v32H20z" fill="#819a81" />
          <path d="M20 170h20v-8h7v8h14v-6h7v6h19v-10h8v10h13v-7h8v7h22v-5h7v5h15v12H20z" fill="#71896f" />
          <path d="M20 190h140v16H20z" fill="#687d68" />
          <path d="M35 178h8v10h-8zm35-2h8v13h-8zm49 1h7v11h-7z" fill="#c5c698" opacity=".6" />
          <path d="M28 104h8v2h-8zm96 48h8v2h-8z" fill="#f1dcc1" opacity=".62" />
        </g>

        {/* The same deep sill and painted casing, extended into tall lower lights. */}
        <path d="M18 201h144v15H18z" fill="#65574b" />
        <path d="M21 204h138v9H21z" fill="#f6f0df" />
        <path d="M24 207h132v4H24z" fill="#d5cbbc" />
        <path d="M18 214h144v8H18z" fill="#8b7762" />
        <path d="M14 220h152v8H14z" fill="#d8d2c7" />
        <path d="M10 227h160v10H10z" fill="#f8f4e9" />
        <path d="M14 237h152v4H14z" fill="#aaa093" />
        <path d="M22 205h5v12h-5zm131 0h5v12h-5z" fill="#fff" />

        <path d="M14 204V80a76 76 0 0 1 152 0v124h-9V80a67 67 0 0 0-134 0v124z" fill="#9d988f" />
        <path d="M18 201V80a72 72 0 0 1 144 0v121h-7V80a65 65 0 0 0-130 0v121z" fill="#fffdf2" />
        <path d="M25 199V80a65 65 0 0 1 130 0v119h-4V80a61 61 0 0 0-122 0v119z" fill="#e2ded2" />

        {/* Broad, open panes: three long vertical lights and just one cross rail. */}
        <path d="M67 23h6v176h-6zM107 23h6v176h-6z" fill="#f6f2e7" />
        <path d="M29 126h122v6H29z" fill="#f6f2e7" />
        <path d="M69 25h2v171h-2zM109 25h2v171h-2zM31 128h118v2H31z" fill="#fff" opacity=".75" />
        <path d="M17 80h5v119h-5zm141 0h5v119h-5z" fill="#fff" />
        <path d="M16 199h148v4H16z" fill="#c7c0b4" />
        <path d="M10 241h160v5H10z" fill="#75604e" />
        <path d="M7 245h166v8H7z" fill="#f4efe4" />
        <path d="M12 253h156v4H12z" fill="#c7beb0" />
        <path d="M14 258h152v5H14z" fill="#6c5745" />

        <path d="M18 80a72 72 0 0 1 144 0" fill="none" stroke="#fff" strokeWidth="3" />
        <path d="M21 82v114M159 82v114" stroke="#bdb5a8" strokeWidth="2" />
        <path d="M24 264h132" stroke="#4f4238" strokeWidth="2" opacity=".32" />
      </svg>
      <span className="high-arch-window__glint" aria-hidden="true" />
    </div>
  );
}

export function HighArch() {
  return (
    <ScenePreview
      className="high-arch-scene"
      windowContent={<HighArchWindow />}
    />
  );
}
