import type { VatRate } from '../types';

export interface CatalogItem {
  name: string;
  description: string;       // Erscheint auf der Rechnung
  unitPrice: number;         // Verkaufspreis netto (Vorschlag)
  purchasePrice?: number;    // Einkaufspreis netto (Vorschlag)
  unit: string;
  vatRate: VatRate;
  category: string;
  articleNumber?: string;    // Hersteller-/Lieferanten-Nr.
  suggestedMinStock?: number; // Empfohlener Mindestbestand
}

export interface IndustryCatalog {
  id: string;
  name: string;
  emoji: string;
  description: string;
  color: string;
  items: CatalogItem[];
}

export const INDUSTRY_CATALOGS: IndustryCatalog[] = [
  {
    id: 'elektro',
    name: 'Elektrotechnik',
    emoji: '⚡',
    description: 'Kabel, Leitungen, Klemmen, Schalter, Dosen, Verteilertechnik',
    color: '#eab308',
    items: [
      // ── Leitungen & Kabel ─────────────────────────────────────────────────
      { name: 'NYM-J 3x1,5mm²', description: 'Feuchtraumkabel NYM-J 3x1,5mm², grau', unitPrice: 0.85, purchasePrice: 0.48, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'NYM3x1.5', suggestedMinStock: 100 },
      { name: 'NYM-J 3x2,5mm²', description: 'Feuchtraumkabel NYM-J 3x2,5mm², grau', unitPrice: 1.20, purchasePrice: 0.70, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'NYM3x2.5', suggestedMinStock: 50 },
      { name: 'NYM-J 5x1,5mm²', description: 'Feuchtraumkabel NYM-J 5x1,5mm², grau', unitPrice: 1.45, purchasePrice: 0.85, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'NYM5x1.5', suggestedMinStock: 50 },
      { name: 'NYM-J 5x2,5mm²', description: 'Feuchtraumkabel NYM-J 5x2,5mm², grau', unitPrice: 2.10, purchasePrice: 1.25, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'NYM5x2.5', suggestedMinStock: 30 },
      { name: 'H07V-K 1,5mm² sw', description: 'Einzelader flexibel H07V-K 1,5mm², schwarz', unitPrice: 0.32, purchasePrice: 0.18, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'H07VK1.5SW', suggestedMinStock: 50 },
      { name: 'H07V-K 1,5mm² bl', description: 'Einzelader flexibel H07V-K 1,5mm², blau', unitPrice: 0.32, purchasePrice: 0.18, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'H07VK1.5BL', suggestedMinStock: 50 },
      { name: 'H07V-K 1,5mm² gr/ge', description: 'Einzelader flexibel H07V-K 1,5mm², grün/gelb (PE)', unitPrice: 0.32, purchasePrice: 0.18, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'H07VK1.5GG', suggestedMinStock: 30 },
      { name: 'H07V-K 2,5mm² sw', description: 'Einzelader flexibel H07V-K 2,5mm², schwarz', unitPrice: 0.52, purchasePrice: 0.30, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'H07VK2.5SW', suggestedMinStock: 30 },
      { name: 'CAT6 Verlegekabel', description: 'Netzwerkkabel CAT6 U/UTP, starr, 4x2x0,6mm²', unitPrice: 0.68, purchasePrice: 0.38, unit: 'm', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'CAT6-VERL', suggestedMinStock: 50 },
      { name: 'KFLEX Kabelkanal 25x25', description: 'PVC-Kabelkanal 25x25mm, weiß, 2m Stück', unitPrice: 2.40, purchasePrice: 1.30, unit: 'Stk.', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'KK25x25', suggestedMinStock: 10 },
      { name: 'KFLEX Kabelkanal 40x25', description: 'PVC-Kabelkanal 40x25mm, weiß, 2m Stück', unitPrice: 3.20, purchasePrice: 1.80, unit: 'Stk.', vatRate: 19, category: 'Leitungen & Kabel', articleNumber: 'KK40x25', suggestedMinStock: 10 },
      // ── Verbindungstechnik / Klemmen ──────────────────────────────────────
      { name: 'Wago 221-412 (2-Leiter)', description: 'Wago Verbindungsklemme 221-412, 2-Leiter, 0,2–4mm²', unitPrice: 0.65, purchasePrice: 0.35, unit: 'Stk.', vatRate: 19, category: 'Verbindungstechnik', articleNumber: 'WAG221-412', suggestedMinStock: 100 },
      { name: 'Wago 221-413 (3-Leiter)', description: 'Wago Verbindungsklemme 221-413, 3-Leiter, 0,2–4mm²', unitPrice: 0.75, purchasePrice: 0.42, unit: 'Stk.', vatRate: 19, category: 'Verbindungstechnik', articleNumber: 'WAG221-413', suggestedMinStock: 100 },
      { name: 'Wago 221-415 (5-Leiter)', description: 'Wago Verbindungsklemme 221-415, 5-Leiter, 0,2–4mm²', unitPrice: 0.95, purchasePrice: 0.55, unit: 'Stk.', vatRate: 19, category: 'Verbindungstechnik', articleNumber: 'WAG221-415', suggestedMinStock: 50 },
      { name: 'Lüsterklemme 2,5mm² (10er)', description: 'Schraubklemme / Lüsterklemme 2,5mm², 10er-Streifen', unitPrice: 0.45, purchasePrice: 0.22, unit: 'Stk.', vatRate: 19, category: 'Verbindungstechnik', articleNumber: 'LUEST2.5', suggestedMinStock: 50 },
      { name: 'Adernendhülse 1,5mm² (100er)', description: 'Adernendhülse isoliert 1,5mm², grau, 100 Stück', unitPrice: 2.80, purchasePrice: 1.50, unit: 'Pkg.', vatRate: 19, category: 'Verbindungstechnik', articleNumber: 'ANH1.5-100', suggestedMinStock: 5 },
      { name: 'Adernendhülse 2,5mm² (100er)', description: 'Adernendhülse isoliert 2,5mm², blau, 100 Stück', unitPrice: 3.20, purchasePrice: 1.80, unit: 'Pkg.', vatRate: 19, category: 'Verbindungstechnik', articleNumber: 'ANH2.5-100', suggestedMinStock: 5 },
      // ── Installationsmaterial / Dosen ─────────────────────────────────────
      { name: 'UP-Schalterdose 60mm', description: 'Unterputz-Gerätedose 60mm tief, Ø 68mm, mit Schraubenösen', unitPrice: 0.55, purchasePrice: 0.28, unit: 'Stk.', vatRate: 19, category: 'Dosen & Gehäuse', articleNumber: 'UPDO60', suggestedMinStock: 30 },
      { name: 'Abzweigdose 85x85mm IP65', description: 'Feuchtraumabzweigdose 85x85mm, IP65, mit Klemmen', unitPrice: 2.80, purchasePrice: 1.60, unit: 'Stk.', vatRate: 19, category: 'Dosen & Gehäuse', articleNumber: 'ABZDO85-IP65', suggestedMinStock: 10 },
      { name: 'Unterverteiler 12TE', description: 'AP-Unterverteiler, 1-reihig, 12TE, mit Tür', unitPrice: 18.50, purchasePrice: 11.00, unit: 'Stk.', vatRate: 19, category: 'Dosen & Gehäuse', articleNumber: 'UV12TE', suggestedMinStock: 2 },
      { name: 'Abdeckrahmen 1-fach EDIZIOdue', description: 'Abdeckrahmen 1-fach, alpinweiß, Feller/Berker kompatibel', unitPrice: 3.20, purchasePrice: 1.80, unit: 'Stk.', vatRate: 19, category: 'Dosen & Gehäuse', articleNumber: 'ARH1F', suggestedMinStock: 20 },
      // ── Schutzschalter & Sicherungen ─────────────────────────────────────
      { name: 'LS-Schalter B16A 1-pol.', description: 'Leitungsschutzschalter B16A 1-polig, 6kA', unitPrice: 8.50, purchasePrice: 4.80, unit: 'Stk.', vatRate: 19, category: 'Schutzschalter', articleNumber: 'LSS-B16-1P', suggestedMinStock: 10 },
      { name: 'LS-Schalter B16A 3-pol.', description: 'Leitungsschutzschalter B16A 3-polig, 6kA', unitPrice: 22.00, purchasePrice: 13.00, unit: 'Stk.', vatRate: 19, category: 'Schutzschalter', articleNumber: 'LSS-B16-3P', suggestedMinStock: 5 },
      { name: 'LS-Schalter C16A 1-pol.', description: 'Leitungsschutzschalter C16A 1-polig, 6kA', unitPrice: 8.50, purchasePrice: 4.80, unit: 'Stk.', vatRate: 19, category: 'Schutzschalter', articleNumber: 'LSS-C16-1P', suggestedMinStock: 5 },
      { name: 'FI-Schutzschalter 40A/30mA 2-pol.', description: 'FI-Schutzschalter (RCD) 40A/30mA Typ A, 2-polig', unitPrice: 38.00, purchasePrice: 22.00, unit: 'Stk.', vatRate: 19, category: 'Schutzschalter', articleNumber: 'FI40-30-2P', suggestedMinStock: 3 },
      { name: 'FI-Schutzschalter 40A/30mA 4-pol.', description: 'FI-Schutzschalter (RCD) 40A/30mA Typ A, 4-polig', unitPrice: 68.00, purchasePrice: 40.00, unit: 'Stk.', vatRate: 19, category: 'Schutzschalter', articleNumber: 'FI40-30-4P', suggestedMinStock: 2 },
      // ── Schalter & Steckdosen ─────────────────────────────────────────────
      { name: 'Schuko-Steckdose UP Rahmen', description: 'Schuko-Steckdose UP, erhöhter Berührungsschutz, Serie M', unitPrice: 4.80, purchasePrice: 2.60, unit: 'Stk.', vatRate: 19, category: 'Schalter & Steckdosen', articleNumber: 'DO-UP-SK', suggestedMinStock: 20 },
      { name: 'Wechselschalter UP', description: 'Wechselschalter UP, 10A, Serie M, mit Abdeckung', unitPrice: 5.20, purchasePrice: 2.80, unit: 'Stk.', vatRate: 19, category: 'Schalter & Steckdosen', articleNumber: 'SCH-UP-W', suggestedMinStock: 15 },
      { name: 'Serienschalter UP', description: 'Serienschalter UP, 10A, Serie M, mit Abdeckung', unitPrice: 6.50, purchasePrice: 3.60, unit: 'Stk.', vatRate: 19, category: 'Schalter & Steckdosen', articleNumber: 'SCH-UP-SE', suggestedMinStock: 10 },
      { name: 'CAT6-Dose UP RJ45', description: 'Netzwerkdose CAT6 RJ45 UP, 1-Port, Keystone', unitPrice: 12.00, purchasePrice: 7.00, unit: 'Stk.', vatRate: 19, category: 'Schalter & Steckdosen', articleNumber: 'DO-CAT6-UP', suggestedMinStock: 10 },
      // ── Kleinmaterial / Befestigung ───────────────────────────────────────
      { name: 'Kabelbinder 200mm natur (100er)', description: 'Kabelbinder 200x3,6mm, natur, 100 Stück', unitPrice: 2.20, purchasePrice: 1.10, unit: 'Pkg.', vatRate: 19, category: 'Kleinmaterial', articleNumber: 'KB200-N100', suggestedMinStock: 5 },
      { name: 'Iso-Band schwarz 10m', description: 'PVC-Isolierband schwarz, 15mm x 10m', unitPrice: 1.80, purchasePrice: 0.90, unit: 'Rolle', vatRate: 19, category: 'Kleinmaterial', articleNumber: 'ISOBAND-SW', suggestedMinStock: 10 },
      { name: 'Dübel + Schraube 6x40 (50er)', description: 'Universaldübel 6mm + Schraube 4x40, verzinkt, 50er-Set', unitPrice: 3.50, purchasePrice: 1.80, unit: 'Pkg.', vatRate: 19, category: 'Kleinmaterial', articleNumber: 'DUB6x40-50', suggestedMinStock: 5 },
      { name: 'Schraube M4x16 Kreuzschlitz (100er)', description: 'Zylinderkopfschraube M4x16 Kreuzschlitz verzinkt, 100er', unitPrice: 2.20, purchasePrice: 1.10, unit: 'Pkg.', vatRate: 19, category: 'Kleinmaterial', articleNumber: 'SCR-M4x16-100', suggestedMinStock: 3 },
      { name: 'Einziehdraht 50m', description: 'Einziehdraht Stahl verzinkt, Ø 1,2mm, 50m Rolle', unitPrice: 8.50, purchasePrice: 4.80, unit: 'Rolle', vatRate: 19, category: 'Kleinmaterial', articleNumber: 'EINZ50M', suggestedMinStock: 2 },
      { name: 'Silikon transp. 310ml', description: 'Transparentes Silikon, 310ml Kartusche, Universal', unitPrice: 4.20, purchasePrice: 2.30, unit: 'Stk.', vatRate: 19, category: 'Kleinmaterial', articleNumber: 'SIL-TRANSP-310', suggestedMinStock: 5 },
    ],
  },

  {
    id: 'shk',
    name: 'Sanitär & Heizung',
    emoji: '🔧',
    description: 'Rohre, Fittings, Ventile, Armaturen, Dichtungen',
    color: '#0284c7',
    items: [
      // ── Kupfer-Rohrleitungen ──────────────────────────────────────────────
      { name: 'Kupferrohr 15x1mm (Stange)', description: 'Kupferrohr weich 15x1mm, 5m Stange, EN 1057', unitPrice: 18.50, purchasePrice: 11.00, unit: 'Stk.', vatRate: 19, category: 'Kupferrohrleitungen', articleNumber: 'KU15x1-5M', suggestedMinStock: 5 },
      { name: 'Kupferrohr 22x1mm (Stange)', description: 'Kupferrohr weich 22x1mm, 5m Stange, EN 1057', unitPrice: 28.00, purchasePrice: 17.00, unit: 'Stk.', vatRate: 19, category: 'Kupferrohrleitungen', articleNumber: 'KU22x1-5M', suggestedMinStock: 5 },
      { name: 'Kupferrohr 28x1,5mm (Stange)', description: 'Kupferrohr weich 28x1,5mm, 5m Stange, EN 1057', unitPrice: 52.00, purchasePrice: 32.00, unit: 'Stk.', vatRate: 19, category: 'Kupferrohrleitungen', articleNumber: 'KU28x1.5-5M', suggestedMinStock: 3 },
      // ── Press-Fittings ────────────────────────────────────────────────────
      { name: 'Pressbogen 15mm 90° (Cu)', description: 'Pressbogen 90° für Kupfer 15mm, DVGW', unitPrice: 3.20, purchasePrice: 1.80, unit: 'Stk.', vatRate: 19, category: 'Press-Fittings Kupfer', articleNumber: 'PBK15-90', suggestedMinStock: 20 },
      { name: 'Pressbogen 22mm 90° (Cu)', description: 'Pressbogen 90° für Kupfer 22mm, DVGW', unitPrice: 5.80, purchasePrice: 3.30, unit: 'Stk.', vatRate: 19, category: 'Press-Fittings Kupfer', articleNumber: 'PBK22-90', suggestedMinStock: 15 },
      { name: 'Presskupplung 15mm (Cu)', description: 'Presskupplung gerade für Kupfer 15mm, DVGW', unitPrice: 2.80, purchasePrice: 1.55, unit: 'Stk.', vatRate: 19, category: 'Press-Fittings Kupfer', articleNumber: 'PKU15', suggestedMinStock: 20 },
      { name: 'Presskupplung 22mm (Cu)', description: 'Presskupplung gerade für Kupfer 22mm, DVGW', unitPrice: 4.50, purchasePrice: 2.60, unit: 'Stk.', vatRate: 19, category: 'Press-Fittings Kupfer', articleNumber: 'PKU22', suggestedMinStock: 15 },
      { name: 'Pres-T-Stück 15mm (Cu)', description: 'Pres-T gleichschenkliges T-Stück 15mm, Kupfer', unitPrice: 5.20, purchasePrice: 2.90, unit: 'Stk.', vatRate: 19, category: 'Press-Fittings Kupfer', articleNumber: 'PTK15', suggestedMinStock: 10 },
      // ── Verbundrohr / Mehrschicht ─────────────────────────────────────────
      { name: 'Verbundrohr 16x2mm (Rolle)', description: 'Mehrschichtverbundrohr 16x2mm, 50m Rolle, DVGW', unitPrice: 42.00, purchasePrice: 25.00, unit: 'Rolle', vatRate: 19, category: 'Verbundrohr', articleNumber: 'VBR16-50M', suggestedMinStock: 2 },
      { name: 'Verbundrohr 20x2mm (Rolle)', description: 'Mehrschichtverbundrohr 20x2mm, 50m Rolle, DVGW', unitPrice: 65.00, purchasePrice: 38.00, unit: 'Rolle', vatRate: 19, category: 'Verbundrohr', articleNumber: 'VBR20-50M', suggestedMinStock: 1 },
      { name: 'Pressring-Fitting 16mm (VBR)', description: 'Pressring-Fitting Kupplung 16mm für Verbundrohr', unitPrice: 2.20, purchasePrice: 1.20, unit: 'Stk.', vatRate: 19, category: 'Verbundrohr', articleNumber: 'PRF16-KU', suggestedMinStock: 20 },
      { name: 'Pressring-Fitting T 16mm (VBR)', description: 'Pressring-Fitting T-Stück 16mm für Verbundrohr', unitPrice: 3.80, purchasePrice: 2.10, unit: 'Stk.', vatRate: 19, category: 'Verbundrohr', articleNumber: 'PRF16-T', suggestedMinStock: 10 },
      // ── Ventile & Hähne ───────────────────────────────────────────────────
      { name: 'Kugelhahn 1/2" IG/IG', description: 'Kugelhahn Messing DN15 (1/2") IG/IG, vollständig', unitPrice: 8.50, purchasePrice: 4.80, unit: 'Stk.', vatRate: 19, category: 'Ventile & Hähne', articleNumber: 'KH12-IGIG', suggestedMinStock: 10 },
      { name: 'Kugelhahn 3/4" IG/IG', description: 'Kugelhahn Messing DN20 (3/4") IG/IG, vollständig', unitPrice: 12.50, purchasePrice: 7.20, unit: 'Stk.', vatRate: 19, category: 'Ventile & Hähne', articleNumber: 'KH34-IGIG', suggestedMinStock: 5 },
      { name: 'Thermostatventil Heizkörper', description: 'Thermostatventilunterteil 1/2" Eck, Messing vernickelt', unitPrice: 8.80, purchasePrice: 5.00, unit: 'Stk.', vatRate: 19, category: 'Ventile & Hähne', articleNumber: 'TVU12-ECK', suggestedMinStock: 10 },
      { name: 'Thermostat-Kopf (analog)', description: 'Thermostat-Kopf für Heizkörper, 6–28°C', unitPrice: 9.50, purchasePrice: 5.50, unit: 'Stk.', vatRate: 19, category: 'Ventile & Hähne', articleNumber: 'TVK-ANA', suggestedMinStock: 10 },
      // ── Dichtungen & Kleinmaterial ────────────────────────────────────────
      { name: 'Flachdichtung 1/2" EPDM (10er)', description: 'Flachdichtung 13,0x20,0x2,0mm EPDM für 1/2", 10er-Pack', unitPrice: 1.20, purchasePrice: 0.60, unit: 'Pkg.', vatRate: 19, category: 'Dichtungen & Kleinmaterial', articleNumber: 'FLDI12-10', suggestedMinStock: 5 },
      { name: 'Flachdichtung 3/4" EPDM (10er)', description: 'Flachdichtung 20,0x26,5x2,0mm EPDM für 3/4", 10er-Pack', unitPrice: 1.50, purchasePrice: 0.75, unit: 'Pkg.', vatRate: 19, category: 'Dichtungen & Kleinmaterial', articleNumber: 'FLDI34-10', suggestedMinStock: 5 },
      { name: 'Gewindeband PTFE 12m', description: 'PTFE-Gewindeband (Teflonband) 12m x 12mm', unitPrice: 1.80, purchasePrice: 0.90, unit: 'Rolle', vatRate: 19, category: 'Dichtungen & Kleinmaterial', articleNumber: 'PTFE12M', suggestedMinStock: 10 },
      { name: 'Hanf Dichtfaden 150m', description: 'Hanf-Dichtfaden für Gasgewinde, 150m', unitPrice: 6.50, purchasePrice: 3.50, unit: 'Stk.', vatRate: 19, category: 'Dichtungen & Kleinmaterial', articleNumber: 'HANF150M', suggestedMinStock: 3 },
      { name: 'Lötdraht 2mm Lötring 500g', description: 'Lot-Zinn 60/40 mit Flussmittel, 2mm, 500g', unitPrice: 22.00, purchasePrice: 13.00, unit: 'Stk.', vatRate: 19, category: 'Dichtungen & Kleinmaterial', articleNumber: 'LOT60-40-500', suggestedMinStock: 1 },
      { name: 'Rohrisolierung 15mm Ø 9mm (2m)', description: 'Kautschukisolierung für Rohr DN15, Wandstärke 9mm, 2m', unitPrice: 3.80, purchasePrice: 2.10, unit: 'Stk.', vatRate: 19, category: 'Dichtungen & Kleinmaterial', articleNumber: 'RI15-9-2M', suggestedMinStock: 10 },
    ],
  },

  {
    id: 'maler',
    name: 'Maler & Trockenbau',
    emoji: '🎨',
    description: 'Farben, Lacke, Trockenbaumaterialien, Werkzeuge',
    color: '#8b5cf6',
    items: [
      { name: 'Wandfarbe weiß 12,5L', description: 'Innenfarbe weiß matt, ergiebig, 12,5 Liter', unitPrice: 42.00, purchasePrice: 24.00, unit: 'Eimer', vatRate: 19, category: 'Farben & Lacke', articleNumber: 'WANDF-WS-12.5', suggestedMinStock: 2 },
      { name: 'Wandfarbe weiß 2,5L', description: 'Innenfarbe weiß matt, 2,5 Liter', unitPrice: 10.50, purchasePrice: 6.00, unit: 'Eimer', vatRate: 19, category: 'Farben & Lacke', articleNumber: 'WANDF-WS-2.5', suggestedMinStock: 3 },
      { name: 'Tiefengrund 5L', description: 'Tiefengrund / Füller, 5 Liter, lösemittelfrei', unitPrice: 18.00, purchasePrice: 10.00, unit: 'Eimer', vatRate: 19, category: 'Farben & Lacke', articleNumber: 'TGRD-5L', suggestedMinStock: 2 },
      { name: 'Dispersionsputz 25kg', description: 'Reibeputz Körnung 2mm, weißgrau, 25kg', unitPrice: 38.00, purchasePrice: 22.00, unit: 'Sack', vatRate: 19, category: 'Farben & Lacke', articleNumber: 'DISP-25KG', suggestedMinStock: 2 },
      { name: 'GK-Platte 12,5mm 2000x600', description: 'Gipskartonplatte GKB 12,5mm, 2000x600mm', unitPrice: 7.50, purchasePrice: 4.20, unit: 'Stk.', vatRate: 19, category: 'Trockenbau', articleNumber: 'GKB-12.5-2000', suggestedMinStock: 20 },
      { name: 'GK-Feuerschutzplatte 12,5mm', description: 'Gipskartonplatte GKFI 12,5mm (rot), 2000x625mm', unitPrice: 9.50, purchasePrice: 5.50, unit: 'Stk.', vatRate: 19, category: 'Trockenbau', articleNumber: 'GKFI-12.5', suggestedMinStock: 10 },
      { name: 'CW-Profil 75mm (3m)', description: 'CW-Wandprofil 75x50x0,6mm, 3m Stange', unitPrice: 5.80, purchasePrice: 3.20, unit: 'Stk.', vatRate: 19, category: 'Trockenbau', articleNumber: 'CW75-3M', suggestedMinStock: 20 },
      { name: 'UW-Profil 75mm (3m)', description: 'UW-Bodenprofil 75x40x0,6mm, 3m Stange', unitPrice: 5.20, purchasePrice: 2.90, unit: 'Stk.', vatRate: 19, category: 'Trockenbau', articleNumber: 'UW75-3M', suggestedMinStock: 20 },
      { name: 'GK-Schraube TN 3,5x35 (1000er)', description: 'Trockenbauschraube TN 3,5x35mm, Frequenzgehärtet, 1000er', unitPrice: 8.50, purchasePrice: 4.80, unit: 'Pkg.', vatRate: 19, category: 'Trockenbau', articleNumber: 'GKSCR-35-1000', suggestedMinStock: 2 },
      { name: 'Fugenspachtel 5kg', description: 'Fugenspachtel / Gipsspachtel für GK, 5kg', unitPrice: 7.20, purchasePrice: 4.00, unit: 'Eimer', vatRate: 19, category: 'Trockenbau', articleNumber: 'FUSP-5KG', suggestedMinStock: 3 },
      { name: 'Fugenband 50m', description: 'Bewehrungsband für Fugen, Papier, 50m', unitPrice: 4.50, purchasePrice: 2.50, unit: 'Rolle', vatRate: 19, category: 'Trockenbau', articleNumber: 'FUBAND-50M', suggestedMinStock: 3 },
      { name: 'Abklebeband 30mm 50m', description: 'Malerkrepp-Band 30mm x 50m', unitPrice: 2.80, purchasePrice: 1.40, unit: 'Rolle', vatRate: 19, category: 'Hilfsmaterial', articleNumber: 'AKLEB30-50M', suggestedMinStock: 10 },
      { name: 'Abdeckfolie 4x5m', description: 'Malerfolie PE 4x5m, 0,012mm dick', unitPrice: 3.20, purchasePrice: 1.60, unit: 'Stk.', vatRate: 19, category: 'Hilfsmaterial', articleNumber: 'ABFOLIE-4x5', suggestedMinStock: 5 },
      { name: 'Schleifpapier K80 (10er)', description: 'Handschleifpapier K80, 230x280mm, 10er-Pack', unitPrice: 4.80, purchasePrice: 2.60, unit: 'Pkg.', vatRate: 19, category: 'Hilfsmaterial', articleNumber: 'SCHLP-K80-10', suggestedMinStock: 3 },
      { name: 'Schleifpapier K120 (10er)', description: 'Handschleifpapier K120, 230x280mm, 10er-Pack', unitPrice: 4.80, purchasePrice: 2.60, unit: 'Pkg.', vatRate: 19, category: 'Hilfsmaterial', articleNumber: 'SCHLP-K120-10', suggestedMinStock: 3 },
    ],
  },

  {
    id: 'bau-roh',
    name: 'Bauhandwerk / Rohbau',
    emoji: '🏗️',
    description: 'Zement, Mörtel, Dübel, Befestigungen, Bewehrung',
    color: '#ea580c',
    items: [
      { name: 'Zement CEM II 25kg', description: 'Portlandzement CEM II/B-M 32,5R, 25kg Sack', unitPrice: 8.50, purchasePrice: 5.00, unit: 'Sack', vatRate: 19, category: 'Baustoffe', articleNumber: 'ZEM-CEMII-25', suggestedMinStock: 10 },
      { name: 'Kalkzementputz 25kg', description: 'Kalkzementputz Unterputz, 25kg', unitPrice: 9.80, purchasePrice: 5.80, unit: 'Sack', vatRate: 19, category: 'Baustoffe', articleNumber: 'KZP-25KG', suggestedMinStock: 10 },
      { name: 'Fliesenkleber C2 25kg', description: 'Fliesenkleber flexibel C2TE, 25kg', unitPrice: 16.50, purchasePrice: 9.50, unit: 'Sack', vatRate: 19, category: 'Baustoffe', articleNumber: 'FKL-C2-25KG', suggestedMinStock: 5 },
      { name: 'Fugenmörtel grau 5kg', description: 'Fugengrau Zementfugenmörtel, grau, 5kg', unitPrice: 6.80, purchasePrice: 3.80, unit: 'Eimer', vatRate: 19, category: 'Baustoffe', articleNumber: 'FUGM-GR-5', suggestedMinStock: 5 },
      { name: 'Montageschaum 750ml', description: 'PU-Montageschaum, 750ml, Pistolenschaum', unitPrice: 6.50, purchasePrice: 3.50, unit: 'Stk.', vatRate: 19, category: 'Montagemittel', articleNumber: 'MOSCH-750', suggestedMinStock: 10 },
      { name: 'Bauschrauben 5x80 (50er)', description: 'Spanplattenschraube 5x80mm, Torx, teilgewinde, 50er', unitPrice: 5.20, purchasePrice: 2.80, unit: 'Pkg.', vatRate: 19, category: 'Befestigung', articleNumber: 'BSCR5x80-50', suggestedMinStock: 5 },
      { name: 'Rahmendübel 10x120 (10er)', description: 'Rahmendübel 10x120mm mit Schraube, 10er-Pack', unitPrice: 7.80, purchasePrice: 4.40, unit: 'Pkg.', vatRate: 19, category: 'Befestigung', articleNumber: 'RAHD10-120-10', suggestedMinStock: 5 },
      { name: 'Setzanker M10x75mm (10er)', description: 'Setzanker / Spreizdübel M10x75mm, Stahl, 10er', unitPrice: 12.00, purchasePrice: 7.00, unit: 'Pkg.', vatRate: 19, category: 'Befestigung', articleNumber: 'SETA-M10-10', suggestedMinStock: 3 },
      { name: 'Bewehrungsstahl B500B 6mm (6m)', description: 'Betonstahl geriffelt B500B, Ø6mm, 6m Stange', unitPrice: 7.50, purchasePrice: 4.20, unit: 'Stk.', vatRate: 19, category: 'Bewehrung', articleNumber: 'BST-6MM-6M', suggestedMinStock: 10 },
      { name: 'Abstandshalter 25mm (50er)', description: 'Betonabstandshalter 25mm, für Bodenplatten, 50 Stück', unitPrice: 8.00, purchasePrice: 4.50, unit: 'Pkg.', vatRate: 19, category: 'Bewehrung', articleNumber: 'ABSH25-50', suggestedMinStock: 2 },
      { name: 'Trennscheibe 125mm Beton (5er)', description: 'Trennscheibe 125mm für Beton/Stein, 5er-Pack', unitPrice: 14.50, purchasePrice: 8.50, unit: 'Pkg.', vatRate: 19, category: 'Werkzeugzubehör', articleNumber: 'TRSCB125-5', suggestedMinStock: 3 },
      { name: 'Diamantbohrer 12mm SDS+', description: 'Diamantbohrer / Betonbohrer 12mm, SDS+, 160mm', unitPrice: 8.50, purchasePrice: 4.80, unit: 'Stk.', vatRate: 19, category: 'Werkzeugzubehör', articleNumber: 'DIABO12-SDS', suggestedMinStock: 2 },
    ],
  },

  {
    id: 'it',
    name: 'IT & Netzwerk',
    emoji: '💻',
    description: 'Netzwerkkomponenten, Kabel, Patchfelder, Lizenzen',
    color: '#0ea5e9',
    items: [
      { name: 'Patchkabel Cat6 0,5m gelb', description: 'RJ45-Patchkabel Cat6 SFTP, 0,5m, gelb', unitPrice: 4.50, purchasePrice: 2.50, unit: 'Stk.', vatRate: 19, category: 'Netzwerkzubehör', articleNumber: 'PK-CAT6-0.5-GE', suggestedMinStock: 10 },
      { name: 'Patchkabel Cat6 2m blau', description: 'RJ45-Patchkabel Cat6 SFTP, 2m, blau', unitPrice: 5.20, purchasePrice: 2.90, unit: 'Stk.', vatRate: 19, category: 'Netzwerkzubehör', articleNumber: 'PK-CAT6-2-BL', suggestedMinStock: 20 },
      { name: 'Patchkabel Cat6 5m grau', description: 'RJ45-Patchkabel Cat6 SFTP, 5m, grau', unitPrice: 7.80, purchasePrice: 4.40, unit: 'Stk.', vatRate: 19, category: 'Netzwerkzubehör', articleNumber: 'PK-CAT6-5-GR', suggestedMinStock: 10 },
      { name: 'Keystone-Modul Cat6 (Buchse)', description: 'KeyStone-Modul RJ45 Cat6, Werkzeuglos, weiß', unitPrice: 3.80, purchasePrice: 2.10, unit: 'Stk.', vatRate: 19, category: 'Netzwerkzubehör', articleNumber: 'KS-CAT6-WS', suggestedMinStock: 20 },
      { name: 'Patchfeld 24-Port Cat6', description: 'Patchfeld 24-Port Cat6 STP, 19", 1HE, geschirmt', unitPrice: 68.00, purchasePrice: 40.00, unit: 'Stk.', vatRate: 19, category: 'Netzwerkzubehör', articleNumber: 'PF24-CAT6', suggestedMinStock: 1 },
      { name: 'Switch 8-Port PoE 100MBit', description: 'Managed Switch 8-Port 100Mbit PoE+, 19" 1HE', unitPrice: 145.00, purchasePrice: 88.00, unit: 'Stk.', vatRate: 19, category: 'Aktive Komponenten', articleNumber: 'SW8-POE-MAN', suggestedMinStock: 1 },
      { name: 'Switch 24-Port Gigabit', description: 'Managed Switch 24-Port Gigabit, 19" 1HE', unitPrice: 380.00, purchasePrice: 230.00, unit: 'Stk.', vatRate: 19, category: 'Aktive Komponenten', articleNumber: 'SW24-GIG', suggestedMinStock: 1 },
      { name: 'SSD 1TB SATA 2,5"', description: 'SSD 1TB SATA III 2,5" 550MB/s Lese', unitPrice: 85.00, purchasePrice: 52.00, unit: 'Stk.', vatRate: 19, category: 'Komponenten', articleNumber: 'SSD-1TB-SATA', suggestedMinStock: 2 },
      { name: 'RAM DDR4 16GB', description: 'Arbeitsspeicher DDR4-3200 DIMM 16GB', unitPrice: 42.00, purchasePrice: 26.00, unit: 'Stk.', vatRate: 19, category: 'Komponenten', articleNumber: 'RAM-DDR4-16GB', suggestedMinStock: 2 },
      { name: 'USB-C Kabel 1m 100W', description: 'USB-C zu USB-C Kabel, 1m, 100W, 10Gbps', unitPrice: 12.00, purchasePrice: 6.80, unit: 'Stk.', vatRate: 19, category: 'Zubehör', articleNumber: 'USBC-100W-1M', suggestedMinStock: 5 },
      { name: 'USB-A zu USB-C 2m', description: 'USB-A zu USB-C Kabel, 2m, Datentransfer & Laden', unitPrice: 8.50, purchasePrice: 4.80, unit: 'Stk.', vatRate: 19, category: 'Zubehör', articleNumber: 'USBA-C-2M', suggestedMinStock: 5 },
      { name: 'Thermalpaste 1g', description: 'Wärmeleitpaste 1g, für CPU/Kühlkörper', unitPrice: 6.50, purchasePrice: 3.50, unit: 'Stk.', vatRate: 19, category: 'Zubehör', articleNumber: 'TPASTE-1G', suggestedMinStock: 3 },
    ],
  },

  {
    id: 'kfz',
    name: 'Kfz-Werkstatt',
    emoji: '🔩',
    description: 'Verschleißteile, Öle, Filter, Bremsenteile',
    color: '#64748b',
    items: [
      { name: 'Motoröl 5W-30 5L', description: 'Vollsynthetisches Motoröl 5W-30 ACEA C3, 5 Liter', unitPrice: 38.00, purchasePrice: 22.00, unit: 'Stk.', vatRate: 19, category: 'Öle & Flüssigkeiten', articleNumber: 'MOE-5W30-5L', suggestedMinStock: 5 },
      { name: 'Motoröl 5W-40 5L', description: 'Vollsynthetisches Motoröl 5W-40 ACEA A3/B4, 5 Liter', unitPrice: 36.00, purchasePrice: 21.00, unit: 'Stk.', vatRate: 19, category: 'Öle & Flüssigkeiten', articleNumber: 'MOE-5W40-5L', suggestedMinStock: 5 },
      { name: 'Bremsflüssigkeit DOT4 500ml', description: 'Bremsflüssigkeit DOT4 LV, 500ml', unitPrice: 12.50, purchasePrice: 7.00, unit: 'Stk.', vatRate: 19, category: 'Öle & Flüssigkeiten', articleNumber: 'BRFL-DOT4-500', suggestedMinStock: 3 },
      { name: 'Kühlerfrostschutz 5L', description: 'Kühlmittel G12+ rot, fertig gemischt, 5 Liter', unitPrice: 22.00, purchasePrice: 13.00, unit: 'Stk.', vatRate: 19, category: 'Öle & Flüssigkeiten', articleNumber: 'KFSC-G12+5L', suggestedMinStock: 3 },
      { name: 'Ölfilter universal (sortiment)', description: 'Ölfilter Filterkartusche, je nach Fahrzeug', unitPrice: 12.00, purchasePrice: 7.00, unit: 'Stk.', vatRate: 19, category: 'Filter', articleNumber: 'OELFI-UNI', suggestedMinStock: 5 },
      { name: 'Luftfilter universal', description: 'Luftfiltereinsatz, je nach Fahrzeugtyp', unitPrice: 18.00, purchasePrice: 11.00, unit: 'Stk.', vatRate: 19, category: 'Filter', articleNumber: 'LUFTFI-UNI', suggestedMinStock: 3 },
      { name: 'Kraftstofffilter Diesel', description: 'Kraftstofffilter für Dieselfahrzeuge', unitPrice: 22.00, purchasePrice: 13.00, unit: 'Stk.', vatRate: 19, category: 'Filter', articleNumber: 'KSFI-DI', suggestedMinStock: 2 },
      { name: 'Bremsbeläge VA (Satz)', description: 'Bremsbeläge für Vorderachse, Satz (4 Stück)', unitPrice: 58.00, purchasePrice: 34.00, unit: 'Satz', vatRate: 19, category: 'Bremsanlage', articleNumber: 'BRBL-VA', suggestedMinStock: 2 },
      { name: 'Bremsscheibe VA (Stk.)', description: 'Bremsscheibe Vorderachse, je nach Fahrzeug', unitPrice: 65.00, purchasePrice: 38.00, unit: 'Stk.', vatRate: 19, category: 'Bremsanlage', articleNumber: 'BRSC-VA', suggestedMinStock: 2 },
      { name: 'Zündkerze (je Stk.)', description: 'Zündkerze Iridium/NGK, je nach Fahrzeug', unitPrice: 14.00, purchasePrice: 8.00, unit: 'Stk.', vatRate: 19, category: 'Motor & Zündung', articleNumber: 'ZUEKE-UNI', suggestedMinStock: 8 },
      { name: 'Keilrippenriemen', description: 'Keilrippenriemen Poly-V je nach Fahrzeug', unitPrice: 42.00, purchasePrice: 25.00, unit: 'Stk.', vatRate: 19, category: 'Motor & Zündung', articleNumber: 'KRIRM-UNI', suggestedMinStock: 2 },
      { name: 'Wagenheber Gummiauflage', description: 'Gummiauflage / Adapterpuck für Wagenheber', unitPrice: 8.50, purchasePrice: 4.80, unit: 'Stk.', vatRate: 19, category: 'Werkzeugzubehör', articleNumber: 'WAHJ-GUM', suggestedMinStock: 2 },
    ],
  },
];
