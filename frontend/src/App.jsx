import { useEffect, useState } from 'react'
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import { ArrowRight, CheckCircle2, Eye, EyeOff, Fingerprint, KeyRound, LockKeyhole, Mail, ShieldCheck, UserRound, Users, LogOut, Sparkles } from 'lucide-react'
import { apiRequest } from './api'

function Brand() {
  return <Link className="brand" to="/"><span className="brand-mark"><Fingerprint size={22}/></span><span>NOVA<span className="brand-dot">.</span></span></Link>
}

function Shell({ children, asideTitle = 'Your workspace, secured.', asideText = 'A calmer, safer place to manage what matters. Sign in to continue your journey.' }) {
  return <main className="auth-layout">
    <section className="visual-panel">
      <div className="visual-orb orb-one"/><div className="visual-orb orb-two"/>
      <div className="visual-content">
        <Brand />
        <div className="visual-copy">
          <div className="eyebrow"><span className="pulse"/> SECURE ACCESS · SIMPLE EXPERIENCE</div>
          <h1>{asideTitle}</h1>
          <p>{asideText}</p>
          <div className="trust-card"><div className="trust-icon"><ShieldCheck size={20}/></div><div><strong>Security comes first</strong><span>Your account is protected with encrypted credentials.</span></div><CheckCircle2 className="trust-check" size={18}/></div>
        </div>
        <div className="visual-footer"><span>© 2026 NOVA WORKSPACE</span><span>PRIVACY · SECURITY</span></div>
      </div>
    </section>
    <section className="form-panel"><div className="mobile-brand"><Brand /></div>{children}<p className="form-foot">Protected access <span>•</span> Built for focus</p></section>
  </main>
}

function Field({ label, icon: Icon, type = 'text', value, onChange, placeholder, autoComplete, right, ...props }) {
  return <label className="field"><span className="field-label">{label}</span><span className="input-wrap"><Icon size={18}/><input type={type} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete} required {...props}/>{right}</span></label>
}

function PasswordField({ label = 'Password', value, onChange, placeholder = 'Enter your password', autoComplete = 'current-password' }) {
  const [visible, setVisible] = useState(false)
  return <Field label={label} icon={LockKeyhole} type={visible ? 'text' : 'password'} value={value} onChange={onChange} placeholder={placeholder} autoComplete={autoComplete}
    right={<button className="icon-button" type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Hide password' : 'Show password'}>{visible ? <EyeOff size={17}/> : <Eye size={17}/>}</button>} />
}

function Notice({ message, error }) {
  if (!message) return null
  return <div className={`notice ${error ? 'notice-error' : 'notice-success'}`}>{message}</div>
}

function Login({ onLogin }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState(false)
  const navigate = useNavigate()

  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage(''); setError(false)
    try {
      const data = await apiRequest('/api/auth/login', { method: 'POST', body: { email, password } })
      onLogin(data); navigate('/dashboard')
    } catch (err) { setError(true); setMessage(err.message) }
    finally { setBusy(false) }
  }

  return <Shell>
    <div className="form-card">
      <div className="form-heading"><span className="mini-icon"><LockKeyhole size={19}/></span><div className="eyebrow">WELCOME BACK</div><h2>Sign in to your account</h2><p>Enter your details to access your workspace.</p></div>
      <form onSubmit={submit}>
        <Field label="Email address" icon={Mail} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/>
        <PasswordField value={password} onChange={e=>setPassword(e.target.value)}/>
        <div className="form-options"><span className="muted-small">Secure sign in</span><Link to="/forgot-password">Forgot password?</Link></div>
        <Notice message={message} error={error}/>
        <button className="primary-button" disabled={busy}>{busy ? 'Signing in…' : 'Sign in'} <ArrowRight size={18}/></button>
      </form>
      <div className="separator"><span>NEW TO NOVA?</span></div>
      <p className="switch-copy">Don't have an account? <Link to="/register">Create account</Link></p>
    </div>
  </Shell>
}

function Register({ onLogin }) {
  const [name,setName]=useState(''); const [email,setEmail]=useState(''); const [password,setPassword]=useState(''); const [busy,setBusy]=useState(false); const [message,setMessage]=useState(''); const [error,setError]=useState(false)
  const navigate=useNavigate()
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage(''); setError(false)
    try {
      const data=await apiRequest('/api/auth/register',{method:'POST',body:{name,email,password}})
      onLogin(data); navigate('/dashboard')
    } catch(err) {setError(true);setMessage(err.message)} finally {setBusy(false)}
  }
  return <Shell asideTitle="A better way to work starts here." asideText="Create your account and bring your workspace into one secure, focused place.">
    <div className="form-card">
      <div className="form-heading"><span className="mini-icon"><Sparkles size={19}/></span><div className="eyebrow">GET STARTED</div><h2>Create your account</h2><p>It only takes a moment to get set up.</p></div>
      <form onSubmit={submit}>
        <Field label="Full name" icon={UserRound} value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name"/>
        <Field label="Email address" icon={Mail} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/>
        <PasswordField label="Create password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/>
        <p className="hint">Use at least 8 characters. Avoid reusing a password from another account.</p>
        <Notice message={message} error={error}/>
        <button className="primary-button" disabled={busy}>{busy?'Creating account…':'Create account'} <ArrowRight size={18}/></button>
      </form>
      <p className="switch-copy register-switch">Already have an account? <Link to="/">Sign in</Link></p>
    </div>
  </Shell>
}

function ForgotPassword() {
  const [email,setEmail]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState(false); const [busy,setBusy]=useState(false); const [demoToken,setDemoToken]=useState('')
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage(''); setError(false); setDemoToken('')
    try { const data=await apiRequest('/api/auth/forgot-password',{method:'POST',body:{email}}); setMessage(data.message); if(data.development_reset_token)setDemoToken(data.development_reset_token) }
    catch(err){setError(true);setMessage(err.message)} finally{setBusy(false)}
  }
  return <Shell asideTitle="A fresh start is one step away." asideText="It happens. We'll help you get back into your workspace securely.">
    <div className="form-card">
      <div className="form-heading"><span className="mini-icon"><KeyRound size={19}/></span><div className="eyebrow">ACCOUNT RECOVERY</div><h2>Forgot your password?</h2><p>Enter the email address linked to your account. If it exists, reset instructions will be prepared.</p></div>
      <form onSubmit={submit}>
        <Field label="Email address" icon={Mail} type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email"/>
        <Notice message={message} error={error}/>
        {demoToken && <div className="demo-token"><strong>Local demo reset token</strong><code>{demoToken}</code><span>Development only. Use this on the reset page; never expose reset tokens in production.</span></div>}
        <button className="primary-button" disabled={busy}>{busy?'Preparing…':'Continue'} <ArrowRight size={18}/></button>
      </form>
      <p className="switch-copy register-switch"><Link to="/">← Back to sign in</Link></p>
    </div>
  </Shell>
}

function ResetPassword() {
  const [token,setToken]=useState(new URLSearchParams(window.location.search).get('token') || '')
  const [password,setPassword]=useState(''); const [message,setMessage]=useState(''); const [error,setError]=useState(false); const [busy,setBusy]=useState(false)
  async function submit(e) {
    e.preventDefault(); setBusy(true); setMessage('');setError(false)
    try { const data=await apiRequest('/api/auth/reset-password',{method:'POST',body:{token,new_password:password}});setMessage(data.message) }
    catch(err){setError(true);setMessage(err.message)} finally{setBusy(false)}
  }
  return <Shell asideTitle="Choose a new password." asideText="Set a fresh password to secure your account and continue.">
    <div className="form-card">
      <div className="form-heading"><span className="mini-icon"><KeyRound size={19}/></span><div className="eyebrow">RESET PASSWORD</div><h2>Create a new password</h2><p>Enter the reset token from your password recovery email or local demo response.</p></div>
      <form onSubmit={submit}>
        <Field label="Reset token" icon={KeyRound} value={token} onChange={e=>setToken(e.target.value)} placeholder="Paste your reset token" autoComplete="off"/>
        <PasswordField label="New password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="At least 8 characters" autoComplete="new-password"/>
        <Notice message={message} error={error}/>
        <button className="primary-button" disabled={busy}>{busy?'Updating…':'Update password'} <ArrowRight size={18}/></button>
      </form>
      <p className="switch-copy register-switch"><Link to="/">← Back to sign in</Link></p>
    </div>
  </Shell>
}

function Dashboard({ user, onLogout }) {
  return <main className="dashboard-page">
    <header className="dashboard-nav"><Brand/><button className="logout-button" onClick={onLogout}><LogOut size={17}/> Sign out</button></header>
    <section className="dashboard-content">
      <div className="dashboard-kicker"><span className="pulse"/> YOUR WORKSPACE</div>
      <h1>Welcome, {user?.name || 'there'}<span className="brand-dot">.</span></h1>
      <p className="dashboard-subtitle">You're signed in. Your workspace is ready.</p>
      <div className="dashboard-grid">
        <article className="welcome-card"><div className="welcome-icon"><ShieldCheck size={25}/></div><div className="eyebrow">ACCOUNT STATUS</div><h2>You're all set.</h2><p>Your login was verified by the Flask API. This dashboard is ready to grow with your application.</p><span className="status-pill"><span/> Authenticated session</span></article>
        <article className="info-card"><div className="info-icon"><UserRound size={21}/></div><span className="eyebrow">PROFILE</span><h3>{user?.name}</h3><p>{user?.email}</p><div className="info-divider"/><span className="muted-small">Account details</span></article>
        <article className="info-card"><div className="info-icon"><Users size={21}/></div><span className="eyebrow">NEXT UP</span><h3>More features</h3><p>Connect a MySQL database to add persistent user profiles and application data.</p></article>
      </div>
      <div className="api-note"><span className="api-dot"/><span>Frontend connected to Flask REST API</span><span className="api-tag">API CONNECTED</span></div>
    </section>
  </main>
}

export default function App() {
  const [auth,setAuth]=useState(()=>({token:localStorage.getItem('nova_token'),user:JSON.parse(localStorage.getItem('nova_user') || 'null')}))
  const [checking,setChecking]=useState(Boolean(auth.token))
  useEffect(()=>{
    let active=true
    if(auth.token) apiRequest('/api/auth/me',{token:auth.token}).then(data=>{if(active){localStorage.setItem('nova_user',JSON.stringify(data.user));setAuth(a=>({...a,user:data.user}))}}).catch(()=>{localStorage.removeItem('nova_token');localStorage.removeItem('nova_user');if(active)setAuth({token:null,user:null})}).finally(()=>{if(active)setChecking(false)})
    return ()=>{active=false}
  },[])
  function login(data){localStorage.setItem('nova_token',data.access_token);localStorage.setItem('nova_user',JSON.stringify(data.user));setAuth({token:data.access_token,user:data.user})}
  function logout(){localStorage.removeItem('nova_token');localStorage.removeItem('nova_user');setAuth({token:null,user:null})}
  if(checking)return <div className="loading-screen">Loading your workspace…</div>
  return <Routes>
    <Route path="/" element={auth.token?<Navigate to="/dashboard"/>:<Login onLogin={login}/>}/>
    <Route path="/register" element={auth.token?<Navigate to="/dashboard"/>:<Register onLogin={login}/>}/>
    <Route path="/forgot-password" element={<ForgotPassword/>}/>
    <Route path="/reset-password" element={<ResetPassword/>}/>
    <Route path="/dashboard" element={auth.token?<Dashboard user={auth.user} onLogout={logout}/>:<Navigate to="/"/>}/>
    <Route path="*" element={<Navigate to="/"/>}/>
  </Routes>
}
