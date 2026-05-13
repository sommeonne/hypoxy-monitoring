import React, { useEffect, useRef } from 'react';
import { notification } from 'antd';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from '../hooks/useSocket';
import { fetchPatient } from '../api/patients';

interface AlertPayload {
  patientId: string;
  sessionId: string;
  measurementId: string;
  level: string;
  values: string | Record<string, number>;
}

export default function AlertNotifier() {
  const { on } = useSocket();
  const queryClient = useQueryClient();
  const shownRef = useRef(new Set<string>());

  useEffect(() => {
    return on('alert:new', async (alert: AlertPayload) => {
      if (shownRef.current.has(alert.measurementId)) return;
      shownRef.current.add(alert.measurementId);

      let patientName = `Patient …${alert.patientId.slice(-6)}`;
      try {
        const patient = await queryClient.fetchQuery({
          queryKey: ['patient', alert.patientId],
          queryFn: () => fetchPatient(alert.patientId),
          staleTime: 5 * 60 * 1000,
        });
        patientName = `${patient.firstName} ${patient.lastName}`;
      } catch {}

      const values = typeof alert.values === 'string'
        ? JSON.parse(alert.values) as Record<string, number>
        : alert.values;

      const details = Object.entries(values)
        .map(([k, v]) => `${k}: ${v}`)
        .join(' · ');

      notification.error({
        message: <span style={{ fontSize: 12, fontWeight: 600 }}>{`Critical alert — ${patientName}`}</span>,
        description: <span style={{ fontSize: 11, color: '#666' }}>{details}</span>,
        duration: 8,
        placement: 'topRight',
        style: { padding: '7px 10px', minWidth: 0, width: 280 },
      });
    });
  }, [on, queryClient]);

  return null;
}
