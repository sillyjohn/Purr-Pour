import { ClipboardList, PawPrint, Plus, ShoppingBag } from "lucide-react";
import type { MenuItem, Pet } from "@workspace/api-client-react";
import { PetSprite, SpeechCloud, type PetState } from "@/components/pet-sprite";
import { PaintedWelcome } from "@/components/painted-welcome";
import { ArchedWindow } from "@/components/arched-window";
import { asset, money, spriteKind } from "@/lib/cafe";

type CafeSceneProps = {
  menu: MenuItem[];
  loading: boolean;
  pet?: Pet;
  petList: Pet[];
  unlocked: string[];
  speech: { text: string; id: number };
  petState: PetState;
  reduced: boolean;
  cartCount: number;
  welcomeName: string;
  announcement?: string;
  onMenu: () => void;
  onCategory: (category: "coffee" | "tea" | "treats") => void;
  onPets: () => void;
  onOrders: () => void;
  onCart: () => void;
  onPoke: () => void;
  onWake: () => void;
};

export function CafeScene({
  menu, loading, pet, petList, unlocked, speech, petState, reduced, cartCount, welcomeName,
  onMenu, onCategory, onPets, onOrders, onCart, onPoke, onWake,
}: CafeSceneProps) {
  const boardItems = menu.slice(0, 10);
  const kind = pet ? spriteKind(pet) : "ginger";
  return (
    <main className="cafe-playfield" aria-label="Purr & Pour cafe">
      <div className="cafe-wall" aria-hidden="true">
        <ArchedWindow reduced={reduced} />
        <div className="wall-lamp">
          <span className="lamp-cord" />
          <svg className="lamp-fixture" viewBox="0 0 120 50" preserveAspectRatio="none" role="presentation" shapeRendering="crispEdges" aria-hidden="true">
            <g stroke="#353a3e" strokeWidth="3" strokeLinejoin="miter">
              <path fill="#737b82" d="M55 0h10v5h4v5h9v5h8v6h8v8h7v9h5v8H14v-8h5v-9h7v-8h8v-6h8v-5h9V5h4z" />
              <path fill="#c3c8cb" d="M55 4h7v7h-5v5h-8v6h-7v7h-7v8H22v-5h7v-8h7v-7h8v-6h8v-5h3z" stroke="none" />
              <path fill="#a0a7ac" d="M62 4h3v7h7v5h7v6h7v7h7v8H42v-8h7v-7h7v-6h5v-6h3z" stroke="none" />
              <path fill="#666e75" d="M65 4h3v6h9v5h8v6h8v8h6v8H69v-8h5v-7h-5v-6h-4v-6h-3z" stroke="none" />
              <path fill="#8f979d" d="M22 38h76v6H22z" stroke="none" />
              <path fill="#545b61" d="M18 43h84v5H18z" stroke="none" />
              <path fill="#d4d7d8" d="M22 39h18v3H22zM78 39h16v3H78z" stroke="none" />
              <path fill="#9b8b70" d="M38 39h44v7H38z" stroke="none" />
              <path fill="#f5d48c" d="M48 39h24v7H48z" stroke="none" />
              <path fill="#fff0bd" d="M52 39h12v3H52z" stroke="none" />
              <path fill="#c99f61" d="M45 46h30v2H45z" stroke="none" />
            </g>
            <path d="M43 18h5v-4h7v-4h6" fill="none" stroke="#eef0ef" strokeWidth="2" />
            <path d="M91 25h4v7h4" fill="none" stroke="#42494e" strokeWidth="2" />
          </svg>
        </div>
        <div className="beam" />
      </div>

      <PaintedWelcome name={welcomeName} />

      <section className="menu-board" aria-label="Today's menu">
        <div className="board-heading">
          <p className="board-kicker font-pixel">Today</p>
          <button className="board-all font-pixel" onClick={onMenu} data-testid="button-open-menu">Full menu <span aria-hidden>+</span></button>
        </div>
        <ul className="board-lines">
          {loading ? [0, 1, 2].map((n) => <li key={n} className="board-skeleton" />) : boardItems.map((item) => (
            <li key={item.id}>
              <button onClick={() => onCategory(item.category)} className="board-item font-pixel" data-testid={`button-slat-${item.id}`}>
                <span className={`board-name ${item.available ? "" : "line-through opacity-55"}`}>{item.name}</span>
                <span className="board-price font-number" aria-label={money(item.priceCents)}>
                  {Array.from(money(item.priceCents)).map((character, index) => (
                    <span key={index} aria-hidden="true" className={/\d/.test(character) ? "board-price-digit" : "board-price-symbol"}>{character}</span>
                  ))}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="scene-action-rail" aria-label="Cafe shortcuts">
          <button id="scene-menu" onClick={onMenu} aria-label="Browse menu" data-testid="scene-menu"><Plus size={16} /><span className="font-pixel">Menu</span></button>
        <button onClick={onPets} aria-label="Meet the crew" data-testid="scene-pets"><PawPrint size={16} /><span className="font-pixel">Crew</span></button>
        <button onClick={onOrders} aria-label="Your tickets" data-testid="scene-orders"><ClipboardList size={16} /><span className="font-pixel">Tickets</span></button>
        <button onClick={onCart} aria-label={`Open tab, ${cartCount} items`} data-testid="scene-cart"><ShoppingBag size={16} /><span className="font-number text-xl">{cartCount}</span></button>
      </div>

      <div className="cafe-floor" aria-hidden="true" />
      <section className="cafe-station" aria-label="Coffee station and barista">
        <img className="cafe-station-art" src={asset("/scene/cafe-station-cutout.png")} alt="" aria-hidden="true" />
        <div className="barista-spot">
          <div className="speech-anchor"><SpeechCloud text={speech.text} id={speech.id} /></div>
          {petList.filter((p) => p.id !== pet?.id).slice(0, 1).map((p) => (
            <button key={p.id} className="guest-pet" onClick={onPets} aria-label={`Preview ${p.name}`} data-testid={`scene-preview-${p.id}`}>
              <PetSprite kind={spriteKind(p)} px={60} state={unlocked.includes(p.id) ? "idle" : "sleep"} locked={!unlocked.includes(p.id)} />
            </button>
          ))}
          <button className="barista-button" onClick={onPoke} onPointerEnter={onWake} aria-label={`Pet ${pet?.name ?? "the barista"}. Currently ${petState}.`} data-testid="button-poke-pet">
            <span className="barista-visual">
              <PetSprite kind={kind} px={108} state={reduced && petState !== "sleep" ? "idle" : petState} />
            </span>
          </button>
          <span className="barista-name font-pixel">{pet?.name ?? "Miso"} <small>on shift</small></span>
        </div>
      </section>
    </main>
  );
}
