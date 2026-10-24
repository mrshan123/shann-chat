import { useEffect, useState } from "react";
import { MessageCircle, Search, Plus, Settings, ShieldCheck, Paperclip, Send, LockKeyhole, Cloud, Users, Phone, Video, LogOut } from "lucide-react";
import { isSupabaseConfigured, supabase } from "./lib/supabase";
import { createLocalKey, decryptText, encryptText } from "./lib/crypto";
import { fetchMessages, sendEncryptedMessage, subscribeToMessages, type ChatMessage } from "./lib/chatService";

type Chat = { id: string; name: string; handle: string; preview: string; time: string; unread?: number; avatar: string };
const demoChats: Chat[] = [
  { id:"demo", name:"Shann Notes", handle:"@shann_notes", preview:"Your private space starts here", time:"Now", avatar:"S" },
  { id:"demo-team", name:"Project Team", handle:"@project_team", preview:"Files and updates in one place", time:"Yesterday", avatar:"PT" },
  { id:"demo-family", name:"Family Circle", handle:"@family_circle", preview:"A little space for your people", time:"Mon", avatar:"FC" }
];

export default function App() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [user, setUser] = useState<string | null>(null);
  const [chatId, setChatId] = useState("demo");
  const [message, setMessage] = useState("");
  const [items, setItems] = useState<ChatMessage[]>([]);
  const [plain, setPlain] = useState<Record<string,string>>({});
  const [key, setKey] = useState<CryptoKey | null>(null);
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const current = demoChats.find(c => c.id === chatId) ?? demoChats[0];

  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getSession().then(({ data }) => setUser(data.session?.user.email ?? null));
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => setUser(session?.user.email ?? null));
    return () => listener.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let active = true;
    if (!user || !key || chatId.startsWith("demo")) { setItems([]); return; }
    fetchMessages(chatId).then(async rows => {
      if (!active) return;
      setItems(rows);
      const decrypted: Record<string,string> = {};
      for (const row of rows) {
        try { decrypted[row.id] = await decryptText({ iv: row.iv, ciphertext: row.ciphertext }, key); }
        catch { decrypted[row.id] = "Unable to decrypt on this device"; }
      }
      if (active) setPlain(decrypted);
    }).catch(e => setNotice(e.message));
    const unsubscribe = subscribeToMessages(chatId, async row => {
      setItems(old => old.some(m => m.id === row.id) ? old : [...old, row]);
      try { const value = await decryptText({ iv: row.iv, ciphertext: row.ciphertext }, key); setPlain(old => ({...old, [row.id]: value})); }
      catch { setPlain(old => ({...old, [row.id]: "Unable to decrypt on this device"})); }
    });
    return () => { active = false; unsubscribe(); };
  }, [user, key, chatId]);

  async function signIn(mode: "signin" | "signup") {
    if (!supabase) { setNotice("Add Supabase credentials in .env.local first."); return; }
    setBusy(true); setNotice("");
    try {
      const result = mode === "signup"
        ? await supabase.auth.signUp({ email, password })
        : await supabase.auth.signInWithPassword({ email, password });
      if (result.error) throw result.error;
      setUser(result.data.user?.email ?? null);
      setKey(await createLocalKey());
      setNotice(mode === "signup" ? "Account created. If email confirmation is enabled, check your inbox." : "Signed in.");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Authentication failed"); }
    finally { setBusy(false); }
  }

  async function send() {
    if (!message.trim()) return;
    if (chatId.startsWith("demo")) {
      setNotice("Demo conversation only. Create a real chat in Supabase before sending cross-device messages.");
      return;
    }
    if (!user || !key) { setNotice("Sign in and unlock this device first."); return; }
    setBusy(true);
    try {
      const encrypted = await encryptText(message.trim(), key);
      const row = await sendEncryptedMessage({ chatId, ciphertext: encrypted.ciphertext, iv: encrypted.iv });
      setItems(old => [...old, row]); setPlain(old => ({...old, [row.id]: message.trim()})); setMessage("");
    } catch (e) { setNotice(e instanceof Error ? e.message : "Message failed"); }
    finally { setBusy(false); }
  }

  return <main className="app-shell">
    <aside className="sidebar">
      <div className="brand"><div className="brand-mark">S<span>✦</span></div><div><b>Shann</b><small>MORE THAN JUST MESSAGES</small></div></div>
      <div className="search"><Search size={17}/><input placeholder="Search messages" aria-label="Search messages"/></div>
      <div className="side-label">MESSAGES <button title="New chat" onClick={() => setNotice("To connect real users, create a chat and add members using the SQL guide.")}><Plus size={17}/></button></div>
      <div className="chat-list">{demoChats.map(chat => <button key={chat.id} className={`chat-row ${chat.id===chatId?"selected":""}`} onClick={() => setChatId(chat.id)}>
        <div className="avatar">{chat.avatar}</div><div className="chat-meta"><b>{chat.name}</b><small>{chat.preview}</small></div><time>{chat.time}</time>
      </button>)}</div>
      <div className="sidebar-bottom"><div className="secure-pill"><ShieldCheck size={16}/> Privacy-first design</div>
        {!user ? <div className="auth-box"><label>Email</label><input value={email} onChange={e=>setEmail(e.target.value)} type="email" placeholder="you@example.com"/><label>Password</label><input value={password} onChange={e=>setPassword(e.target.value)} type="password" placeholder="At least 8 characters"/><button className="primary full" disabled={busy} onClick={()=>signIn("signin")}>Sign in</button><button className="text-btn" disabled={busy} onClick={()=>signIn("signup")}>Create account</button></div> :
        <button className="profile" onClick={()=>supabase?.auth.signOut()}><div className="avatar small">{user.slice(0,1).toUpperCase()}</div><span>{user}<small>Signed in · <LogOut size={12}/> Sign out</small></span></button>}
        <div className="side-links"><span><Settings size={15}/> Settings</span><span><LockKeyhole size={15}/> Security</span></div>
      </div>
    </aside>
    <section className="conversation">
      <header className="topbar"><div className="person"><div className="avatar">{current.avatar}</div><div><b>{current.name}</b><small>{current.handle} · {chatId.startsWith("demo")?"Preview conversation":"Connected chat"}</small></div></div><div className="top-actions"><button title="Voice call (planned)" onClick={()=>setNotice("Voice and video calls are planned for Phase 5.")}><Phone/></button><button title="Video call (planned)" onClick={()=>setNotice("Voice and video calls are planned for Phase 5.")}><Video/></button><button title="Chat details" onClick={()=>setNotice("Chat details and member management are part of the next build step.")}><Users/></button></div></header>
      <div className="encryption-note"><LockKeyhole size={14}/> Messages should be encrypted on your device. This prototype's key is temporary and not shared across devices.</div>
      <div className="message-area">
        <div className="date-chip">TODAY</div>
        {chatId.startsWith("demo") ? <>
          <div className="bubble incoming"><small>Shann Assistant</small>Welcome to Shann — your space for meaningful conversations.<time>09:41</time></div>
          <div className="bubble outgoing">Private chats, file sharing, voice messages and calls are planned in the Shann roadmap.<time>09:42 ✓✓</time></div>
          <div className="feature-card"><div className="feature-icon"><Cloud/></div><div><b>One home for your conversations</b><p>Start with secure messaging, then add verified multi-device encryption, media and calls.</p></div></div>
        </> : items.map(item => <div key={item.id} className={`bubble ${item.sender_id===undefined?"incoming":"outgoing"}`}>{plain[item.id] ?? "Encrypted message"}<time>{new Date(item.created_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"})}</time></div>)}
        <div className="notice-area" aria-live="polite">{notice}</div>
      </div>
      <footer className="composer"><button title="Attach file (planned)" onClick={()=>setNotice("File uploads need a private Storage bucket, membership checks, size limits and encrypted file keys.")}><Paperclip/></button><input value={message} onChange={e=>setMessage(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();void send();}}} placeholder="Write a message…" aria-label="Write a message"/><button title="Voice message (planned)" onClick={()=>setNotice("Voice-message recording and encrypted upload are planned after the core chat flow.")}><MessageCircle/></button><button className="send-btn" onClick={()=>void send()} disabled={busy}><Send size={18}/></button></footer>
      <div className="footer-caption">Shann · Navy Blue & White <span>Built for your own world</span></div>
    </section>
    <aside className="details"><div className="detail-logo"><div className="brand-mark large">S<span>✦</span></div><h2>Shann</h2><p>More Than Just Messages</p></div><div className="detail-section"><h3>Built for connection</h3><div><LockKeyhole/> <span><b>Private by design</b><small>Security-first architecture</small></span></div><div><Cloud/> <span><b>Files & memories</b><small>Private storage roadmap</small></span></div><div><Users/> <span><b>Groups & communities</b><small>Manage people together</small></span></div></div><div className="setup-card"><b>{isSupabaseConfigured?"Supabase configured":"Setup required"}</b><p>{isSupabaseConfigured?"Backend credentials detected.":"Add your Supabase URL and publishable key to .env.local to enable authentication."}</p></div><div className="build-note">This is a starter build, not a production-ready Telegram replacement. See README for the exact next steps and security limitations.</div></aside>
  </main>;
}