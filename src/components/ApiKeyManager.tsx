import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import { useStore } from '../store';
import { useAuth } from '../context/AuthContext';
import type { ApiKey, ApiKeyScope } from '../types';
import { Button } from './ui/Button';
import { Input } from './ui/Input';

const ALL_SCOPES: { scope: ApiKeyScope; label: string; desc: string }[] = [
  { scope: 'invoices:read',   label: 'Rechnungen lesen',     desc: 'GET /invoices, GET /invoices/:id' },
  { scope: 'invoices:write',  label: 'Rechnungen schreiben', desc: 'POST /invoices, PATCH /invoices/:id/status' },
  { scope: 'customers:read',  label: 'Kunden lesen',         desc: 'GET /customers, GET /customers/:id' },
  { scope: 'customers:write', label: 'Kunden schreiben',     desc: 'POST /customers' },
  { scope: 'products:read',   label: 'Produkte lesen',       desc: 'GET /products' },
];

const API_BASE = 'https://europe-west1-re-generator-f1de5.cloudfunctions.net/api/v1';

export function ApiKeyManager() {
  const { user } = useAuth();
  const { apiKeys, addApiKey, revokeApiKeyLocal, removeApiKey } = useStore();
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [scopes, setScopes] = useState<ApiKeyScope[]>(['invoices:read', 'customers:read']);
  const [expiresAt, setExpiresAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [newKey, setNewKey] = useState<{ plainKey: string; id: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDocs, setShowDocs] = useState(false);

  function toggleScope(s: ApiKeyScope) {
    setScopes((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  }

  async function handleCreate() {
    if (!name.trim() || scopes.length === 0 || !user) return;
    setLoading(true);
    try {
      const fn = httpsCallable<unknown, { id: string; plainKey: string; keyPrefix: string }>(functions, 'createApiKey');
      const result = await fn({ uid: user.uid, name: name.trim(), scopes, expiresAt: expiresAt || undefined });
      const { id, plainKey, keyPrefix } = result.data;
      const key: ApiKey = {
        id,
        name: name.trim(),
        keyHash: '',  // not stored client-side
        keyPrefix,
        scopes,
        createdAt: new Date().toISOString(),
        expiresAt: expiresAt || undefined,
        active: true,
      };
      addApiKey(key);
      setNewKey({ plainKey, id });
      setCreating(false);
      setName('');
      setScopes(['invoices:read', 'customers:read']);
      setExpiresAt('');
    } catch (e) {
      alert(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex justify-between items-start flex-wrap gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-800">API-Zugriff</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            REST API für Integrationen mit Zapier, Make, n8n, eigenen Apps u.v.m.
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setShowDocs((v) => !v)}>
            {showDocs ? 'Docs ausblenden' : '📖 API Docs'}
          </Button>
          <Button onClick={() => { setCreating(true); setNewKey(null); }}>+ API-Key erstellen</Button>
        </div>
      </div>

      {/* Base URL info */}
      <div className="bg-gray-900 rounded-xl p-4 text-sm font-mono">
        <p className="text-gray-400 text-xs mb-1">Base URL</p>
        <div className="flex items-center gap-2">
          <span className="text-green-400">{API_BASE}</span>
          <button
            onClick={() => handleCopy(API_BASE)}
            className="text-xs text-gray-500 hover:text-gray-300 ml-auto"
          >
            {copied ? '✓' : 'Kopieren'}
          </button>
        </div>
      </div>

      {/* API Docs */}
      {showDocs && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-5 space-y-4 text-sm">
          <h3 className="font-semibold text-gray-800">API-Dokumentation</h3>
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Authentifizierung</p>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400">
              Authorization: Bearer rgk_xxxxxxxxxxxx
            </div>
          </div>
          {[
            { method: 'GET',   path: '/invoices',              scope: 'invoices:read',   desc: 'Alle Rechnungen (max. 100)' },
            { method: 'GET',   path: '/invoices/:id',           scope: 'invoices:read',   desc: 'Eine Rechnung abrufen' },
            { method: 'POST',  path: '/invoices',               scope: 'invoices:write',  desc: 'Neue Rechnung erstellen' },
            { method: 'PATCH', path: '/invoices/:id/status',    scope: 'invoices:write',  desc: 'Status ändern (draft|sent|paid|cancelled)' },
            { method: 'GET',   path: '/customers',              scope: 'customers:read',  desc: 'Alle Kunden' },
            { method: 'GET',   path: '/customers/:id',          scope: 'customers:read',  desc: 'Einen Kunden abrufen' },
            { method: 'POST',  path: '/customers',              scope: 'customers:write', desc: 'Neuen Kunden anlegen' },
            { method: 'GET',   path: '/products',               scope: 'products:read',   desc: 'Alle Produkte/Leistungen' },
            { method: 'GET',   path: '/health',                 scope: '—',               desc: 'API-Status' },
          ].map((e) => (
            <div key={e.path + e.method} className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
              <span className={`text-xs font-bold px-2 py-0.5 rounded font-mono shrink-0 ${
                e.method === 'GET' ? 'bg-blue-100 text-blue-700'
                : e.method === 'POST' ? 'bg-green-100 text-green-700'
                : 'bg-amber-100 text-amber-700'
              }`}>{e.method}</span>
              <code className="text-xs text-gray-700 font-mono flex-1">{e.path}</code>
              <span className="text-xs text-gray-400 flex-1">{e.desc}</span>
              <span className="text-xs text-purple-600 font-mono shrink-0">{e.scope}</span>
            </div>
          ))}
          <div className="mt-3">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Beispiel: Rechnungen abrufen</p>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 leading-6">
              <span className="text-blue-400">curl</span> -H <span className="text-yellow-400">"Authorization: Bearer rgk_..."</span>{' '}
              <span className="text-gray-400">\</span><br />
              &nbsp;&nbsp;{API_BASE}/invoices
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Beispiel: Status auf bezahlt setzen</p>
            <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 leading-6">
              <span className="text-blue-400">curl</span> -X PATCH{' '}
              -H <span className="text-yellow-400">"Authorization: Bearer rgk_..."</span>{' '}<span className="text-gray-400">\</span><br />
              &nbsp;&nbsp;-H <span className="text-yellow-400">"Content-Type: application/json"</span>{' '}<span className="text-gray-400">\</span><br />
              &nbsp;&nbsp;-d <span className="text-yellow-400">'&#123;"status":"paid"&#125;'</span>{' '}<span className="text-gray-400">\</span><br />
              &nbsp;&nbsp;{API_BASE}/invoices/&#123;id&#125;/status
            </div>
          </div>
        </div>
      )}

      {/* New key reveal */}
      {newKey && (
        <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-5 space-y-3">
          <div className="flex items-start gap-2">
            <span className="text-xl">⚠️</span>
            <div>
              <p className="font-semibold text-amber-800">API-Key — jetzt kopieren!</p>
              <p className="text-sm text-amber-700">Dieser Schlüssel wird nur einmal angezeigt und danach niemals wieder im Klartext gespeichert.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-amber-300 rounded-lg p-3">
            <code className="font-mono text-sm text-gray-800 flex-1 select-all break-all">{newKey.plainKey}</code>
            <button
              onClick={() => handleCopy(newKey.plainKey)}
              className="shrink-0 bg-amber-500 text-white text-xs px-3 py-1.5 rounded-lg hover:bg-amber-600 font-medium"
            >
              {copied ? '✓ Kopiert' : 'Kopieren'}
            </button>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setNewKey(null)}>Schließen</Button>
        </div>
      )}

      {/* Create form */}
      {creating && (
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
          <h3 className="font-medium text-gray-700">Neuen API-Key erstellen</h3>
          <Input
            label="Name / Verwendungszweck"
            placeholder="z. B. Zapier Integration, Buchhaltungssoftware"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoFocus
          />
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-2">Berechtigungen (Scopes)</label>
            <div className="space-y-2">
              {ALL_SCOPES.map(({ scope, label, desc }) => (
                <label key={scope} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                  <input
                    type="checkbox"
                    className="mt-0.5 w-4 h-4 rounded accent-blue-600"
                    checked={scopes.includes(scope)}
                    onChange={() => toggleScope(scope)}
                  />
                  <div>
                    <p className="text-sm font-medium text-gray-700">{label}</p>
                    <p className="text-xs text-gray-400 font-mono">{desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <Input
            label="Ablaufdatum (optional)"
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
          <div className="flex gap-2 justify-end">
            <Button variant="secondary" onClick={() => setCreating(false)}>Abbrechen</Button>
            <Button onClick={handleCreate} disabled={loading || !name.trim() || scopes.length === 0}>
              {loading ? 'Erstelle …' : 'API-Key generieren'}
            </Button>
          </div>
        </div>
      )}

      {/* Key list */}
      {apiKeys.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Noch keine API-Keys erstellt.</p>
      ) : (
        <div className="grid gap-3">
          {apiKeys.map((k) => (
            <div key={k.id} className={`bg-white border rounded-xl p-4 shadow-sm flex items-start gap-4 ${!k.active ? 'opacity-50' : ''}`}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-semibold text-gray-800">{k.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${k.active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                    {k.active ? 'Aktiv' : 'Widerrufen'}
                  </span>
                  {k.expiresAt && <span className="text-xs text-amber-600">Läuft ab: {new Date(k.expiresAt).toLocaleDateString('de-DE')}</span>}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <code className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{k.keyPrefix}••••••••</code>
                  <span className="text-xs text-gray-400">Erstellt {new Date(k.createdAt).toLocaleDateString('de-DE')}</span>
                  {k.lastUsedAt && <span className="text-xs text-gray-400">· Zuletzt {new Date(k.lastUsedAt).toLocaleDateString('de-DE')}</span>}
                </div>
                <div className="flex flex-wrap gap-1 mt-1.5">
                  {k.scopes.map((s) => (
                    <span key={s} className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded font-mono">{s}</span>
                  ))}
                </div>
              </div>
              <div className="flex gap-2 shrink-0">
                {k.active && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => { if (confirm('Key widerrufen?')) revokeApiKeyLocal(k.id); }}
                    className="text-amber-700 border-amber-300"
                  >
                    Widerrufen
                  </Button>
                )}
                <Button
                  variant="danger"
                  size="sm"
                  onClick={() => { if (confirm('Key endgültig löschen?')) removeApiKey(k.id); }}
                >
                  Löschen
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
