import React from 'react';

interface Props {
  cardNumber: string;
  lastName: string;
  firstName: string;
  patronymic: string;
  dateOfBirth: string;
  gender: string;
  group: number | null;
  height: number | null;
  weight: number | null;
  phone: string;
  email: string;
  address: string;
  baselineHeartRate: number | null;
  baselineRespiratoryRate: number | null;
  baselineTidalVolume: number | null;
}

interface FieldProps {
  label: string;
  value: string | null | undefined;
  noBorder?: boolean;
  span?: boolean;
}

function Field({ label, value, noBorder, span }: FieldProps) {
  return (
    <div
      style={{
        padding: '16px 24px',
        borderBottom: noBorder ? 'none' : '1px solid #F3F4F6',
        gridColumn: span ? '1 / -1' : undefined,
        minWidth: 0,
      }}
    >
      {label && (
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: '#6B7280',
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          fontSize: 15,
          color: value ? '#111827' : '#D1D5DB',
          lineHeight: 1.4,
          wordBreak: 'break-word',
        }}
      >
        {value || '—'}
      </div>
    </div>
  );
}

export default function PatientInfoCard({
  cardNumber,
  lastName,
  firstName,
  patronymic,
  dateOfBirth,
  gender,
  group,
  height,
  weight,
  phone,
  email,
  address,
  baselineHeartRate,
  baselineRespiratoryRate,
  baselineTidalVolume,
}: Props) {
  const dob = dateOfBirth ? new Date(dateOfBirth).toLocaleDateString() : null;

  return (
    <div
      style={{
        background: '#fff',
        borderRadius: 12,
        border: '1px solid #E5E7EB',
        overflow: 'hidden',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '14px 24px',
          borderBottom: '1px solid #E5E7EB',
          background: '#fff',
        }}
      >
        <span style={{ fontSize: 15, fontWeight: 600, color: '#111827' }}>
          Patient Information
        </span>
        <span style={{ color: '#D1D5DB', margin: '0 12px', fontWeight: 300, fontSize: 18, lineHeight: 1 }}>
          |
        </span>
        <span style={{ fontSize: 14, color: '#9CA3AF', fontWeight: 400 }}>
          №{cardNumber || '—'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)' }}>

        <Field label="Last Name"   value={lastName} />
        <Field label="First Name"  value={firstName} />
        <Field label="Patronymic"  value={patronymic} />

        <Field label="Date of Birth" value={dob} />
        <Field label="Gender"        value={gender} />
        <Field label="Group"         value={group != null ? String(group) : null} />

        <Field label="Height" value={height != null ? `${height} cm` : null} />
        <Field label="Weight" value={weight != null ? `${weight} kg` : null} />
        <Field label="Baseline HR (bpm)" value={baselineHeartRate != null ? String(baselineHeartRate) : null} />

        <Field label="Baseline RR (/min)" value={baselineRespiratoryRate != null ? String(baselineRespiratoryRate) : null} />
        <Field label="Baseline Tidal Volume (mL)"  value={baselineTidalVolume != null ? String(baselineTidalVolume) : null} />
        <Field label="Phone" value={phone} />

        <Field label="Email"   value={email} />
        <Field label="Address" value={address} span noBorder />

      </div>
    </div>
  );
}
