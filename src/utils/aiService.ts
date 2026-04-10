/** Lightweight OpenAI chat wrapper — no SDK, direct fetch */

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

async function chat(apiKey: string, model: string, messages: Message[]): Promise<string> {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ model, messages, temperature: 0.5 }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: { message?: string } }).error?.message ?? `API error ${res.status}`);
  }

  const data = await res.json() as {
    choices: { message: { content: string } }[];
  };
  return data.choices[0]?.message?.content?.trim() ?? '';
}

// ── Feature 1: Improve / generate a professional service description ──────────

export async function generateDescription(
  shortInput: string,
  apiKey: string,
  model = 'gpt-4o-mini'
): Promise<string> {
  return chat(apiKey, model, [
    {
      role: 'system',
      content:
        'Du bist ein Experte für professionelle Rechnungsstellung im deutschsprachigen Raum (DE/AT/CH). ' +
        'Formuliere präzise, sachliche Leistungsbeschreibungen für Rechnungen, wie sie auf einer rechtlich ' +
        'korrekten Rechnung erscheinen. Maximal 2-3 Sätze. Kein Markdown, kein HTML.',
    },
    {
      role: 'user',
      content: `Erstelle eine professionelle Leistungsbeschreibung für folgende Tätigkeit: "${shortInput}"`,
    },
  ]);
}

// ── Feature 2: Parse bullet points into structured invoice line items ──────────

export interface AILineItem {
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  vatRate: 0 | 7 | 19;
}

export interface AIInvoiceDraft {
  customerHint: string;    // extracted customer name/company if mentioned
  notes: string;
  items: AILineItem[];
}

export async function parseInvoiceFromText(
  bulletText: string,
  apiKey: string,
  model = 'gpt-4o-mini'
): Promise<AIInvoiceDraft> {
  const raw = await chat(apiKey, model, [
    {
      role: 'system',
      content:
        'Du bist ein Rechnungs-Assistent. Der Nutzer gibt dir Stichpunkte zu einer Rechnung. ' +
        'Gib ausschließlich valides JSON zurück (kein Markdown, keine Erklärungen). ' +
        'Schema: { "customerHint": string, "notes": string, "items": [ { "description": string, "quantity": number, "unit": string, "unitPrice": number, "vatRate": 0|7|19 } ] }. ' +
        'Verwende sinnvolle deutsche Einheiten (Std., Stk., pauschal, Monat). ' +
        'vatRate: 19 für normale Dienstleistungen/Waren, 7 für Lebensmittel/Bücher, 0 für steuerbefreite Leistungen.',
    },
    { role: 'user', content: bulletText },
  ]);

  try {
    // Strip possible markdown code block
    const json = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    return JSON.parse(json) as AIInvoiceDraft;
  } catch {
    throw new Error('KI-Antwort konnte nicht geparst werden. Bitte versuche es erneut.');
  }
}

// ── Feature 3: Extract invoice data from OCR text ─────────────────────────────

export interface AIReceiptData {
  vendorName: string;
  vendorAddress: string;
  date: string;          // ISO date or empty
  totalAmount: number;
  vatAmount: number;
  vatRate: number;
  items: { description: string; amount: number }[];
  invoiceNumber: string;
  notes: string;
}

export async function parseReceiptFromOcr(
  ocrText: string,
  apiKey: string,
  model = 'gpt-4o-mini'
): Promise<AIReceiptData> {
  const raw = await chat(apiKey, model, [
    {
      role: 'system',
      content:
        'Du extrahierst strukturierte Daten aus OCR-Text von Rechnungen oder Belegen. ' +
        'Gib nur valides JSON zurück (kein Markdown). ' +
        'Schema: { "vendorName": string, "vendorAddress": string, "date": string (YYYY-MM-DD oder leer), ' +
        '"totalAmount": number, "vatAmount": number, "vatRate": number, "invoiceNumber": string, ' +
        '"items": [{ "description": string, "amount": number }], "notes": string }. ' +
        'Fehlende Felder als leeren String oder 0.',
    },
    {
      role: 'user',
      content: `Extrahiere die Rechnungsdaten aus folgendem OCR-Text:\n\n${ocrText.slice(0, 4000)}`,
    },
  ]);

  try {
    const json = raw.replace(/^```(?:json)?\n?/i, '').replace(/\n?```$/i, '');
    return JSON.parse(json) as AIReceiptData;
  } catch {
    throw new Error('KI-Antwort konnte nicht geparst werden.');
  }
}
