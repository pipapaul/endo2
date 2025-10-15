import React, { useEffect, useMemo, useRef, useState } from 'react'

// ---------- Constants & Helpers ----------
const STORAGE_KEY = 'endo_mini_v1_data'
const SETTINGS_KEY = 'endo_mini_v1_settings'
const ENC_KEY = 'endo_mini_v1_cipher'

const STR = {
  appTitle: 'Endo – Tagescheck',
  today: 'Heute',
  trends: 'Verlauf',
  entries: 'Einträge',
  export: 'Export',
  start: 'Weiter',
  back: 'Zurück',
  save: 'Speichern',
  done: 'Fertig',
  likeYesterday: 'Wie gestern',
  symptomFree: 'Heute symptomfrei',
  quickOnly: 'Nur Schmerz & Blutung',
  nrsQ: 'Wie stark ist dein Schmerz jetzt?',
  nrsHint: '0 = kein, 10 = unerträglich. Wähle spontan.',
  pbacTitle: 'Periode & Blutung',
  pbacHint: 'Tippe, wie voll deine Produkte waren. Das hilft in Arztgesprächen (PBAC).',
  bodyQ: 'Wo sitzt der Schmerz?',
  symptomsQ: 'Welche 1–3 Symptome spürst du heute?',
  medsQ: 'Hast du etwas genommen?',
  sleepQ: 'Wie war dein Schlaf?',
  sleepHint: '0 = sehr schlecht, 10 = sehr gut.',
  saved: 'Gespeichert',
  dataLocal: 'Daten bleiben auf diesem Gerät.',
  lock: 'PIN-Schutz',
  enableEncryption: 'Verschlüsselung aktivieren',
  setPin: 'PIN festlegen',
  unlock: 'Entsperren',
  clearAll: 'Alles löschen',
  highPain: 'Sehr starke Schmerzen? Hol dir Hilfe, wenn du unsicher bist.',
  disclaimerCorr: 'Das sind Zusammenhänge, keine Beweise. Wir zeigen sie erst bei genug Daten.',
  pdf1: 'Arzt-Kurzbrief (Druckansicht)',
  jsonExport: 'JSON exportieren',
  dateLabel: 'Datum',
  todayJump: 'Heute',
  pickDate: 'Datum wählen',
  completed: 'Abgeschlossen',
  savedDay: 'Tag gespeichert',
  editDay: 'Tag bearbeiten',
  bannerSaved: 'Tag gespeichert',
  periodStart: 'Periodenbeginn heute',
  periodLegend: 'Markierung zeigt Periodentage / -beginn'
}

const SYMPTOMS = [
  { id: 'fatigue', label: 'Müdigkeit' },
  { id: 'nausea', label: 'Übelkeit' },
  { id: 'bloat', label: 'Blähbauch' },
  { id: 'back', label: 'Rückenschmerz' },
  { id: 'sex_deep', label: 'Schmerz beim Sex (tief)' },
  { id: 'urination', label: 'Schmerz beim Wasserlassen' },
  { id: 'bowel', label: 'Schmerz beim Stuhlgang' },
  { id: 'urge', label: 'Dranginkontinenz' },
  { id: 'migraine', label: 'Kopfschmerzen/Migräne' },
  { id: 'dizzy', label: 'Schwindel' },
]

const MAX_SYMPTOMS = 3

const ZONES = [
  { id: 'uterus', label: 'Uterus' },
  { id: 'pelvis_left', label: 'Becken links' },
  { id: 'pelvis_right', label: 'Becken rechts' },
  { id: 'sacrum', label: 'Kreuzbein' },
  { id: 'rectal', label: 'Rektal' },
  { id: 'vaginal', label: 'Vaginal' },
  { id: 'thigh_l', label: 'Oberschenkel links' },
  { id: 'thigh_r', label: 'Oberschenkel rechts' },
]

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function addDaysISO(iso, delta) {
  const d = new Date(iso)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }

function useLocalState(key, initial) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, [key, v])
  return [v, setV]
}

// Minimal AES-GCM (optional). Falls WebCrypto fehlt, speichere Klartext.
async function deriveKey(pass, salt) {
  const enc = new TextEncoder()
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 120000, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
async function encryptBlob(obj, pass) {
  if (!window.crypto || !pass) return { mode: 'plain', data: JSON.stringify(obj) }
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(pass, salt)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)))
  return { mode: 'gcm', iv: Array.from(iv), salt: Array.from(salt), data: btoa(String.fromCharCode(...new Uint8Array(cipher))) }
}
async function decryptBlob(bundle, pass) {
  try {
    if (!bundle || bundle.mode !== 'gcm') return bundle?.data ? JSON.parse(bundle.data) : []
    const dec = new TextDecoder()
    const iv = new Uint8Array(bundle.iv)
    const salt = new Uint8Array(bundle.salt)
    const key = await deriveKey(pass, salt)
    const bytes = Uint8Array.from(atob(bundle.data), c => c.charCodeAt(0))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, bytes)
    return JSON.parse(dec.decode(plain))
  } catch { return [] }
}

// ---------- Period helpers ----------
// Build a set of dates that are considered "period days": union of
// (a) explicit period starts + next 5 days; (b) any day with PBAC > 0.
function flagPeriodDays(entries) {
  const set = new Set()
  const starts = new Set()
  entries.forEach(e => {
    if (e?.pbac?.periodStart) {
      starts.add(e.date)
      for (let i=0;i<6;i++) set.add(addDaysISO(e.date, i))
    }
    if ((e?.pbac?.dayScore||0) > 0) set.add(e.date)
  })
  return { periodSet: set, startSet: starts }
}

// ---------- UI Bits ----------
function Section({ title, hint, children, right }) {
  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-rose-900">{title}</h2>
        {right}
      </div>
      {hint && <p className="text-sm text-rose-700 mb-2">{hint}</p>}
      <div className="bg-white rounded-2xl shadow p-3">{children}</div>
    </section>
  )
}

function Tooltip({ text }) {
  const [open, setOpen] = useState(false)
  return (
    <span className="relative inline-flex ml-2 align-middle">
      <button aria-label="Info" className="w-5 h-5 rounded-full border text-xs" onClick={() => setOpen(o=>!o)}>i</button>
      {open && (
        <div className="absolute z-20 mt-2 w-64 p-2 text-sm bg-rose-600 text-white rounded-xl shadow">
          {text}
        </div>
      )}
    </span>
  )
}

function Stepper({ step, total }) {
  return (
    <div className="flex gap-1 px-4">
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className={`h-1 flex-1 rounded ${i <= step ? 'bg-rose-500' : 'bg-rose-100'}`} />
      ))}
    </div>
  )
}

function TopSlideBanner({ show, text, onClose }){
  return (
    <div className={`fixed top-0 inset-x-0 z-50 transform transition-transform duration-300 ${show? 'translate-y-0':'-translate-y-full'}`}>
      <div className="mx-auto max-w-md mt-2 px-4 py-2 rounded-xl bg-rose-600 text-white shadow text-center">
        {text}
      </div>
    </div>
  )
}

function Range({ value, onChange, min=0, max=10, step=1, aria, labels, disabled=false }) {
  const defaultLabels = ['0 kein','3 leicht','5 mittel','7 stark','10 unerträglich']
  const L = labels && labels.length===5 ? labels : defaultLabels
  return (
    <div>
      <input aria-label={aria} type="range" className="w-full" min={min} max={max} step={step} value={value} onChange={e=>onChange(Number(e.target.value))} disabled={disabled} />
      <div className="mt-2 flex justify-between text-xs text-gray-600">
        <span>{L[0]}</span><span>{L[1]}</span><span>{L[2]}</span><span>{L[3]}</span><span>{L[4]}</span>
      </div>
    </div>
  )
}

function Chip({ active, onClick, children, disabled=false }) {
  return (
    <button onClick={onClick} disabled={disabled} className={`px-3 py-2 rounded-full border text-sm mr-2 mb-2 ${active ? 'bg-rose-600 text-white border-rose-600' : 'bg-white border-rose-200'} disabled:opacity-50 disabled:pointer-events-none`}>{children}</button>
  )
}

function NrsSlider({ value, onChange, disabled=false }) {
  return (
    <Section title={STR.nrsQ} hint={STR.nrsHint} right={<Tooltip text={STR.nrsHint} />}>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold w-10 text-center" aria-live="polite">{value}</span>
        <Range value={value} onChange={onChange} aria={STR.nrsQ} disabled={disabled} />
      </div>
    </Section>
  )
}

const PBAC_WEIGHTS = { pad: [0,1,5], tampon: [0,5,10], cup: [0,10,20] } // low/mid/high

function PbacMini({ state, setState, disabled=false }) {
  const update = (kind, fill) => {
    const list = state.products.filter(p=>p.kind!==kind)
    setState({ ...state, products: [...list, { kind, fill }] })
  }
  const score = useMemo(()=>{
    const map = { low:0, mid:1, high:2 }
    let s = 0
    state.products.forEach(p=>{ s += PBAC_WEIGHTS[p.kind][map[p.fill]] })
    if (state.clots==='small') s += 5
    if (state.clots==='large') s += 10
    if (state.flooding) s += 20
    return s
  }, [state])
  useEffect(()=>setState({ ...state, dayScore: score }), [score])
  const FillBtn = ({label, fill, active, onClick, disabled = false}) => (
    <button onClick={onClick} disabled={disabled} className={`px-3 py-2 rounded-xl border mr-2 ${active ? 'bg-rose-600 text-white border-rose-600' : 'border-rose-200'} disabled:opacity-50 disabled:pointer-events-none`}>{label}</button>
  )
  const ProdRow = ({ kind, label }) => {
    const current = state.products.find(p=>p.kind===kind)?.fill || 'low'
    return (
      <div className="mb-2">
        <div className="text-sm mb-1">{label}</div>
        <div className="flex">
          {['low','mid','high'].map(f=>
            <FillBtn key={f} label={f==='low'?'leicht':f==='mid'?'mittel':'stark'} fill={f} active={current===f} onClick={()=>update(kind,f)} disabled={disabled} />
          )}
        </div>
      </div>
    )
  }
  return (
    <Section title={STR.pbacTitle} hint={STR.pbacHint} right={<Tooltip text={STR.pbacHint} />}>
      <div className="mb-2">
        <Chip active={!!state.periodStart} onClick={()=>setState({ ...state, periodStart: !state.periodStart })} disabled={disabled}>{STR.periodStart}</Chip>
      </div>
      <ProdRow kind="pad" label="Binde" />
      <ProdRow kind="tampon" label="Tampon" />
      <ProdRow kind="cup" label="Menstruationstasse" />
      <div className="mt-2 flex items-center gap-2">
        <Chip active={state.clots==='small'} onClick={()=>setState({ ...state, clots: state.clots==='small'? 'none':'small' })} disabled={disabled}>Klumpen klein</Chip>
        <Chip active={state.clots==='large'} onClick={()=>setState({ ...state, clots: state.clots==='large'? 'none':'large' })} disabled={disabled}>Klumpen groß</Chip>
        <Chip active={!!state.flooding} onClick={()=>setState({ ...state, flooding: !state.flooding })} disabled={disabled}>Flooding</Chip>
      </div>
      <div className="mt-3 text-sm">Tages-PBAC: <span className="font-semibold">{score}</span></div>
    </Section>
  )
}

function BodyMapSimple({ zones, setZones, disabled=false }) {
  const toggle = (id) => { if (disabled) return; setZones(zones.includes(id) ? zones.filter(z=>z!==id) : [...zones, id]) }
  return (
    <Section title={STR.bodyQ} hint="Tippe 1–3 Bereiche. Alternativ Liste für Screenreader.">
      <div className="grid grid-cols-2 gap-2">
        {ZONES.map(z => (
          <button key={z.id} onClick={()=>toggle(z.id)} disabled={disabled} className={`p-3 rounded-2xl border text-sm ${zones.includes(z.id) ? 'bg-rose-600 text-white border-rose-600' : ''} disabled:opacity-50 disabled:pointer-events-none`}>{z.label}</button>
        ))}
      </div>
    </Section>
  )
}

function SymptomPicker({ selected, setSelected, disabled=false }) {
  const toggle = (id) => {
  if (disabled) return
    let arr = selected.map(s=>s.id)
    if (arr.includes(id)) {
      setSelected(selected.filter(s=>s.id!==id))
    } else if (selected.length < MAX_SYMPTOMS) {
      setSelected([...selected, { id, label: SYMPTOMS.find(s=>s.id===id).label, intensity: 5 }])
    }
  }
  const updateInt = (id, v) => { if (disabled) return; setSelected(selected.map(s=>s.id===id?{...s,intensity:v}:s)) }
  return (
    <Section title={STR.symptomsQ} hint="0 = keins, 10 = sehr stark.">
      <div className="mb-2">
        {SYMPTOMS.map(s => <Chip key={s.id} active={selected.some(x=>x.id===s.id)} onClick={()=>toggle(s.id)} disabled={disabled}>{s.label}</Chip>)}
      </div>
      {selected.map(s => (
        <div key={s.id} className="mt-2">
          <div className="text-sm mb-1">{s.label}: <b>{s.intensity}</b></div>
          <Range value={s.intensity} onChange={(v)=>updateInt(s.id, v)} aria={`${s.label} Intensität`} labels={["0 keins","3 leicht","5 mittel","7 stark","10 sehr stark"]} disabled={disabled} />
        </div>
      ))}
    </Section>
  )
}

function MedicationQuick({ meds, setMeds, disabled=false }) {
  const [taking, setTaking] = useState(meds.length>0)
  const [name, setName] = useState('')
  const [dose, setDose] = useState('')
  const add = () => {
    if (disabled) return;
    if (!name.trim()) return
    setMeds([...(meds||[]), { name: name.trim(), dose: dose.trim(), ts: Date.now() }])
    setName(''); setDose(''); setTaking(true)
  }
  return (
    <Section title={STR.medsQ}>
      <div className="flex gap-2 mb-3">
        <Chip active={!taking} onClick={()=>{ if (disabled) return; setTaking(false); setMeds([]) }} disabled={disabled}>Nein</Chip>
        <Chip active={taking} onClick={()=>{ if (disabled) return; setTaking(true) }} disabled={disabled}>Ja</Chip>
      </div>
      {taking && (
        <div>
          <div className="mb-2 flex flex-wrap gap-2">
            {meds.map((m,i)=>(
              <span key={i} className="px-3 py-1 rounded-full bg-gray-100 text-sm">{m.name}{m.dose?` ${m.dose}`:''}</span>
            ))}
          </div>
          <div className="flex gap-2">
            <input aria-label="Medikament" className="flex-1 border rounded-xl px-3 py-2" placeholder="Name" value={name} onChange={e=>setName(e.target.value)} disabled={disabled} />
            <input aria-label="Dosis" className="w-28 border rounded-xl px-3 py-2" placeholder="Dosis" value={dose} onChange={e=>setDose(e.target.value)} disabled={disabled} />
            <button className="px-3 py-2 rounded-xl bg-rose-600 text-white disabled:opacity-50 disabled:pointer-events-none" onClick={add} disabled={disabled}>Hinzufügen</button>
          </div>
        </div>
      )}
    </Section>
  )
}

function SleepScale({ value, onChange, disabled=false }) {
  return (
    <Section title={STR.sleepQ} hint={STR.sleepHint}>
      <Range value={value} onChange={onChange} aria={STR.sleepQ} labels={["0 sehr schlecht","3 schlecht","5 mittel","7 gut","10 sehr gut"]} disabled={disabled} />
    </Section>
  )
}

// ---------- Charts (lightweight SVG + simple markers) ----------
function Sparkline({ data=[0], mask=[], width=280, height=40 }) {
  const max = Math.max(10, ...data)
  const pts = data.map((v,i)=>{
    const x = (i/(data.length-1||1))*(width-4)+2
    const y = height - (v/max)*(height-4) - 2
    return `${x},${y}`
  }).join(' ')
  return (
    <div>
      <svg width={width} height={height} aria-label="Sparkline">
        <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="2" />
      </svg>
      {/* period mask row */}
      {!!mask.length && (
        <div className="mt-1 flex gap-1" aria-label={STR.periodLegend}>
          {mask.map((m,i)=> <div key={i} className={`h-1 flex-1 ${m?'bg-rose-400':'bg-transparent'}`} />)}
        </div>
      )}
    </div>
  )
}

function CalendarHeatmap({ days }) {
  // days: array of last 30 {date, nrs, period, periodStart}
  const cell = 20
  return (
    <div className="grid grid-cols-7 gap-1" aria-label="Kalender Heatmap">
      {days.map((d,i)=>{
        const c = d.nrs>=8?'bg-red-600':d.nrs>=5?'bg-red-400':d.nrs>=3?'bg-orange-300':d.nrs>0?'bg-yellow-200':'bg-gray-200'
        return (
          <div key={i} className={`relative w-[${cell}px] h-[${cell}px] ${c} rounded`}>
            {d.period && <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-400 rounded-b" />}
            {d.periodStart && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-700" />}
          </div>
        )
      })}
    </div>
  )
}

// ---------- Date Navigation ----------
function DateNav({ activeDate, setActiveDate, hasEntry, onPrev, onNext, onToday, isEditing, onEdit }) {
  return (
    <div className="px-4 pt-2 pb-1 bg-rose-50 border-b border-rose-100">
      <div className="flex items-center justify-between">
        <button aria-label="Vorheriger Tag" className="w-9 h-9 rounded-full bg-rose-100 text-rose-700" onClick={onPrev}>‹</button>
        <div className="text-center">
          <div className="text-sm text-rose-800 font-medium">{STR.dateLabel}</div>
          <div className="flex items-center gap-2 justify-center">
            <input type="date" className="px-2 py-1 rounded-xl border border-rose-200 bg-white text-sm" value={activeDate} onChange={e=>setActiveDate(e.target.value)} />
            {hasEntry && <span className="px-2 py-1 text-xs rounded-full bg-rose-200 text-rose-800">{STR.completed} ✓</span>}
            {!isEditing && hasEntry && (
              <button className="px-2 py-1 rounded-lg border border-rose-300 bg-white text-rose-700 text-xs" onClick={onEdit}>{STR.editDay}</button>
            )}
          </div>
        </div>
        <button aria-label="Nächster Tag" className="w-9 h-9 rounded-full bg-rose-100 text-rose-700" onClick={onNext}>›</button>
      </div>
      <div className="mt-2 flex justify-center">
        <button className="text-xs underline text-rose-700" onClick={onToday}>{STR.todayJump}</button>
      </div>
    </div>
  )
}

// ---------- Main App ----------
export default function EndoMiniApp() {
  const [tab, setTab] = useState('today') // today|trends|entries|export
  const [activeDate, setActiveDate] = useState(todayISO())
  const [settings, setSettings] = useLocalState(SETTINGS_KEY, { quickMode: true, encryption: false })
  const [pass, setPass] = useState('')
  const [locked, setLocked] = useState(false)

  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)

  // Load persisted data (possibly encrypted)
  useEffect(()=>{
    (async () => {
      const raw = localStorage.getItem(STORAGE_KEY)
      const encBundle = localStorage.getItem(ENC_KEY)
      if (settings.encryption && encBundle) {
        try { const parsed = JSON.parse(encBundle); const dec = await decryptBlob(parsed, pass); setEntries(Array.isArray(dec)?dec:[]); setLoaded(true); setLocked(false) } catch { setLocked(true); setLoaded(true) }
      } else {
        try { setEntries(raw?JSON.parse(raw):[]); setLoaded(true) } catch { setEntries([]); setLoaded(true) }
      }
    })()
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.encryption, pass])

  useEffect(()=>{
    if (!loaded) return
    if (settings.encryption) {
      (async () => {
        const bundle = await encryptBlob(entries, pass)
        localStorage.setItem(ENC_KEY, JSON.stringify(bundle))
        localStorage.removeItem(STORAGE_KEY)
      })()
    } else {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
      localStorage.removeItem(ENC_KEY)
    }
  }, [entries, settings.encryption, loaded, pass])

  // Today Wizard state
  const [step, setStep] = useState(0)
  const totalSteps = 6
  const yesterday = useMemo(()=>{
    const y = new Date(activeDate); y.setDate(y.getDate()-1)
    const iso = y.toISOString().slice(0,10)
    return entries.find(e=>e.date===iso)
  }, [entries, activeDate])

  const [nrs, setNrs] = useState(3)
  const [pbac, setPbac] = useState({ products: [], clots: 'none', flooding: false, dayScore: 0, periodStart: false })
  const [zones, setZones] = useState([])
  const [symptoms, setSymptoms] = useState([])
  const [meds, setMeds] = useState([])
  const [sleep, setSleep] = useState(5)
  const [savedFlag, setSavedFlag] = useState(false) // legacy, not used
  const [isEditing, setIsEditing] = useState(true)
  const [banner, setBanner] = useState({ show:false, text:'' })
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)

  // section refs for progressive reveal scrolling
  const sectionRefs = [useRef(null), useRef(null), useRef(null), useRef(null), useRef(null), useRef(null)]

  // Load entry when switching day
  useEffect(()=>{
    const e = entries.find(x=>x.date===activeDate)
    if (e) {
      setNrs(e.nrs ?? 3)
      setPbac(e.pbac ?? { products: [], clots: 'none', flooding: false, dayScore: 0, periodStart: false })
      setZones(e.zones ?? [])
      setSymptoms(e.symptoms ?? [])
      setMeds(e.medication ?? [])
      setSleep(e.sleep ?? 5)
      setIsEditing(false) // vorhandener Tag: zunächst gesperrt
    } else {
      setNrs(3); setPbac({ products: [], clots:'none', flooding:false, dayScore:0, periodStart:false }); setZones([]); setSymptoms([]); setMeds([]); setSleep(5)
      setIsEditing(true) // neuer Tag: sofort editierbar
    }
    setStep(e ? totalSteps-1 : 0)
    window.scrollTo({ top: 0 })
  }, [activeDate, entries])

  useEffect(()=>{ if (banner.show) { const t = setTimeout(()=>setBanner(b=>({...b, show:false})), 1400); return ()=>clearTimeout(t) } }, [banner.show])

  function fillLikeYesterday() {
    if (!yesterday) return
    setNrs(yesterday.nrs ?? 3)
    setPbac(yesterday.pbac ?? { products: [], clots: 'none', flooding: false, dayScore: 0, periodStart:false })
    setZones(yesterday.zones ?? [])
    setSymptoms(yesterday.symptoms ?? [])
    setMeds(yesterday.medication ?? [])
    setSleep(yesterday.sleep ?? 5)
  }

  function markSymptomFree(){
    setNrs(0); setPbac({ products: [], clots:'none', flooding:false, dayScore:0, periodStart:false }); setZones([]); setSymptoms([]); setMeds([]); setSleep(7)
  }

  function saveToday() {
    const d = activeDate
    const isUpdate = entries.some(e=>e.date===d)
    if (isUpdate) {
      setConfirmOverwrite(true)
      return
    }
    commitSave()
  }
  function commitSave() {
    try {
      const d = activeDate
      const entry = { id: d, date: d, mode: settings.quickMode?'quick':'detail', nrs, pbac, zones, symptoms, medication: meds, sleep }
      const others = entries.filter(e=>e.date!==d)
      const sorted = [entry, ...others].sort((a,b)=> (b?.date ?? '').localeCompare(a?.date ?? ''))
      setEntries(sorted)
      setIsEditing(false)
      setBanner({ show:true, text: STR.bannerSaved })
      setStep(totalSteps-1)
    } catch (e) {
      console.error('Save failed', e)
      alert('Konnte nicht speichern. Bitte erneut versuchen.')
    }
  }

  const { periodSet, startSet } = useMemo(()=>flagPeriodDays(entries), [entries])

  const last7 = useMemo(()=>entries.slice(0,7).map(e=>e.nrs ?? 0).reverse(), [entries])
  const last7Mask = useMemo(()=>entries.slice(0,7).map(e=>!!(e?.pbac?.dayScore>0 || e?.pbac?.periodStart)).reverse(), [entries])

  const last30 = useMemo(()=>{
    const arr = []
    for (let i=29;i>=0;i--) {
      const dt = new Date(); dt.setDate(dt.getDate()-i)
      const iso = dt.toISOString().slice(0,10)
      const e = entries.find(x=>x.date===iso)
      arr.push({ date: iso, nrs: e?.nrs ?? 0, period: periodSet.has(iso), periodStart: startSet.has(iso) })
    }
    return arr
  }, [entries, periodSet, startSet])

  const corr = useMemo(()=>{
    // Pearson r zwischen NRS und Schlaf, falls genügend Daten
    const xs = entries.map(e=>typeof e.nrs==='number'?e.nrs:null).filter(v=>v!==null)
    const ys = entries.map(e=>typeof e.sleep==='number'?e.sleep:null).filter(v=>v!==null)
    const n = Math.min(xs.length, ys.length)
    if (n < 14) return { n, r: null }
    const X = xs.slice(0,n), Y = ys.slice(0,n)
    const mx = X.reduce((a,b)=>a+b,0)/n, my = Y.reduce((a,b)=>a+b,0)/n
    const num = X.map((x,i)=>(x-mx)*(Y[i]-my)).reduce((a,b)=>a+b,0)
    const den = Math.sqrt(X.map(x=>Math.pow(x-mx,2)).reduce((a,b)=>a+b,0) * Y.map(y=>Math.pow(y-my,2)).reduce((a,b)=>a+b,0))
    const r = den ? num/den : 0
    return { n, r: Number(r.toFixed(2)) }
  }, [entries])

  const hasEntryToday = entries.some(e=>e.date===activeDate)

  // Date navigation handlers
  const goPrev = () => setActiveDate(addDaysISO(activeDate, -1))
  const goNext = () => setActiveDate(addDaysISO(activeDate, 1))
  const goToday = () => setActiveDate(todayISO())

  // progressive reveal navigation
  const handlePrev = () => setStep(s=>clamp(s-1,0,totalSteps-1))
  const handleNext = () => {
    const ns = clamp(step+1,0,totalSteps-1)
    setStep(ns)
    setTimeout(()=>{
      const ref = sectionRefs[ns]
      if (ref && ref.current) ref.current.scrollIntoView({ behavior:'smooth', block:'start' })
    }, 0)
  }

  return (
    <main className="min-h-screen bg-rose-50 text-gray-900 pb-24">
      <header className="sticky top-0 z-30 bg-rose-50/80 backdrop-blur border-b border-rose-100">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-rose-900">{STR.appTitle}</h1>
          <details className="relative">
            <summary className="list-none cursor-pointer px-3 py-2 rounded-xl border border-rose-200 bg-white">Einstellungen</summary>
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow p-4 text-sm">
              <div className="flex items-center justify-between mb-2">
                <span>Schnellmodus</span>
                <input type="checkbox" checked={settings.quickMode} onChange={e=>setSettings({...settings, quickMode:e.target.checked})} />
              </div>
              <div className="flex items-center justify-between mb-2">
                <span>Verschlüsselung</span>
                <input type="checkbox" checked={settings.encryption} onChange={e=>setSettings({...settings, encryption:e.target.checked})} />
              </div>
              {settings.encryption && (
                <div className="mt-2">
                  <label className="block mb-1">Passphrase</label>
                  <input type="password" className="w-full border rounded-xl px-3 py-2" placeholder="PIN/Passwort" value={pass} onChange={e=>setPass(e.target.value)} />
                  <p className="text-xs text-gray-500 mt-1">{STR.dataLocal}</p>
                </div>
              )}
              <div className="mt-3 flex items-center justify-between">
                <span className="text-red-600">{STR.clearAll}</span>
                <button className="px-3 py-2 rounded-xl border" onClick={()=>{ if (confirm('Wirklich alles löschen?')) { localStorage.clear(); location.reload() } }}>Löschen</button>
              </div>
            </div>
          </details>
        </div>
        {tab==='today' && <Stepper step={step} total={totalSteps} />}
        {tab==='today' && (
          <DateNav
            activeDate={activeDate}
            setActiveDate={setActiveDate}
            hasEntry={hasEntryToday}
            onPrev={goPrev}
            onNext={goNext}
            onToday={goToday}
            isEditing={isEditing}
            onEdit={()=>{ setIsEditing(true); setStep(totalSteps-1); }}
          />
        )}
      </header>

      {/* Top slide banner */}
      <TopSlideBanner show={banner.show} text={banner.text} onClose={()=>setBanner(b=>({...b, show:false}))} />

      {/* Tabs */}
      {tab==='today' && (
        <div className="relative">
          <fieldset disabled={!isEditing}>
          <div className="px-4 pt-3 flex gap-2">
            <button className="px-3 py-2 rounded-xl border bg-white disabled:opacity-50 disabled:pointer-events-none" onClick={fillLikeYesterday} disabled={!yesterday || !isEditing}>{STR.likeYesterday}</button>
            <button className="px-3 py-2 rounded-xl border bg-white disabled:opacity-50 disabled:pointer-events-none" onClick={markSymptomFree} disabled={!isEditing}>{STR.symptomFree}</button>
            <button className="px-3 py-2 rounded-xl border bg-white disabled:opacity-50 disabled:pointer-events-none" onClick={()=>{ if (!isEditing) return; setStep(0); setNrs(3); setPbac({ products: [], clots:'none', flooding:false, dayScore:0, periodStart:false }) }}>{STR.quickOnly}</button>
          </div>
          </fieldset>

          {/* Minimal read overlay when not editing (still readable) */}
          {!isEditing && hasEntryToday && (
            <div className="absolute inset-x-0 top-0 bottom-16 z-10 bg-white/10 backdrop-blur-[1px] pointer-events-none" />
          )}

          {confirmOverwrite && (
            <div className="fixed inset-0 z-40 bg-black/20 flex items-center justify-center">
              <div className="mx-4 max-w-sm w-full rounded-2xl bg-white p-4 shadow">
                <div className="font-medium text-rose-900 mb-2">Eintrag überschreiben?</div>
                <p className="text-sm text-gray-600 mb-4">Für dieses Datum existiert bereits ein Eintrag. Überschreiben?</p>
                <div className="flex gap-2">
                  <button className="px-3 py-2 rounded-xl border flex-1" onClick={()=>setConfirmOverwrite(false)}>Abbrechen</button>
                  <button className="px-3 py-2 rounded-xl bg-rose-600 text-white flex-1" onClick={()=>{ setConfirmOverwrite(false); commitSave(); }}>Überschreiben</button>
                </div>
              </div>
            </div>
          )} 

          {/* Progressive reveal: show sections up to current step */}
          <fieldset disabled={!isEditing}>
          <div ref={sectionRefs[0]}>{step>=0 && <NrsSlider value={nrs} onChange={setNrs} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[1]}>{step>=1 && <PbacMini state={pbac} setState={setPbac} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[2]}>{step>=2 && <BodyMapSimple zones={zones} setZones={setZones} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[3]}>{step>=3 && <SymptomPicker selected={symptoms} setSelected={setSymptoms} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[4]}>{step>=4 && <MedicationQuick meds={meds} setMeds={setMeds} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[5]}>{step>=5 && <SleepScale value={sleep} onChange={setSleep} disabled={!isEditing} />}</div>

          <div className="px-4 pb-4 flex gap-2">
            <button className="px-4 py-3 rounded-2xl border flex-1 disabled:opacity-50 disabled:pointer-events-none" disabled={!isEditing} onClick={handlePrev}>{STR.back}</button>
            {step<totalSteps-1 ? (
              <button className="px-4 py-3 rounded-2xl bg-rose-600 text-white flex-1 disabled:opacity-50 disabled:pointer-events-none" disabled={!isEditing} onClick={handleNext}>{STR.start}</button>
            ) : (
              <button className="px-4 py-3 rounded-2xl bg-rose-600 text-white flex-1 disabled:opacity-50 disabled:pointer-events-none" disabled={!isEditing} onClick={saveToday}>{STR.save}</button>
            )}
          </div>
          </fieldset>

          {nrs>=9 && (
            <div className="px-4 pb-6"><div className="text-sm text-red-600">{STR.highPain}</div></div>
          )}
        </div>
      )}

      {tab==='trends' && (
        <div>
          <Section title="7-Tage Schmerz" hint={`${STR.periodLegend}`}>
            <Sparkline data={last7.length?last7:[0]} mask={last7Mask} />
          </Section>
          <Section title="Kalender (30 Tage)" hint="Farbe = Schmerzintensität; Punkt = Beginn, Balken = Periode">
            <CalendarHeatmap days={last30} />
          </Section>
          <Section title="Zusammenhänge" hint={STR.disclaimerCorr}>
            {corr.r===null ? (
              <p className="text-sm text-gray-600">Zu wenige Daten (n &lt; 14).</p>
            ) : (
              <p className="text-sm">r(NRS, Schlaf) = <b>{corr.r}</b> bei n={corr.n}</p>
            )}
          </Section>
        </div>
      )}

      {tab==='entries' && (
        <div>
          <Section title="Letzte Einträge">
            <ul className="divide-y">
              {entries.slice(0,50).map(e => (
                <li key={e.id} className="py-3 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{e.date}</div>
                    <div className="text-sm text-gray-600">NRS {e.nrs ?? '-'} · PBAC {e.pbac?.dayScore ?? 0} · {e.pbac?.periodStart ? 'Beginn' : ''} · Symptome {(e.symptoms||[]).map(s=>s.label).join(', ')}</div>
                  </div>
                  <button className="text-sm underline" onClick={()=>{
                    if (confirm('Eintrag löschen?')) setEntries(entries.filter(x=>x.id!==e.id))
                  }}>Löschen</button>
                </li>
              ))}
            </ul>
          </Section>
        </div>
      )}

      {tab==='export' && (
        <div>
          <Section title={STR.pdf1}>
            <button className="px-4 py-2 rounded-xl border" onClick={()=>window.print()}>{STR.pdf1}</button>
          </Section>
          <Section title="JSON">
            <button className="px-4 py-2 rounded-xl border" onClick={()=>{
              const blob = new Blob([JSON.stringify(entries,null,2)], { type:'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `endo_export_${todayISO()}.json`; a.click(); URL.revokeObjectURL(url)
            }}>{STR.jsonExport}</button>
          </Section>
          <Section title="Diagnose/Tests (dev)">
            <SelfTests />
          </Section>
        </div>
      )}

      <nav className="fixed bottom-0 inset-x-0 bg-white border-t">
        <div className="grid grid-cols-4">
          <button className={`py-3 ${tab==='today'?'font-semibold text-rose-700':''}`} onClick={()=>setTab('today')}>{STR.today}</button>
          <button className={`py-3 ${tab==='trends'?'font-semibold text-rose-700':''}`} onClick={()=>setTab('trends')}>{STR.trends}</button>
          <button className={`py-3 ${tab==='entries'?'font-semibold text-rose-700':''}`} onClick={()=>setTab('entries')}>{STR.entries}</button>
          <button className={`py-3 ${tab==='export'?'font-semibold text-rose-700':''}`} onClick={()=>setTab('export')}>{STR.export}</button>
        </div>
      </nav>
    </main>
  )
}

// ---------- Self tests (inline, dev-only visual) ----------
function SelfTests(){
  const [result, setResult] = useState('–')
  useEffect(()=>{
    try {
      // clamp tests
      if (clamp(5,0,10)!==5) throw new Error('clamp basic')
      if (clamp(-1,0,10)!==0) throw new Error('clamp lower')
      if (clamp(11,0,10)!==10) throw new Error('clamp upper')
      // addDaysISO test
      if (addDaysISO('2025-10-15', -1) !== '2025-10-14') throw new Error('addDaysISO prev')
      if (addDaysISO('2025-10-13', 1) !== '2025-10-14') throw new Error('addDaysISO next')
      if (!/^\d{4}-\d{2}-\d{2}$/.test(todayISO())) throw new Error('todayISO format')
      // ISO date sort test (desc)
      if ('2025-10-02'.localeCompare('2025-02-11') <= 0) throw new Error('iso sort')
      // safe sort should not throw when date missing
      const safeSorted = [{}, {date:'2025-01-01'}].sort((a,b)=> (b?.date ?? '').localeCompare(a?.date ?? ''))
      if (safeSorted[0]?.date !== '2025-01-01') throw new Error('safe sort')
      // update detection
      const upd = [{date:'2025-01-01'}].some(e=>e.date==='2025-01-01')
      if (!upd) throw new Error('update detect')
      // PBAC score test
      const state = { products:[{kind:'pad',fill:'high'},{kind:'tampon',fill:'mid'},{kind:'cup',fill:'low'}], clots:'small', flooding:true }
      // expected: pad high=5, tampon mid=5, cup low=0, clots small=5, flooding=20 => 35
      const map = { low:0, mid:1, high:2 }
      let s = 0
      state.products.forEach(p=>{ s += PBAC_WEIGHTS[p.kind][map[p.fill]] })
      if (state.clots==='small') s += 5
      if (state.flooding) s += 20
      if (s !== 35) throw new Error('PBAC scoring')
      // period flags test
      const e = [
        { date:'2025-10-01', pbac:{ dayScore:0, periodStart:true } },
        { date:'2025-10-02', pbac:{ dayScore:5 } },
        { date:'2025-10-08', pbac:{ dayScore:0 } },
      ]
      const { periodSet, startSet } = flagPeriodDays(e)
      if (!startSet.has('2025-10-01')) throw new Error('period start not flagged')
      if (!periodSet.has('2025-10-05')) throw new Error('period window not propagated')
      setResult('✅ Alle Tests OK')
    } catch (e) {
      setResult('❌ Tests fehlgeschlagen: ' + (e?.message||'unknown'))
    }
  }, [])
  return <p className="text-sm text-gray-600">{result}</p>
}
