import {useState, type ReactNode} from "react";
import {ClipboardList,PencilRuler,Settings2,UserRound,ShoppingBag} from "lucide-react";
import {CafeScene} from "./_shared/CafeScene";
import {usePetMachine} from "./_shared/PetSprite";
import {asset} from "./_shared/cafe";
import {menu,pet} from "./_shared/fixtures";
import "./_group.css";
export function ScenePreview({className="",windowContent}:{className?:string;windowContent?:ReactNode}){
const machine=usePetMachine(); const [drawer,setDrawer]=useState<string|null>(null);
const shop={data:{name:"Purr & Pour"}}; const me={data:{signedIn:false,name:""}}; const isStaff=false; const role="customer" as string; const live="open" as string; const cartCount=0;
const navBtn="px-btn font-pixel bg-card flex items-center gap-1.5 px-3 py-2 text-sm";
return <div className={"cafe-root "+className}>
      <header className="sticky top-0 z-40 border-b-4 border-[hsl(var(--walnut))] bg-[hsl(var(--wall)/.92)] backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <img src={asset("/logo.svg")} alt="" className="pixelated h-9 w-9" />
          <div className="mr-auto leading-none">
            <p className="font-pixel text-xl font-bold" data-testid="text-shop-name">{shop.data?.name ?? "Purr & Pour"}</p>
            <p className="font-chalk text-muted-foreground text-base">neighborhood counter, pickup only</p>
          </div>
          <span className="hidden items-center gap-1.5 text-xs sm:flex font-pixel" title="Live order updates" data-testid="status-live">
            <span className={`h-2 w-2 ${live === "open" ? "bg-[hsl(140_45%_40%)]" : live === "down" ? "bg-destructive" : "bg-[hsl(var(--lamp))]"}`} />
            {live === "open" ? "live" : live === "down" ? "reconnecting" : "connecting"}
          </span>
          <button className={navBtn} onClick={() => setDrawer("menu")} data-testid="header-menu"><span className="font-pixel">Menu</span></button>
          <button className={`${navBtn} hidden sm:flex`} onClick={() => setDrawer("orders")} data-testid="button-open-orders"><ClipboardList size={16} /><span className="hidden md:inline">Tickets</span></button>
          <button className={`${navBtn} hidden sm:flex`} onClick={() => setDrawer("pets")} data-testid="button-open-pets"><span className="font-pixel">Crew</span></button>
          {isStaff && <button className={navBtn} onClick={() => setDrawer("staff")} data-testid="button-open-staff"><ClipboardList size={16} /><span className="hidden md:inline">Rail</span></button>}
          {role === "admin" && <button className={navBtn} onClick={() => setDrawer("admin")} data-testid="button-open-admin"><PencilRuler size={16} /><span className="hidden md:inline">Board</span></button>}
          <button className={navBtn} aria-label="Settings" onClick={() => setDrawer("settings")} data-testid="button-open-settings"><Settings2 size={16} /></button>
          <button className={navBtn} aria-label="Account" onClick={() => setDrawer("account")} data-testid="button-open-account"><UserRound size={16} /><span className="hidden md:inline">{me.data?.signedIn ? me.data.name.split(" ")[0] || "You" : "Sign in"}</span></button>
          <button className={`${navBtn} !bg-primary text-primary-foreground`} onClick={() => setDrawer("cart")} data-testid="button-open-cart" aria-label={`Open tab, ${cartCount} items`}>
            <ShoppingBag size={16} />
            <span key={cartCount} className="anim-pop font-number text-xl">{cartCount}</span>
          </button>
        </div>
      </header>
<CafeScene menu={menu} loading={false} pet={pet} petList={[pet,{id:"mochi",name:"Mochi",species:"cat"}]} unlocked={[pet.id]} speech={{text:"What can meow do for you today?",id:0}} petState={machine.state} reduced={false} cartCount={0} welcomeName="hairy stranger" onMenu={()=>setDrawer("Menu")} onCategory={()=>setDrawer("Menu")} onPets={()=>setDrawer("Crew")} onOrders={()=>setDrawer("Tickets")} onCart={()=>setDrawer("Your tab")} onPoke={()=>machine.send("POKE")} onWake={()=>machine.send("WAKE")} windowContent={windowContent}/>
{drawer&&<div role="dialog" aria-label={drawer} className="chalkboard" style={{position:"absolute",right:0,top:0,bottom:0,width:300,zIndex:80,padding:24}}><h2>{drawer}</h2><p>This is a window design preview. Ordering and account tools remain in the live café.</p><button onClick={()=>setDrawer(null)} style={{marginTop:20}}>Close preview panel</button></div>}
</div>;
}
