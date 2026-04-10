import { useState, useRef } from 'react';
import { createWorker } from 'tesseract.js';
import { useStore } from '../store';
import type { LineItem } from '../types';
import {
  parseInvoiceFromText,
  parseReceiptFromOcr,
  type AIInvoiceDraft,
  type AIReceiptData,
} from '../utils/aiService';
import { Button } from './ui/Button';

type Mode = 'bullets' | 'ocr';

interface Props {
  onApply: (items: LineItem[], notes: string, customerHint: string) => void;
  onClose: () => void;
}

function Spinner() {
  return (
    <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
    </svg>
  );
}

export function AIWizard({ onApply, onClose }: Props) {
  const { company } = useStore();
  const apiKey = company.aiApiKey ?? '';
  const model = company.aiModel ?? 'gpt-4o-mini';

  const [mode, setMode] = useState<Mode>('bullets');
  const [bulletText, setBulletText] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [ocrProgress, setOcrProgress] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [draft, setDraft] = useState<AIInvoiceDraft | null>(null);
  const [receiptData, setReceiptData] = useState<AIReceiptData | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // ── OCR ────────────────────────────────────────────────────────────────────
  async function handleOcrFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError('');
    setOcrProgress('Bild wird geladen …');
    setLoading(true);
    try {
      const url = URL.createObjectURL(file);
      setOcrProgress('OCR läuft (kann 10-30 Sek. dauern) …');
      const worker = await createWorker('deu+eng', 1, {
        logger: (m: { status: string; progress: number }) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(`OCR: ${Math.round(m.progress * 100)} %`);
          }
        },
      });
      const { data } = await worker.recognize(url);
      await worker.terminate();
      URL.revokeObjectURL(url);
      setOcrText(data.text);
      setOcrProgress('');
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // ── AI: parse bullets → draft ──────────────────────────────────────────────
  async function handleBulletsSubmit() {
    if (!apiKey) { setError('Bitte erst den OpenAI API-Schlüssel in den Einstellungen hinterlegen.'); return; }
    if (!bulletText.trim()) { setError('Bitte Stichpunkte eingeben.'); return; }
    setLoading(true); setError('');
    try {
      const result = await parseInvoiceFromText(bulletText, apiKey, model);
      setDraft(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // ── AI: parse OCR text → receipt data ─────────────────────────────────────
  async function handleOcrSubmit() {
    if (!apiKey) { setError('Bitte erst den OpenAI API-Schlüssel in den Einstellungen hinterlegen.'); return; }
    if (!ocrText.trim()) { setError('Bitte zuerst ein Bild hochladen oder Text einfügen.'); return; }
    setLoading(true); setError('');
    try {
      const result = await parseReceiptFromOcr(ocrText, apiKey, model);
      setReceiptData(result);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  // ── Apply draft to invoice ─────────────────────────────────────────────────
  function applyDraft() {
    if (!draft) return;
    const items: LineItem[] = draft.items.map((it) => ({
      id: crypto.randomUUID(),
      description: it.description,
      quantity: it.quantity,
      unit: it.unit,
      unitPrice: it.unitPrice,
      vatRate: it.vatRate,
    }));
    onApply(items, draft.notes, draft.customerHint);
  }

  function applyReceipt() {
    if (!receiptData) return;
    const items: LineItem[] = receiptData.items.length > 0
      ? receiptData.items.map((it) => ({
          id: crypto.randomUUID(),
          description: it.description,
          quantity: 1,
          unit: 'pauschal',
          unitPrice: it.amount,
          vatRate: (receiptData.vatRate === 7 ? 7 : receiptData.vatRate === 0 ? 0 : 19) as LineItem['vatRate'],
        }))
      : [{
          id: crypto.randomUUID(),
          description: `Einkauf bei ${receiptData.vendorName}`,
          quantity: 1,
          unit: 'pauschal',
          unitPrice: receiptData.totalAmount - receiptData.vatAmount,
          vatRate: (receiptData.vatRate === 7 ? 7 : receiptData.vatRate === 0 ? 0 : 19) as LineItem['vatRate'],
        }];
    onApply(items, receiptData.notes, receiptData.vendorName);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-xl">✨</span>
            <h2 className="font-bold text-gray-900">KI-Assistent</h2>
            <span className="text-xs bg-purple-100 text-purple-600 px-2 py-0.5 rounded-full font-medium">Beta</span>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">×</button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-1 px-6 pt-4">
          {([
            { id: 'bullets' as Mode, label: '📝 Aus Stichpunkten', desc: 'Rechnung aus Text generieren' },
            { id: 'ocr' as Mode, label: '📷 Foto / Beleg scannen', desc: 'OCR + KI-Extraktion' },
          ]).map((t) => (
            <button
              key={t.id}
              onClick={() => { setMode(t.id); setError(''); setDraft(null); setReceiptData(null); }}
              className={`flex-1 px-4 py-2.5 rounded-lg text-sm font-medium text-left transition-colors ${
                mode === t.id ? 'bg-purple-50 text-purple-700 border border-purple-200' : 'text-gray-500 hover:bg-gray-50'
              }`}
            >
              <p>{t.label}</p>
              <p className="text-xs font-normal opacity-70">{t.desc}</p>
            </button>
          ))}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {!apiKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800">
              Kein OpenAI API-Schlüssel hinterlegt.
              Bitte gehe zu <strong>Einstellungen → KI-Assistent</strong> und trage deinen Schlüssel ein.
            </div>
          )}

          {/* ── Bullets mode ── */}
          {mode === 'bullets' && (
            <>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Stichpunkte zur Rechnung
                </label>
                <textarea
                  rows={6}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none"
                  placeholder={`Beispiel:\n- Website für Kunde Müller GmbH, 40 Stunden Webdesign à 90€\n- Logo-Erstellung pauschal 450€\n- Monatshosting 25€\n- 19% MwSt.\n- Zahlungsziel 14 Tage`}
                  value={bulletText}
                  onChange={(e) => setBulletText(e.target.value)}
                />
              </div>

              {!draft && (
                <Button onClick={handleBulletsSubmit} disabled={loading || !bulletText.trim()}>
                  {loading ? <><Spinner /> Generiere …</> : '✨ Rechnung generieren'}
                </Button>
              )}

              {/* Draft preview */}
              {draft && (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2">
                    {draft.customerHint && (
                      <p className="text-sm text-purple-700">
                        <span className="font-medium">Erkannter Kunde:</span> {draft.customerHint}
                      </p>
                    )}
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-xs text-gray-400 border-b border-purple-200">
                          <th className="text-left py-1">Beschreibung</th>
                          <th className="text-right py-1 w-16">Menge</th>
                          <th className="py-1 w-16">Einh.</th>
                          <th className="text-right py-1 w-24">Preis</th>
                          <th className="text-right py-1 w-16">MwSt.</th>
                        </tr>
                      </thead>
                      <tbody>
                        {draft.items.map((it, i) => (
                          <tr key={i} className="border-b border-purple-100 last:border-0">
                            <td className="py-1.5 pr-2 text-gray-700">{it.description}</td>
                            <td className="py-1.5 text-right text-gray-600">{it.quantity}</td>
                            <td className="py-1.5 text-gray-400 pl-1">{it.unit}</td>
                            <td className="py-1.5 text-right text-gray-700">{it.unitPrice.toFixed(2)} €</td>
                            <td className="py-1.5 text-right text-gray-400">{it.vatRate} %</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {draft.notes && <p className="text-xs text-gray-500 italic">{draft.notes}</p>}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={applyDraft}>Zur Rechnung übernehmen</Button>
                    <Button variant="secondary" onClick={() => setDraft(null)}>Nochmals generieren</Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* ── OCR mode ── */}
          {mode === 'ocr' && (
            <>
              {/* Upload area */}
              <label className="block cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-xl p-6 text-center hover:border-purple-400 hover:bg-purple-50 transition-colors">
                  <p className="text-2xl mb-2">📷</p>
                  <p className="text-sm font-medium text-gray-700">Belegfoto oder PDF-Scan hochladen</p>
                  <p className="text-xs text-gray-400 mt-1">PNG, JPG, TIFF — läuft vollständig im Browser (kein Upload)</p>
                  {ocrProgress && <p className="text-xs text-purple-600 mt-2 font-medium">{ocrProgress}</p>}
                </div>
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleOcrFile} />
              </label>

              {/* OCR text (editable) */}
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-1">
                  Erkannter Text (bearbeitbar)
                </label>
                <textarea
                  rows={5}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 resize-y font-mono"
                  placeholder="OCR-Text erscheint hier automatisch, oder füge Text manuell ein …"
                  value={ocrText}
                  onChange={(e) => setOcrText(e.target.value)}
                />
              </div>

              {!receiptData && (
                <Button onClick={handleOcrSubmit} disabled={loading || !ocrText.trim()}>
                  {loading ? <><Spinner /> Analysiere …</> : '✨ Beleg analysieren'}
                </Button>
              )}

              {/* Receipt preview */}
              {receiptData && (
                <div className="space-y-3">
                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 space-y-2 text-sm">
                    <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-gray-700">
                      {receiptData.vendorName && <p><span className="text-gray-400">Aussteller:</span> {receiptData.vendorName}</p>}
                      {receiptData.date && <p><span className="text-gray-400">Datum:</span> {receiptData.date}</p>}
                      {receiptData.invoiceNumber && <p><span className="text-gray-400">Beleg-Nr.:</span> {receiptData.invoiceNumber}</p>}
                      {receiptData.totalAmount > 0 && <p><span className="text-gray-400">Brutto:</span> {receiptData.totalAmount.toFixed(2)} €</p>}
                      {receiptData.vatAmount > 0 && <p><span className="text-gray-400">MwSt.:</span> {receiptData.vatAmount.toFixed(2)} € ({receiptData.vatRate} %)</p>}
                    </div>
                    {receiptData.items.length > 0 && (
                      <ul className="mt-2 space-y-0.5">
                        {receiptData.items.map((it, i) => (
                          <li key={i} className="flex justify-between text-xs text-gray-600">
                            <span>{it.description}</span>
                            <span>{it.amount.toFixed(2)} €</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={applyReceipt}>Zur Rechnung übernehmen</Button>
                    <Button variant="secondary" onClick={() => setReceiptData(null)}>Nochmals analysieren</Button>
                  </div>
                </div>
              )}
            </>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
        </div>

        <div className="px-6 py-3 border-t border-gray-100 flex justify-end">
          <Button variant="secondary" onClick={onClose}>Schließen</Button>
        </div>
      </div>
    </div>
  );
}
