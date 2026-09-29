import React, { useEffect, useMemo, useState } from 'react';
import { Bell, ExternalLink, Package, Plus, RefreshCw, Save, ShoppingBag, Trash2, Truck, Palette } from 'lucide-react';
import { api, USE_SERVER_API } from '../../services/apiClient';

type Product = { id:string; kind:string; sku?:string; name:string; name_bn?:string; description?:string; description_bn?:string; category?:string; image_url?:string; price:number; compare_price?:number|null; stock?:number|null; active:boolean; featured:boolean; sort_order:number };
type Order = { id:string; order_number:string; customer_name:string; phone:string; email?:string; address?:string; city?:string; items:any[]; subtotal:number; delivery_fee:number; discount:number; total:number; payment_method:string; payment_status:string; status:string; note?:string; created_at:string };
const statuses = ['NEW','CONFIRMED','PROCESSING','READY','SHIPPED','DELIVERED','COMPLETED','CANCELLED'];

const emptyProduct = { kind:'product', sku:'', name:'', nameBn:'', description:'', descriptionBn:'', category:'', imageUrl:'', price:'', comparePrice:'', stock:'', active:true, featured:false, sortOrder:'0' };

export const EcommerceControl: React.FC = () => {
  const [tab,setTab]=useState<'overview'|'products'|'orders'|'customize'|'sms'>('overview');
  const [products,setProducts]=useState<Product[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [settings,setSettings]=useState<Record<string,any>>({});
  const [form,setForm]=useState<any>(emptyProduct);
  const [editing,setEditing]=useState<string|null>(null);
  const [loading,setLoading]=useState(false);

  const load = async () => {
    if (!USE_SERVER_API) return;
    setLoading(true);
    try {
      const [p,o,s] = await Promise.all([api.ecommerceProducts(),api.storefrontOrders(),api.ecommerceSettings()]);
      setProducts(p as Product[]); setOrders(o as Order[]); setSettings(s.settings || {});
    } catch(e) { console.error(e); } finally { setLoading(false); }
  };
  useEffect(()=>{void load();},[]);

  const stats = useMemo(()=>({
    products: products.length,
    active: products.filter(p=>p.active).length,
    low: products.filter(p=>p.kind==='product' && p.stock!==null && Number(p.stock)<=5 && p.active).length,
    newOrders: orders.filter(o=>o.status==='NEW').length,
    revenue: orders.filter(o=>!['CANCELLED'].includes(o.status)).reduce((n,o)=>n+Number(o.total||0),0)
  }),[products,orders]);

  const saveProduct = async (e:React.FormEvent) => {
    e.preventDefault();
    if(!form.name.trim()) return;
    const payload = {...form, price:Number(form.price||0), comparePrice:form.comparePrice===''?'':Number(form.comparePrice), stock:form.kind==='service'?'':form.stock===''?'':Number(form.stock), sortOrder:Number(form.sortOrder||0)};
    if(editing) await api.updateEcommerceProduct(editing,payload); else await api.createEcommerceProduct(payload);
    setForm(emptyProduct); setEditing(null); await load();
  };
  const editProduct = (p:Product) => { setEditing(p.id); setForm({kind:p.kind,sku:p.sku||'',name:p.name,nameBn:p.name_bn||'',description:p.description||'',descriptionBn:p.description_bn||'',category:p.category||'',imageUrl:p.image_url||'',price:String(p.price),comparePrice:p.compare_price==null?'':String(p.compare_price),stock:p.stock==null?'':String(p.stock),active:p.active,featured:p.featured,sortOrder:String(p.sort_order||0)}); setTab('products'); };
  const updateStatus = async(id:string,status:string)=>{await api.updateStorefrontOrder(id,status);await load();};
  const saveSettings = async()=>{await api.updateEcommerceSettings(settings);await load();};

  const input = (label:string,key:string,type='text') => <label className="block"><span className="block text-xs font-bold text-slate-600 mb-1">{label}</span><input type={type} value={form[key] ?? ''} onChange={e=>setForm({...form,[key]:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm" /></label>;

  return <div className="space-y-5">
    <div className="rounded-3xl p-5 sm:p-6 bg-gradient-to-r from-slate-950 via-slate-900 to-emerald-950 text-white shadow-lg">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div><div className="flex items-center gap-2 text-emerald-300 text-xs font-black tracking-widest"><ShoppingBag className="w-4 h-4"/> E-COMMERCE CONTROL</div><h1 className="text-2xl sm:text-3xl font-black mt-1">Complete Store Control Center</h1><p className="text-sm text-slate-300 mt-1">Products, services, prices, stock, orders, branding, checkout and SMS — all controlled from Accounting.</p></div>
        <div className="flex gap-2"><button onClick={()=>void load()} className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold flex items-center gap-2"><RefreshCw className={loading?'w-4 h-4 animate-spin':'w-4 h-4'}/> Refresh</button><a href="https://siam-air-ecom.onrender.com" target="_blank" rel="noreferrer" className="px-3 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-black flex items-center gap-2">Open Store <ExternalLink className="w-4 h-4"/></a></div>
      </div>
    </div>

    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
      {[[stats.products,'Catalog'],[stats.active,'Live'],[stats.low,'Low Stock'],[stats.newOrders,'New Orders'],['৳'+stats.revenue.toLocaleString(),'Order Value']].map(([v,l],i)=><div key={i} className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm"><div className="text-[11px] text-slate-500">{l}</div><div className="text-xl font-black mt-1">{v}</div></div>)}
    </div>

    <div className="flex gap-2 overflow-x-auto pb-1">
      {([['overview','Overview'],['products','Products & Services'],['orders','Orders'],['customize','Store Customization'],['sms','SMS & Notifications']] as const).map(([id,label])=><button key={id} onClick={()=>setTab(id)} className={'px-4 py-2.5 rounded-xl text-xs font-black whitespace-nowrap '+(tab===id?'bg-slate-900 text-white':'bg-white border border-slate-200 text-slate-600')}>{label}</button>)}
    </div>

    {tab==='overview' && <div className="grid lg:grid-cols-3 gap-4">
      <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-lg mb-4">Latest Orders</h2>{orders.slice(0,8).map(o=><div key={o.id} className="flex items-center justify-between gap-3 py-3 border-b last:border-0 border-slate-100"><div><div className="font-bold text-sm">{o.order_number} · {o.customer_name}</div><div className="text-xs text-slate-500">{o.phone} · {new Date(o.created_at).toLocaleString()}</div></div><div className="text-right"><div className="font-black">৳{Number(o.total).toLocaleString()}</div><div className="text-[10px] font-bold text-emerald-700">{o.status}</div></div></div>)}{orders.length===0&&<div className="py-10 text-center text-slate-400">No orders yet.</div>}</div>
      <div className="bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-lg mb-4">Low Stock</h2>{products.filter(p=>p.kind==='product'&&p.stock!==null&&Number(p.stock)<=5).slice(0,10).map(p=><div key={p.id} className="flex justify-between py-2 text-sm"><span>{p.name}</span><b className="text-rose-600">{p.stock}</b></div>)}{stats.low===0&&<div className="text-sm text-slate-400">No low-stock items.</div>}</div>
    </div>}

    {tab==='products' && <div className="grid xl:grid-cols-[380px_1fr] gap-4">
      <form onSubmit={saveProduct} className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3 sticky top-4 h-fit">
        <div className="flex items-center justify-between"><h2 className="font-black text-lg">{editing?'Edit':'Add'} Product / Service</h2>{editing&&<button type="button" onClick={()=>{setEditing(null);setForm(emptyProduct)}} className="text-xs text-rose-600 font-bold">Cancel</button>}</div>
        <div className="grid grid-cols-2 gap-3"><label className="block"><span className="block text-xs font-bold text-slate-600 mb-1">Type</span><select value={form.kind} onChange={e=>setForm({...form,kind:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"><option value="product">Physical Product</option><option value="service">Service</option></select></label>{input('SKU','sku')}</div>
        <div className="grid sm:grid-cols-2 gap-3">{input('Name','name')}{input('Bangla Name','nameBn')}</div>
        <div className="grid sm:grid-cols-2 gap-3">{input('Category','category')}{input('Image URL','imageUrl')}</div>
        <div className="grid grid-cols-2 gap-3">{input('Price','price','number')}{input('Compare Price','comparePrice','number')}</div>
        {form.kind==='product'&&input('Stock (blank = unlimited)','stock','number')}
        <div className="grid grid-cols-2 gap-3"><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!form.active} onChange={e=>setForm({...form,active:e.target.checked})}/> Active</label><label className="flex items-center gap-2 text-xs font-bold"><input type="checkbox" checked={!!form.featured} onChange={e=>setForm({...form,featured:e.target.checked})}/> Featured</label></div>
        {input('Sort Order','sortOrder','number')} {input('Short Description','description')}
        <button className="w-full py-3 rounded-xl bg-emerald-600 text-white font-black flex items-center justify-center gap-2"><Save className="w-4 h-4"/>{editing?'Update':'Add to Store'}</button>
      </form>
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><div className="p-4 border-b flex justify-between"><h2 className="font-black">Catalog ({products.length})</h2><span className="text-xs text-slate-500">Customer site reads this live.</span></div><div className="divide-y">{products.map(p=><div key={p.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3"><div className="w-12 h-12 rounded-xl bg-slate-100 overflow-hidden shrink-0">{p.image_url&&<img src={p.image_url} className="w-full h-full object-cover" />}</div><div className="flex-1 min-w-0"><div className="font-black text-sm">{p.name} <span className="text-[10px] text-slate-400">({p.kind})</span></div><div className="text-xs text-slate-500">{p.category||'Uncategorized'} · {p.sku||'No SKU'}</div></div><div className="text-right"><div className="font-black">৳{Number(p.price).toLocaleString()}</div><div className={'text-xs font-bold '+(p.kind==='service'?'text-slate-500':Number(p.stock||0)<=5?'text-rose-600':'text-emerald-600')}>{p.kind==='service'?'Service':p.stock===null?'Unlimited':'Stock '+p.stock}</div></div><button onClick={()=>editProduct(p)} className="px-3 py-2 rounded-xl bg-slate-100 text-xs font-black">Edit</button><button onClick={async()=>{if(confirm('Delete this item?')){await api.deleteEcommerceProduct(p.id);await load();}}} className="p-2 rounded-xl bg-rose-50 text-rose-600"><Trash2 className="w-4 h-4"/></button></div>)}</div></div>
    </div>}

    {tab==='orders' && <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden"><div className="p-4 border-b flex justify-between"><h2 className="font-black">All Orders</h2><span className="text-xs text-slate-500">{orders.length} orders</span></div><div className="divide-y">{orders.map(o=><div key={o.id} className="p-4 grid lg:grid-cols-[1fr_auto] gap-4"><div><div className="flex flex-wrap items-center gap-2"><b>{o.order_number}</b><span className="text-[10px] px-2 py-1 rounded-full bg-slate-100">{o.status}</span><span className="text-[10px] text-slate-500">{new Date(o.created_at).toLocaleString()}</span></div><div className="mt-2 font-bold">{o.customer_name} · {o.phone}</div><div className="text-xs text-slate-500">{o.address||'No address'}{o.city?' · '+o.city:''}</div><div className="mt-2 text-xs">{(Array.isArray(o.items)?o.items:[]).map((i:any)=><span key={i.productId} className="inline-block mr-2 mb-1 px-2 py-1 rounded-lg bg-slate-50">{i.name} × {i.quantity}</span>)}</div></div><div className="flex flex-col items-end gap-2"><b className="text-lg">৳{Number(o.total).toLocaleString()}</b><select value={o.status} onChange={e=>void updateStatus(o.id,e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-xs font-black">{statuses.map(s=><option key={s}>{s}</option>)}</select></div></div>)}{orders.length===0&&<div className="p-12 text-center text-slate-400">No orders yet.</div>}</div></div>}

    {tab==='customize' && <div className="bg-white rounded-2xl border border-slate-200 p-5 max-w-4xl space-y-5"><div><h2 className="font-black text-xl flex items-center gap-2"><Palette className="w-5 h-5"/> Store Customization</h2><p className="text-xs text-slate-500 mt-1">Business name, logo and tagline are automatically taken from Accounting Identity Settings. These fields control e-commerce-only presentation.</p></div><div className="grid sm:grid-cols-2 gap-4">{[['Hero Title','heroTitle'],['Hero Subtitle','heroSubtitle'],['Announcement','announcement'],['Primary Color','primaryColor'],['Secondary Color','secondaryColor'],['Delivery Fee','deliveryFee'],['Free Delivery Minimum','freeDeliveryMinimum']].map(([label,key])=><label key={key} className="block"><span className="block text-xs font-bold text-slate-600 mb-1">{label}</span><input type={key.includes('Color')?'text':'text'} value={settings[key]??''} onChange={e=>setSettings({...settings,[key]:e.target.value})} className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"/></label>)}</div><div className="grid sm:grid-cols-2 gap-3">{[['requireLoginForCheckout','Login required for checkout'],['codEnabled','Cash on Delivery'],['bkashEnabled','bKash'],['nagadEnabled','Nagad'],['bankEnabled','Bank'],['whatsappEnabled','WhatsApp fallback']].map(([key,label])=><label key={key} className="flex items-center gap-2 text-sm font-bold p-3 rounded-xl bg-slate-50"><input type="checkbox" checked={settings[key]!==false} onChange={e=>setSettings({...settings,[key]:e.target.checked})}/>{label}</label>)}</div><button onClick={()=>void saveSettings()} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-black flex items-center gap-2"><Save className="w-4 h-4"/> Save Store Settings</button></div>}

    {tab==='sms' && <div className="grid lg:grid-cols-2 gap-4"><div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4"><h2 className="font-black text-xl flex items-center gap-2"><Bell className="w-5 h-5"/> Order SMS</h2><p className="text-sm text-slate-500">When configured, a new order sends an SMS to the business notification number and status changes can send SMS to customers. The provider credentials stay in Render environment variables.</p><label className="flex items-center gap-2 font-bold"><input type="checkbox" checked={settings.smsEnabled===true} onChange={e=>setSettings({...settings,smsEnabled:e.target.checked})}/> Enable SMS notifications</label><label className="block"><span className="block text-xs font-bold text-slate-600 mb-1">Business SMS notification number</span><input value={settings.smsNotificationPhone||''} onChange={e=>setSettings({...settings,smsNotificationPhone:e.target.value})} placeholder="+8801XXXXXXXXX" className="w-full rounded-xl border border-slate-300 px-3 py-2"/></label><button onClick={()=>void saveSettings()} className="px-5 py-3 rounded-xl bg-emerald-600 text-white font-black">Save SMS Settings</button><div className="text-xs text-slate-500 bg-slate-50 rounded-xl p-3">Provider: Twilio REST API. Required Render secrets: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_NUMBER.</div></div><div className="bg-white rounded-2xl border border-slate-200 p-5"><h2 className="font-black text-xl mb-4">Notification Log</h2>{(awaitableNotifications(settings) as any)}</div></div>}
  </div>;
};

const awaitableNotifications = (_settings:any) => <div className="text-sm text-slate-500"><Truck className="w-5 h-5 inline mr-2"/>New order and customer status SMS events are logged in Accounting. Refresh after an order to review delivery results.</div>;
