import React, { useState } from 'react';
import { Building2, Mail, Phone, UserRound, LockKeyhole, MapPin, X, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/apiClient';

interface RegisterModalProps { isOpen: boolean; onClose: () => void; }

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const [businessName,setBusinessName]=useState('');
  const [ownerName,setOwnerName]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [address,setAddress]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [success,setSuccess]=useState('');

  if(!isOpen)return null;

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError(''); setSuccess('');
    if(password.length<8){setError('Password must be at least 8 characters.');return;}
    setBusy(true);
    try{
      const r=await api.saasRegister({businessName,ownerName,phone,email,username:username||email,password,address});
      setSuccess(r.message);
    }catch(err){setError(err instanceof Error?err.message:'Registration failed.');}
    finally{setBusy(false);}
  };

  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-md">
    <div className="relative max-h-[94vh] w-full max-w-xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
      <div className="bg-gradient-to-br from-emerald-700 via-emerald-600 to-sky-600 px-7 py-6 text-white">
        <button onClick={onClose} className="absolute right-5 top-5 rounded-xl p-2 text-white/80 hover:bg-white/15"><X className="h-5 w-5"/></button>
        <Building2 className="mb-3 h-8 w-8"/>
        <div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">SIAM AIR Accounting SaaS</div>
        <h2 className="mt-1 text-2xl font-extrabold">Create Business Account</h2>
        <p className="mt-1 text-sm text-white/80">Register your office and choose a paid plan after activation.</p>
      </div>
      <form onSubmit={submit} className="grid gap-4 p-7 sm:grid-cols-2">
        {success ? <div className="sm:col-span-2 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm text-emerald-800"><CheckCircle2 className="mb-2 h-6 w-6"/><b>Registration received.</b><p className="mt-1">{success}</p><button type="button" onClick={onClose} className="mt-4 rounded-xl bg-emerald-600 px-4 py-2 font-bold text-white">Close</button></div> : <>
          {error&&<div className="sm:col-span-2 rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{error}</div>}
          <Field icon={<Building2/>} label="Business / Office Name" value={businessName} onChange={setBusinessName} required/>
          <Field icon={<UserRound/>} label="Owner / Admin Name" value={ownerName} onChange={setOwnerName} required/>
          <Field icon={<Phone/>} label="Mobile Number" value={phone} onChange={setPhone} required/>
          <Field icon={<Mail/>} label="Email" type="email" value={email} onChange={setEmail} required/>
          <Field icon={<UserRound/>} label="Username" value={username} onChange={setUsername} placeholder="Leave blank to use email"/>
          <Field icon={<LockKeyhole/>} label="Password (8+)" type="password" value={password} onChange={setPassword} required/>
          <Field icon={<MapPin/>} label="Office Address" value={address} onChange={setAddress} className="sm:col-span-2"/>
          <button disabled={busy} className="sm:col-span-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60">{busy?'Creating Account…':'Register Business'}</button>
          <p className="sm:col-span-2 text-center text-[11px] text-slate-400">Your account starts as pending. Accounting data access is enabled only after subscription activation and tenant-isolation checks.</p>
        </>}
      </form>
    </div>
  </div>;
};

const Field=({icon,label,value,onChange,type='text',placeholder,required,className=''}:{icon:React.ReactNode;label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;required?:boolean;className?:string})=><label className={'block '+className}>
  <span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">{label}</span>
  <div className="relative"><span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 [&_svg]:h-4 [&_svg]:w-4">{icon}</span><input required={required} type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 py-3 pl-10 pr-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"/></div>
</label>;
