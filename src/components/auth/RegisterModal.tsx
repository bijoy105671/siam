import React, { useEffect, useState } from 'react';
import { Building2, Mail, Phone, UserRound, LockKeyhole, MapPin, X, CheckCircle2, CreditCard, Upload, ShieldCheck } from 'lucide-react';
import { api } from '../../services/apiClient';

interface RegisterModalProps { isOpen: boolean; onClose: () => void; }

export const RegisterModal: React.FC<RegisterModalProps> = ({ isOpen, onClose }) => {
  const [plans,setPlans]=useState<any[]>([]);
  const [paymentSettings,setPaymentSettings]=useState<any>({});
  const [planId,setPlanId]=useState('');
  const [businessName,setBusinessName]=useState('');
  const [ownerName,setOwnerName]=useState('');
  const [phone,setPhone]=useState('');
  const [email,setEmail]=useState('');
  const [username,setUsername]=useState('');
  const [password,setPassword]=useState('');
  const [address,setAddress]=useState('');
  const [businessType,setBusinessType]=useState('');
  const [website,setWebsite]=useState('');
  const [facebook,setFacebook]=useState('');
  const [logoUrl,setLogoUrl]=useState('');
  const [paymentMethod,setPaymentMethod]=useState('bkash');
  const [senderAccount,setSenderAccount]=useState('');
  const [transactionId,setTransactionId]=useState('');
  const [amount,setAmount]=useState('');
  const [paymentSlip,setPaymentSlip]=useState('');
  const [termsAccepted,setTermsAccepted]=useState(false);
  const [userId,setUserId]=useState('');
  const [otp,setOtp]=useState('');
  const [step,setStep]=useState<'form'|'otp'|'done'>('form');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');

  useEffect(()=>{ if(!isOpen)return; api.saasPlans().then(r=>{setPlans(r.plans||[]); if(!planId&&r.plans?.[0]?.id)setPlanId(r.plans[0].id);}).catch(e=>setError(e instanceof Error?e.message:'Unable to load packages.')); api.saasPaymentSettings().then(r=>setPaymentSettings(r.settings||{})).catch(()=>{}); },[isOpen]);

  const selectedPlan=plans.find(p=>p.id===planId); const isFreePlan=Number(selectedPlan?.price||0)<=0 && !selectedPlan?.is_lifetime;
  useEffect(()=>{ if(selectedPlan) setAmount(String(Number(selectedPlan.price||0))); },[planId,plans]);

  const readFile=(file:File, max=11000000)=>new Promise<string>((resolve,reject)=>{ if(file.size>max){reject(new Error('File is too large. Please choose a smaller file.'));return;} const reader=new FileReader(); reader.onload=()=>resolve(String(reader.result||'')); reader.onerror=()=>reject(new Error('Unable to read file.')); reader.readAsDataURL(file); });

  const submit=async(e:React.FormEvent)=>{
    e.preventDefault(); setError(''); setMessage('');
    if(!planId||!businessName||!ownerName||!phone||!email||!password||!address||!businessType||!logoUrl||!termsAccepted){setError('All mandatory registration fields, package, business logo/photo and Terms & Conditions acceptance are required.');return;} if(!isFreePlan && (!senderAccount||!transactionId||!paymentSlip||!Number(amount)||Number(amount)<=0)){setError('Payment method, amount, sender account, Transaction ID and payment slip are required for paid packages.');return;}
    if(password.length<8){setError('Password must be at least 8 characters.');return;}
    setBusy(true);
    try{
      const r=await api.saasRegister({businessName,ownerName,phone,email,username:username||email,password,address,businessType,website,facebook,logoUrl,planId,paymentMethod,senderAccount,transactionId,amount:Number(amount),paymentSlip,termsAccepted});
      setUserId(r.userId); setMessage(r.message); setStep('otp');
    }catch(err){setError(err instanceof Error?err.message:'Registration failed.');}
    finally{setBusy(false);}
  };

  const verify=async()=>{
    setError(''); setBusy(true);
    try{ const r=await api.verifyRegistrationOtp(userId,otp); setMessage(r.message); setStep('done'); }
    catch(err){setError(err instanceof Error?err.message:'OTP verification failed.');}
    finally{setBusy(false);}
  };

  if(!isOpen)return null;
  return <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/80 p-3 sm:p-4 backdrop-blur-md">
    <div className="relative max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-[28px] bg-white shadow-2xl">
      <div className="sticky top-0 z-10 bg-gradient-to-br from-emerald-700 via-emerald-600 to-sky-600 px-5 py-5 sm:px-7 text-white">
        <button type="button" onClick={onClose} className="absolute right-4 top-4 rounded-xl p-2 text-white/80 hover:bg-white/15"><X className="h-5 w-5"/></button>
        <Building2 className="mb-2 h-8 w-8"/><div className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/70">SIAM AIR SaaS Registration</div>
        <h2 className="mt-1 text-xl sm:text-2xl font-extrabold">Create Business Account</h2>
        <p className="mt-1 text-xs sm:text-sm text-white/80">Choose a subscription. Paid packages require payment proof; the 1 Month Free trial only requires email verification.</p>
      </div>

      {step==='done' ? <div className="p-7 text-center"><CheckCircle2 className="mx-auto h-14 w-14 text-emerald-600"/><h3 className="mt-4 text-2xl font-extrabold text-slate-900">Registration Complete</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{message}</p><div className="mt-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-left text-xs text-amber-800">Your email is verified. Your subscription/payment is now pending administrator approval. After approval, you will receive a Congratulations email and can sign in with your registered email/username and password.</div><button type="button" onClick={onClose} className="mt-5 rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-extrabold text-white">Close</button></div>
      : step==='otp' ? <div className="space-y-5 p-6 sm:p-8">
          <div className="rounded-2xl border border-sky-200 bg-sky-50 p-5"><ShieldCheck className="h-7 w-7 text-sky-600"/><h3 className="mt-2 text-xl font-extrabold text-slate-900">Verify Registered Email</h3><p className="mt-1 text-sm leading-6 text-slate-600">A 6-digit OTP was sent to <b>{email}</b>. This registered email is the permanent verification email for this account.</p></div>
          {error&&<ErrorBox text={error}/>} {message&&<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">{message}</div>}
          <input autoFocus inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={otp} onChange={e=>setOtp(e.target.value.replace(/\D/g,'').slice(0,6))} placeholder="Enter 6-digit OTP" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-center text-2xl font-black tracking-[0.65em] outline-none focus:border-emerald-500 focus:bg-white"/>
          <button type="button" disabled={busy||otp.length!==6} onClick={verify} className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 py-3.5 text-sm font-extrabold text-white disabled:opacity-60">{busy?'Verifying…':'Verify Email & Continue'}</button>
        </div>
      : <form onSubmit={submit} className="space-y-6 p-5 sm:p-7">
        {error&&<ErrorBox text={error}/>}
        <section><SectionTitle title="1. Subscription Package"/><div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{plans.map(p=><button key={p.id} type="button" onClick={()=>setPlanId(p.id)} className={'rounded-2xl border p-4 text-left transition '+(planId===p.id?'border-emerald-500 bg-emerald-50 ring-2 ring-emerald-500/10':'border-slate-200 bg-slate-50 hover:border-emerald-300')}><div className="text-sm font-extrabold text-slate-900">{p.name}</div><div className="mt-1 text-lg font-black text-emerald-700">৳{Number(p.price||0).toLocaleString()}</div><div className="mt-1 text-[10px] text-slate-500">{p.is_lifetime?'Lifetime access':'Subscription access'}</div></button>)}</div></section>
        <section><SectionTitle title="2. Account & Business Information"/><div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business / Company Name" value={businessName} onChange={setBusinessName} required/><Field label="Owner / Admin Name" value={ownerName} onChange={setOwnerName} required/><Field label="Registered Email" type="email" value={email} onChange={setEmail} required/><Field label="Mobile Number" value={phone} onChange={setPhone} required/><Field label="Username" value={username} onChange={setUsername} placeholder="Leave blank to use registered email"/><Field label="Password (8+)" type="password" value={password} onChange={setPassword} required/><Field label="Business Type" value={businessType} onChange={setBusinessType} placeholder="Travel Agency / Business / Other" required/><Field label="Office Address" value={address} onChange={setAddress} required/><Field label="Website (optional)" value={website} onChange={setWebsite}/><Field label="Facebook Page (optional)" value={facebook} onChange={setFacebook}/></div>
          <div className="mt-4"><label className="block text-[11px] font-bold uppercase tracking-wider text-slate-600">Business Logo / Photo <span className="text-rose-500">*</span></label><label className="mt-1 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"><Upload className="h-5 w-5 text-slate-400"/><span className="text-xs font-semibold text-slate-600">{logoUrl?'Logo/photo selected':'Upload business logo/photo'}</span><input type="file" accept="image/*" className="hidden" required={!logoUrl} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{setLogoUrl(await readFile(f,1800000));}catch(err){setError(err instanceof Error?err.message:'Unable to upload logo.');}}}/></label></div>
        </section>
        <section><SectionTitle title="3. Payment"/>{isFreePlan ? <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800"><b>1 Month Free Trial:</b> No payment is required. Verify your registered email and your free trial will be activated.</div> : <><div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 text-xs leading-5 text-slate-700"><div className="font-extrabold text-slate-900">Payment Instructions</div>{paymentSettings.bkashNumber&&<div className="mt-1"><b>bKash:</b> {paymentSettings.bkashNumber}</div>}{paymentSettings.bankName&&<div className="mt-1"><b>Bank:</b> {paymentSettings.bankName} — {paymentSettings.bankAccountName} — A/C {paymentSettings.bankAccountNumber}{paymentSettings.bankBranch?' — '+paymentSettings.bankBranch:''}</div>}<div className="mt-1">{paymentSettings.instructions||'Send the exact package amount, then submit the payment details below.'}</div></div>
          <div className="mt-4 grid gap-4 sm:grid-cols-2"><label><span className="label">Payment Method *</span><select required={!isFreePlan} value={paymentMethod} onChange={e=>setPaymentMethod(e.target.value)} className="input"><option value="bkash">bKash</option><option value="bank">Bank</option></select></label><Field label="Amount" type="number" value={amount} onChange={setAmount} required={!isFreePlan}/><Field label="Sender Account / Number" value={senderAccount} onChange={setSenderAccount} required={!isFreePlan}/><Field label="Transaction ID" value={transactionId} onChange={setTransactionId} required={!isFreePlan}/></div>
          <label className="mt-4 block"><span className="label">Payment Slip / Receipt {isFreePlan?'':'*'}</span><span className="mt-1 flex cursor-pointer items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4"><CreditCard className="h-5 w-5 text-slate-400"/><span className="text-xs font-semibold text-slate-600">{paymentSlip?'Payment slip selected':'Upload payment slip (image/PDF)'}</span><input type="file" accept="image/*,.pdf" className="hidden" required={!isFreePlan && !paymentSlip} onChange={async e=>{const f=e.target.files?.[0];if(!f)return;try{setPaymentSlip(await readFile(f));}catch(err){setError(err instanceof Error?err.message:'Unable to upload payment slip.');}}}/></span></label>
        </div></> </section>
        <section><SectionTitle title="4. Terms & Conditions"/><label className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4"><input type="checkbox" required checked={termsAccepted} onChange={e=>setTermsAccepted(e.target.checked)} className="mt-1 h-4 w-4"/><span className="text-xs leading-5 text-slate-600">I have read and agree to the <b className="text-slate-900">SIAM AIR & DIGITAL SERVICE Terms & Conditions</b>. I confirm that the registration and payment information submitted by me is accurate.</span></label></section>
        <button disabled={busy} className="w-full rounded-2xl bg-gradient-to-r from-emerald-600 to-sky-600 py-3.5 text-sm font-extrabold text-white shadow-lg disabled:opacity-60">{busy?'Submitting Registration & Sending OTP…':isFreePlan?'Start 1 Month Free Trial':'Submit Registration & Send Email OTP'}</button>
      </form>}
    </div>
  </div>;
};

const ErrorBox=({text}:{text:string})=><div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-700">{text}</div>;
const SectionTitle=({title}:{title:string})=><h3 className="mb-3 text-sm font-extrabold text-slate-900">{title}</h3>;
const Field=({label,value,onChange,type='text',placeholder,required}:{label:string;value:string;onChange:(v:string)=>void;type?:string;placeholder?:string;required?:boolean})=><label className="block"><span className="mb-1.5 block text-[11px] font-bold uppercase tracking-wider text-slate-600">{label}{required&&<span className="text-rose-500"> *</span>}</span><input required={required} type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)} className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 text-sm outline-none focus:border-emerald-500 focus:bg-white"/></label>;
