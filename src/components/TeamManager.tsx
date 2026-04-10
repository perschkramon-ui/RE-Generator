import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useStore } from '../store';
import { useAuth } from '../context/AuthContext';
import { usePermissions } from '../hooks/usePermission';
import type { TeamMember, TeamRole } from '../types';
import { ROLE_LABELS, ROLE_DESCRIPTIONS, ROLE_PERMISSIONS } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const ASSIGNABLE_ROLES: TeamRole[] = ['admin', 'accountant', 'viewer'];

export function TeamManager() {
  const { user } = useAuth();
  const { can } = usePermissions();
  const { teamMembers, addTeamMember, updateTeamMemberRole, removeTeamMember } = useStore();

  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamRole>('accountant');
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');
  const [invited, setInvited] = useState<string | null>(null);

  if (!can('team:read')) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-amber-800 text-sm">
        Du hast keine Berechtigung, das Team zu verwalten.
      </div>
    );
  }

  async function handleAdd() {
    setError('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Bitte eine gültige E-Mail-Adresse eingeben.');
      return;
    }
    if (teamMembers.some((m) => m.email === email.trim())) {
      setError('Diese E-Mail ist bereits im Team.');
      return;
    }

    const member: TeamMember = {
      id: email.trim(),
      uid: '',
      email: email.trim(),
      role,
      status: 'pending',
      invitedAt: new Date().toISOString(),
      invitedBy: user?.uid ?? '',
      ownerUid: user?.uid ?? '',
    };
    addTeamMember(member);

    // Send invite email via Cloud Function (best-effort)
    try {
      const fn = httpsCallable(functions, 'sendTeamInvite');
      await fn({
        toEmail: email.trim(),
        inviterName: user?.displayName ?? user?.email ?? 'Dein Team',
        companyName: '', // will use store company name
        role,
        appUrl: window.location.origin,
      });
    } catch {
      // email sending failure is non-critical
    }

    setInvited(email.trim());
    setEmail('');
    setAdding(false);
    setTimeout(() => setInvited(null), 5000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Teamzugänge</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            Mitarbeiter einladen und Berechtigungen verwalten.
          </p>
        </div>
        {can('team:write') && (
          <Button onClick={() => { setAdding(true); setError(''); }}>+ Mitarbeiter einladen</Button>
        )}
      </div>

      {invited && (
        <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-3 text-sm text-green-700">
          ✓ <strong>{invited}</strong> wurde eingeladen. Sie können sich mit dieser E-Mail registrieren und haben dann Zugriff.
        </div>
      )}

      {adding && (
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-medium text-gray-700">Mitarbeiter einladen</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <Input
                label="E-Mail-Adresse"
                type="email"
                required
                placeholder="mitarbeiter@firma.de"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
                error={error}
              />
            </div>
            <div className="col-span-2">
              <label className="text-sm font-medium text-gray-700 block mb-2">Rolle</label>
              <div className="grid grid-cols-3 gap-2">
                {ASSIGNABLE_ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`text-left p-3 rounded-xl border transition-colors ${
                      role === r ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-semibold text-sm text-gray-800">{ROLE_LABELS[r]}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{ROLE_DESCRIPTIONS[r]}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => { setAdding(false); setError(''); }}>Abbrechen</Button>
            <Button onClick={handleAdd}>Einladung erstellen</Button>
          </div>
        </div>
      )}

      {/* Role legend */}
      <div className="grid grid-cols-2 gap-3">
        {(['admin', 'accountant', 'viewer'] as TeamRole[]).map((r) => (
          <div key={r} className="bg-gray-50 border border-gray-200 rounded-xl p-4">
            <p className="font-semibold text-sm text-gray-800 mb-1">{ROLE_LABELS[r]}</p>
            <p className="text-xs text-gray-400 mb-2">{ROLE_DESCRIPTIONS[r]}</p>
            <div className="flex flex-wrap gap-1">
              {ROLE_PERMISSIONS[r].map((perm) => (
                <span key={perm} className="text-[10px] bg-white border border-gray-200 text-gray-500 px-1.5 py-0.5 rounded">
                  {perm}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Member list */}
      {teamMembers.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Noch keine Teammitglieder eingeladen.</p>
      ) : (
        <div className="grid gap-3">
          {teamMembers.map((m) => (
            <div key={m.email} className="bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4">
              {/* Avatar */}
              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-gray-600 font-semibold text-sm shrink-0">
                {(m.displayName ?? m.email)[0].toUpperCase()}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-800 truncate">{m.displayName ?? m.email}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                    m.status === 'active' ? 'bg-green-100 text-green-700'
                    : m.status === 'pending' ? 'bg-amber-100 text-amber-700'
                    : 'bg-gray-100 text-gray-500'
                  }`}>
                    {m.status === 'active' ? 'Aktiv' : m.status === 'pending' ? 'Einladung ausstehend' : 'Deaktiviert'}
                  </span>
                </div>
                {m.displayName && <p className="text-xs text-gray-400">{m.email}</p>}
                <p className="text-xs text-gray-400 mt-0.5">
                  Eingeladen {new Date(m.invitedAt).toLocaleDateString('de-DE')}
                  {m.acceptedAt && ` · Angenommen ${new Date(m.acceptedAt).toLocaleDateString('de-DE')}`}
                </p>
              </div>

              {/* Role selector */}
              {can('team:write') ? (
                <select
                  value={m.role}
                  onChange={(e) => updateTeamMemberRole(m.uid || m.email, e.target.value as TeamRole)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shrink-0"
                >
                  {ASSIGNABLE_ROLES.map((r) => (
                    <option key={r} value={r}>{ROLE_LABELS[r]}</option>
                  ))}
                </select>
              ) : (
                <span className="text-sm text-gray-600 shrink-0">{ROLE_LABELS[m.role]}</span>
              )}

              {/* Remove */}
              {can('team:write') && (
                <button
                  onClick={() => {
                    if (confirm(`${m.email} aus dem Team entfernen?`)) {
                      removeTeamMember(m.uid || m.email);
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-red-50 text-red-400 hover:bg-red-100 flex items-center justify-center text-base font-bold shrink-0"
                  title="Aus Team entfernen"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
