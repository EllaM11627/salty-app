import { useState, useEffect, useRef } from 'react'

const PETS = {
  fox:    { emoji: '🦊', color: '#FF6B35', bg: 'rgba(255,107,53,0.18)' },
  koala:  { emoji: '🐨', color: '#8B5CF6', bg: 'rgba(139,92,246,0.18)' },
  monkey: { emoji: '🐒', color: '#F59E0B', bg: 'rgba(245,158,11,0.18)' },
}

function getMood(xp) {
  if (xp === 0)   return { emoji: '😴', label: 'Dormant',    msg: 'Wake me when you actually log something.' }
  if (xp < 80)    return { emoji: '😒', label: 'Salty',      msg: "This is your food tracking? Adorable attempt." }
  if (xp < 200)   return { emoji: '😑', label: 'Unimpressed',msg: "You're doing… something. I suppose that counts." }
  if (xp < 400)   return { emoji: '😌', label: 'Chill',      msg: "Okay, not terrible. I'll allow it." }
  if (xp < 700)   return { emoji: '😊', label: 'Pleased',    msg: "Look who showed up! Kinda proud of you." }
  return           { emoji: '🤩', label: 'Obsessed',          msg: "You're literally my favorite person. Don't tell anyone." }
}

async function callClaude(apiKey, messages, system) {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      system,
      messages,
    }),
  })
  if (!res.ok) {
    const e = await res.json().catch(() => ({}))
    throw new Error(e.error?.message || `HTTP ${res.status}`)
  }
  const d = await res.json()
  return d.content[0].text
}

const GLOBAL_CSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { height: 100%; overflow: hidden; }
  body {
    background: #0A0A0A;
    color: #F0F0F0;
    font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Display', 'Segoe UI', sans-serif;
    -webkit-font-smoothing: antialiased;
  }
  #root {
    height: 100dvh;
    max-width: 430px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    background: #111;
    overflow: hidden;
    position: relative;
  }

  /* ── Onboarding ── */
  .onboard {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    justify-content: center; padding: 32px 24px; gap: 22px; overflow-y: auto;
  }
  .ob-logo {
    font-size: 44px; font-weight: 900; letter-spacing: -1.5px;
    background: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .ob-sub { font-size: 15px; color: #777; text-align: center; line-height: 1.6; }
  .ob-heading { font-size: 26px; font-weight: 800; text-align: center; }
  .step-dots { display: flex; gap: 6px; }
  .dot { width: 6px; height: 6px; border-radius: 3px; background: #2A2A2A; transition: all .25s; }
  .dot.on { width: 18px; background: #FF6B6B; }

  .pet-grid { display: flex; gap: 14px; justify-content: center; }
  .pet-card {
    display: flex; flex-direction: column; align-items: center; gap: 8px;
    padding: 20px 14px; border-radius: 22px; border: 2px solid #2A2A2A;
    background: #1A1A1A; cursor: pointer; transition: all .2s; min-width: 88px;
  }
  .pet-card:hover { transform: translateY(-3px); border-color: #444; }
  .pet-card.sel { border-color: #FF6B6B; }
  .pet-card-emoji { font-size: 50px; }
  .pet-card-name { font-size: 12px; color: #777; font-weight: 600; text-transform: capitalize; }

  .field {
    width: 100%; background: #1A1A1A; border: 1.5px solid #2A2A2A;
    border-radius: 14px; padding: 14px 16px; color: #F0F0F0;
    font-size: 16px; font-family: inherit; outline: none; transition: border-color .2s;
  }
  .field:focus { border-color: #FF6B6B; }
  .field::placeholder { color: #444; }

  .btn {
    width: 100%; padding: 15px; border-radius: 16px; border: none;
    font-size: 16px; font-weight: 700; font-family: inherit;
    cursor: pointer; transition: all .15s; letter-spacing: .3px;
  }
  .btn:active { transform: scale(.97); }
  .btn-p { background: linear-gradient(135deg, #FF6B6B, #FF8E53); color: #fff; }
  .btn-p:disabled { opacity: .35; cursor: not-allowed; transform: none; }
  .btn-s { background: #1A1A1A; color: #666; border: 1.5px solid #2A2A2A; }

  /* ── App Shell ── */
  .shell { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .topbar {
    display: flex; align-items: center; justify-content: space-between;
    padding: 14px 20px 6px; flex-shrink: 0;
  }
  .topbar-logo {
    font-size: 26px; font-weight: 900; letter-spacing: -.5px;
    background: linear-gradient(135deg, #FF6B6B 0%, #FFE66D 100%);
    -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
  }
  .topbar-pet { font-size: 26px; }

  .content { flex: 1; overflow-y: auto; padding: 10px 16px 16px; -webkit-overflow-scrolling: touch; }
  .content::-webkit-scrollbar { display: none; }
  .content.chat-mode { overflow-y: hidden; display: flex; flex-direction: column; }

  .tabbar {
    display: flex; background: #181818; border-top: 1px solid #222;
    padding: 6px 0 max(8px, env(safe-area-inset-bottom)); flex-shrink: 0;
  }
  .tab {
    flex: 1; display: flex; flex-direction: column; align-items: center;
    gap: 3px; padding: 6px 0; background: none; border: none;
    cursor: pointer; color: #444; font-family: inherit; transition: color .2s;
  }
  .tab.on { color: #FF6B6B; }
  .tab-ico { font-size: 22px; line-height: 1; }
  .tab-lbl { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }

  /* ── Pal Tab ── */
  .pal { display: flex; flex-direction: column; align-items: center; gap: 20px; padding: 12px 0; }
  .pet-ring {
    position: relative; width: 150px; height: 150px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center; font-size: 82px;
    animation: bob 3s ease-in-out infinite;
  }
  @keyframes bob { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-8px); } }
  .mood-badge { position: absolute; bottom: 4px; right: 4px; font-size: 28px; }
  .pet-name { font-size: 22px; font-weight: 800; text-align: center; }
  .pet-mood { font-size: 13px; color: #666; text-align: center; margin-top: 2px; }
  .mood-quote {
    background: #1A1A1A; border-radius: 16px; padding: 14px 18px;
    font-size: 14px; color: #aaa; line-height: 1.55; text-align: center;
    font-style: italic; max-width: 300px;
  }
  .xp-box { width: 100%; max-width: 300px; }
  .xp-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 7px; }
  .xp-lbl { font-size: 11px; color: #555; font-weight: 700; text-transform: uppercase; letter-spacing: .6px; }
  .xp-val { font-size: 13px; color: #FF6B6B; font-weight: 800; }
  .xp-track { height: 7px; background: #1E1E1E; border-radius: 4px; overflow: hidden; }
  .xp-bar { height: 100%; background: linear-gradient(90deg, #FF6B6B, #FFE66D); border-radius: 4px; transition: width .5s ease; }
  .stats { display: flex; gap: 10px; width: 100%; max-width: 300px; }
  .stat { flex: 1; background: #1A1A1A; border-radius: 16px; padding: 14px 10px; text-align: center; }
  .stat-n { font-size: 22px; font-weight: 900; color: #FF6B6B; }
  .stat-l { font-size: 10px; color: #555; font-weight: 700; text-transform: uppercase; letter-spacing: .5px; margin-top: 3px; }

  /* ── Scan Tab ── */
  .scan { display: flex; flex-direction: column; gap: 14px; padding: 4px 0; }
  .drop-zone {
    background: #1A1A1A; border: 2px dashed #2A2A2A; border-radius: 22px;
    min-height: 200px; display: flex; flex-direction: column; align-items: center;
    justify-content: center; gap: 10px; cursor: pointer; transition: border-color .2s;
    position: relative; overflow: hidden;
  }
  .drop-zone:hover { border-color: #FF6B6B; }
  .drop-zone input {
    position: absolute; inset: 0; opacity: 0; cursor: pointer; width: 100%; height: 100%;
  }
  .drop-ico { font-size: 44px; }
  .drop-hint { font-size: 14px; color: #555; }
  .scan-img { width: 100%; max-height: 260px; object-fit: cover; border-radius: 20px; }
  .scan-result {
    background: #1A1A1A; border-radius: 20px; padding: 18px;
    font-size: 14px; line-height: 1.65; color: #ccc; white-space: pre-wrap;
  }
  .scan-result-head { font-size: 15px; font-weight: 700; color: #FF6B6B; margin-bottom: 10px; }
  .analyzing {
    display: flex; align-items: center; gap: 10px; color: #666; font-size: 14px;
    padding: 14px 16px; background: #1A1A1A; border-radius: 16px;
  }
  .spin {
    width: 18px; height: 18px; border: 2px solid #2A2A2A; border-top-color: #FF6B6B;
    border-radius: 50%; animation: spin .7s linear infinite; flex-shrink: 0;
  }
  @keyframes spin { to { transform: rotate(360deg); } }

  /* ── Log Tab ── */
  .log { display: flex; flex-direction: column; gap: 14px; }
  .log-form { background: #1A1A1A; border-radius: 20px; padding: 14px; display: flex; flex-direction: column; gap: 10px; }
  .log-row { display: flex; gap: 10px; }
  .log-row .field { flex: 1; }
  .field-cal { width: 90px; flex: none !important; }
  .log-total {
    background: #1A1A1A; border-radius: 16px; padding: 12px 16px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .log-total-l { font-size: 14px; color: #666; }
  .log-total-n { font-size: 20px; font-weight: 900; color: #FF6B6B; }
  .log-list { display: flex; flex-direction: column; gap: 8px; }
  .log-item {
    background: #1A1A1A; border-radius: 14px; padding: 11px 14px;
    display: flex; justify-content: space-between; align-items: center;
  }
  .log-item-name { font-size: 15px; font-weight: 500; }
  .log-item-time { font-size: 12px; color: #555; margin-top: 2px; }
  .log-item-cal { font-size: 15px; font-weight: 800; color: #FF8E53; }
  .log-del {
    background: none; border: none; color: #333; cursor: pointer;
    font-size: 20px; padding: 2px 8px; border-radius: 8px; margin-left: 8px;
    transition: color .2s;
  }
  .log-del:hover { color: #FF6B6B; }
  .empty { text-align: center; color: #444; font-size: 14px; padding: 36px 0; }
  .empty-ico { font-size: 44px; margin-bottom: 12px; }

  /* ── Chat Tab ── */
  .chat { flex: 1; display: flex; flex-direction: column; overflow: hidden; }
  .msgs { flex: 1; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; padding-bottom: 6px; }
  .msgs::-webkit-scrollbar { display: none; }
  .bubble {
    max-width: 82%; padding: 11px 15px; border-radius: 20px;
    font-size: 14px; line-height: 1.55; word-break: break-word;
  }
  .bubble.user {
    align-self: flex-end; background: linear-gradient(135deg, #FF6B6B, #FF8E53);
    color: #fff; border-bottom-right-radius: 5px;
  }
  .bubble.bot {
    align-self: flex-start; background: #1A1A1A; color: #ccc;
    border-bottom-left-radius: 5px;
  }
  .bubble-head { font-size: 11px; color: #555; font-weight: 700; margin-bottom: 4px; }
  .typing {
    align-self: flex-start; background: #1A1A1A; border-radius: 20px;
    border-bottom-left-radius: 5px; padding: 12px 16px; display: flex; gap: 4px; align-items: center;
  }
  .tdot {
    width: 6px; height: 6px; background: #444; border-radius: 50%;
    animation: tdot 1.2s ease-in-out infinite;
  }
  .tdot:nth-child(2) { animation-delay: .2s; }
  .tdot:nth-child(3) { animation-delay: .4s; }
  @keyframes tdot { 0%,60%,100% { transform: translateY(0); } 30% { transform: translateY(-6px); } }
  .chat-bar { display: flex; gap: 9px; padding-top: 8px; flex-shrink: 0; align-items: flex-end; }
  .chat-in {
    flex: 1; background: #1A1A1A; border: 1.5px solid #2A2A2A; border-radius: 20px;
    padding: 11px 15px; color: #F0F0F0; font-size: 15px; font-family: inherit;
    outline: none; resize: none; transition: border-color .2s; max-height: 100px;
  }
  .chat-in:focus { border-color: #FF6B6B; }
  .chat-in::placeholder { color: #444; }
  .send-btn {
    width: 42px; height: 42px; border-radius: 50%; background: linear-gradient(135deg, #FF6B6B, #FF8E53);
    border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
    font-size: 18px; flex-shrink: 0; transition: transform .15s, opacity .15s; color: #fff;
  }
  .send-btn:disabled { opacity: .35; cursor: not-allowed; }
  .send-btn:not(:disabled):active { transform: scale(.91); }

  /* ── Toast ── */
  .toast {
    position: fixed; bottom: 90px; left: 50%; transform: translateX(-50%);
    background: #FF4757; color: #fff; padding: 10px 20px; border-radius: 20px;
    font-size: 13px; font-weight: 600; z-index: 200; max-width: 300px; text-align: center;
    animation: tpop .25s ease;
  }
  @keyframes tpop {
    from { opacity: 0; transform: translateX(-50%) translateY(8px); }
    to   { opacity: 1; transform: translateX(-50%) translateY(0); }
  }
`

export default function App() {
  const [petType,     setPetType]     = useState(() => localStorage.getItem('s_pt') || '')
  const [petName,     setPetName]     = useState(() => localStorage.getItem('s_pn') || '')
  const [apiKey,      setApiKey]      = useState(() => localStorage.getItem('s_ak') || '')
  const [xp,          setXp]          = useState(() => +localStorage.getItem('s_xp') || 0)
  const [entries,     setEntries]     = useState(() => { try { return JSON.parse(localStorage.getItem('s_log') || '[]') } catch { return [] } })
  const [chatHistory, setChatHistory] = useState(() => { try { return JSON.parse(localStorage.getItem('s_chat') || '[]') } catch { return [] } })

  const [step,        setStep]    = useState(1)
  const [tPet,        setTPet]    = useState('')
  const [tName,       setTName]   = useState('')
  const [tKey,        setTKey]    = useState('')
  const [tab,         setTab]     = useState('pal')
  const [scanImg,     setScanImg] = useState(null)
  const [scanResult,  setScanResult] = useState(null)
  const [scanning,    setScanning]   = useState(false)
  const [chatIn,      setChatIn]  = useState('')
  const [chatLoading, setChatLoading] = useState(false)
  const [logFood,     setLogFood] = useState('')
  const [logCals,     setLogCals] = useState('')
  const [toast,       setToast]   = useState(null)

  const chatEndRef = useRef(null)

  useEffect(() => {
    const s = document.createElement('style')
    s.textContent = GLOBAL_CSS
    document.head.appendChild(s)
    return () => document.head.removeChild(s)
  }, [])

  useEffect(() => { if (petType) localStorage.setItem('s_pt', petType) }, [petType])
  useEffect(() => { if (petName) localStorage.setItem('s_pn', petName) }, [petName])
  useEffect(() => { if (apiKey)  localStorage.setItem('s_ak', apiKey)  }, [apiKey])
  useEffect(() => { localStorage.setItem('s_xp',   String(xp))              }, [xp])
  useEffect(() => { localStorage.setItem('s_log',  JSON.stringify(entries))  }, [entries])
  useEffect(() => { localStorage.setItem('s_chat', JSON.stringify(chatHistory)) }, [chatHistory])
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [chatHistory, chatLoading])

  const showToast = (msg) => { setToast(msg); setTimeout(() => setToast(null), 4000) }

  const isSetup = petType && petName && apiKey
  const pet  = PETS[petType] || PETS.fox
  const mood = getMood(xp)
  const today = new Date().toDateString()
  const todayEntries  = entries.filter(e => e.date === today)
  const todayCalories = todayEntries.reduce((s, e) => s + e.calories, 0)

  /* ── Onboarding ── */
  if (!isSetup) {
    return (
      <div className="onboard">
        <div className="step-dots">
          {[1, 2, 3].map(s => <div key={s} className={`dot${step === s ? ' on' : ''}`} />)}
        </div>

        {step === 1 && <>
          <div className="ob-logo">Salty 🧂</div>
          <div className="ob-sub">The food tracker that judges you (lovingly). First, pick your companion.</div>
          <div className="pet-grid">
            {Object.entries(PETS).map(([k, p]) => (
              <div key={k} className={`pet-card${tPet === k ? ' sel' : ''}`}
                   style={tPet === k ? { background: p.bg, borderColor: p.color } : {}}
                   onClick={() => setTPet(k)}>
                <span className="pet-card-emoji">{p.emoji}</span>
                <span className="pet-card-name">{k}</span>
              </div>
            ))}
          </div>
          <button className="btn btn-p" disabled={!tPet} onClick={() => setStep(2)}>Choose this one →</button>
        </>}

        {step === 2 && <>
          <div style={{ fontSize: 80 }}>{PETS[tPet]?.emoji}</div>
          <div className="ob-heading">Name your companion</div>
          <div className="ob-sub">They'll be offended if you skip this part.</div>
          <input className="field" placeholder="Pepper, Biscuit, Kevin…" autoFocus
                 value={tName} onChange={e => setTName(e.target.value)}
                 onKeyDown={e => e.key === 'Enter' && tName.trim() && setStep(3)} />
          <button className="btn btn-p" disabled={!tName.trim()} onClick={() => setStep(3)}>That's the one →</button>
          <button className="btn btn-s" onClick={() => setStep(1)}>← Back</button>
        </>}

        {step === 3 && <>
          <div style={{ fontSize: 80 }}>{PETS[tPet]?.emoji}</div>
          <div className="ob-heading">Anthropic API Key</div>
          <div className="ob-sub">{tName.trim() || 'Your pal'} needs a brain. Grab a key at console.anthropic.com</div>
          <input className="field" type="password" placeholder="sk-ant-…" autoFocus
                 value={tKey} onChange={e => setTKey(e.target.value)} />
          <button className="btn btn-p" disabled={tKey.trim().length < 20}
                  onClick={() => { setPetType(tPet); setPetName(tName.trim()); setApiKey(tKey.trim()) }}>
            Let's go 🚀
          </button>
          <button className="btn btn-s" onClick={() => setStep(2)}>← Back</button>
        </>}

        {toast && <div className="toast">{toast}</div>}
      </div>
    )
  }

  /* ── Scan handler ── */
  async function handleScan(e) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''
    const reader = new FileReader()
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result
      setScanImg(dataUrl)
      setScanResult(null)
      setScanning(true)
      try {
        const base64    = dataUrl.split(',')[1]
        const mediaType = (file.type || 'image/jpeg')
        const result    = await callClaude(apiKey, [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType, data: base64 } },
            { type: 'text', text:
              `Analyze this food photo. Identify what you see, estimate calories precisely, and give snarky but genuinely helpful nutrition commentary. Format as:

🍽️ What I see: [list the foods]
🔥 Estimated calories: [specific number or tight range] kcal
📊 Nutritional notes:
• [macro breakdown or key nutrients]
• [one noteworthy thing — good or bad]
💬 ${petName}'s verdict: [one sharp, witty one-liner as the pet companion]` }
          ]
        }],
        `You are ${petName}, a ${petType} who is a snarky but genuinely helpful nutrition coach. You care about the user's health but express it with wit and personality.`)
        setScanResult(result)
        setXp(prev => prev + 5)
      } catch (err) {
        showToast(`Scan failed: ${err.message}`)
        setScanImg(null)
      } finally {
        setScanning(false)
      }
    }
    reader.readAsDataURL(file)
  }

  /* ── Log handler ── */
  function addEntry() {
    if (!logFood.trim() || !logCals) return
    const entry = {
      id: Date.now(), name: logFood.trim(), calories: Math.round(+logCals),
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: today,
    }
    setEntries(prev => [entry, ...prev])
    setXp(prev => prev + 10)
    setLogFood(''); setLogCals('')
  }

  function deleteEntry(id) {
    const e = entries.find(x => x.id === id)
    setEntries(prev => prev.filter(x => x.id !== id))
    if (e) setXp(prev => Math.max(0, prev - 10))
  }

  /* ── Chat handler ── */
  async function sendChat() {
    const msg = chatIn.trim()
    if (!msg || chatLoading) return
    setChatIn('')
    const next = [...chatHistory, { role: 'user', content: msg }]
    setChatHistory(next)
    setChatLoading(true)
    try {
      const reply = await callClaude(apiKey, next,
        `You are ${petName}, a ${petType} pet companion and snarky nutrition coach inside the Salty food tracking app.
You care about the user's health but express it with wit, personality, and light attitude.
Context: the user has logged ${todayCalories} kcal today across ${todayEntries.length} meals. Their total XP is ${xp}. Your current mood is "${mood.label}".
Be conversational and keep responses short (2–4 sentences). Give real nutritional info mixed with your personality.`)
      setChatHistory(prev => [...prev, { role: 'assistant', content: reply }])
    } catch (err) {
      showToast(`Chat error: ${err.message}`)
      setChatHistory(prev => prev.slice(0, -1))
      setChatIn(msg)
    } finally {
      setChatLoading(false)
    }
  }

  const TABS = [
    { id: 'pal',  ico: pet.emoji, lbl: 'Pal'  },
    { id: 'scan', ico: '📸',      lbl: 'Scan' },
    { id: 'log',  ico: '📋',      lbl: 'Log'  },
    { id: 'chat', ico: '💬',      lbl: 'Chat' },
  ]

  return (
    <div className="shell">
      <div className="topbar">
        <div className="topbar-logo">Salty 🧂</div>
        <div className="topbar-pet">{pet.emoji}</div>
      </div>

      <div className={`content${tab === 'chat' ? ' chat-mode' : ''}`}>

        {/* ── PAL ── */}
        {tab === 'pal' && (
          <div className="pal">
            <div className="pet-ring" style={{ background: pet.bg }}>
              <span>{pet.emoji}</span>
              <span className="mood-badge">{mood.emoji}</span>
            </div>
            <div>
              <div className="pet-name">{petName}</div>
              <div className="pet-mood">Feeling {mood.label}</div>
            </div>
            <div className="mood-quote">"{mood.msg}"</div>
            <div className="xp-box">
              <div className="xp-row">
                <span className="xp-lbl">XP · Level {Math.floor(xp / 100)}</span>
                <span className="xp-val">{xp} pts</span>
              </div>
              <div className="xp-track">
                <div className="xp-bar" style={{ width: `${xp % 100}%` }} />
              </div>
            </div>
            <div className="stats">
              <div className="stat">
                <div className="stat-n">{todayCalories.toLocaleString()}</div>
                <div className="stat-l">kcal today</div>
              </div>
              <div className="stat">
                <div className="stat-n">{todayEntries.length}</div>
                <div className="stat-l">meals</div>
              </div>
              <div className="stat">
                <div className="stat-n">{Math.floor(xp / 100)}</div>
                <div className="stat-l">level</div>
              </div>
            </div>
          </div>
        )}

        {/* ── SCAN ── */}
        {tab === 'scan' && (
          <div className="scan">
            <div className="drop-zone">
              <input type="file" accept="image/*" capture="environment" onChange={handleScan} />
              {scanImg
                ? <img src={scanImg} className="scan-img" alt="food" />
                : <><span className="drop-ico">📸</span><span className="drop-hint">Tap to photograph your food</span></>}
            </div>

            {scanning && (
              <div className="analyzing">
                <div className="spin" />
                <span>{petName} is judging your choices…</span>
              </div>
            )}

            {scanResult && !scanning && (
              <div className="scan-result">
                <div className="scan-result-head">{pet.emoji} Food Analysis</div>
                {scanResult}
              </div>
            )}

            {scanImg && !scanning && (
              <button className="btn btn-s" onClick={() => { setScanImg(null); setScanResult(null) }}>
                Clear & scan again
              </button>
            )}
          </div>
        )}

        {/* ── LOG ── */}
        {tab === 'log' && (
          <div className="log">
            <div className="log-form">
              <div className="log-row">
                <input className="field" placeholder="What did you eat?" value={logFood}
                       onChange={e => setLogFood(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && addEntry()} />
                <input className="field field-cal" type="number" placeholder="kcal" min="0"
                       value={logCals} onChange={e => setLogCals(e.target.value)}
                       onKeyDown={e => e.key === 'Enter' && addEntry()} />
              </div>
              <button className="btn btn-p" disabled={!logFood.trim() || !logCals} onClick={addEntry}>
                + Log it (+10 XP)
              </button>
            </div>

            {todayEntries.length > 0 && (
              <div className="log-total">
                <span className="log-total-l">Today's total</span>
                <span className="log-total-n">{todayCalories.toLocaleString()} kcal</span>
              </div>
            )}

            <div className="log-list">
              {todayEntries.length === 0
                ? <div className="empty"><div className="empty-ico">🍽️</div>Nothing logged yet.<br />{petName} is watching.</div>
                : todayEntries.map(e => (
                    <div className="log-item" key={e.id}>
                      <div>
                        <div className="log-item-name">{e.name}</div>
                        <div className="log-item-time">{e.time}</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center' }}>
                        <span className="log-item-cal">{e.calories} kcal</span>
                        <button className="log-del" onClick={() => deleteEntry(e.id)}>×</button>
                      </div>
                    </div>
                  ))
              }
            </div>
          </div>
        )}

        {/* ── CHAT ── */}
        {tab === 'chat' && (
          <div className="chat">
            <div className="msgs">
              {chatHistory.length === 0 && (
                <div className="bubble bot">
                  <div className="bubble-head">{pet.emoji} {petName}</div>
                  Hey — your {petType} nutrition coach is here. Ask me about macros, meal ideas, or why you ate that. I've got opinions.
                </div>
              )}
              {chatHistory.map((m, i) => (
                <div key={i} className={`bubble ${m.role === 'user' ? 'user' : 'bot'}`}>
                  {m.role === 'assistant' && <div className="bubble-head">{pet.emoji} {petName}</div>}
                  {m.content}
                </div>
              ))}
              {chatLoading && (
                <div className="typing">
                  <div className="tdot" /><div className="tdot" /><div className="tdot" />
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="chat-bar">
              <textarea className="chat-in" rows={1} placeholder={`Ask ${petName}…`}
                        value={chatIn} onChange={e => setChatIn(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat() } }} />
              <button className="send-btn" disabled={!chatIn.trim() || chatLoading} onClick={sendChat}>↑</button>
            </div>
          </div>
        )}

      </div>

      {/* ── Tab Bar ── */}
      <div className="tabbar">
        {TABS.map(t => (
          <button key={t.id} className={`tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
            <span className="tab-ico">{t.ico}</span>
            <span className="tab-lbl">{t.lbl}</span>
          </button>
        ))}
      </div>

      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}
