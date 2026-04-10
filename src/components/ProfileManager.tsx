import { useState } from 'react';
import { useStore } from '../store';
import type { CompanyProfile } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

/** Inline profile switcher for the header */
export function ProfileSwitcher() {
  const { profiles, activeProfileId, switchProfile } = useStore();
  const [open, setOpen] = useState(false);

  if (profiles.length <= 1) return null;

  const active = profiles.find((p) => p.id === activeProfileId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="flex items-center gap-1.5 text-sm border border-gray-200 rounded-lg px-3 py-1.5 bg-white hover:bg-gray-50 transition-colors max-w-[180px]"
      >
        <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
        <span className="truncate text-gray-700 font-medium">{active?.profileName ?? 'Profil'}</span>
        <svg className="w-3 h-3 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-10 z-50 w-56 bg-white border border-gray-200 rounded-xl shadow-xl overflow-hidden">
          <p className="text-xs text-gray-400 px-3 pt-2 pb-1 uppercase tracking-wider font-medium">Firmenprofil wechseln</p>
          {profiles.map((p) => (
            <button
              key={p.id}
              onMouseDown={() => { switchProfile(p.id); setOpen(false); }}
              className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2 hover:bg-blue-50 transition-colors ${p.id === activeProfileId ? 'bg-blue-50' : ''}`}
            >
              <span className={`w-2 h-2 rounded-full shrink-0 ${p.id === activeProfileId ? 'bg-blue-500' : 'bg-gray-200'}`} />
              <div className="min-w-0">
                <p className="font-medium text-gray-800 truncate">{p.profileName}</p>
                <p className="text-xs text-gray-400 truncate">{p.name}</p>
              </div>
              {p.id === activeProfileId && <span className="ml-auto text-blue-500 text-xs">aktiv</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/** Full profile manager page */
export function ProfileManager() {
  const { profiles, activeProfileId, company, addProfile, updateProfile, deleteProfile, switchProfile } = useStore();
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CompanyProfile | null>(null);
  const [newName, setNewName] = useState('');

  function handleCreate() {
    if (!newName.trim()) return;
    const profile: CompanyProfile = {
      // Copy current company settings as starting point
      ...company,
      id: crypto.randomUUID(),
      profileName: newName.trim(),
      createdAt: new Date().toISOString(),
      // Reset invoice number to avoid conflicts
      nextInvoiceNumber: 1,
    };
    addProfile(profile);
    setCreating(false);
    setNewName('');
  }

  function handleRename(profile: CompanyProfile, name: string) {
    updateProfile({ ...profile, profileName: name });
    setEditing(null);
  }

  function handleDelete(id: string) {
    if (profiles.length <= 1) {
      alert('Das letzte Profil kann nicht gelöscht werden.');
      return;
    }
    if (confirm(`Profil wirklich löschen? Alle zugehörigen Rechnungsnummern bleiben erhalten.`)) {
      deleteProfile(id);
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">Firmenprofile</h2>
          <p className="text-xs text-gray-400 mt-0.5">Verwalte mehrere Marken oder Firmen — jede mit eigenem Logo, Farben und Rechnungsnummern.</p>
        </div>
        <Button onClick={() => setCreating(true)}>+ Neues Profil</Button>
      </div>

      {creating && (
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="font-medium text-gray-700">Neues Profil anlegen</h3>
          <p className="text-xs text-gray-400">Startet als Kopie des aktuellen Profils. Du kannst alle Angaben danach in den Einstellungen ändern.</p>
          <Input
            label="Profilname (intern)"
            placeholder="z. B. Freelance Design, Consulting GmbH …"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => { setCreating(false); setNewName(''); }}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={!newName.trim()}>Profil erstellen</Button>
          </div>
        </div>
      )}

      <div className="grid gap-3">
        {profiles.map((p) => (
          <div
            key={p.id}
            className={`bg-white border rounded-xl p-4 shadow-sm flex items-center gap-4 ${p.id === activeProfileId ? 'border-blue-300 ring-1 ring-blue-200' : ''}`}
          >
            {/* Color dot */}
            <div
              className="w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-white font-bold text-sm"
              style={{ backgroundColor: p.brandColor ?? '#1d4ed8' }}
            >
              {(p.profileName?.[0] ?? p.name?.[0] ?? '?').toUpperCase()}
            </div>

            <div className="flex-1 min-w-0">
              {editing?.id === p.id ? (
                <div className="flex gap-2">
                  <input
                    autoFocus
                    className="border border-gray-300 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 flex-1"
                    defaultValue={p.profileName}
                    onBlur={(e) => handleRename(p, e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleRename(p, (e.target as HTMLInputElement).value);
                      if (e.key === 'Escape') setEditing(null);
                    }}
                  />
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2">
                    <p className="font-semibold text-gray-800">{p.profileName}</p>
                    {p.id === activeProfileId && (
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">aktiv</span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500 truncate">{p.name}</p>
                  <div className="flex gap-3 mt-1 text-xs text-gray-400">
                    {p.taxNumber && <span>St.-Nr.: {p.taxNumber}</span>}
                    <span>Nächste RE: {p.invoicePrefix}-{p.nextInvoiceNumber}</span>
                  </div>
                </>
              )}
            </div>

            <div className="flex gap-2 shrink-0">
              {p.id !== activeProfileId && (
                <Button size="sm" onClick={() => switchProfile(p.id)}>
                  Aktivieren
                </Button>
              )}
              <Button variant="secondary" size="sm" onClick={() => setEditing(p)}>
                Umbenennen
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleDelete(p.id)}
                disabled={profiles.length <= 1}
              >
                Löschen
              </Button>
            </div>
          </div>
        ))}
      </div>

      {profiles.length > 1 && (
        <p className="text-xs text-gray-400 bg-blue-50 border border-blue-100 rounded-lg px-4 py-3">
          Das aktive Profil bestimmt Absenderdaten, Logo, Farben und Rechnungsnummern für neue Rechnungen.
          Du kannst jederzeit zwischen Profilen wechseln.
        </p>
      )}
    </div>
  );
}
