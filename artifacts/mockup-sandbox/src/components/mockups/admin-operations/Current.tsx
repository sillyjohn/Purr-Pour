// Source-extracted from the live drawers; API/auth boundaries replaced with reference fixtures.
import {useState, type ReactNode} from 'react';
import {RotateCw} from 'lucide-react';
import './_group.css';
type MenuItem={id:string;name:string;description:string;priceCents:number;available:boolean};
const fixtures:MenuItem[]=[{id:'latte',name:'Cloud Nine Latte',description:'Silky steamed milk meets our cozy house espresso.',priceCents:500,available:true}];
const sampleOrders=[{id:'reference-1',number:'0042',customerName:'Alex',status:'accepted',practice:true,notes:'Extra foam, please',lines:[{quantity:2,name:'Cloud Nine Latte',temperature:'hot',milk:'oat'}]}];
const chalkBtn="font-pixel px-4 py-2 text-sm border-2 border-[hsl(var(--chalk-ink)/.7)] text-[hsl(var(--chalk-ink))] hover:bg-[hsl(var(--chalk-ink)/.1)] disabled:opacity-40 disabled:cursor-not-allowed transition-colors";
const chalkBtnHot="font-pixel px-4 py-3 text-base bg-[hsl(var(--lamp))] text-[hsl(var(--walnut))] hover:bg-[hsl(45_80%_86%)] disabled:opacity-40 disabled:cursor-not-allowed";
const getGetStaffOrdersQueryKey=()=>['reference-orders']; const getGetOrdersQueryKey=()=>['reference-customer']; const getGetMenuQueryKey=()=>['reference-menu'];
const useQueryClient=()=>({invalidateQueries:(_value:unknown)=>{}});
const useGetStaffOrders=(_options:unknown)=>({data:sampleOrders,isLoading:false,isError:false,error:null,refetch:()=>{}});
const apiError=(_error:unknown)=>'Reference only. Nothing is submitted.';
type ReferenceMutationOptions={onSuccess:()=>void;onError:(error:unknown)=>void};
function useUpdateOrderStatus(){return {isPending:false,mutate:(_input:unknown,_options:ReferenceMutationOptions)=>{}}}
function useUpdateMenuItem(){return {isPending:false,mutate:(_input:unknown,_options:ReferenceMutationOptions)=>{}}}
function ChalkDrawer({open,title,desc,children,testId}:{open:boolean;onClose:()=>void;title:string;desc:string;children:ReactNode;testId:string}){return open?<section className='chalkboard' data-testid={testId}><div className='mb-5 text-left'><h2 className='font-pixel text-3xl tracking-wide text-[hsl(var(--lamp))]'>{title}</h2><p className='font-chalk text-lg text-[hsl(var(--chalk-ink)/.7)]'>{desc}</p></div>{children}</section>:null;}
const NEXT: Record<string, ("preparing" | "ready" | "collected")[]> = {
  accepted: ["preparing"],
  preparing: ["ready"],
  ready: ["collected"],
};
function StaffDrawer({ open, onClose, enabled }: { open: boolean; onClose: () => void; enabled: boolean }) {
  const qc = useQueryClient();
  const q = useGetStaffOrders({ query: { enabled, queryKey: getGetStaffOrdersQueryKey() } });
  const upd = useUpdateOrderStatus();
  const [err, setErr] = useState("");
  const set = (id: string, status: "preparing" | "ready" | "collected" | "cancelled") => {
    setErr("");
    upd.mutate(
      { id, data: { status } },
      {
        onSuccess: () => {
          qc.invalidateQueries({ queryKey: getGetStaffOrdersQueryKey() });
          qc.invalidateQueries({ queryKey: getGetOrdersQueryKey() });
        },
        onError: (e) => setErr(apiError(e)),
      },
    );
  };
  const active = (q.data ?? []).filter((o) => o.status !== "collected" && o.status !== "cancelled");
  return (
    <ChalkDrawer open={open} onClose={onClose} title="The Rail" desc="Live ticket queue, staff only." testId="drawer-staff">
      {q.isLoading ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <div key={i} className="h-20 animate-pulse bg-[hsl(var(--chalk-ink)/.08)]" />)}</div>
      ) : q.isError ? (
        <div><p className="text-lg">{apiError(q.error)}</p><button className={`${chalkBtn} mt-3`} onClick={() => q.refetch()}><RotateCw size={14} className="mr-1 inline" />Retry</button></div>
      ) : active.length === 0 ? (
        <p className="py-10 text-center text-xl text-[hsl(var(--chalk-ink)/.7)]">Rail is clear. Wipe the steam wand.</p>
      ) : (
        <ul className="space-y-4">
          {active.map((o) => (
            <li key={o.id} className="border-2 border-[hsl(var(--chalk-ink)/.3)] p-3" data-testid={`row-staff-order-${o.id}`}>
              <div className="flex justify-between font-pixel text-lg">
                <span className="text-[hsl(var(--lamp))]">#{o.number} {o.customerName}</span>
                <span>{o.status}</span>
              </div>
              {o.practice && <p className="text-base text-[hsl(var(--lamp)/.8)]">PRACTICE - do not make</p>}
              <ul className="text-lg">
                {o.lines.map((l, i) => <li key={i}>{l.quantity}x {l.name} <span className="text-[hsl(var(--chalk-ink)/.6)]">{l.temperature}{l.milk !== "none" ? `, ${l.milk}` : ""}</span></li>)}
              </ul>
              {o.notes && <p className="text-base italic text-[hsl(var(--chalk-ink)/.7)]">"{o.notes}"</p>}
              <div className="mt-2 flex flex-wrap gap-2">
                {(NEXT[o.status] ?? []).map((s) => (
                  <button key={s} className={chalkBtnHot + " !py-1 !text-sm"} disabled={upd.isPending} onClick={() => set(o.id, s)} data-testid={`button-status-${s}-${o.id}`}>Mark {s}</button>
                ))}
                <button className={chalkBtn + " !py-1"} disabled={upd.isPending} onClick={() => set(o.id, "cancelled")} data-testid={`button-cancel-${o.id}`}>Cancel</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {err && <p role="alert" className="pt-3 text-lg text-[hsl(4_80%_72%)]">{err}</p>}
    </ChalkDrawer>
  );
}


function AdminRow({ item }: { item: MenuItem }) {
  const qc = useQueryClient();
  const upd = useUpdateMenuItem();
  const [name, setName] = useState(item.name);
  const [desc, setDesc] = useState(item.description);
  const [price, setPrice] = useState((item.priceCents / 100).toFixed(2));
  const [avail, setAvail] = useState(item.available);
  const [msg, setMsg] = useState("");
  const cents = Math.round(Number(price) * 100);
  const ok = name.trim().length > 0 && cents >= 50 && cents <= 10000;
  const save = () => {
    setMsg("");
    upd.mutate(
      { id: item.id, data: { name: name.trim(), description: desc, priceCents: cents, available: avail } },
      { onSuccess: () => { qc.invalidateQueries({ queryKey: getGetMenuQueryKey() }); setMsg("Saved"); }, onError: (e) => setMsg(apiError(e)) },
    );
  };
  return (
    <li className="space-y-2 border-2 border-[hsl(var(--chalk-ink)/.3)] p-3" data-testid={`row-admin-item-${item.id}`}>
      <input className="chalk-input" aria-label="Name" value={name} maxLength={80} onChange={(e) => setName(e.target.value)} data-testid={`input-admin-name-${item.id}`} />
      <textarea className="chalk-input resize-none !text-lg" aria-label="Description" rows={2} maxLength={250} value={desc} onChange={(e) => setDesc(e.target.value)} data-testid={`input-admin-desc-${item.id}`} />
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-1 text-lg">$<input className="chalk-input !w-20" inputMode="decimal" aria-label="Price in USD" value={price} onChange={(e) => setPrice(e.target.value)} data-testid={`input-admin-price-${item.id}`} /></label>
        <button role="switch" aria-checked={avail} onClick={() => setAvail(!avail)} className={chalkBtn + " !py-1"} data-testid={`toggle-admin-available-${item.id}`}>{avail ? "Available" : "86'd"}</button>
        <button onClick={save} disabled={!ok || upd.isPending} className={chalkBtnHot + " ml-auto !py-1 !text-sm"} data-testid={`button-admin-save-${item.id}`}>{upd.isPending ? "..." : "Save"}</button>
      </div>
      {!ok && <p className="text-base text-[hsl(4_80%_72%)]">Price must be $0.50 to $100.00 and name filled.</p>}
      {msg && <p role="status" className="text-base">{msg}</p>}
    </li>
  );
}
function AdminDrawer({ open, onClose, menu }: { open: boolean; onClose: () => void; menu: MenuItem[] }) {
  return (
    <ChalkDrawer open={open} onClose={onClose} title="Board Edits" desc="Admin only. Changes show on the wall right away." testId="drawer-admin">
      <ul className="space-y-4">{menu.map((m) => <AdminRow key={`${m.id}-${m.priceCents}-${m.available}-${m.name}`} item={m} />)}</ul>
    </ChalkDrawer>
  );
}

export function Current(){const[view,setView]=useState('staff');return <div className='admin-current'><h1 className='font-pixel text-2xl'>Current staff & menu controls</h1><p>Source-extracted reference. API calls are disabled; no real orders or menu changes.</p><div className='admin-current-controls'><button className='px-btn font-pixel px-3 py-2' onClick={()=>setView('staff')}>Staff queue</button><button className='px-btn font-pixel px-3 py-2' onClick={()=>setView('menu')}>Menu edits</button></div><StaffDrawer open={view==='staff'} onClose={()=>{}} enabled={true}/><AdminDrawer open={view==='menu'} onClose={()=>{}} menu={fixtures}/></div>}
