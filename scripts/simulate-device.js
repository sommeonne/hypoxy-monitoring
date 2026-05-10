#!/usr/bin/env node
/**
 * Hypoxy Device Simulator
 *
 * Fetches active sessions and streams realistic physiological measurements
 * to the device service every few seconds.
 *
 * Each session's o2Percentage (set when starting the session) drives the
 * physiological baseline — lower O₂ → lower SpO₂, elevated HR and RR.
 *
 * Usage:
 *   node scripts/simulate-device.js
 *
 * Options (env vars):
 *   GATEWAY_URL    API gateway base URL  (default: http://localhost:3000)
 *   DEVICE_URL     Device service URL    (default: http://localhost:3001)
 *   INTERVAL_MS    Interval in ms        (default: 2000)
 *   SIM_USERNAME   Login username        (default: doctor) — must be a doctor account, not admin
 *   SIM_PASSWORD   Login password        (default: doctor123)
 *   SIM_TOKEN      Pre-existing JWT (skips login)
 *   DEFAULT_O2     Fallback O₂% when session has none set (default: 21)
 */

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000'
const DEVICE_URL  = process.env.DEVICE_URL  ?? 'http://localhost:3001'
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 2000);
const USERNAME    = process.env.SIM_USERNAME 
const PASSWORD    = process.env.SIM_PASSWORD 
const INIT_TOKEN  = process.env.SIM_TOKEN
const DEFAULT_O2  = Number(process.env.DEFAULT_O2 ?? 21);

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  blue:   '\x1b[34m',
  white:  '\x1b[37m',
};

function log(msg)  { console.log(`${c.dim}[${ts()}]${c.reset} ${msg}`); }
function ok(msg)   { console.log(`${c.dim}[${ts()}]${c.reset} ${c.green}✓${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.dim}[${ts()}]${c.reset} ${c.yellow}⚠${c.reset} ${msg}`); }
function err(msg)  { console.log(`${c.dim}[${ts()}]${c.reset} ${c.red}✗${c.reset} ${msg}`); }
function ts()      { return new Date().toTimeString().slice(0, 8); }

// Lookup table derived from the physiological reference chart.
// Each entry: [o2, spo2Lo, spo2Hi, hrLo, hrHi, rrLo, rrHi, tvLo, tvHi]
const O2_TABLE = [
  { o2: 21, spo2: [96, 99], hr: [60,  80], rr: [12, 16], tv: [450, 550] },
  { o2: 20, spo2: [95, 98], hr: [62,  81], rr: [12, 16], tv: [455, 555] },
  { o2: 19, spo2: [94, 97], hr: [65,  82], rr: [12, 17], tv: [460, 560] },
  { o2: 18, spo2: [94, 97], hr: [67,  83], rr: [13, 17], tv: [465, 565] },
  { o2: 17, spo2: [93, 96], hr: [70,  85], rr: [13, 17], tv: [470, 570] },
  { o2: 16, spo2: [91, 94], hr: [75,  90], rr: [14, 18], tv: [480, 580] },
  { o2: 15, spo2: [89, 93], hr: [80,  95], rr: [15, 19], tv: [490, 600] },
  { o2: 14, spo2: [87, 91], hr: [85, 100], rr: [16, 20], tv: [500, 620] },
  { o2: 13, spo2: [84, 89], hr: [90, 105], rr: [17, 22], tv: [520, 640] },
  { o2: 12, spo2: [81, 87], hr: [95, 110], rr: [18, 24], tv: [540, 670] },
  { o2: 11, spo2: [78, 84], hr: [100, 118], rr: [20, 26], tv: [560, 710] },
  { o2: 10, spo2: [75, 81], hr: [105, 125], rr: [22, 28], tv: [580, 750] },
  { o2:  9, spo2: [70, 77], hr: [110, 130], rr: [25, 32], tv: [600, 780] },
];

function midpoint([lo, hi]) { return (lo + hi) / 2; }

function interpolateRow(o2) {
  // Exact match
  const exact = O2_TABLE.find(r => r.o2 === Math.round(o2));
  if (exact) return exact;

  // Clamp to table edges
  if (o2 >= O2_TABLE[0].o2) return O2_TABLE[0];
  if (o2 <= O2_TABLE[O2_TABLE.length - 1].o2) return O2_TABLE[O2_TABLE.length - 1];

  // Linear interpolation between two nearest rows
  const upper = O2_TABLE.find(r => r.o2 <= o2);
  const lower = O2_TABLE.slice().reverse().find(r => r.o2 >= o2);
  const t = (upper.o2 - o2) / (upper.o2 - lower.o2);
  const lerp = ([a0, a1], [b0, b1]) => [a0 + (b0 - a0) * t, a1 + (b1 - a1) * t];
  return {
    o2: o2,
    spo2: lerp(upper.spo2, lower.spo2),
    hr:   lerp(upper.hr,   lower.hr),
    rr:   lerp(upper.rr,   lower.rr),
    tv:   lerp(upper.tv,   lower.tv),
  };
}

function baselineForO2(o2) {
  const row = interpolateRow(o2);
  return {
    spo2:            midpoint(row.spo2),
    heartRate:       midpoint(row.hr),
    respiratoryRate: midpoint(row.rr),
    tidalVolume:     midpoint(row.tv),
    // walk bounds come from the row's own range
    bounds: { spo2: row.spo2, hr: row.hr, rr: row.rr, tv: row.tv },
  };
}

let token = null;

function decodeJwtRole(jwt) {
  try {
    const payload = JSON.parse(Buffer.from(jwt.split('.')[1], 'base64').toString());
    return payload.role ?? null;
  } catch {
    return null;
  }
}

async function login() {
  const res = await fetch(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  token = data.access_token;

  const role = decodeJwtRole(token);
  if (role === 'admin') {
    throw new Error(`The simulator must run as a doctor.`);
  }
}

const state = {};

function getOrInitState(sessionId, o2) {
  if (!state[sessionId]) {
    const bl = baselineForO2(o2);
    state[sessionId] = {
      spo2:            bl.spo2,
      heartRate:       bl.heartRate,
      respiratoryRate: bl.respiratoryRate,
      tidalVolume:     bl.tidalVolume,
      o2Percentage:    o2,
    };
  }
  return state[sessionId];
}


function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function walk(v, step, min, max) {
  return clamp(v + (Math.random() - 0.5) * 2 * step, min, max);
}

function nextReading(sessionId, setO2) {
  const o2 = setO2 ?? DEFAULT_O2;
  const bl  = baselineForO2(o2);
  const s   = getOrInitState(sessionId, o2);
  const b   = bl.bounds;

  s.spo2            = walk(s.spo2,            0.6,  b.spo2[0], b.spo2[1]);
  s.heartRate       = walk(s.heartRate,        2.0,  b.hr[0],   b.hr[1]);
  s.respiratoryRate = walk(s.respiratoryRate,  0.4,  b.rr[0],   b.rr[1]);
  s.tidalVolume     = walk(s.tidalVolume,      12,   b.tv[0],   b.tv[1]);

  s.o2Percentage    = walk(s.o2Percentage,     0.2,  Math.max(9, o2 - 0.5), Math.min(21, o2 + 0.5));

  return {
    spo2:            Math.round(s.spo2            * 10) / 10,
    heartRate:       Math.round(s.heartRate),
    respiratoryRate: Math.round(s.respiratoryRate * 10) / 10,
    tidalVolume:     Math.round(s.tidalVolume),
    o2Percentage:    Math.round(s.o2Percentage    * 10) / 10,
  };
}

async function getCurrentSession() {
  const res = await fetch(`${GATEWAY_URL}/api/sessions/current`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Session fetch failed: ${res.status}`);
  return res.json();
}

async function postMeasurement(payload) {
  const res = await fetch(`${DEVICE_URL}/devices/measurements`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${body}`);
  }
  return res.json();
}

function spo2Label(v) {
  if (v < 78) return `${c.red}${c.bold}${v}%${c.reset}`;   // severe hypoxia
  if (v < 89) return `${c.yellow}${v}%${c.reset}`;          // moderate
  return `${c.green}${v}%${c.reset}`;
}

function o2Label(v) {
  if (v < 12) return `${c.red}${v}%${c.reset}`;    // severe hypoxia
  if (v < 15) return `${c.yellow}${v}%${c.reset}`; // moderate
  if (v < 17) return `${c.cyan}${v}%${c.reset}`;   // mild
  return `${c.blue}${v}%${c.reset}`;
}

async function tick() {
  let session;
  try {
    session = await getCurrentSession();
  } catch (e) {
    err(`Could not fetch session — ${e.message}`);
    return;
  }

  if (!session) {
    warn('No active session found. Start a session in the UI first.');
    return;
  }

  const setO2   = session.o2Percentage ?? DEFAULT_O2;
  const reading = nextReading(session.id, setO2);

  try {
    await postMeasurement(reading);
    ok(
      `Session ${c.cyan}${session.id.slice(0, 8)}…${c.reset}` +
      `  O₂(set) ${o2Label(setO2)}` +
      `  O₂(meas) ${o2Label(reading.o2Percentage)}` +
      `  SpO₂ ${spo2Label(reading.spo2)}` +
      `  HR ${c.white}${reading.heartRate}${c.reset} bpm` +
      `  RR ${c.white}${reading.respiratoryRate}${c.reset} /min` +
      `  TV ${c.white}${reading.tidalVolume}${c.reset} mL`,
    );
  } catch (e) {
    err(`Session ${session.id.slice(0, 8)}… — ${e.message}`);
  }
}

function printBanner() {
  console.log(`${c.bold}${c.cyan}Hypoxy Device Simulator${c.reset}  ${c.dim}Press Ctrl+C to stop.${c.reset}`);
}

if (INIT_TOKEN) {
  token = INIT_TOKEN;
  printBanner();
  ok(`Using provided token`);
  tick();
  setInterval(tick, INTERVAL_MS);
} else {
  printBanner();
  login()
    .then(() => {
      ok(`Logged in as ${c.cyan}${USERNAME}${c.reset}`);
      tick();
      setInterval(tick, INTERVAL_MS);
    })
    .catch((e) => {
      err(`Auth failed — ${e.message}`);
      process.exit(1);
    });
}

process.on('SIGINT', () => {
  console.log(`\n${c.dim}Simulator stopped.${c.reset}`);
  process.exit(0);
});
