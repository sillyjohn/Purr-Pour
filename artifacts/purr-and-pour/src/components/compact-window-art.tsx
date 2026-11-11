/** A separately drawn compact window, not a vertically scaled tall window. */
export function CompactWindowArt() {
  return (
    <svg className="arched-window__compact-art" viewBox="0 0 180 180" preserveAspectRatio="xMidYMid meet" shapeRendering="crispEdges" aria-hidden="true">
      <defs>
        <clipPath id="compact-window-view">
          <path d="M29 145V78a61 61 0 0 1 122 0v67z" />
        </clipPath>
        <linearGradient id="compact-dawn" x2="0" y2="1">
          <stop stopColor="#8c91bd" /><stop offset=".58" stopColor="#e8a17c" /><stop offset="1" stopColor="#f4d49a" />
        </linearGradient>
        <linearGradient id="compact-day" x2="0" y2="1">
          <stop stopColor="#82b9ce" /><stop offset="1" stopColor="#d6d9b2" />
        </linearGradient>
        <linearGradient id="compact-dusk" x2="0" y2="1">
          <stop stopColor="#666b9a" /><stop offset=".62" stopColor="#d17f73" /><stop offset="1" stopColor="#efb477" />
        </linearGradient>
        <linearGradient id="compact-night" x2="0" y2="1">
          <stop stopColor="#293b5e" /><stop offset="1" stopColor="#60778b" />
        </linearGradient>
      </defs>
      <g clipPath="url(#compact-window-view)">
        <rect className="window-sky window-sky--dawn" x="20" width="140" height="150" fill="url(#compact-dawn)" />
        <rect className="window-sky window-sky--day" x="20" width="140" height="150" fill="url(#compact-day)" />
        <rect className="window-sky window-sky--dusk" x="20" width="140" height="150" fill="url(#compact-dusk)" />
        <rect className="window-sky window-sky--night" x="20" width="140" height="150" fill="url(#compact-night)" />
        <circle className="window-sun" cx="119" cy="49" r="12" fill="#fff0bd" />
        <path className="window-moon" d="M119 34a13 13 0 1 0 14 19 11 11 0 0 1-14-19z" fill="#e9e3c0" />
        <path className="window-stars" d="M52 33h3v3h-3zM79 23h2v2h-2zM101 45h2v2h-2zM139 69h2v2h-2z" fill="#f8edc5" />
        <g className="window-cloud" fill="#f0dfca">
          <path d="M26 73h8v-7h5v-5h10v4h5v8h7v7H26z" />
          <path d="M31 70h7v-4h5v5h-5v4h-7z" fill="#fff0dc" />
        </g>
        <path className="window-cloud window-cloud--two" d="M108 104h8v-6h5v-5h9v4h5v7h7v7h-34z" fill="#f2dfcb" />
        <path d="M20 128h140v22H20z" fill="#9aaf92" />
        <path d="M20 134h20v-8h8v8h18v-6h8v6h17v-10h8v10h18v-8h8v8h35v16H20z" fill="#71896f" />
        <path d="M20 143h140v7H20z" fill="#687d68" />
        <path d="M35 136h8v7h-8zm37 0h7v7h-7zm51 0h7v7h-7z" fill="#c5c698" opacity=".6" />
      </g>
      {/* The arch keeps the same circular radius; only the straight jambs are shorter. */}
      <path d="M14 150V78a76 76 0 0 1 152 0v72h-9V78a67 67 0 0 0-134 0v72z" fill="#9d988f" />
      <path d="M18 148V78a72 72 0 0 1 144 0v70h-7V78a65 65 0 0 0-130 0v70z" fill="#fffdf2" />
      <path d="M25 145V78a65 65 0 0 1 130 0v67h-4V78a61 61 0 0 0-122 0v67z" fill="#e2ded2" />
      <path d="M87 17h6v128h-6zM29 89h122v6H29z" fill="#f6f2e7" />
      <path d="M89 18h2v125h-2zM31 91h118v2H31z" fill="#fff" />
      <path d="M18 78a72 72 0 0 1 144 0" fill="none" stroke="#fff" strokeWidth="3" />
      <path d="M21 80v64M159 80v64" stroke="#bdb5a8" strokeWidth="2" />
      {/* A shallow projecting sill replaces the tall design's deep stepped base. */}
      <path d="M18 145h144v7H18z" fill="#a79d8e" />
      <path d="M21 145h138v4H21z" fill="#fffdf2" />
      <path d="M10 152h160v8H10z" fill="#f8f4e9" />
      <path d="M10 160h160v3H10z" fill="#aaa093" />
      <path d="M15 163h150v6H15z" fill="#e2ded2" />
      <path d="M18 169h144v3H18z" fill="#8d8172" />
      <path d="M21 174h140" stroke="#4f4238" strokeWidth="2" opacity=".24" />
    </svg>
  );
}
