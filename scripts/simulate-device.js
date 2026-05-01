#!/usr/bin/env node
/**
 * Hypoxy Device Simulator
 *
 * Fetches active sessions and streams realistic physiological measurements
 * to the device service every few seconds.
 *
 * Usage:
 *   node scripts/simulate-device.js [options]
 *
 * Options (env vars):
 *   GATEWAY_URL   API gateway base URL  (default: http://localhost:3000)
 *   DEVICE_URL    Device service URL    (default: http://localhost:3001)
 *   INTERVAL_MS   Interval in ms        (default: 2000)
 *   MODE          normal | hypoxy | crisis  (default: normal)
 */

const GATEWAY_URL = process.env.GATEWAY_URL ?? 'http://localhost:3000';
const DEVICE_URL  = process.env.DEVICE_URL  ?? 'http://localhost:3001';
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 2000);
const MODE        = process.env.MODE ?? 'normal';
const USERNAME    = process.env.SIM_USERNAME ?? 'admin';
const PASSWORD    = process.env.SIM_PASSWORD ?? 'admin123';
const INIT_TOKEN  = process.env.SIM_TOKEN ?? null;

const c = {
  reset:  '\x1b[0m',
  bold:   '\x1b[1m',
  dim:    '\x1b[2m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  red:    '\x1b[31m',
  cyan:   '\x1b[36m',
  white:  '\x1b[37m',
};

function log(msg)  { console.log(`${c.dim}[${ts()}]${c.reset} ${msg}`); }
function ok(msg)   { console.log(`${c.dim}[${ts()}]${c.reset} ${c.green}✓${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.dim}[${ts()}]${c.reset} ${c.yellow}⚠${c.reset} ${msg}`); }
function err(msg)  { console.log(`${c.dim}[${ts()}]${c.reset} ${c.red}✗${c.reset} ${msg}`); }
function ts()      { return new Date().toTimeString().slice(0, 8); }

const BASELINES = {
  normal:   { spo2: 97, heartRate: 72,  respiratoryRate: 16 }, 
  moderate: { spo2: 87, heartRate: 105, respiratoryRate: 24 }, 
  crisis:   { spo2: 68, heartRate: 145, respiratoryRate: 36 }, 
};
const baseline = BASELINES[MODE.toLowerCase()] ?? BASELINES.normal;

let token = null;

async function login() {
  const res = await fetch(`${GATEWAY_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  if (!res.ok) throw new Error(`Login failed: ${res.status}`);
  const data = await res.json();
  token = data.access_token;
}

const state = {};

function getOrInitState(sessionId) {
  if (!state[sessionId]) {
    state[sessionId] = {
      spo2:            baseline.spo2,
      heartRate:       baseline.heartRate,
      respiratoryRate: baseline.respiratoryRate,
    };
  }
  return state[sessionId];
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

function walk(v, step, min, max) {
  return clamp(v + (Math.random() - 0.5) * 2 * step, min, max);
}

function nextReading(sessionId) {
  const s = getOrInitState(sessionId);

  s.spo2            = walk(s.spo2,            0.8,   60,  100);
  s.heartRate       = walk(s.heartRate,        2,     40,  200);
  s.respiratoryRate = walk(s.respiratoryRate,  0.5,    8,   40);

  return {
    spo2:            Math.round(s.spo2 * 10) / 10,
    heartRate:       Math.round(s.heartRate),
    respiratoryRate: Math.round(s.respiratoryRate * 10) / 10,
  };
}

async function getActiveSessions() {
  const res = await fetch(`${GATEWAY_URL}/api/sessions/active`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Sessions fetch failed: ${res.status}`);
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
  if (v < 80) return `${c.red}${c.bold}${v}%${c.reset}`;
  if (v < 90) return `${c.yellow}${v}%${c.reset}`;
  return `${c.green}${v}%${c.reset}`;
}

async function tick() {
  let sessions;
  try {
    sessions = await getActiveSessions();
  } catch (e) {
    err(`Could not fetch sessions — ${e.message}`);
    return;
  }

  if (sessions.length === 0) {
    warn('No active sessions found. Start a session in the UI first.');
    return;
  }

  for (const session of sessions) {
    const reading = nextReading(session.id);
    const payload = {
      patientId: session.patientId,
      sessionId: session.id,
      ...reading,
    };

    try {
      await postMeasurement(payload);
      ok(
        `Session ${c.cyan}${session.id.slice(0, 8)}…${c.reset}` +
        `  SpO2 ${spo2Label(reading.spo2)}` +
        `  HR ${c.white}${reading.heartRate}${c.reset} bpm` +
        `  RR ${c.white}${reading.respiratoryRate}${c.reset} /min`,
      );
    } catch (e) {
      err(`Session ${session.id.slice(0, 8)}… — ${e.message}`);
    }
  }
}

console.log(`
${c.bold}${c.cyan}Hypoxy Device Simulator${c.reset}
  Gateway : ${GATEWAY_URL}
  Device  : ${DEVICE_URL}
  Interval: ${INTERVAL_MS} ms
  Mode    : ${c.bold}${MODE}${c.reset}  (spo2≈${baseline.spo2}  hr≈${baseline.heartRate}  rr≈${baseline.respiratoryRate})

${c.dim}Press Ctrl+C to stop.${c.reset}
`);

if (INIT_TOKEN) {
  token = INIT_TOKEN;
  ok(`Using provided token`);
  tick();
  setInterval(tick, INTERVAL_MS);
} else {
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
