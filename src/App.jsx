import React, { useEffect, useMemo, useRef, useState, useId } from 'react'
import { createPortal } from 'react-dom'

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false }
  }

  static getDerivedStateFromError() {
    return { hasError: true }
  }

  componentDidCatch(err, info) {
    console.error('UI error:', err, info)
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="m-4 rounded-xl border border-rose-200 bg-white p-4 text-sm">
          Uuups, da ist etwas schiefgelaufen. Bitte neu laden.
        </div>
      )
    }
    return this.props.children
  }
}

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
  pbacHint: 'Tippe, wie voll die Produkte waren. PBAC hilft in Arztgesprächen.',
  bodyQ: 'Wo sitzt der Schmerz?',
  bodyHint: 'Tippe 1–3 Bereiche. Alternativ Liste für Screenreader.',
  symptomsQ: 'Welche 1–3 Symptome spürst du heute?',
  symptomsHint: '0 = keins, 10 = sehr stark.',
  medsQ: 'Heute Medikamente eingenommen (z. B. Schmerzmittel/Hormontherapie)?',
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
  periodLegend: 'Markierung zeigt Periodentage / -beginn',
  pbacGuide: 'PBAC nach Higham: Binde/Tampon leicht ≈ 1/5/20 bzw. 1/5/10 Punkte. Klumpen klein ≈ 1 cm (1 Punkt), groß ≈ 2–3 cm (5 Punkte). Flooding = plötzliches Durchsickern, je Episode 5 Punkte. Cups in ml erfassen – gehören nicht zum Score.',
  pbacCupLabel: 'Menstruationstasse',
  pbacCupHint: 'Menstruationstassen zählen nicht zum Higham-Score. Menge in ml erfassen.',
  pbacFloodingEpisodes: 'Flooding-Episoden',
  pbacFloodingHint: 'Je Episode 5 Punkte (Higham); max. 6/Tag. Bei anhaltend starker Blutung ärztlich abklären.',
  pbacClotHint: 'Klumpen klein ≈ 1 cm, groß ≈ 2–3 cm.',
  pbacClotSmall: 'Klumpen klein',
  pbacClotLarge: 'Klumpen groß',
  pbacLegend: 'Legende: Linie Schmerz, Balken PBAC, Punkt Beginn, Schraffur Periode, Linie Spotting.',
  calendarHint: 'Farbe = Schmerzintensität; Punkt = Beginn, Balken = Periode; Linie = Spotting.',
  spottingLabel: 'Spotting',
  moreDetails: 'Weitere Details',
  lessDetails: 'Details ausblenden',
  subNrsTitle: 'Schmerz-Details',
  dyspareuniaLabel: 'Dyspareunie',
  dyspareuniaHint: 'Schmerzen beim Sex (0–10).',
  dysuriaLabel: 'Dysurie (Schmerzen beim Wasserlassen, 0–10)',
  dysuriaHint: 'Schmerzen beim Wasserlassen (0–10).',
  dyscheziaLabel: 'Dyschezie (Schmerzen beim Stuhlgang, 0–10)',
  dyscheziaHint: 'Schmerzen beim Stuhlgang (0–10).',
  timingDuring: 'während',
  timingAfter: 'danach',
  locationSuperficial: 'oberflächlich',
  locationDeep: 'tief',
  avoidanceLabel: 'Vermeidung',
  painInterferenceTitle: 'Pain Interference (PEG-3)',
  pegHint: 'Einmal pro Woche (Montag): Durchschnittsschmerz, Lebensfreude, Aktivität (0–10).',
  pegPain: 'Durchschnittsschmerz',
  pegEnjoyment: 'Lebensfreude',
  pegActivity: 'Aktivität',
  promisTitle: 'Schlaf & Müdigkeit',
  promisSleepHint: 'PROMIS Sleep Disturbance 4a (letzte 7 Tage). 1 = Nie, 5 = Immer.',
  promisFatigueHint: 'PROMIS Fatigue 4a (letzte 7 Tage). 1 = Nie, 5 = Immer.',
  promisFatigueLabel: 'Fatigue-Erfassung',
  promisFatigueToggle: 'Fatigue erfassen',
  promisFatigueHide: 'Fatigue ausblenden',
  weekliesInfo: 'Diese Kurzfragen erscheinen nur am jeweiligen Wochentag.',
  uroTitle: 'Blase & Wasserlassen',
  uroHint: 'Frequenzen als Kategorien, Drang separat.',
  urinationFrequencyLabel: 'Miktionen pro Tag',
  urgencyLabel: 'Starker/plötzlicher Harndrang (Urgency)',
  urgencyHint: 'Plötzlicher Harndrang.',
  urgencyFrequencyLabel: 'Häufigkeit des Harndrangs',
  bowelTitle: 'Darm & Verdauung',
  bowelHint: 'Frequenzen & Bristol-Form dokumentieren.',
  bowelFrequencyLabel: 'Stuhlgang pro Tag',
  bristolLabel: 'Bristol-Skala',
  bristolTooltip: 'Bristol: 1 = sehr hart, 4 = normal, 7 = flüssig.',
  therapyTitle: 'Therapien & Nebenwirkungen',
  therapyHint: 'Strukturiert erfassen, max. drei Nebenwirkungen je Eintrag.',
  therapyAdd: 'Therapie hinzufügen',
  therapyClassLabel: 'Klasse',
  therapyDrugLabel: 'Wirkstoff/Name',
  therapyDoseLabel: 'Dosis',
  therapyRegimenLabel: 'Regime',
  therapyAdherenceLabel: 'Adhärenz (Einnahmetreue) (%)',
  therapyAeLabel: 'Nebenwirkungen',
  therapyAeHint: 'Mehrfachauswahl, max. 3',
  therapyHasAe: 'Nebenwirkungen vorhanden',
  therapyListEmpty: 'Keine Therapien erfasst.',
  therapyDelete: 'Löschen',
  therapyEdit: 'Bearbeiten',
  lagCheckTitle: 'Lag-Check Schlaf↔Schmerz',
  lagCheckHint: 'Explorativ: Schlaf gestern (x) vs. Schmerz heute (y), n ≥ 14 nötig – keine Kausalität.',
  lagCheckTooFew: 'Zu wenige gepaarte Werte (n < 14).',
  cycleCardsTitle: 'Cycle-Cards',
  cycleCardMedian: 'Median NRS',
  cycleCardPeak: 'Peak NRS',
  cycleCardPbac: 'PBAC-Summe',
  cycleCardSymptoms: 'Top-Symptome',
  cycleCardHint: 'Median/Peak nach Zyklus, PBAC-Summe, häufigste Symptome.',
  cycleCardEmpty: 'Noch keine Blutungszyklen erkannt.',
  strongerKdf: 'Stärkere Verschlüsselung (langsamer)',
  encryptionNote: 'Aktiv mit Passphrase (mind. 4 Zeichen). Ohne Passphrase keine Verschlüsselung.',
  passphraseWarning: 'Hinweis: Die Passphrase wird nicht gespeichert und kann nicht wiederhergestellt werden.',
  pbacCupNote: 'Cups werden in ml erfasst und zählen nicht zum Higham-Score.',
  cupMlLabel: 'Tassenmenge (ml)',
  medsYes: 'Ja',
  medsNo: 'Nein',
  medsUnknown: 'Offen lassen',
  tipsTitle: 'Tipps zur Nutzung',
  tipsHint: 'Kurze Hinweise für die Anwendung im Alltag.',
  tipsItems: [
    'Lade regelmäßig den PDF-Kurzbrief herunter, um einen Überblick für Termine zu haben.',
    'Notiere besondere Ereignisse im Notizenfeld deiner Tagesübersicht, damit du sie im Verlauf wiederfindest.',
    'Nutze die Verschlüsselung mit einer PIN, wenn du dein Gerät mit anderen Personen teilst.',
  ],
}

const SYMPTOMS = [
  { id: 'fatigue', label: 'Müdigkeit' },
  { id: 'nausea', label: 'Übelkeit' },
  { id: 'bloat', label: 'Blähbauch' },
  { id: 'back', label: 'Rückenschmerz' },
  { id: 'sex_deep', label: 'Schmerzen beim Sex' },
  { id: 'urination', label: 'Schmerz beim Wasserlassen' },
  { id: 'bowel', label: 'Schmerz beim Stuhlgang' },
  { id: 'urge', label: 'Harndrang (stark/plötzlich)' },
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

const FILL_ALIASES = { low: 'light', mid: 'medium', high: 'heavy', light: 'light', medium: 'medium', heavy: 'heavy' }

const FREQUENCY_OPTIONS = [
  { id: '0', label: '0 (keine Miktion)' },
  { id: '1-3', label: '1–3' },
  { id: '4-6', label: '4–6' },
  { id: '>=7', label: '≥7' },
]

const BRISTOL_OPTIONS = [1, 2, 3, 4, 5, 6, 7]

const THERAPY_CLASSES = ['NSAID', 'Kombinierte Pille', 'Gestagen', 'GnRH-Analog/Antagonist', 'Andere']
const ADHERENCE_OPTIONS = [0, 25, 50, 75, 100]

const PROMIS_SLEEP_ITEMS = [
  'Ich hatte Schwierigkeiten einzuschlafen.',
  'Ich wachte mehrmals in der Nacht auf.',
  'Mein Schlaf war erholsam.',
  'Ich war mit meinem Schlaf zufrieden.',
]

const PROMIS_FATIGUE_ITEMS = [
  'Ich fühlte mich erschöpft.',
  'Ich hatte Probleme, mich zu konzentrieren.',
  'Ich fühlte mich energielos.',
  'Ich fühlte mich müde.',
]

const DEFAULT_SUB_NRS = {
  dyspareunia: {
    nrs: 0,
    timing: { during: false, after: false },
    location: { superficial: false, deep: false },
    avoidance: false,
  },
  dysuria: 0,
  dyschezia: 0,
}

const DEFAULT_PBAC = { products: [], clots: 'none', floodingEpisodes: 0, cupMl: 0, dayScore: 0, periodStart: false }

const DEFAULT_PAIN_INTERFERENCE = date => ({
  date,
  peg3: { pain: 0, enjoyment: 0, activity: 0 },
  rawSum: 0,
})

const DEFAULT_PROMIS = date => ({
  date,
  sleep4a: [0, 0, 0, 0],
  sleep4aRaw: 0,
  fatigue4a: [0, 0, 0, 0],
  fatigue4aRaw: 0,
})

const DEFAULT_URO = { urinationFrequency: '0', urgency: false, urgencyFrequency: '0' }
const DEFAULT_BOWEL = { bowelFrequency: '0', bristol: 0 }

function computePbacDayScore(pbac) {
  if (!pbac) return 0
  const products = Array.isArray(pbac.products) ? pbac.products : []
  const levelIndex = { light: 0, medium: 1, heavy: 2 }
  let total = 0
  products
    .filter(p => p && (p.kind === 'pad' || p.kind === 'tampon'))
    .forEach(p => {
      const kind = p.kind
      const fill = FILL_ALIASES[p.fill] ?? 'light'
      const idx = levelIndex[fill] ?? 0
      const weights = PBAC_WEIGHTS[kind]
      if (weights) total += weights[idx] ?? 0
    })
  const episodes = clamp(Number.isFinite(Number(pbac.floodingEpisodes)) ? Number(pbac.floodingEpisodes) : (pbac.flooding ? 1 : 0), 0, PBAC_RULES.maxFloodingEpisodesPerDay)
  total += episodes * PBAC_RULES.floodingPointsPerEpisode
  const clotKey = ['none', 'small', 'large'].includes(pbac.clots) ? pbac.clots : 'none'
  total += PBAC_RULES.clots[clotKey] ?? 0
  return total
}

function normalizePbac(raw) {
  const base = { ...DEFAULT_PBAC }
  if (!raw) return base
  const products = Array.isArray(raw.products)
    ? raw.products
        .map(p => ({ kind: p.kind, fill: FILL_ALIASES[p.fill] ?? 'light' }))
        .filter(p => p.kind === 'pad' || p.kind === 'tampon')
    : []
  const floodingEpisodes = clamp(
    Number.isFinite(Number(raw.floodingEpisodes)) ? Number(raw.floodingEpisodes) : raw.flooding ? 1 : 0,
    0,
    PBAC_RULES.maxFloodingEpisodesPerDay,
  )
  const cupMl = clamp(Math.round(Number(raw.cupMl) || 0), 0, 120)
  const clots = ['none', 'small', 'large'].includes(raw.clots) ? raw.clots : 'none'
  const periodStart = !!raw.periodStart
  const dayScore = computePbacDayScore({ products, clots, floodingEpisodes })
  return { ...base, products, clots, floodingEpisodes, cupMl, periodStart, dayScore }
}

function normalizeSubNrs(raw) {
  const base = JSON.parse(JSON.stringify(DEFAULT_SUB_NRS))
  if (!raw) return base
  return {
    dyspareunia: {
      nrs: clamp(Number(raw.dyspareunia?.nrs ?? raw.dyspareunia ?? 0), 0, 10),
      timing: {
        during: !!(raw.dyspareunia?.timing?.during),
        after: !!(raw.dyspareunia?.timing?.after),
      },
      location: {
        superficial: !!(raw.dyspareunia?.location?.superficial),
        deep: !!(raw.dyspareunia?.location?.deep),
      },
      avoidance: !!(raw.dyspareunia?.avoidance),
    },
    dysuria: clamp(Number(raw.dysuria ?? 0), 0, 10),
    dyschezia: clamp(Number(raw.dyschezia ?? 0), 0, 10),
  }
}

function normalizePainInterference(raw, date) {
  if (!raw && !date) return null
  const source = raw || {}
  const peg = source.peg3 || {}
  const nextPeg = {
    pain: clamp(Number(peg.pain ?? 0), 0, 10),
    enjoyment: clamp(Number(peg.enjoyment ?? 0), 0, 10),
    activity: clamp(Number(peg.activity ?? 0), 0, 10),
  }
  const rawSum = nextPeg.pain + nextPeg.enjoyment + nextPeg.activity
  const nextDate = source.date || date
  return nextDate ? { date: nextDate, peg3: nextPeg, rawSum } : null
}

function normalizePromis(raw, date) {
  if (!raw && !date) return null
  const src = raw || {}
  const sleep = Array.isArray(src.sleep4a) ? src.sleep4a.slice(0, 4) : [0, 0, 0, 0]
  while (sleep.length < 4) sleep.push(0)
  const fatigue = Array.isArray(src.fatigue4a) ? src.fatigue4a.slice(0, 4) : [0, 0, 0, 0]
  while (fatigue.length < 4) fatigue.push(0)
  const sleep4a = sleep.map(v => clamp(Number(v || 0), 0, 5))
  const fatigue4a = fatigue.map(v => clamp(Number(v || 0), 0, 5))
  const sleep4aRaw = sleep4a.reduce((a, b) => a + b, 0)
  const fatigue4aRaw = fatigue4a.reduce((a, b) => a + b, 0)
  const nextDate = src.date || date
  return nextDate ? { date: nextDate, sleep4a, sleep4aRaw, fatigue4a, fatigue4aRaw } : null
}

function normalizeUro(raw) {
  const base = { ...DEFAULT_URO }
  if (!raw) return base
  return {
    urinationFrequency: FREQUENCY_OPTIONS.some(opt => opt.id === raw.urinationFrequency) ? raw.urinationFrequency : '0',
    urgency: !!raw.urgency,
    urgencyFrequency: FREQUENCY_OPTIONS.some(opt => opt.id === raw.urgencyFrequency) ? raw.urgencyFrequency : '0',
  }
}

function normalizeBowel(raw) {
  const base = { ...DEFAULT_BOWEL }
  if (!raw) return base
  const bristol = clamp(Number(raw.bristol ?? 0), 0, 7)
  return {
    bowelFrequency: FREQUENCY_OPTIONS.some(opt => opt.id === raw.bowelFrequency) ? raw.bowelFrequency : '0',
    bristol,
  }
}

function normalizeTherapy(list, legacyMeds) {
  if (Array.isArray(list) && list.length) {
    return list.map(item => ({
      class: THERAPY_CLASSES.includes(item.class) ? item.class : 'Andere',
      drug: item.drug || '',
      dose: item.dose || '',
      regimen: item.regimen || '',
      adherence: ADHERENCE_OPTIONS.includes(item.adherence) ? item.adherence : 0,
      adverse: {
        hasAe: !!(item.adverse?.hasAe),
        top: Array.isArray(item.adverse?.top) ? item.adverse.top.slice(0, 3) : [],
      },
      id: item.id || `${item.class || 'Therapie'}_${Math.random().toString(36).slice(2, 8)}`,
    }))
  }
  if (Array.isArray(legacyMeds) && legacyMeds.length) {
    return legacyMeds.map(m => ({
      class: 'Andere',
      drug: m.name || '',
      dose: m.dose || '',
      regimen: 'bei Bedarf',
      adherence: 0,
      adverse: { hasAe: false, top: [] },
      id: `${m.name || 'med'}_${Math.random().toString(36).slice(2, 8)}`,
    }))
  }
  return []
}

function deriveTookMeds(source) {
  if (!source) return null
  if (typeof source.tookMeds === 'boolean') return source.tookMeds
  if (Array.isArray(source.medication) && source.medication.length > 0) return true
  return null
}

function todayISO() {
  const d = new Date()
  return d.toISOString().slice(0, 10)
}

function addDaysISO(iso, delta) {
  const d = new Date(iso)
  d.setDate(d.getDate() + delta)
  return d.toISOString().slice(0, 10)
}

function isoWeekday(iso) {
  return new Date(iso).getDay()
}

function clamp(n, a, b) { return Math.max(a, Math.min(b, n)) }

function median(values) {
  if (!values.length) return 0
  const sorted = [...values].sort((a,b)=>a-b)
  const mid = Math.floor(sorted.length/2)
  if (sorted.length % 2 === 0) return (sorted[mid-1] + sorted[mid]) / 2
  return sorted[mid]
}

function useLocalState(key, initial) {
  const [v, setV] = useState(() => {
    try { const s = localStorage.getItem(key); return s ? JSON.parse(s) : initial } catch { return initial }
  })
  useEffect(() => { try { localStorage.setItem(key, JSON.stringify(v)) } catch {} }, [key, v])
  return [v, setV]
}

// Minimal AES-GCM (optional). Falls WebCrypto fehlt, speichere Klartext.
async function deriveKey(pass, salt, iterations = 120000) {
  const enc = new TextEncoder()
  const keyMat = await crypto.subtle.importKey('raw', enc.encode(pass), 'PBKDF2', false, ['deriveKey'])
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMat,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}
async function encryptBlob(obj, pass, iterations = 120000) {
  if (!window.crypto || !pass) return { mode: 'plain', data: JSON.stringify(obj) }
  const enc = new TextEncoder()
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const salt = crypto.getRandomValues(new Uint8Array(16))
  const key = await deriveKey(pass, salt, iterations)
  const cipher = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, enc.encode(JSON.stringify(obj)))
  return { mode: 'gcm', iv: Array.from(iv), salt: Array.from(salt), iter: iterations, data: btoa(String.fromCharCode(...new Uint8Array(cipher))) }
}
async function decryptBlob(bundle, pass) {
  try {
    if (!bundle || bundle.mode !== 'gcm') return bundle?.data ? JSON.parse(bundle.data) : []
    const dec = new TextDecoder()
    const iv = new Uint8Array(bundle.iv)
    const salt = new Uint8Array(bundle.salt)
    const iterations = bundle.iter || 120000
    const key = await deriveKey(pass, salt, iterations)
    const bytes = Uint8Array.from(atob(bundle.data), c => c.charCodeAt(0))
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, bytes)
    return JSON.parse(dec.decode(plain))
  } catch { return [] }
}

async function persistEntries(entries, settings, pass) {
  const { encryption, kdfStrong } = settings || {}
  if (encryption) {
    if (!pass || pass.length < 4) return 'skip'
    const iterations = kdfStrong ? 310000 : 120000
    const bundle = await encryptBlob(entries, pass, iterations)
    localStorage.setItem(ENC_KEY, JSON.stringify(bundle))
    localStorage.removeItem(STORAGE_KEY)
    return 'encrypted'
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries))
  localStorage.removeItem(ENC_KEY)
  return 'plain'
}

// ---------- Period helpers ----------
function isoDiffDays(a, b) {
  const da = new Date(a)
  const db = new Date(b)
  return Math.round((da - db) / 86400000)
}

function detectCycles(entries, rules = PBAC_RULES) {
  const sorted = entries
    .filter(e => e?.date)
    .slice()
    .sort((a, b) => (a.date || '').localeCompare(b.date || ''))
  const cycles = []
  let current = null
  let zeroStreak = rules.minZerosBeforeNewBleed
  let prevDate = null
  let positiveRun = false
  let runZerosBefore = zeroStreak

  const finalize = () => {
    if (current) {
      cycles.push(current)
      current = null
    }
  }

  sorted.forEach(entry => {
    const date = entry.date
    const pbacRaw = Number(entry?.pbac?.dayScore ?? 0)
    const pbac = Number.isFinite(pbacRaw) ? Math.max(0, pbacRaw) : 0
    const spotting = pbac > 0 && pbac <= rules.spottingMax
    const bleeding = pbac >= rules.bleedingMin

    if (prevDate) {
      const gap = isoDiffDays(date, prevDate)
      if (gap > 1) {
        zeroStreak += gap - 1
        positiveRun = false
        runZerosBefore = zeroStreak
        finalize()
      }
    }

    if (pbac === 0) {
      zeroStreak += 1
      positiveRun = false
      runZerosBefore = zeroStreak
      finalize()
    } else {
      if (!positiveRun) {
        positiveRun = true
        runZerosBefore = zeroStreak
      }
      zeroStreak = 0

      if (bleeding) {
        if (!current) {
          if (runZerosBefore >= rules.minZerosBeforeNewBleed || cycles.length === 0) {
            current = { start: date, end: date, days: [], pbacSum: 0 }
          } else {
            const last = cycles.pop()
            if (last) {
              current = { ...last, days: last.days.slice() }
            }
            if (!current) current = { start: date, end: date, days: [], pbacSum: 0 }
          }
        }
        current.days.push({ date, pbac, spotting: false })
        current.pbacSum += pbac
        current.end = date
      } else if (spotting && current) {
        current.days.push({ date, pbac, spotting: true })
        current.end = date
      }
    }

    prevDate = date
  })

  finalize()
  return cycles
}

function buildPeriodFlags(entries, rules = PBAC_RULES) {
  const cycles = detectCycles(entries, rules)
  const periodSet = new Set()
  const startSet = new Set()
  const spottingSet = new Set()

  entries.forEach(e => {
    const pbac = Number(e?.pbac?.dayScore ?? 0)
    if (pbac > 0 && pbac <= rules.spottingMax) spottingSet.add(e.date)
  })

  cycles.forEach(cycle => {
    const firstBleed = cycle.days.find(d => !d.spotting)
    if (firstBleed) startSet.add(firstBleed.date)
    cycle.days.forEach(day => {
      if (day.spotting) spottingSet.add(day.date)
      else periodSet.add(day.date)
    })
  })

  return { periodSet, startSet, spottingSet, cycles }
}

// ---------- UI Bits ----------
function Section({ title, hint, children, right }) {
  return (
    <section className="p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-rose-900">{title}</h2>
          {hint && <Tooltip text={hint} />}
        </div>
        {right}
      </div>
      {hint && <p className="sr-only">{hint}</p>}
      <div className="rounded-2xl bg-white p-3 shadow">{children}</div>
    </section>
  )
}

function Tooltip({ text }) {
  const [open, setOpen] = useState(false)
  const [isManual, setIsManual] = useState(false)
  const [coords, setCoords] = useState({ top: 0, left: 0 })
  const triggerRef = useRef(null)
  const tooltipRef = useRef(null)
  const tooltipId = useId()

  useEffect(() => {
    if (!open) return
    const updatePosition = () => {
      if (!triggerRef.current || !tooltipRef.current) return
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()
      let top = triggerRect.top - tooltipRect.height - 8
      let placement = 'top'
      if (top < 8) {
        top = triggerRect.bottom + 8
        placement = 'bottom'
      }
      let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2
      const maxLeft = window.innerWidth - tooltipRect.width - 8
      left = Math.min(Math.max(left, 8), maxLeft)
      const maxTop = window.innerHeight - tooltipRect.height - 8
      top = Math.min(Math.max(top, 8), maxTop)
      if (tooltipRef.current) {
        tooltipRef.current.dataset.placement = placement
      }
      setCoords({ top, left })
    }
    updatePosition()
    window.addEventListener('scroll', updatePosition, true)
    window.addEventListener('resize', updatePosition)
    return () => {
      window.removeEventListener('scroll', updatePosition, true)
      window.removeEventListener('resize', updatePosition)
    }
  }, [open, text])

  useEffect(() => {
    if (!open) return
    const handleKey = event => {
      if (event.key === 'Escape') {
        setOpen(false)
        setIsManual(false)
      }
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [open])

  useEffect(() => {
    if (!open) {
      setIsManual(false)
    }
  }, [open])

  return (
    <span className="relative inline-flex align-middle">
      <button
        type="button"
        ref={triggerRef}
        className="flex h-5 w-5 items-center justify-center rounded-full border border-rose-200 bg-white text-xs font-semibold text-rose-600 shadow-sm transition-colors hover:bg-rose-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-400"
        aria-label="Info"
        aria-describedby={open ? tooltipId : undefined}
        aria-expanded={open}
        onClick={() => {
          setOpen(prev => {
            const next = !prev
            setIsManual(next)
            return next
          })
        }}
        onMouseEnter={() => !isManual && setOpen(true)}
        onMouseLeave={() => {
          if (!isManual) setOpen(false)
        }}
        onFocus={() => !isManual && setOpen(true)}
        onBlur={() => {
          if (!isManual) setOpen(false)
        }}
      >
        i
      </button>
      {open &&
        createPortal(
          <div
            ref={tooltipRef}
            id={tooltipId}
            role="tooltip"
            className="pointer-events-none fixed z-50 max-w-xs break-words rounded-xl bg-rose-600 px-3 py-2 text-sm leading-snug text-white shadow-xl whitespace-pre-wrap"
            style={{ top: `${coords.top}px`, left: `${coords.left}px` }}
          >
            {text}
          </div>,
          document.body
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
      <div className="mx-auto max-w-md mt-2 px-4 py-2 rounded-xl bg-rose-600 text-white shadow text-center" aria-live="polite">
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
    <Section title={STR.nrsQ} hint={STR.nrsHint}>
      <div className="flex items-center gap-2">
        <span className="text-2xl font-bold w-10 text-center" aria-live="polite">{value}</span>
        <Range value={value} onChange={onChange} aria={STR.nrsQ} disabled={disabled} />
      </div>
    </Section>
  )
}

const PBAC_WEIGHTS = {
  pad: [1, 5, 20],
  tampon: [1, 5, 10],
}

const PBAC_RULES = {
  spottingMax: 4,
  bleedingMin: 5,
  minZerosBeforeNewBleed: 2,
  clots: { none: 0, small: 1, large: 5 },
  floodingPointsPerEpisode: 5,
  maxFloodingEpisodesPerDay: 6,
}

function PbacMini({ state, setState, disabled = false }) {
  const { products = [], clots = 'none', floodingEpisodes = 0, cupMl = 0 } = state
  const safeEpisodes = clamp(Number.isFinite(Number(floodingEpisodes)) ? Number(floodingEpisodes) : 0, 0, PBAC_RULES.maxFloodingEpisodesPerDay)
  const score = useMemo(() => computePbacDayScore({ products, clots, floodingEpisodes: safeEpisodes }), [products, clots, safeEpisodes])

  useEffect(() => {
    setState(prev => {
      const changedScore = prev.dayScore !== score
      const changedEpisodes = prev.floodingEpisodes !== safeEpisodes
      if (!changedScore && !changedEpisodes) return prev
      return { ...prev, dayScore: score, floodingEpisodes: safeEpisodes }
    })
  }, [score, safeEpisodes, setState])

  const updateProduct = (kind, fill) => {
    const list = products.filter(p => p.kind !== kind)
    setState({ ...state, products: [...list, { kind, fill }] })
  }

  const updateCup = value => {
    const v = clamp(Math.round(Number(value) || 0), 0, 120)
    setState({ ...state, cupMl: v })
  }

  const adjustEpisodes = delta => {
    if (disabled) return
    const next = clamp(safeEpisodes + delta, 0, PBAC_RULES.maxFloodingEpisodesPerDay)
    setState({ ...state, floodingEpisodes: next })
  }

  const ProdRow = ({ kind, label }) => {
    const current = products.find(p => p.kind === kind)?.fill || 'light'
    const options = [
      { id: 'light', label: 'leicht' },
      { id: 'medium', label: 'mittel' },
      { id: 'heavy', label: 'stark' },
    ]
    return (
      <div className="mb-2">
        <div className="text-sm mb-1">{label}</div>
        <div className="flex flex-wrap gap-2">
          {options.map(opt => (
            <Chip
              key={opt.id}
              active={current === opt.id}
              onClick={() => !disabled && updateProduct(kind, opt.id)}
              disabled={disabled}
            >
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>
    )
  }

  return (
    <Section title={STR.pbacTitle} hint={STR.pbacHint} right={<Tooltip text={`${STR.pbacGuide} ${STR.pbacCupNote}`} />}>
      <div className="mb-2">
        <Chip active={!!state.periodStart} onClick={() => setState({ ...state, periodStart: !state.periodStart })} disabled={disabled}>
          {STR.periodStart}
        </Chip>
      </div>
      <ProdRow kind="pad" label="Binde" />
      <ProdRow kind="tampon" label="Tampon" />
      <div className="mb-2">
        <div className="text-sm flex items-center justify-between gap-2">
          <span>{STR.pbacCupLabel}</span>
          <Tooltip text={STR.pbacCupHint} />
        </div>
        <div className="mt-2 flex items-center gap-2">
          <input
            type="number"
            min={0}
            max={120}
            step={1}
            aria-label={STR.cupMlLabel}
            className="w-28 border rounded-xl px-3 py-2"
            value={cupMl ?? 0}
            onChange={e => updateCup(e.target.value)}
            disabled={disabled}
          />
        </div>
      </div>
      <div className="mt-2">
        <div className="flex items-center justify-between text-sm">
          <span>{STR.pbacFloodingEpisodes}</span>
          <Tooltip text={STR.pbacFloodingHint} />
        </div>
        <div className="mt-2 flex items-center gap-3">
          <button
            type="button"
            aria-label="Flooding verringern"
            className="w-8 h-8 rounded-full border bg-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-rose-400"
            onClick={() => adjustEpisodes(-1)}
            disabled={disabled || safeEpisodes <= 0}
          >
            −
          </button>
          <span className="min-w-[2rem] text-center font-semibold" aria-live="polite">
            {safeEpisodes}
          </span>
          <button
            type="button"
            aria-label="Flooding erhöhen"
            className="w-8 h-8 rounded-full border bg-white disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-rose-400"
            onClick={() => adjustEpisodes(1)}
            disabled={disabled || safeEpisodes >= PBAC_RULES.maxFloodingEpisodesPerDay}
          >
            +
          </button>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Chip
          active={clots === 'small'}
          onClick={() => setState({ ...state, clots: clots === 'small' ? 'none' : 'small' })}
          disabled={disabled}
        >
          {STR.pbacClotSmall}
        </Chip>
        <Chip
          active={clots === 'large'}
          onClick={() => setState({ ...state, clots: clots === 'large' ? 'none' : 'large' })}
          disabled={disabled}
        >
          {STR.pbacClotLarge}
        </Chip>
        <Tooltip text={STR.pbacClotHint} />
      </div>
      <div className="mt-3 text-sm">
        Tages-PBAC (Higham): <span className="font-semibold">{score}</span>
      </div>
    </Section>
  )
}

function BodyMapSimple({ zones, setZones, disabled=false }) {
  const toggle = (id) => { if (disabled) return; setZones(zones.includes(id) ? zones.filter(z=>z!==id) : [...zones, id]) }
  return (
    <Section title={STR.bodyQ} hint={STR.bodyHint}>
      <div className="grid grid-cols-2 gap-2">
        {ZONES.map(z => (
          <button key={z.id} onClick={()=>toggle(z.id)} disabled={disabled} className={`p-3 rounded-2xl border text-sm ${zones.includes(z.id) ? 'bg-rose-600 text-white border-rose-600' : ''} disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-rose-400`}>{z.label}</button>
        ))}
      </div>
      <ul className="sr-only">
        {ZONES.map(z => (
          <li key={z.id}>
            <label>
              <input
                type="checkbox"
                checked={zones.includes(z.id)}
                onChange={() => toggle(z.id)}
                disabled={disabled}
              />
              {' '}{z.label}
            </label>
          </li>
        ))}
      </ul>
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
    <Section title={STR.symptomsQ} hint={STR.symptomsHint}>
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

function SleepScale({ value, onChange, disabled=false }) {
  return (
    <Section title={STR.sleepQ} hint={STR.sleepHint}>
      <Range value={value} onChange={onChange} aria={STR.sleepQ} labels={["0 sehr schlecht","3 schlecht","5 mittel","7 gut","10 sehr gut"]} disabled={disabled} />
    </Section>
  )
}

function PainDetails({ value, onChange, disabled = false }) {
  const [open, setOpen] = useState(false)
  if (!value) return null
  const dysp = value.dyspareunia
  const toggleTiming = key => {
    if (disabled) return
    onChange({ ...value, dyspareunia: { ...dysp, timing: { ...dysp.timing, [key]: !dysp.timing[key] } } })
  }
  const toggleLocation = key => {
    if (disabled) return
    onChange({ ...value, dyspareunia: { ...dysp, location: { ...dysp.location, [key]: !dysp.location[key] } } })
  }
  const toggleAvoidance = () => {
    if (disabled) return
    onChange({ ...value, dyspareunia: { ...dysp, avoidance: !dysp.avoidance } })
  }
  const updateDyspNrs = v => {
    if (disabled) return
    onChange({ ...value, dyspareunia: { ...dysp, nrs: v } })
  }
  const updateField = (field, v) => {
    if (disabled) return
    onChange({ ...value, [field]: v })
  }
  return (
    <section className="p-4">
      <div className="flex items-center justify-between mb-2">
        <h2 className="text-lg font-semibold text-rose-900">{STR.subNrsTitle}</h2>
        <button
          type="button"
          className="text-sm text-rose-700 underline"
          onClick={() => setOpen(o => !o)}
        >
          {open ? STR.lessDetails : STR.moreDetails}
        </button>
      </div>
      {open && (
        <div className="bg-white rounded-2xl shadow p-3">
          <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium">
              {STR.dyspareuniaLabel}: <b>{dysp.nrs}</b>
            </span>
            <Tooltip text={STR.dyspareuniaHint} />
          </div>
            <Range value={dysp.nrs} onChange={updateDyspNrs} aria={STR.dyspareuniaLabel} disabled={disabled} />
            <div className="mt-2 text-xs text-rose-700">Zeitpunkt</div>
            <div className="flex flex-wrap gap-2 mt-1">
              <Chip active={dysp.timing.during} onClick={() => toggleTiming('during')} disabled={disabled}>{STR.timingDuring}</Chip>
              <Chip active={dysp.timing.after} onClick={() => toggleTiming('after')} disabled={disabled}>{STR.timingAfter}</Chip>
            </div>
            <div className="mt-3 text-xs text-rose-700">Lokalisation</div>
            <div className="flex flex-wrap gap-2 mt-1">
              <Chip active={dysp.location.superficial} onClick={() => toggleLocation('superficial')} disabled={disabled}>{STR.locationSuperficial}</Chip>
              <Chip active={dysp.location.deep} onClick={() => toggleLocation('deep')} disabled={disabled}>{STR.locationDeep}</Chip>
            </div>
            <div className="mt-3">
              <Chip active={dysp.avoidance} onClick={toggleAvoidance} disabled={disabled}>{STR.avoidanceLabel}</Chip>
            </div>
          </div>
          <div className="mb-4">
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium">
              {STR.dysuriaLabel}: <b>{value.dysuria}</b>
            </span>
            <Tooltip text={STR.dysuriaHint} />
          </div>
            <Range value={value.dysuria} onChange={v => updateField('dysuria', v)} aria={STR.dysuriaLabel} disabled={disabled} />
          </div>
          <div>
          <div className="mb-2 flex items-center gap-2">
            <span className="text-sm font-medium">
              {STR.dyscheziaLabel}: <b>{value.dyschezia}</b>
            </span>
            <Tooltip text={STR.dyscheziaHint} />
          </div>
            <Range value={value.dyschezia} onChange={v => updateField('dyschezia', v)} aria={STR.dyscheziaLabel} disabled={disabled} />
          </div>
        </div>
      )}
    </section>
  )
}

function PainInterferenceMini({ value, onChange, disabled = false, date, titleOverride }) {
  if (!value || !date) return null
  const peg = value.peg3
  const update = (field, val) => {
    if (disabled) return
    const nextPeg = { ...peg, [field]: val }
    const rawSum = nextPeg.pain + nextPeg.enjoyment + nextPeg.activity
    onChange({ date, peg3: nextPeg, rawSum })
  }
  return (
    <Section title={titleOverride || STR.painInterferenceTitle} hint={`${STR.pegHint} ${STR.weekliesInfo}`}>
      <div className="space-y-4">
        <div>
          <div className="text-sm font-medium mb-1">{STR.pegPain}: <b>{peg.pain}</b></div>
          <Range value={peg.pain} onChange={v => update('pain', v)} aria={STR.pegPain} disabled={disabled} />
        </div>
        <div>
          <div className="text-sm font-medium mb-1">{STR.pegEnjoyment}: <b>{peg.enjoyment}</b></div>
          <Range value={peg.enjoyment} onChange={v => update('enjoyment', v)} aria={STR.pegEnjoyment} disabled={disabled} />
        </div>
        <div>
          <div className="text-sm font-medium mb-1">{STR.pegActivity}: <b>{peg.activity}</b></div>
          <Range value={peg.activity} onChange={v => update('activity', v)} aria={STR.pegActivity} disabled={disabled} />
        </div>
        <div className="text-sm">Summe (PEG-3): <span className="font-semibold">{value.rawSum}</span></div>
        <p className="text-xs text-gray-500 mt-1">Heute ist Montag: PEG-3 Kurzfragen.</p>
      </div>
    </Section>
  )
}

function PromisWeeklyMini({ value, onChange, disabled = false, date, titleOverride }) {
  const [showFatigue, setShowFatigue] = useState(() => !!(value && value.fatigue4aRaw > 0))
  useEffect(() => {
    if (value?.fatigue4aRaw > 0) setShowFatigue(true)
  }, [value?.fatigue4aRaw])
  if (!value || !date) return null

  const handleToggleFatigue = () => {
    if (disabled) return
    if (showFatigue) {
      setShowFatigue(false)
      onChange({ date, sleep4a: value.sleep4a, sleep4aRaw: value.sleep4aRaw, fatigue4a: [0, 0, 0, 0], fatigue4aRaw: 0 })
    } else {
      setShowFatigue(true)
    }
  }

  const updateArray = (type, index, val) => {
    if (disabled) return
    const arr = type === 'sleep' ? value.sleep4a.slice() : value.fatigue4a.slice()
    arr[index] = val
    const raw = arr.reduce((a, b) => a + b, 0)
    if (type === 'sleep') {
      onChange({ date, sleep4a: arr, sleep4aRaw: raw, fatigue4a: value.fatigue4a, fatigue4aRaw: value.fatigue4aRaw })
    } else {
      onChange({ date, sleep4a: value.sleep4a, sleep4aRaw: value.sleep4aRaw, fatigue4a: arr, fatigue4aRaw: raw })
    }
  }

  const LikertRow = ({ items, values, type }) => (
    <div className="space-y-3">
      {items.map((text, idx) => (
        <div key={idx}>
          <div className="text-sm mb-1">{text}</div>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(n => (
              <button
                key={n}
                type="button"
                className={`w-10 h-10 rounded-full border ${values[idx] === n ? 'bg-rose-600 text-white border-rose-600' : 'bg-white'} disabled:opacity-50`}
                onClick={() => updateArray(type, idx, n)}
                disabled={disabled}
                aria-label={`${text} ${n}`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>
      ))}
    </div>
  )

  return (
    <Section title={titleOverride || STR.promisTitle} hint={`${STR.promisSleepHint} ${STR.weekliesInfo}`}>
      <div className="space-y-4">
        <LikertRow items={PROMIS_SLEEP_ITEMS} values={value.sleep4a} type="sleep" />
        <div className="text-sm">Summe Schlaf: <span className="font-semibold">{value.sleep4aRaw}</span></div>
        <p className="text-xs text-gray-500 mt-1">Heute ist Sonntag: PROMIS-Kurzfragen.</p>
        <div className="pt-2 border-t border-rose-100">
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-2 text-sm font-medium text-rose-700">
              <span>{STR.promisFatigueLabel}</span>
              <Tooltip text={STR.promisFatigueHint} />
            </div>
            <button type="button" className="text-sm text-rose-700 underline" onClick={handleToggleFatigue}>
              {showFatigue ? STR.promisFatigueHide : STR.promisFatigueToggle}
            </button>
          </div>
          {showFatigue && (
            <div className="space-y-4">
              <LikertRow items={PROMIS_FATIGUE_ITEMS} values={value.fatigue4a} type="fatigue" />
              <div className="text-sm">Summe Fatigue: <span className="font-semibold">{value.fatigue4aRaw}</span></div>
              <p className="text-xs text-gray-500 mt-1">Skala 1–5: 1=Nie · 2=Selten · 3=Manchmal · 4=Oft · 5=Immer</p>
            </div>
          )}
        </div>
      </div>
    </Section>
  )
}

function UroInputs({ value, onChange, disabled = false }) {
  if (!value) return null
  const setField = (field, val) => {
    if (disabled) return
    onChange({ ...value, [field]: val })
  }
  return (
    <Section title={STR.uroTitle} hint={STR.uroHint}>
      <div className="mb-4">
        <div className="text-sm mb-1">{STR.urinationFrequencyLabel}</div>
        <div className="flex flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map(opt => (
            <Chip key={opt.id} active={value.urinationFrequency === opt.id} onClick={() => setField('urinationFrequency', opt.id)} disabled={disabled}>
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm mb-1">
          <span>{STR.urgencyLabel}</span>
          <Tooltip text={STR.urgencyHint} />
        </div>
        <div className="flex gap-2">
          <Chip active={!value.urgency} onClick={() => setField('urgency', false)} disabled={disabled}>Nein</Chip>
          <Chip active={value.urgency} onClick={() => setField('urgency', true)} disabled={disabled}>Ja</Chip>
        </div>
      </div>
      <div>
        <div className="text-sm mb-1">{STR.urgencyFrequencyLabel}</div>
        <div className="flex flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map(opt => (
            <Chip key={opt.id} active={value.urgencyFrequency === opt.id} onClick={() => setField('urgencyFrequency', opt.id)} disabled={disabled || !value.urgency}>
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>
    </Section>
  )
}

function BowelInputs({ value, onChange, disabled = false }) {
  if (!value) return null
  const setField = (field, val) => {
    if (disabled) return
    onChange({ ...value, [field]: val })
  }
  return (
    <Section title={STR.bowelTitle} hint={STR.bowelHint}>
      <div className="mb-4">
        <div className="text-sm mb-1">{STR.bowelFrequencyLabel}</div>
        <div className="flex flex-wrap gap-2">
          {FREQUENCY_OPTIONS.map(opt => (
            <Chip key={opt.id} active={value.bowelFrequency === opt.id} onClick={() => setField('bowelFrequency', opt.id)} disabled={disabled}>
              {opt.label}
            </Chip>
          ))}
        </div>
      </div>
      <div>
        <div className="text-sm mb-1 flex items-center gap-2">
          <span>{STR.bristolLabel}</span>
          <Tooltip text={STR.bristolTooltip} />
        </div>
        <div className="flex flex-wrap gap-2">
          {BRISTOL_OPTIONS.map(num => (
            <button
              key={num}
              type="button"
              className={`w-10 h-10 rounded-full border ${value.bristol === num ? 'bg-rose-600 text-white border-rose-600' : 'bg-white'} disabled:opacity-50`}
              onClick={() => setField('bristol', num)}
              disabled={disabled}
            >
              {num}
            </button>
          ))}
        </div>
      </div>
    </Section>
  )
}

function TherapyManager({ list, onChange, disabled = false, tookMeds = null, onTookMedsChange = () => {} }) {
  const [draft, setDraft] = useState({
    id: null,
    class: THERAPY_CLASSES[0],
    drug: '',
    dose: '',
    regimen: '',
    adherence: 100,
    adverse: { hasAe: false, top: [] },
  })
  const [tagInput, setTagInput] = useState('')

  const handleTookMeds = value => {
    if (disabled) return
    const next = tookMeds === value ? null : value
    onTookMedsChange(next)
  }

  const handleClearMeds = () => {
    if (disabled) return
    onTookMedsChange(null)
  }

  const resetDraft = () => {
    setDraft({ id: null, class: THERAPY_CLASSES[0], drug: '', dose: '', regimen: '', adherence: 100, adverse: { hasAe: false, top: [] } })
    setTagInput('')
  }

  const commit = () => {
    if (disabled) return
    const drug = draft.drug.trim()
    if (!drug) return
    const item = {
      ...draft,
      id: draft.id || `therapy_${Date.now()}`,
      drug,
      dose: draft.dose.trim(),
      regimen: draft.regimen.trim(),
      adverse: {
        hasAe: draft.adverse.hasAe,
        top: draft.adverse.top.slice(0, 3),
      },
    }
    const updated = [...list.filter(t => t.id !== item.id), item]
    onChange(updated)
    resetDraft()
  }

  const remove = id => {
    if (disabled) return
    onChange(list.filter(t => t.id !== id))
  }

  const edit = item => {
    if (disabled) return
    setDraft({ ...item })
    setTagInput('')
  }

  const toggleAe = () => {
    if (disabled) return
    setDraft(d => ({ ...d, adverse: { ...d.adverse, hasAe: !d.adverse.hasAe, top: !d.adverse.hasAe ? d.adverse.top : [] } }))
  }

  const addTag = tag => {
    const t = tag.trim()
    if (!t) return
    setDraft(d => {
      if (d.adverse.top.includes(t) || d.adverse.top.length >= 3) return d
      return { ...d, adverse: { ...d.adverse, top: [...d.adverse.top, t] } }
    })
  }

  const removeTag = tag => {
    setDraft(d => ({ ...d, adverse: { ...d.adverse, top: d.adverse.top.filter(x => x !== tag) } }))
  }

  return (
    <Section title={STR.therapyTitle} hint={STR.therapyHint}>
      <div className="space-y-4">
        <div className="rounded-2xl border border-rose-100 bg-rose-50 p-3">
          <div className="text-sm font-medium text-rose-900">{STR.medsQ}</div>
          <div className="mt-2 flex flex-wrap gap-2">
            <Chip active={tookMeds === true} onClick={() => handleTookMeds(true)} disabled={disabled}>{STR.medsYes}</Chip>
            <Chip active={tookMeds === false} onClick={() => handleTookMeds(false)} disabled={disabled}>{STR.medsNo}</Chip>
            <Chip active={tookMeds === null} onClick={handleClearMeds} disabled={disabled}>{STR.medsUnknown}</Chip>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3">
          <label className="text-sm">
            <span className="block mb-1">{STR.therapyClassLabel}</span>
            <select className="w-full border rounded-xl px-3 py-2" value={draft.class} onChange={e => setDraft(d => ({ ...d, class: e.target.value }))} disabled={disabled}>
              {THERAPY_CLASSES.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </label>
          <label className="text-sm">
            <span className="block mb-1">{STR.therapyDrugLabel}</span>
            <input className="w-full border rounded-xl px-3 py-2" value={draft.drug} onChange={e => setDraft(d => ({ ...d, drug: e.target.value }))} disabled={disabled} />
          </label>
          <label className="text-sm">
            <span className="block mb-1">{STR.therapyDoseLabel}</span>
            <input className="w-full border rounded-xl px-3 py-2" value={draft.dose} onChange={e => setDraft(d => ({ ...d, dose: e.target.value }))} disabled={disabled} />
          </label>
          <label className="text-sm">
            <span className="block mb-1">{STR.therapyRegimenLabel}</span>
            <input className="w-full border rounded-xl px-3 py-2" value={draft.regimen} onChange={e => setDraft(d => ({ ...d, regimen: e.target.value }))} disabled={disabled} />
          </label>
          <label className="text-sm">
            <span className="block mb-1">{STR.therapyAdherenceLabel}</span>
            <select className="w-full border rounded-xl px-3 py-2" value={draft.adherence} onChange={e => setDraft(d => ({ ...d, adherence: Number(e.target.value) }))} disabled={disabled}>
              {ADHERENCE_OPTIONS.map(opt => <option key={opt} value={opt}>{opt}%</option>)}
            </select>
          </label>
        </div>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Chip active={draft.adverse.hasAe} onClick={toggleAe} disabled={disabled}>{STR.therapyHasAe}</Chip>
            <Tooltip text={STR.therapyAeHint} />
          </div>
          {draft.adverse.hasAe && (
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {draft.adverse.top.map(tag => (
                  <span key={tag} className="px-3 py-1 rounded-full bg-rose-100 text-sm flex items-center gap-2">
                    {tag}
                    <button type="button" className="text-xs rounded-full focus-visible:ring-2 focus-visible:ring-rose-400" onClick={() => removeTag(tag)} disabled={disabled}>×</button>
                  </span>
                ))}
              </div>
              {draft.adverse.top.length < 3 && (
                <input
                  className="w-full border rounded-xl px-3 py-2 text-sm"
                  placeholder="Tag eingeben und Enter drücken"
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addTag(tagInput)
                      setTagInput('')
                    }
                  }}
                  disabled={disabled}
                />
              )}
            </div>
          )}
        </div>
        <div className="flex gap-2">
          <button type="button" className="px-4 py-2 rounded-xl bg-rose-600 text-white disabled:opacity-50" onClick={commit} disabled={disabled}>{STR.therapyAdd}</button>
          <button type="button" className="px-4 py-2 rounded-xl border" onClick={resetDraft} disabled={disabled}>Zurücksetzen</button>
        </div>
        <div className="border-t pt-3">
          {list.length === 0 ? (
            <p className="text-sm text-gray-600">{STR.therapyListEmpty}</p>
          ) : (
            <ul className="space-y-3">
              {list.map(item => (
                <li key={item.id} className="border rounded-xl p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div>
                      <div className="font-medium text-sm">{item.class} · {item.drug}</div>
                      <div className="text-xs text-gray-600">{[item.dose, item.regimen].filter(Boolean).join(' · ')}</div>
                      <div className="text-xs text-gray-600">Adhärenz: {item.adherence}%</div>
                      {item.adverse.hasAe && item.adverse.top.length > 0 && (
                        <div className="text-xs text-rose-700 mt-1">AE: {item.adverse.top.join(', ')}</div>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <button type="button" className="text-xs underline" onClick={() => edit(item)} disabled={disabled}>{STR.therapyEdit}</button>
                      <button type="button" className="text-xs underline text-red-600" onClick={() => remove(item.id)} disabled={disabled}>{STR.therapyDelete}</button>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </Section>
  )
}

// ---------- Charts (lightweight SVG + simple markers) ----------
function Sparkline({ data=[0], mask=[], spottingMask=[], starts=[], width=280, height=40 }) {
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
        {starts?.length === data.length && starts.map((flag,i) => flag ? (() => {
          const x = (i/(data.length-1||1))*(width-4)+2
          const y = height - (data[i]/max)*(height-4) - 2
          return <circle key={i} cx={x} cy={y} r={3} fill="#be123c" />
        })() : null)}
      </svg>
      {/* period mask row */}
      {!!mask.length && (
        <div className="mt-1 flex gap-1" aria-label={STR.periodLegend}>
          {mask.map((m,i)=> <div key={i} className={`h-1 flex-1 ${m?'bg-rose-400':'bg-transparent'}`} />)}
        </div>
      )}
      {!!spottingMask.length && (
        <div className="mt-0.5 flex gap-1" aria-label={STR.spottingLabel}>
          {spottingMask.map((s,i)=> <div key={i} className={`h-[2px] flex-1 ${s?'bg-rose-300':'bg-transparent'}`} />)}
        </div>
      )}
    </div>
  )
}

function PbacWeekBars({ days = [] }) {
  const max = Math.max(PBAC_RULES.bleedingMin, ...days.map(d => d.pbac || 0), 1)
  return (
    <div className="mt-4">
      <div className="flex items-end gap-2 h-24">
        {days.map((day, idx) => {
          const value = Math.max(0, Number(day.pbac || 0))
          const heightPercent = value ? Math.max(6, (value / max) * 100) : 0
          const isPeriod = !!day.period
          const isSpotting = !!day.spotting && !isPeriod
          const barStyle = isPeriod
            ? { height: `${heightPercent}%`, backgroundImage: 'repeating-linear-gradient(135deg, rgba(225,29,72,0.6) 0, rgba(225,29,72,0.6) 6px, rgba(244,114,182,0.2) 6px, rgba(244,114,182,0.2) 12px)' }
            : { height: `${heightPercent}%` }
          return (
            <div key={day.date || idx} className="flex-1 relative h-full" aria-label={`${day.date || ''} PBAC ${value}`}>
              {value > 0 && (
                <div
                  className={`w-full rounded-t-md ${isPeriod ? 'bg-rose-400' : 'bg-rose-200'}`}
                  style={barStyle}
                />
              )}
              {day.start && (
                <span className="absolute -top-2 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-700" />
              )}
              {isSpotting && (
                <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-rose-400" />
              )}
            </div>
          )
        })}
      </div>
      <div className="mt-2 flex justify-between text-xs text-gray-500">
        {days.map((day, idx) => (
          <span key={day.date || idx} className="flex-1 text-center">
            {(day.date || '').slice(5)}
          </span>
        ))}
      </div>
    </div>
  )
}

function LagScatter({ pairs = [] }) {
  const width = 280
  const height = 180
  const padding = 24
  const axisMax = 10
  const axisMin = 0
  const scaleX = value => {
    const clamped = clamp(value, axisMin, axisMax)
    return padding + ((clamped - axisMin) / (axisMax - axisMin)) * (width - padding * 2)
  }
  const scaleY = value => {
    const clamped = clamp(value, axisMin, axisMax)
    return height - padding - ((clamped - axisMin) / (axisMax - axisMin)) * (height - padding * 2)
  }
  return (
    <svg width={width} height={height} className="w-full" aria-label="Lag-Scatterplot">
      <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#9f1239" strokeWidth="1" />
      <line x1={padding} y1={height - padding} x2={padding} y2={padding} stroke="#9f1239" strokeWidth="1" />
      <text x={width - padding} y={height - padding + 16} className="text-[10px] fill-rose-900" textAnchor="end">Schlaf</text>
      <text x={padding - 14} y={padding} className="text-[10px] fill-rose-900" textAnchor="end">Schmerz</text>
      {[0,5,10].map(tick => (
        <g key={`x${tick}`}>
          <line x1={scaleX(tick)} y1={height - padding} x2={scaleX(tick)} y2={height - padding + 4} stroke="#9f1239" strokeWidth="1" />
          <text x={scaleX(tick)} y={height - padding + 14} className="text-[9px] fill-rose-900" textAnchor="middle">{tick}</text>
        </g>
      ))}
      {[0,5,10].map(tick => (
        <g key={`y${tick}`}>
          <line x1={padding - 4} y1={scaleY(tick)} x2={padding} y2={scaleY(tick)} stroke="#9f1239" strokeWidth="1" />
          <text x={padding - 6} y={scaleY(tick) + 3} className="text-[9px] fill-rose-900" textAnchor="end">{tick}</text>
        </g>
      ))}
      {pairs.map((p, idx) => (
        <circle key={idx} cx={scaleX(p.x)} cy={scaleY(p.y)} r={3} fill="#f43f5e" opacity={0.7} />
      ))}
    </svg>
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
          <div
            key={i}
            className={`relative ${c} rounded`}
            style={{ width: cell, height: cell }}
          >
            {d.period && <div className="absolute inset-x-0 bottom-0 h-1 bg-rose-400 rounded-b" />}
            {d.periodStart && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-rose-700" />}
            {d.spotting && !d.period && <div className="absolute inset-x-1 bottom-1 h-[2px] bg-rose-400" />}
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
        <button aria-label="Vorheriger Tag" className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-400" onClick={onPrev}>‹</button>
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
        <button aria-label="Nächster Tag" className="w-9 h-9 rounded-full bg-rose-100 text-rose-700 focus-visible:ring-2 focus-visible:ring-rose-400" onClick={onNext}>›</button>
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
  const [settings, setSettings] = useLocalState(SETTINGS_KEY, { quickMode: true, encryption: false, kdfStrong: false })
  const [pass, setPass] = useState('')
  const [locked, setLocked] = useState(false)

  const encryption = settings?.encryption
  const kdfStrong = settings?.kdfStrong

  const [entries, setEntries] = useState([])
  const [loaded, setLoaded] = useState(false)
  const [reportRange, setReportRange] = useState({ from: '', to: '' })
  const [showReport, setShowReport] = useState(false)

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
    persistEntries(entries, { encryption, kdfStrong }, pass).catch(()=>{})
  }, [entries, encryption, kdfStrong, loaded, pass])

  // Today Wizard state
  const [step, setStep] = useState(0)
  const totalSteps = 9
  const yesterday = useMemo(()=>{
    const y = new Date(activeDate); y.setDate(y.getDate()-1)
    const iso = y.toISOString().slice(0,10)
    return entries.find(e=>e.date===iso)
  }, [entries, activeDate])

  const [nrs, setNrs] = useState(3)
  const [pbac, setPbac] = useState(() => ({ ...DEFAULT_PBAC }))
  const [zones, setZones] = useState([])
  const [symptoms, setSymptoms] = useState([])
  const [therapy, setTherapy] = useState([])
  const [tookMeds, setTookMeds] = useState(null)
  const [sleep, setSleep] = useState(5)
  const [subNrs, setSubNrs] = useState(() => JSON.parse(JSON.stringify(DEFAULT_SUB_NRS)))
  const [uro, setUro] = useState(() => ({ ...DEFAULT_URO }))
  const [bowel, setBowel] = useState(() => ({ ...DEFAULT_BOWEL }))
  const [painInterference, setPainInterference] = useState(null)
  const [promis, setPromis] = useState(null)
  const [savedFlag, setSavedFlag] = useState(false) // legacy, not used
  const [isEditing, setIsEditing] = useState(true)
  const [banner, setBanner] = useState({ show:false, text:'' })
  const [confirmOverwrite, setConfirmOverwrite] = useState(false)

  // section refs for progressive reveal scrolling
  const sectionRefs = useMemo(
    () => Array.from({ length: totalSteps }, () => React.createRef()),
    [totalSteps]
  )

  // Load entry when switching day
  useEffect(()=>{
    const e = entries.find(x=>x.date===activeDate)
    const weekday = isoWeekday(activeDate)
    const isPegDay = weekday === 1
    const isPromisDay = weekday === 0
    if (e) {
      setNrs(e.nrs ?? 3)
      setPbac(normalizePbac(e.pbac))
      setZones(e.zones ?? [])
      setSymptoms(e.symptoms ?? [])
      setTherapy(normalizeTherapy(e.therapy, e.medication))
      setTookMeds(deriveTookMeds(e))
      setSleep(e.sleep ?? 5)
      setSubNrs(normalizeSubNrs(e.subNrs))
      setUro(normalizeUro(e.uro))
      setBowel(normalizeBowel(e.bowel))
      const normalizedPeg = normalizePainInterference(e.painInterference, e.date)
      const normalizedPromis = normalizePromis(e.promis, e.date)
      setPainInterference(isPegDay ? (normalizedPeg || DEFAULT_PAIN_INTERFERENCE(activeDate)) : normalizedPeg)
      setPromis(isPromisDay ? (normalizedPromis || DEFAULT_PROMIS(activeDate)) : normalizedPromis)
      setIsEditing(false) // vorhandener Tag: zunächst gesperrt
    } else {
      setNrs(3)
      setPbac(normalizePbac(null))
      setZones([])
      setSymptoms([])
      setTherapy([])
      setTookMeds(null)
      setSleep(5)
      setSubNrs(JSON.parse(JSON.stringify(DEFAULT_SUB_NRS)))
      setUro({ ...DEFAULT_URO })
      setBowel({ ...DEFAULT_BOWEL })
      setPainInterference(isPegDay ? DEFAULT_PAIN_INTERFERENCE(activeDate) : null)
      setPromis(isPromisDay ? DEFAULT_PROMIS(activeDate) : null)
      setIsEditing(true) // neuer Tag: sofort editierbar
    }
    setStep(e ? totalSteps-1 : 0)
    window.scrollTo({ top: 0 })
  }, [activeDate, entries])

  useEffect(()=>{ if (banner.show) { const t = setTimeout(()=>setBanner(b=>({...b, show:false})), 1400); return ()=>clearTimeout(t) } }, [banner.show])

  function fillLikeYesterday() {
    if (!yesterday) return
    setNrs(yesterday.nrs ?? 3)
    setPbac(normalizePbac(yesterday.pbac))
    setZones(yesterday.zones ?? [])
    setSymptoms(yesterday.symptoms ?? [])
    setSleep(yesterday.sleep ?? 5)
    setTherapy(normalizeTherapy(yesterday.therapy, yesterday.medication))
    setTookMeds(deriveTookMeds(yesterday))
    setSubNrs(normalizeSubNrs(yesterday.subNrs))
    setUro(normalizeUro(yesterday.uro))
    setBowel(normalizeBowel(yesterday.bowel))
    const weekday = isoWeekday(activeDate)
    const prevPeg = normalizePainInterference(yesterday.painInterference, yesterday.date)
    const prevPromis = normalizePromis(yesterday.promis, yesterday.date)
    setPainInterference(weekday === 1 ? (prevPeg ? { ...prevPeg, date: activeDate } : DEFAULT_PAIN_INTERFERENCE(activeDate)) : prevPeg)
    setPromis(weekday === 0 ? (prevPromis ? { ...prevPromis, date: activeDate } : DEFAULT_PROMIS(activeDate)) : prevPromis)
  }

  function markSymptomFree(){
    const weekday = isoWeekday(activeDate)
    setNrs(0)
    setPbac(normalizePbac(null))
    setZones([])
    setSymptoms([])
    setTherapy([])
    setTookMeds(null)
    setSleep(7)
    setSubNrs(JSON.parse(JSON.stringify(DEFAULT_SUB_NRS)))
    setUro({ ...DEFAULT_URO })
    setBowel({ ...DEFAULT_BOWEL })
    setPainInterference(weekday === 1 ? DEFAULT_PAIN_INTERFERENCE(activeDate) : null)
    setPromis(weekday === 0 ? DEFAULT_PROMIS(activeDate) : null)
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
      const pbacSave = normalizePbac(pbac)
      const subNrsSave = normalizeSubNrs(subNrs)
      const uroSave = normalizeUro(uro)
      const bowelSave = normalizeBowel(bowel)
      const therapySave = therapy.map(item => ({
        ...item,
        id: item.id || `therapy_${Math.random().toString(36).slice(2,8)}`,
        adherence: ADHERENCE_OPTIONS.includes(item.adherence) ? item.adherence : 0,
        adverse: {
          hasAe: !!item.adverse?.hasAe,
          top: Array.isArray(item.adverse?.top) ? item.adverse.top.slice(0,3) : [],
        },
      }))
      const pegSave = isoWeekday(d) === 1 && painInterference ? normalizePainInterference({ ...painInterference, date: d }, d) : null
      const promisSave = isoWeekday(d) === 0 && promis ? normalizePromis({ ...promis, date: d }, d) : null
      const entry = {
        id: d,
        date: d,
        mode: settings.quickMode ? 'quick' : 'detail',
        nrs,
        pbac: pbacSave,
        zones,
        symptoms,
        therapy: therapySave,
        tookMeds: typeof tookMeds === 'boolean' ? tookMeds : null,
        sleep,
        subNrs: subNrsSave,
        uro: uroSave,
        bowel: bowelSave,
        painInterference: pegSave,
        promis: promisSave,
        medication: [],
      }
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

  const { periodSet, startSet, spottingSet, cycles } = useMemo(()=>buildPeriodFlags(entries), [entries])

  const last7Days = useMemo(()=>{
    const arr = []
    for (let i=6;i>=0;i--) {
      const dt = new Date(); dt.setDate(dt.getDate()-i)
      const iso = dt.toISOString().slice(0,10)
      const e = entries.find(x=>x.date===iso)
      const pbacScore = Number(e?.pbac?.dayScore ?? 0)
      arr.push({
        date: iso,
        nrs: e?.nrs ?? 0,
        pbac: pbacScore,
        period: periodSet.has(iso),
        start: startSet.has(iso),
        spotting: spottingSet.has(iso),
      })
    }
    return arr
  }, [entries, periodSet, startSet, spottingSet])

  const last30 = useMemo(()=>{
    const arr = []
    for (let i=29;i>=0;i--) {
      const dt = new Date(); dt.setDate(dt.getDate()-i)
      const iso = dt.toISOString().slice(0,10)
      const e = entries.find(x=>x.date===iso)
      arr.push({ date: iso, nrs: e?.nrs ?? 0, period: periodSet.has(iso), periodStart: startSet.has(iso), spotting: spottingSet.has(iso) })
    }
    return arr
  }, [entries, periodSet, startSet, spottingSet])

  const cycleSummaries = useMemo(() => {
    return cycles.map(cycle => {
      const dates = cycle.days.map(d => d.date)
      const relevant = entries.filter(e => dates.includes(e.date))
      const nrsValues = relevant.map(e => (typeof e.nrs === 'number' ? e.nrs : null)).filter(v => v !== null)
      const medianNrs = nrsValues.length ? Number(median(nrsValues).toFixed(1)) : 0
      const peakNrs = nrsValues.length ? Math.max(...nrsValues) : 0
      const symptomMap = new Map()
      relevant.forEach(e => {
        (e.symptoms || []).forEach(s => {
          const label = s.label || s.id
          const intensity = typeof s.intensity === 'number' ? s.intensity : 0
          symptomMap.set(label, (symptomMap.get(label) || 0) + intensity)
        })
      })
      const topSymptoms = Array.from(symptomMap.entries()).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([label]) => label)
      return {
        start: cycle.start,
        end: cycle.end,
        pbacSum: cycle.pbacSum,
        medianNrs,
        peakNrs,
        topSymptoms,
      }
    })
  }, [cycles, entries])

  const computedReportRange = useMemo(() => {
    const datedEntries = entries.filter(e => e?.date)
    if (!datedEntries.length) {
      return { from: null, to: null }
    }
    const sorted = datedEntries.slice().sort((a, b) => (a.date || '').localeCompare(b.date || ''))
    return {
      from: sorted[0]?.date || null,
      to: sorted[sorted.length - 1]?.date || null,
    }
  }, [entries])

  useEffect(() => {
    if (!computedReportRange.from && !computedReportRange.to) return
    setReportRange(prev => {
      if (prev.from || prev.to) return prev
      return {
        from: computedReportRange.from || '',
        to: computedReportRange.to || '',
      }
    })
  }, [computedReportRange])

  const lagPairs = useMemo(() => {
    const map = new Map(entries.map(e => [e.date, e]))
    return entries
      .map(e => {
        const prev = map.get(addDaysISO(e.date, -1))
        if (!prev) return null
        const sleepVal = typeof prev.sleep === 'number' ? prev.sleep : null
        const nrsVal = typeof e.nrs === 'number' ? e.nrs : null
        if (sleepVal === null || nrsVal === null) return null
        return { x: sleepVal, y: nrsVal }
      })
      .filter(Boolean)
  }, [entries])

  const corr = useMemo(()=>{
    const pairs = entries
      .map(e => {
        const sleepVal = typeof e.sleep === 'number' ? e.sleep : null
        const nrsVal = typeof e.nrs === 'number' ? e.nrs : null
        if (sleepVal === null || nrsVal === null) return null
        return { x: sleepVal, y: nrsVal }
      })
      .filter(Boolean)
    const n = pairs.length
    if (n < 14) return { n, r: null }
    const mx = pairs.reduce((acc, p) => acc + p.x, 0) / n
    const my = pairs.reduce((acc, p) => acc + p.y, 0) / n
    const num = pairs.reduce((acc, p) => acc + (p.x - mx) * (p.y - my), 0)
    const den = Math.sqrt(
      pairs.reduce((acc, p) => acc + Math.pow(p.x - mx, 2), 0) *
      pairs.reduce((acc, p) => acc + Math.pow(p.y - my, 2), 0)
    )
    const r = den ? num / den : 0
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
    <ErrorBoundary>
      <main className="min-h-screen bg-rose-50 text-gray-900 pb-24 print:hidden">
      <header className="sticky top-0 z-30 bg-rose-50/80 backdrop-blur border-b border-rose-100">
        <div className="p-4 flex items-center justify-between">
          <h1 className="text-xl font-bold text-rose-900">{STR.appTitle}</h1>
          <details className="relative">
   <summary className="list-none cursor-pointer px-3 py-2 rounded-xl border border-rose-200 bg-white">Einstellungen</summary>
   <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow p-4 text-sm">
     <div className="flex items-center justify-between mb-2">
       <span>Schnellmodus</span>
       <input
         type="checkbox"
         checked={settings.quickMode}
         onChange={e=>setSettings({...settings, quickMode:e.target.checked})}
       />
     </div>

     {/* Passphrase immer sichtbar machen */}
     <div className="mt-2">
       <label className="block mb-1">Passphrase</label>
       <input
         type="password"
         className="w-full border rounded-xl px-3 py-2"
         placeholder="PIN/Passwort (≥ 4 Zeichen)"
         value={pass}
         onChange={e=>setPass(e.target.value)}
         aria-label="Passphrase für lokale Verschlüsselung"
       />
       <p className="text-xs text-gray-500 mt-1">Aktiv mit Passphrase (mind. 4 Zeichen). Ohne Passphrase keine Verschlüsselung.</p>
       <p className="text-xs text-gray-500">Passphrase wird nicht gespeichert oder wiederhergestellt. {STR.dataLocal}</p>
     </div>

     <div className="flex items-center justify-between mb-2 mt-3">
       <span>Verschlüsselung</span>
       <input
         type="checkbox"
         checked={settings.encryption}
         disabled={(pass||'').length < 4}
         onChange={e=>{
           if (e.target.checked && (pass||'').length < 4) return
           setSettings({...settings, encryption:e.target.checked})
         }}
         aria-disabled={(pass||'').length < 4}
       />
     </div>

     <div className="flex items-center justify-between mb-2">
       <span>{STR.strongerKdf}</span>
       <input
         type="checkbox"
         checked={!!settings.kdfStrong}
         onChange={e=>setSettings({...settings, kdfStrong:e.target.checked})}
         disabled={!settings.encryption}
       />
     </div>

     {/* Locked-Hinweis, falls Entschlüsselung scheitert */}
     {settings.encryption && locked && (
       <div className="mt-2 rounded-xl border border-amber-200 bg-amber-50 p-2 text-xs">
         Daten sind verschlüsselt. Bitte korrekte Passphrase eingeben, um zu entsperren.
       </div>
     )}

     <div className="mt-3 flex items-center justify-between">
       <span className="text-red-600">{STR.clearAll}</span>
       <button
         className="px-3 py-2 rounded-xl border"
         onClick={()=>{ if (confirm('Wirklich alles löschen?')) { localStorage.clear(); location.reload() } }}
       >
         Löschen
       </button>
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

      {settings.encryption && locked && (
        <div className="mx-4 mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm">
          Daten sind verschlüsselt. Bitte Passphrase eingeben, um zu entsperren.
        </div>
      )}

      {/* Top slide banner */}
      <TopSlideBanner show={banner.show} text={banner.text} onClose={()=>setBanner(b=>({...b, show:false}))} />

      {/* Tabs */}
      {tab==='today' && (
        <div className="relative">
          <fieldset disabled={!isEditing}>
          <div className="px-4 pt-3 flex gap-2">
            <button className="px-3 py-2 rounded-xl border bg-white disabled:opacity-50 disabled:pointer-events-none" onClick={fillLikeYesterday} disabled={!yesterday || !isEditing}>{STR.likeYesterday}</button>
            <button className="px-3 py-2 rounded-xl border bg-white disabled:opacity-50 disabled:pointer-events-none" onClick={markSymptomFree} disabled={!isEditing}>{STR.symptomFree}</button>
            <span className="relative group">
              <button
                className="px-3 py-2 rounded-xl border bg-white disabled:opacity-50 disabled:pointer-events-none"
                onClick={()=>{
                  if (!isEditing) return
                  setStep(0)
                  setNrs(3)
                  setPbac({ products: [], clots:'none', floodingEpisodes:0, dayScore:0, periodStart:false })
                }}
              >
                {STR.quickOnly}
              </button>
              <div className="pointer-events-none absolute left-0 top-[110%] hidden w-56 rounded-xl bg-rose-600 px-3 py-2 text-sm text-white shadow group-hover:block">
                Setzt andere Felder für heute zurück.
              </div>
            </span>
          </div>
          </fieldset>

          {/* Minimal read overlay when not editing (still readable) */}
          {!isEditing && hasEntryToday && (
            <div className="absolute inset-x-0 top-0 bottom-16 z-10 bg-white/10 backdrop-blur-[1px] pointer-events-none" />
          )}

          {confirmOverwrite && (
            <div className="fixed inset-0 z-40 bg-black/20 flex items-center justify-center">
              <div className="mx-4 max-w-sm w-full rounded-2xl bg-white p-4 shadow">
                <div className="font-medium text-rose-900 mb-2">Eintrag vom {activeDate} überschreiben?</div>
                <p className="text-sm text-gray-600 mb-4">Für dieses Datum existiert bereits ein Eintrag. Diese Aktion ersetzt den vorhandenen Eintrag.</p>
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
          <div ref={sectionRefs[1]}>{step>=1 && <PainDetails value={subNrs} onChange={setSubNrs} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[2]}>{step>=2 && <PbacMini state={pbac} setState={setPbac} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[3]}>{step>=3 && <BodyMapSimple zones={zones} setZones={setZones} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[4]}>{step>=4 && <SymptomPicker selected={symptoms} setSelected={setSymptoms} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[5]}>{step>=5 && (
            <>
              <UroInputs value={uro} onChange={setUro} disabled={!isEditing} />
              <BowelInputs value={bowel} onChange={setBowel} disabled={!isEditing} />
            </>
          )}</div>
          <div ref={sectionRefs[6]}>{step>=6 && (
            <TherapyManager
              list={therapy}
              onChange={setTherapy}
              disabled={!isEditing}
              tookMeds={tookMeds}
              onTookMedsChange={setTookMeds}
            />
          )}</div>
          <div ref={sectionRefs[7]}>{step>=7 && <SleepScale value={sleep} onChange={setSleep} disabled={!isEditing} />}</div>
          <div ref={sectionRefs[8]}>{step>=8 && (
            <>
              {isoWeekday(activeDate) === 1 && painInterference && (
                <PainInterferenceMini
                  value={painInterference}
                  onChange={setPainInterference}
                  disabled={!isEditing}
                  date={activeDate}
                  titleOverride="Heute ist Montag: PEG-3 Kurzfragen"
                />
              )}
              {isoWeekday(activeDate) === 0 && promis && (
                <PromisWeeklyMini
                  value={promis}
                  onChange={setPromis}
                  disabled={!isEditing}
                  date={activeDate}
                  titleOverride="Heute ist Sonntag: PROMIS-Kurzfragen"
                />
              )}
            </>
          )}</div>

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
          <Section title="7-Tage Schmerz & PBAC" hint={STR.pbacLegend}>
            <Sparkline
              data={last7Days.map(d=>d.nrs)}
              mask={last7Days.map(d=>d.period)}
              spottingMask={last7Days.map(d=>d.spotting)}
              starts={last7Days.map(d=>d.start)}
            />
            <PbacWeekBars days={last7Days} />
          </Section>
          <Section title="Kalender (30 Tage)" hint={STR.calendarHint}>
            <CalendarHeatmap days={last30} />
          </Section>
          <Section title={STR.cycleCardsTitle} hint={STR.cycleCardHint}>
            {cycleSummaries.length ? (
              <div className="space-y-3">
                {cycleSummaries.map(cycle => (
                  <div key={cycle.start} className="border rounded-2xl p-3 bg-white shadow-sm">
                    <div className="text-sm text-gray-600">{cycle.start} – {cycle.end}</div>
                    <div className="mt-1 font-semibold text-rose-900">{STR.cycleCardPbac}: {cycle.pbacSum}</div>
                    <div className="mt-1 text-sm">{STR.cycleCardMedian}: {cycle.medianNrs} · {STR.cycleCardPeak}: {cycle.peakNrs}</div>
                    <div className="mt-1 text-sm text-gray-700">{STR.cycleCardSymptoms}: {cycle.topSymptoms.length ? cycle.topSymptoms.join(', ') : '–'}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-600">{STR.cycleCardEmpty}</p>
            )}
          </Section>
          <Section title={STR.lagCheckTitle} hint={STR.lagCheckHint}>
            {lagPairs.length >= 14 ? <LagScatter pairs={lagPairs} /> : <p className="text-sm text-gray-600">{STR.lagCheckTooFew}</p>}
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
                    <div className="text-sm text-gray-600">
                      NRS {e.nrs ?? '-'} · PBAC {e.pbac?.dayScore ?? 0}
                      {e.pbac?.periodStart ? ' · Beginn' : ''}
                      {e.pbac?.cupMl ? ` · Cup ${e.pbac.cupMl} ml` : ''}
                      {e.pbac?.dayScore > 0 && e.pbac.dayScore <= PBAC_RULES.spottingMax ? ` · ${STR.spottingLabel}` : ''}
                      {typeof e.tookMeds === 'boolean' ? ` · Medikation heute: ${e.tookMeds ? STR.medsYes : STR.medsNo}` : ''}
                      {(() => {
                        const syms = (e.symptoms||[]).slice().sort((a,b)=> (b.intensity||0)-(a.intensity||0)).slice(0,3)
                        return syms.length ? ` · ${STR.cycleCardSymptoms}: ${syms.map(s=>s.label).join(', ')}` : ''
                      })()}
                    </div>
                  </div>
                  <button className="text-sm underline rounded focus-visible:ring-2 focus-visible:ring-rose-400" onClick={()=>{
                    if (confirm(`Eintrag vom ${e.date} löschen? Diese Aktion kann nicht rückgängig gemacht werden.`)) {
                      setEntries(entries.filter(x=>x.id!==e.id))
                    }
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
            <div className="flex flex-wrap items-end gap-2">
              <label className="text-sm">
                <span className="block mb-1">{STR.dateLabel} von</span>
                <input type="date" className="px-2 py-1 rounded-xl border" value={reportRange.from} onChange={e=>setReportRange(r=>({...r, from:e.target.value}))} />
              </label>
              <label className="text-sm">
                <span className="block mb-1">{STR.dateLabel} bis</span>
                <input type="date" className="px-2 py-1 rounded-xl border" value={reportRange.to} onChange={e=>setReportRange(r=>({...r, to:e.target.value}))} />
              </label>
              <button
                className="px-4 py-2 rounded-xl bg-rose-600 text-white"
                onClick={()=>{
                  setShowReport(true)
                  setTimeout(()=>window.print(), 50)
                  const clear = () => { setShowReport(false); window.removeEventListener('afterprint', clear) }
                  window.addEventListener('afterprint', clear)
                }}
              >
                PDF erstellen
              </button>
            </div>
          </Section>
          <Section title="JSON">
            <button className="px-4 py-2 rounded-xl border" onClick={()=>{
              const blob = new Blob([JSON.stringify(entries,null,2)], { type:'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a'); a.href = url; a.download = `endo_export_${todayISO()}.json`; a.click(); URL.revokeObjectURL(url)
            }}>{STR.jsonExport}</button>
          </Section>
          <Section title={STR.tipsTitle} hint={STR.tipsHint}>
            <ul className="list-disc space-y-2 pl-5 text-sm text-gray-600">
              {STR.tipsItems.map((item, index) => (
                <li key={index}>{item}</li>
              ))}
            </ul>
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
      {showReport && (
        <div className="fixed inset-0 z-[60] bg-white overflow-auto">
          <ReportView
            range={reportRange}
            entries={entries}
            cycles={cycleSummaries}
            last7Days={last7Days}
            last30={last30}
          />
        </div>
      )}
      </main>
    </ErrorBoundary>
  )
}

function ReportView({ range, entries, cycles, last7Days, last30 }) {
  const within = e => (!range?.from || e.date >= range.from) && (!range?.to || e.date <= range.to)
  const list = entries.filter(within).slice().sort((a,b)=> (a.date||'').localeCompare(b.date||''))
  const pbacSum = list.reduce((s,e)=> s + Number(e?.pbac?.dayScore||0), 0)
  const painVals = list.map(e => typeof e.nrs==='number'? e.nrs : null).filter(v=>v!==null)
  const meanPain = painVals.length ? (painVals.reduce((a,b)=>a+b,0)/painVals.length).toFixed(1) : '–'
  const peakPain = painVals.length ? Math.max(...painVals) : '–'

  return (
    <div id="print-report" className="p-6 text-[12px] leading-snug bg-white text-gray-800">
      <div className="flex items-center justify-between text-sm text-gray-600">
        <div>EndoLemon</div>
        <div>{todayISO()}</div>
      </div>
      <h1 className="text-xl font-semibold">Arzt-Kurzbrief</h1>
      <div className="text-sm text-gray-600 mt-1">
        Zeitraum: {range?.from || '–'} – {range?.to || '–'} · Einträge: {list.length}
      </div>

      <section className="mt-4">
        <h2 className="text-base font-semibold">Zusammenfassung</h2>
        <ul className="mt-1 list-disc pl-5">
          <li>Durchschnittsschmerz (NRS): <b>{meanPain}</b> · Peak: <b>{peakPain}</b></li>
          <li>PBAC-Summe (Zeitraum): <b>{pbacSum}</b></li>
          <li>Therapie-Tage (mit Einnahme „Ja“): <b>{list.filter(e=>e.tookMeds===true).length}</b></li>
        </ul>
      </section>

      <section className="mt-4">
        <h2 className="text-base font-semibold">7-Tage Verlauf (Schmerz & PBAC)</h2>
        <div className="mt-2">
          <Sparkline
            data={last7Days.map(d=>d.nrs)}
            mask={last7Days.map(d=>d.period)}
            spottingMask={last7Days.map(d=>d.spotting)}
            starts={last7Days.map(d=>d.start)}
          />
          <PbacWeekBars days={last7Days} />
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-base font-semibold">Kalender (30 Tage)</h2>
        <div className="mt-2">
          <CalendarHeatmap days={last30} />
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-base font-semibold">Zyklen (Auszug)</h2>
        <div className="mt-1 grid grid-cols-2 gap-3">
          {cycles.slice(0,6).map(c=>(
            <div key={c.start} className="border border-gray-200 rounded-lg bg-white p-2">
              <div className="text-xs text-gray-600">{c.start} – {c.end}</div>
              <div className="text-sm">PBAC: <b>{c.pbacSum}</b></div>
              <div className="text-sm">Median NRS: <b>{c.medianNrs}</b> · Peak: <b>{c.peakNrs}</b></div>
              <div className="text-xs text-gray-700">Top-Symptome: {c.topSymptoms?.length? c.topSymptoms.join(', '): '–'}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mt-4">
        <h2 className="text-base font-semibold">Letzte Einträge</h2>
        <table className="mt-2 w-full border-collapse">
          <thead>
            <tr className="text-left border-b">
              <th className="py-1 pr-2">Datum</th>
              <th className="py-1 pr-2">NRS</th>
              <th className="py-1 pr-2">PBAC</th>
              <th className="py-1 pr-2">Symptome</th>
              <th className="py-1">Meds</th>
            </tr>
          </thead>
          <tbody>
            {list.slice(-20).map(e=>(
              <tr key={e.id} className="border-b">
                <td className="py-1 pr-2">{e.date}</td>
                <td className="py-1 pr-2">{e.nrs ?? '–'}</td>
                <td className="py-1 pr-2">{e.pbac?.dayScore ?? 0}{e.pbac?.periodStart?' (Beginn)':''}</td>
                <td className="py-1 pr-2">{(e.symptoms||[]).slice().sort((a,b)=>(b.intensity||0)-(a.intensity||0)).slice(0,3).map(s=>s.label).join(', ') || '–'}</td>
                <td className="py-1">{typeof e.tookMeds==='boolean'?(e.tookMeds?'Ja':'Nein'):'–'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <p className="mt-4 text-[11px] text-gray-600">
        Hinweis: PBAC = Higham-Score; Korrelationen sind keine Kausalität.
      </p>
    </div>
  )
}
