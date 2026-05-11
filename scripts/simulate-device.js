

const GATEWAY_URL = process.env.GATEWAY_URL  ?? 'http://localhost:3000';
const INTERVAL_MS = Number(process.env.INTERVAL_MS ?? 2000);

const token = process.env.SIM_TOKEN;
if (!token) { console.error('SIM_TOKEN is required'); process.exit(1); }

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

function ts()      { return new Date().toTimeString().slice(0, 8); }
function ok(msg)   { console.log(`${c.dim}[${ts()}]${c.reset} ${c.green}✓${c.reset} ${msg}`); }
function warn(msg) { console.log(`${c.dim}[${ts()}]${c.reset} ${c.yellow}⚠${c.reset} ${msg}`); }
function err(msg)  { console.log(`${c.dim}[${ts()}]${c.reset} ${c.red}✗${c.reset} ${msg}`); }

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
  if (o2 >= O2_TABLE[0].o2) return O2_TABLE[0];
  if (o2 <= O2_TABLE[O2_TABLE.length - 1].o2) return O2_TABLE[O2_TABLE.length - 1];

  const exact = O2_TABLE.find(r => r.o2 === Math.round(o2));
  if (exact) return exact;

  const upper = O2_TABLE.find(r => r.o2 <= o2);
  const lower = O2_TABLE.slice().reverse().find(r => r.o2 >= o2);
  const t = (upper.o2 - o2) / (upper.o2 - lower.o2);
  const lerp = ([a0, a1], [b0, b1]) => [a0 + (b0 - a0) * t, a1 + (b1 - a1) * t];
  return {
    o2,
    spo2: lerp(upper.spo2, lower.spo2),
    hr:   lerp(upper.hr,   lower.hr),
    rr:   lerp(upper.rr,   lower.rr),
    tv:   lerp(upper.tv,   lower.tv),
  };
}

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function walk(v, step, min, max) { return clamp(v + (Math.random() - 0.5) * 2 * step, min, max); }

function promptO2() {
  return new Promise((resolve) => {
    const rl = require('readline').createInterface({ input: process.stdin, output: process.stdout });
    const ask = () => {
      rl.question(`${c.bold}Enter O₂ concentration % (9–21): ${c.reset}`, (ans) => {
        const v = Number(ans.trim());
        if (!Number.isFinite(v) || v < 9 || v > 21) {
          console.log(`${c.yellow}Must be a number between 9 and 21.${c.reset}`);
          ask();
        } else {
          rl.close();
          resolve(v);
        }
      });
    };
    ask();
  });
}

const state = {};
let setO2;

function nextReading() {
  const r = interpolateRow(state.o2Percentage);

  state.spo2            = walk(state.spo2,            0.6,  r.spo2[0], r.spo2[1]);
  state.heartRate       = walk(state.heartRate,        2.0,  r.hr[0],   r.hr[1]);
  state.respiratoryRate = walk(state.respiratoryRate,  0.4,  r.rr[0],   r.rr[1]);
  state.tidalVolume     = walk(state.tidalVolume,      12,   r.tv[0],   r.tv[1]);
  state.o2Percentage    = walk(state.o2Percentage,     0.2,  Math.max(9, setO2 - 0.5), Math.min(21, setO2 + 0.5));

  return {
    spo2:            Math.round(state.spo2            * 10) / 10,
    heartRate:       Math.round(state.heartRate),
    respiratoryRate: Math.round(state.respiratoryRate * 10) / 10,
    tidalVolume:     Math.round(state.tidalVolume),
    o2Percentage:    Math.round(state.o2Percentage    * 10) / 10,
  };
}

async function postMeasurement(payload) {
  const res = await fetch(`${GATEWAY_URL}/api/device/measurements`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body:    JSON.stringify(payload),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`${res.status} ${body}`);
  }
  return res.json();
}

function spo2Label(v) {
  if (v < 78) return `${c.red}${c.bold}${v}%${c.reset}`;
  if (v < 89) return `${c.yellow}${v}%${c.reset}`;
  return `${c.green}${v}%${c.reset}`;
}

function o2Label(v) {
  if (v < 12) return `${c.red}${v}%${c.reset}`;
  if (v < 15) return `${c.yellow}${v}%${c.reset}`;
  if (v < 17) return `${c.cyan}${v}%${c.reset}`;
  return `${c.blue}${v}%${c.reset}`;
}

async function tick() {
  const reading = nextReading();
  try {
    await postMeasurement(reading);
    ok(
      `O₂(set) ${o2Label(setO2)}` +
      `  O₂(meas) ${o2Label(reading.o2Percentage)}` +
      `  SpO₂ ${spo2Label(reading.spo2)}` +
      `  HR ${c.white}${reading.heartRate}${c.reset} bpm` +
      `  RR ${c.white}${reading.respiratoryRate}${c.reset} /min` +
      `  TV ${c.white}${reading.tidalVolume}${c.reset} mL`,
    );
  } catch (e) {
    err(e.message);
  }
}

async function start() {
  setO2 = await promptO2();
  const row = interpolateRow(setO2);
  state.spo2            = midpoint(row.spo2);
  state.heartRate       = midpoint(row.hr);
  state.respiratoryRate = midpoint(row.rr);
  state.tidalVolume     = midpoint(row.tv);
  state.o2Percentage    = setO2;

  console.log(`${c.bold}${c.cyan}Hypoxy Device Simulator${c.reset}  ${c.dim}O₂ set: ${setO2}%  Press Ctrl+C to stop.${c.reset}`);
  tick();
  setInterval(tick, INTERVAL_MS);
}

start();

process.on('SIGINT', () => {
  console.log(`\n${c.dim}Simulator stopped.${c.reset}`);
  process.exit(0);
});