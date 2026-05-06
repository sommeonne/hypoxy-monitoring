import React, { useState, useRef, useEffect } from 'react';
import { useSocket } from '../hooks/useSocket';

interface AlertData {
  id: string;
  patientId: string;
  level: 'CRITICAL' | 'WARNING';
  message: string;
  values: Record<string, number>;
  createdAt: string;
}

interface AlertGroup {
  key: string;
  level: 'CRITICAL' | 'WARNING';
  title: string;
  subtitle: string;
  count: number;
  firstAt: number;
  lastAt: number;
}

const METRIC_LABELS: Record<string, string> = {
  spo2: 'SpO₂',
  heartRate: 'Heart Rate',
  respiratoryRate: 'Resp. Rate',
};

const WINDOW_MS = 60_000;
const SOUND_DEBOUNCE_MS = 3_000;

function getGroupKey(level: string, values: Record<string, number> | undefined): string {
  const metric = Object.keys(values ?? {})[0] ?? 'unknown';
  return `${level}_${metric}`;
}

function buildTitle(
  level: 'CRITICAL' | 'WARNING',
  values: Record<string, number> | undefined,
): string {
  const entries = Object.entries(values ?? {});
  if (!entries.length) return level === 'CRITICAL' ? 'Critical Alert' : 'Warning';
  const [key, val] = entries[0];
  const label = METRIC_LABELS[key] ?? key;

  if (key === 'spo2') {
    return `${label} ${level === 'CRITICAL' ? 'critically low' : 'low'} — ${val}%`;
  }
  if (key === 'heartRate') {
    return `${label} ${val > 80 ? 'elevated' : 'low'} — ${val} bpm`;
  }
  if (key === 'respiratoryRate') {
    return `${label} ${val > 20 ? 'elevated' : 'low'} — ${val}/min`;
  }
  return `${label} ${level === 'CRITICAL' ? 'critical' : 'warning'} — ${val}`;
}

export default function AlertPanel({ patientIds }: { patientIds: Set<string> }) {
  const { on } = useSocket();
  const [groups, setGroups] = useState<AlertGroup[]>([]);
  const [, setTick] = useState(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const lastSoundRef = useRef<Map<string, number>>(new Map());
  const groupsRef = useRef<AlertGroup[]>([]);
  const patientIdsRef = useRef<Set<string>>(patientIds);

  useEffect(() => {
    patientIdsRef.current = patientIds;
  }, [patientIds]);

  useEffect(() => {
    groupsRef.current = groups;
  }, [groups]);

  // Re-render every second to keep elapsed time fresh
  useEffect(() => {
    const id = setInterval(() => setTick((t) => t + 1), 1_000);
    return () => clearInterval(id);
  }, []);

  function getCtx(): AudioContext | null {
    try {
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new (window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext)();
      }
      if (audioCtxRef.current.state === 'suspended') {
        void audioCtxRef.current.resume();
      }
      return audioCtxRef.current;
    } catch {
      return null;
    }
  }

  function playTone(
    ctx: AudioContext,
    freq: number,
    duration: number,
    gain: number,
    startDelay: number,
  ) {
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    osc.frequency.value = freq;
    const t = ctx.currentTime + startDelay;
    gainNode.gain.setValueAtTime(gain, t);
    gainNode.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
  }

  function playSound(groupKey: string, type: 'critical' | 'warning' | 'tick') {
    const now = Date.now();
    if (now - (lastSoundRef.current.get(groupKey) ?? 0) < SOUND_DEBOUNCE_MS) return;
    lastSoundRef.current.set(groupKey, now);

    const ctx = getCtx();
    if (!ctx) return;

    if (type === 'critical') {
      // Two sharp beeps: 880Hz × 120ms, 80ms gap, 880Hz × 120ms
      playTone(ctx, 880, 0.12, 0.4, 0);
      playTone(ctx, 880, 0.12, 0.4, 0.20);
    } else if (type === 'warning') {
      playTone(ctx, 440, 0.20, 0.3, 0);
    } else {
      // Quiet tick for repeated collapse
      playTone(ctx, 660, 0.06, 0.2, 0);
    }
  }

  useEffect(() => {
    return on('alert:new', (alert: AlertData) => {
      const ids = patientIdsRef.current;
      if (!ids.has(alert.patientId)) return;
      const now = Date.now();
      const key = getGroupKey(alert.level, alert.values);
      const title = buildTitle(alert.level, alert.values);
      const isCollapse = groupsRef.current.some(
        (g) => g.key === key && now - g.lastAt < WINDOW_MS,
      );

      playSound(key, isCollapse ? 'tick' : alert.level === 'CRITICAL' ? 'critical' : 'warning');

      setGroups((prev) => {
        const idx = prev.findIndex((g) => g.key === key && now - g.lastAt < WINDOW_MS);
        if (idx >= 0) {
          const next = [...prev];
          next[idx] = { ...next[idx], count: next[idx].count + 1, lastAt: now };
          return next;
        }
        const newGroup: AlertGroup = {
          key,
          level: alert.level,
          title,
          subtitle: alert.message ?? '',
          count: 1,
          firstAt: now,
          lastAt: now,
        };
        return [newGroup, ...prev].slice(0, 3);
      });
    });
  }, [on]);

  if (!groups.length) return null;

  const criticalTotal = groups
    .filter((g) => g.level === 'CRITICAL')
    .reduce((sum, g) => sum + g.count, 0);

  return (
    <div
      style={{
        position: 'fixed',
        top: 72,
        right: 16,
        width: 320,
        zIndex: 1000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8,
        pointerEvents: 'auto',
      }}
    >
      {criticalTotal > 0 && (
        <div
          style={{
            alignSelf: 'flex-start',
            background: '#e24b4a',
            color: '#fff',
            fontSize: 11,
            fontWeight: 600,
            padding: '2px 8px',
            borderRadius: 10,
            lineHeight: '18px',
          }}
        >
          {criticalTotal} critical {criticalTotal === 1 ? 'alert' : 'alerts'}
        </div>
      )}

      {groups.map((group) => {
        const isCritical = group.level === 'CRITICAL';
        const elapsed = Math.round((Date.now() - group.firstAt) / 1_000);
        const timeStr = new Date(group.lastAt).toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });

        return (
          <div
            key={group.key}
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: 10,
              background: isCritical ? '#fff8f8' : '#fffbf4',
              border: `1px solid ${isCritical ? '#f09595' : '#fac775'}`,
              borderRadius: 10,
              padding: '12px 14px',
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: isCritical ? '#e24b4a' : '#ef9f27',
                flexShrink: 0,
                marginTop: 4,
              }}
            />

            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 13,
                  fontWeight: 500,
                  color: '#1e293b',
                  lineHeight: 1.35,
                }}
              >
                {group.title}
              </div>
              {group.subtitle && (
                <div
                  style={{
                    fontSize: 12,
                    color: '#64748b',
                    marginTop: 2,
                    lineHeight: 1.35,
                  }}
                >
                  {group.subtitle}
                </div>
              )}
              <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
                {timeStr}
                {group.count > 1 &&
                  ` · ${group.count} occurrences in last ${elapsed}s`}
              </div>
            </div>

            <button
              onClick={() =>
                setGroups((prev) => prev.filter((g) => g.key !== group.key))
              }
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#94a3b8',
                fontSize: 16,
                lineHeight: 1,
                padding: '0 0 0 4px',
                flexShrink: 0,
              }}
            >
              ×
            </button>
          </div>
        );
      })}
    </div>
  );
}
