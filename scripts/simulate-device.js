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

/**
 * Derive physiological baseline from inhaled O₂ concentration.
 *
 * Anchor points (approximate, based on altitude/normobaric hypoxia literature):
 *   21% (normoxia) → SpO₂ 97, HR 72, RR 16
 *   16%            → SpO₂ 93, HR 85, RR 20
 *   13%            → SpO₂ 86, HR 100, RR 25
 *   10%            → SpO₂ 75, HR 128, RR 31
 */
function baselineForO2(o2) {
  const deficit = 21 - o2; // 0 at normoxia, increases with hypoxia
  return {
    spo2:            Math.max(60,  Math.round((97  - deficit * 2.0)  * 10) / 10),
    heartRate:       Math.min(200, Math.round( 72  + deficit * 5.1)),
    respiratoryRate: Math.min(50,  Math.round((16  + deficit * 1.4)  * 10) / 10),
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
    throw new Error(`User "${USERNAME}" has role "admin". The simulator must run as a doctor. Set SIM_USERNAME and SIM_PASSWORD to a doctor account.`);
  }
}

// Per-session state: keeps values walking smoothly between ticks
const state = {};

function getOrInitState(sessionId, o2) {
  if (!state[sessionId]) {
    const bl = baselineForO2(o2);
    state[sessionId] = {
      spo2:            bl.spo2,
      heartRate:       bl.heartRate,
      respiratoryRate: bl.respiratoryRate,
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

  // Random-walk each value around its physiological baseline
  s.spo2            = walk(s.spo2,            0.7,  bl.spo2 - 8,  Math.min(100, bl.spo2 + 3));
  s.heartRate       = walk(s.heartRate,        2.5,  bl.heartRate - 15, bl.heartRate + 20);
  s.respiratoryRate = walk(s.respiratoryRate,  0.4,  bl.respiratoryRate - 4, bl.respiratoryRate + 6);
  // O₂ measured at device varies ±0.4% around the set point
  s.o2Percentage    = walk(s.o2Percentage,     0.2,  Math.max(10, o2 - 0.5), Math.min(21, o2 + 0.5));

  return {
    spo2:            Math.round(s.spo2            * 10) / 10,
    heartRate:       Math.round(s.heartRate),
    respiratoryRate: Math.round(s.respiratoryRate * 10) / 10,
    o2Percentage:    Math.round(s.o2Percentage    * 10) / 10,
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

function o2Label(v) {
  if (v < 13) return `${c.red}${v}%${c.reset}`;
  if (v < 17) return `${c.yellow}${v}%${c.reset}`;
  return `${c.blue}${v}%${c.reset}`;
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
    const setO2  = session.o2Percentage ?? DEFAULT_O2;
    const reading = nextReading(session.id, setO2);
    const payload = {
      patientId: session.patientId,
      sessionId: session.id,
      ...reading,
    };

    try {
      await postMeasurement(payload);
      ok(
        `Session ${c.cyan}${session.id.slice(0, 8)}…${c.reset}` +
        `  O₂(set) ${o2Label(setO2)}` +
        `  O₂(meas) ${o2Label(reading.o2Percentage)}` +
        `  SpO₂ ${spo2Label(reading.spo2)}` +
        `  HR ${c.white}${reading.heartRate}${c.reset} bpm` +
        `  RR ${c.white}${reading.respiratoryRate}${c.reset} /min`,
      );
    } catch (e) {
      err(`Session ${session.id.slice(0, 8)}… — ${e.message}`);
    }
  }
}

// Print startup banner after we know token status
function printBanner() {
  console.log(`
${c.bold}${c.cyan}Hypoxy Device Simulator${c.reset}
  Gateway  : ${GATEWAY_URL}
  Device   : ${DEVICE_URL}
  Interval : ${INTERVAL_MS} ms
  Default O₂: ${c.bold}${DEFAULT_O2}%${c.reset}

  Physiology scales automatically with each session's set O₂ level.
  Lower O₂ → lower SpO₂, elevated HR and RR.

${c.dim}Press Ctrl+C to stop.${c.reset}
`);
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
