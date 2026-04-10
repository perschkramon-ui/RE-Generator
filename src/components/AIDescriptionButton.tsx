import { useState } from 'react';
import { useStore } from '../store';
import { generateDescription } from '../utils/aiService';

interface Props {
  currentText: string;
  onGenerated: (text: string) => void;
}

export function AIDescriptionButton({ currentText, onGenerated }: Props) {
  const { company } = useStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const apiKey = company.aiApiKey ?? '';
  const model = company.aiModel ?? 'gpt-4o-mini';

  if (!apiKey) return null; // silently hide if no key

  async function handle() {
    const input = currentText.trim();
    if (!input) {
      setError('Bitte zuerst eine kurze Beschreibung eingeben.');
      setTimeout(() => setError(''), 3000);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await generateDescription(input, apiKey, model);
      onGenerated(result);
    } catch (err) {
      setError(String(err));
      setTimeout(() => setError(''), 5000);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handle}
        disabled={loading}
        title="Mit KI verbessern"
        className="text-xs text-purple-600 hover:text-purple-800 disabled:opacity-50 flex items-center gap-1"
      >
        {loading ? (
          <>
            <svg className="animate-spin w-3 h-3" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
            </svg>
            KI …
          </>
        ) : (
          <>✨ Verbessern</>
        )}
      </button>
      {error && (
        <div className="absolute left-0 top-6 z-20 w-64 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg p-2 shadow">
          {error}
        </div>
      )}
    </div>
  );
}
