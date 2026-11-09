import { ClipboardList, PawPrint, Plus, ShoppingBag } from "lucide-react";
import type { MenuItem, Pet } from "@workspace/api-client-react";
import { PetSprite, SpeechCloud, type PetState } from "@/components/pet-sprite";
import { money, spriteKind } from "@/lib/cafe";

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
  menu, loading, pet, petList, unlocked, speech, petState, reduced, cartCount,
  onMenu, onCategory, onPets, onOrders, onCart, onPoke, onWake,
}: CafeSceneProps) {
  const boardItems = menu.slice(0, 10);
  const kind = pet ? spriteKind(pet) : "ginger";
  return (
    <main className="cafe-playfield" aria-label="Purr & Pour cafe">
      <div className="cafe-wall" aria-hidden="true">
        <div className="wall-lamp"><span /></div>
        <div className="beam" />
      </div>

      <section className="menu-board" aria-label="Today's menu">
        <div className="board-heading">
          <p className="board-kicker font-pixel">Today</p>
          <button className="board-all font-pixel" onClick={onMenu} data-testid="button-open-menu">Full menu <span aria-hidden>+</span></button>
        </div>
        <ul className="board-lines">
          {loading ? [0, 1, 2].map((n) => <li key={n} className="board-skeleton" />) : boardItems.map((item) => (
            <li key={item.id}>
              <button onClick={() => onCategory(item.category)} className="board-item font-pixel" data-testid={`button-slat-${item.id}`}>
                <span className={item.available ? "" : "line-through opacity-55"}>{item.name}</span>
                <span>{money(item.priceCents)}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <div className="scene-action-rail" aria-label="Cafe shortcuts">
          <button id="scene-menu" onClick={onMenu} aria-label="Browse menu" data-testid="scene-menu"><Plus size={16} /><span className="font-pixel">Menu</span></button>
        <button onClick={onPets} aria-label="Meet the crew" data-testid="scene-pets"><PawPrint size={16} /><span className="font-pixel">Crew</span></button>
        <button onClick={onOrders} aria-label="Your tickets" data-testid="scene-orders"><ClipboardList size={16} /><span className="font-pixel">Tickets</span></button>
        <button onClick={onCart} aria-label={`Open tab, ${cartCount} items`} data-testid="scene-cart"><ShoppingBag size={16} /><span className="font-pixel">{cartCount}</span></button>
      </div>

      <section className="cafe-station" aria-label="Coffee station and barista">
        <div className="station-pipe pipe-one" /><div className="station-pipe pipe-two" />
        <div className="machine">
          <div className="machine-top"><span /><span /></div>
          <div className="machine-face">
            <div className="machine-gauge"><i /></div>
            <div className="machine-display"><span /><span /></div>
            <div className="machine-group"><i /><b /></div>
            <div className="machine-drip"><i /><i /><i /></div>
          </div>
          <div className="machine-base" />
        </div>
        <div className="grinder"><div className="grinder-hopper" /><div className="grinder-body"><i /><b /></div><div className="grinder-foot" /></div>
        <div className="pour-over"><div className="pour-top" /><div className="pour-glass"><i /><i /></div><div className="pour-cup" /></div>
        <div className="supply supply-one"><i /><i /><i /></div>
        <div className="supply supply-two"><i /><i /></div>
        <div className="counter-surface" />
        <div className="counter-front"><span className="counter-sign font-pixel">P &amp; P</span><span className="counter-drawer" /><span className="counter-drawer" /></div>
        <div className="barista-spot">
          <div className="speech-anchor"><SpeechCloud text={speech.text} id={speech.id} /></div>
          {petList.filter((p) => p.id !== pet?.id).slice(0, 1).map((p) => (
            <button key={p.id} className="guest-pet" onClick={onPets} aria-label={`Preview ${p.name}`} data-testid={`scene-preview-${p.id}`}>
              <PetSprite kind={spriteKind(p)} px={60} state={unlocked.includes(p.id) ? "idle" : "sleep"} locked={!unlocked.includes(p.id)} />
            </button>
          ))}
          <button className="barista-button" onClick={onPoke} onPointerEnter={onWake} aria-label={`Pet ${pet?.name ?? "the barista"}. Currently ${petState}.`} data-testid="button-poke-pet">
            <PetSprite kind={kind} px={108} state={reduced && petState !== "sleep" ? "idle" : petState} />
          </button>
          <span className="barista-name font-pixel">{pet?.name ?? "Miso"} <small>on shift</small></span>
        </div>
        <div className="station-floor"><span /><span /><span /><span /><span /></div>
      </section>
    </main>
  );
}
