import { useState } from 'react';
import { useStore } from '../store';
import type { Invoice } from '../types';
import {
  calcInvoiceTotals,
  formatCurrency,
  formatDate,
  daysOverdue,
  getNextDunningLevel,
  buildDunningText,
  calcInterest,
} from '../utils/invoiceUtils';
import { Button } from './ui/Button';

interface Props {
  invoice: Invoice;
}

export function DunningPanel({ invoice }: Props) {
  const { company, recordDunning } = useStore();
  const [copied, setCopied] = useState(false);

  const totals = calcInvoiceTotals(invoice.items);
  const grossAmount = company.smallBusiness ? totals.net : totals.gross;
  const days = daysOverdue(invoice.dueDate);
  const levels = company.dunningLevels ?? [];
  const nextLevel = getNextDunningLevel(invoice, levels);
  const history = invoice.dunningHistory ?? [];
  const currentLevel = invoice.dunningLevel ?? 0;

  if (invoice.status === 'paid' || invoice.status === 'cancelled') return null;

  async function handleSend(level: typeof nextLevel) {
    if (!level) return;
    const text = buildDunningText(invoice, level, grossAmount, company);
    await navigator.clipboard.writeText(text);
    recordDunning(invoice.id, level.level, level.fee, 'clipboard');
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
  }

  return (
    <div className="bg-white rounded-xl border shadow-sm overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">⚖️</span>
          <h3 className="font-semibold text-gray-800">Mahnsystem</h3>
          {days > 0 && (
            <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded-full font-medium">
              {days} {days === 1 ? 'Tag' : 'Tage'} überfällig
            </span>
          )}
        </div>
        <span className="text-xs text-gray-400">
          Mahnstufe {currentLevel} / {levels.length}
        </span>
      </div>

      <div className="p-5 space-y-5">
        {/* Dunning levels progress */}
        <div className="grid gap-2">
          {levels.map((lvl) => {
            const isDue = lvl.triggerAfterDays <= days;
            const isSent = history.some((h) => h.level === lvl.level);
            const isNext = nextLevel?.level === lvl.level;
            const interest = calcInterest(grossAmount, lvl.interestRatePercent, days);
            const totalFee = lvl.fee + interest;

            return (
              <div
                key={lvl.level}
                className={`flex items-center justify-between px-4 py-3 rounded-lg border text-sm transition-colors ${
                  isSent
                    ? 'bg-green-50 border-green-200'
                    : isNext
                    ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-300'
                    : isDue && !isSent
                    ? 'bg-red-50 border-red-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    isSent ? 'bg-green-500 text-white' : isNext ? 'bg-amber-500 text-white' : 'bg-gray-200 text-gray-500'
                  }`}>
                    {isSent ? '✓' : lvl.level}
                  </span>
                  <div>
                    <p className={`font-medium ${isSent ? 'text-green-700' : isNext ? 'text-amber-800' : 'text-gray-600'}`}>
                      {lvl.label}
                    </p>
                    <p className="text-xs text-gray-400">
                      fällig nach {lvl.triggerAfterDays} Tagen
                      {isSent && history.find(h => h.level === lvl.level) && (
                        <span className="ml-2">· gesendet {formatDate(history.find(h => h.level === lvl.level)!.sentAt)}</span>
                      )}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  {totalFee > 0 ? (
                    <div>
                      {lvl.fee > 0 && <p className="text-xs text-gray-500">Mahngebühr: {formatCurrency(lvl.fee)}</p>}
                      {interest > 0 && <p className="text-xs text-gray-500">Zinsen ({lvl.interestRatePercent}%): {formatCurrency(interest)}</p>}
                      <p className="text-xs font-semibold text-gray-700">Gesamt: {formatCurrency(grossAmount + totalFee)}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400">Keine Gebühren</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Next action */}
        {nextLevel ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-semibold text-amber-800 mb-1">
              Jetzt fällig: {nextLevel.label}
            </p>
            <p className="text-xs text-amber-700 mb-3">
              {nextLevel.fee > 0 && `Mahngebühr ${formatCurrency(nextLevel.fee)} · `}
              {nextLevel.interestRatePercent > 0 && `Verzugszinsen ${nextLevel.interestRatePercent} % p.a. (§288 BGB) · `}
              Fertig formulierter Mahnbrief wird in Zwischenablage kopiert.
            </p>
            <Button
              onClick={() => handleSend(nextLevel)}
              className="bg-amber-600 hover:bg-amber-700 text-white border-0"
            >
              {copied ? '✓ Mahnbrief kopiert!' : `${nextLevel.label} erstellen & kopieren`}
            </Button>
          </div>
        ) : days > 0 && currentLevel >= levels.length ? (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-800">
            <p className="font-semibold mb-1">Alle Mahnstufen ausgeschöpft</p>
            <p className="text-xs">Erwäge rechtliche Schritte oder ein Inkassounternehmen.</p>
          </div>
        ) : days <= 0 ? (
          <p className="text-sm text-gray-400 text-center py-2">Rechnung noch nicht überfällig.</p>
        ) : null}

        {/* History */}
        {history.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Mahnhistorie</p>
            <div className="space-y-1.5">
              {history.map((h, i) => {
                const lvl = levels.find((l) => l.level === h.level);
                return (
                  <div key={i} className="flex justify-between text-xs text-gray-600 bg-gray-50 px-3 py-2 rounded-lg">
                    <span>
                      {lvl?.label ?? `Stufe ${h.level}`}
                      {h.fee > 0 && <span className="text-gray-400 ml-2">· {formatCurrency(h.fee)} Gebühr</span>}
                    </span>
                    <span className="text-gray-400">{formatDate(h.sentAt)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
