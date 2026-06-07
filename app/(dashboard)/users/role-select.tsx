'use client'

import { useState } from 'react'

type Props = {
  userId: string
  currentRole: string
  roleLabels: Record<string, string>
  roleColors: Record<string, string>
}

export default function RoleSelect({ userId, currentRole, roleLabels, roleColors }: Props) {
  const [role, setRole] = useState(currentRole)
  const [saving, setSaving] = useState(false)

  const handleChange = async (newRole: string) => {
    if (newRole === role) return
    setSaving(true)
    try {
      await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      })
      setRole(newRole)
    } finally {
      setSaving(false)
    }
  }

  return (
    <select
      value={role}
      onChange={e => handleChange(e.target.value)}
      disabled={saving}
      className="rounded-md px-2.5 py-1 text-[12px] font-medium outline-none cursor-pointer transition-all"
      style={{
        background: 'var(--surface-2)',
        border: '1px solid var(--border)',
        color: roleColors[role] ?? 'var(--text)',
        opacity: saving ? 0.6 : 1,
      }}
    >
      {Object.entries(roleLabels).map(([value, label]) => (
        <option key={value} value={value}>{label}</option>
      ))}
    </select>
  )
}
