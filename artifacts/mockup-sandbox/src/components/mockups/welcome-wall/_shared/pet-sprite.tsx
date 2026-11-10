import { useCallback, useEffect, useReducer, useRef, type CSSProperties } from "react";
import { asset, type SpriteKind } from "./cafe";

export type PetState = "idle" | "happy" | "brew" | "alert" | "sleep";
export type PetEvent = "POKE" | "BREW" | "READY" | "DONE" | "NAP" | "WAKE";
const TRANSITIONS: Record<PetState, Partial<Record<PetEvent, PetState>>> = {
  idle: { POKE: "happy", BREW: "brew", READY: "alert", NAP: "sleep" },
  happy: { DONE: "idle", BREW: "brew", READY: "alert", POKE: "happy" },
  brew: { READY: "alert", POKE: "happy", DONE: "idle" },
  alert: { POKE: "happy", DONE: "idle", BREW: "brew" },
  sleep: { POKE: "happy", WAKE: "idle", BREW: "brew", READY: "alert" },
};
const SETTLE: Partial<Record<PetState, number>> = { happy: 1400, alert: 3200, brew: 6000 };

export function usePetMachine() {
  const [state, dispatch] = useReducer((s: PetState, e: PetEvent) => TRANSITIONS[s][e] ?? s, "idle" as PetState);
  const [tick, bump] = useReducer((n: number) => n + 1, 0);
  const send = useCallback((e: PetEvent) => { dispatch(e); bump(); }, []);
  useEffect(() => {
    const ms = SETTLE[state];
    if (!ms) return;
    const t = window.setTimeout(() => dispatch("DONE"), ms);
    return () => window.clearTimeout(t);
  }, [state, tick]);
  useEffect(() => {
    if (state !== "idle") return;
    const t = window.setTimeout(() => dispatch("NAP"), 25000);
    return () => window.clearTimeout(t);
  }, [state, tick]);
  return { state, send, tick };
}

const SPEED: Record<PetState, number> = { idle: 1.3, happy: 0.45, brew: 0.8, alert: 0.6, sleep: 3 };
function Strip({ src, frames, px, dur, paused }: { src: string; frames: number; px: number; dur: number; paused: boolean }) {
  const style = {
    width: px, height: px, backgroundImage: `url(${src})`, backgroundSize: `${frames * px}px ${px}px`,
    "--end": `-${frames * px}px`, "--frames": frames, "--dur": `${dur}s`,
    animationPlayState: paused ? "paused" : "running",
  } as CSSProperties;
  return <div className="sprite absolute inset-0" style={style} />;
}

const CORGI = [
  "................", "..o.......o.....", "..oo.....oo.....", "..ooooooooo.....",
  "..owwoooowo.....", "..okwooowko.....", "...owwnwwo......", "....wwwww.......",
  "...ooooooooooo..", "..oowwwwwwwooo.T", "..oawwwwwwwaoo..", "...oo.oo..oo.oo.",
  "...bb.bb..bb.bb.",
];
const CORGI_C: Record<string, string> = { o: "#d4813a", w: "#f4ead8", k: "#2b1a10", n: "#2b1a10", a: "#4f6f8f", b: "#7a4a26", T: "#d4813a" };
function Corgi({ px, wag }: { px: number; wag: boolean }) {
  return (
    <svg viewBox="0 0 16 16" width={px} height={px} shapeRendering="crispEdges" className="absolute inset-0" aria-hidden>
      {CORGI.flatMap((row, y) => row.split("").map((c, x) => {
        if (c === ".") return null;
        const dy = c === "T" && wag ? -1 : 0;
        return <rect key={`${x}-${y}`} x={x} y={y + 2 + dy} width={1} height={1} fill={CORGI_C[c]} />;
      }))}
    </svg>
  );
}
function CorgiAnimated({ px, paused, dur }: { px: number; paused: boolean; dur: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [wag, toggle] = useReducer((w: boolean) => !w, false);
  useEffect(() => {
    if (paused) return;
    const t = window.setInterval(toggle, (dur * 1000) / 4);
    return () => window.clearInterval(t);
  }, [paused, dur]);
  return <div ref={ref} className="absolute inset-0"><Corgi px={px} wag={wag} /></div>;
}

export function PetSprite({ kind, px = 96, state = "idle", locked = false, className = "" }: {
  kind: SpriteKind; px?: number; state?: PetState; locked?: boolean; className?: string;
}) {
  const paused = state === "sleep" || locked;
  const dur = SPEED[state];
  const motion = state === "happy" ? "anim-hop" : state === "alert" ? "anim-shake" : state === "sleep" || locked ? "" : "anim-bob";
  return (
    <div className={`relative ${className}`} style={{ width: px, height: px }} aria-hidden>
      <div key={`${state}`} className={`absolute inset-0 ${motion}`} style={{ filter: locked ? "brightness(0) opacity(.35)" : undefined }}>
        {kind === "ginger" && <Strip src={asset("/sprites/draft.png")} frames={5} px={px} dur={dur} paused={paused} />}
        {kind === "tuxedo" && <><Strip src={asset("/sprites/adam-a.png")} frames={11} px={px} dur={dur * 1.6} paused={paused} /><Strip src={asset("/sprites/adam-b.png")} frames={11} px={px} dur={dur * 1.6} paused={paused} /></>}
        {kind === "corgi" && <CorgiAnimated px={px} paused={paused} dur={dur} />}
      </div>
      {state === "sleep" && !locked && <span className="font-pixel zz absolute -top-2 right-0 text-sm font-bold text-[hsl(var(--denim))]">z</span>}
      {state === "brew" && <span className="steam absolute -top-3 left-1/4 h-6 w-2 rounded-full bg-[hsl(34_60%_97%/.8)]" />}
    </div>
  );
}

export function SpeechCloud({ text, id }: { text: string; id: number }) {
  if (!text) return null;
  return <div key={id} role="status" aria-live="polite" className="bubble anim-pop max-w-[230px] px-3 py-2 text-sm leading-tight">{text}</div>;
}
