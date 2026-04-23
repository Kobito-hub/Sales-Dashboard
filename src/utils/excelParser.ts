import * as XLSX from 'xlsx';
import type { SalesRow, TargetRow } from '../types';

const MONTH_NAMES = [
  'jan', 'feb', 'mar', 'apr', 'may', 'jun',
  'jul', 'aug', 'sep', 'oct', 'nov', 'dec'
];

// Exact product names as provided – no trimming
const ALLOWED_PRODUCT_NAMES = new Set([
  '18cl Regal Dry Gin X 30',
  '3cl Regal Dry Gin Classic X 336 With 14pc Seamans Insertion',
  '75cl Regal Dry Gin X 12',
  '10cl Regal Dry Gin X 40',
  '18cl Regal Ginger X 30',
  '3cl Regal Ginger X 288',
  '75cl Regal Ginger X 12',
  '10cl Regal Ginger X 40',
  '18cl Regal Deluxe X 30',
  '3cl Regal Deluxe X 336',
  '75cl Regal Deluxe X 12',
  '10cl Regal Deluxe X 40',
  '100cl Seaman Schnapps - Royale X 6',
  '75cl Seaman Schnapps - Classic X 12',
  '75cl Seaman Schnapps - Premium X 12',
  '75cl Seaman Schnapps - Premium X 6',
  '75cl Seaman Schnapps - Classic X 6',
  '3cl Seaman Schnapps X 336 with 14pcs Regal Classic Insertion',
  '20cl Seaman Schnapps X 24',
  '10cl 9Ja Cafe Rhum X 40',
  '3cl 9ja Café Rhum x 168',
  '3cl 9Ja Cafe Rhum X 336',
  '75cl 9Ja Cafe Rhum X 12',
  '75Cl Korect Bitters X 12',
  '20Cl Korect Bitters X 24',
  '5Cl Korect Bitters X 120',
  '75cl Isiagu Cafe Liqueur X 12',
  '20cl Isiagu Café Liqueur x 24',
  '3cl Isiagu Café Liqueur X 336',
  '10cl Swagga schnapps x 40',
  '17.5cl Lords Dry Gin (Solo) X 24',
  '75cl Lords Dry Gin X 12',
  '17.5cl Lords Chocolate (Solo) X 24',
  '75cl Lords Chocolate X 12',
  '33CL Lord\'s Gin Cocktails X 24',
  '37.5cl Apperito Bitters X 12',
  '100cl Bacchus Tonic Wine X 12',
  '70cl Bacchus Tonic Wine X 12',
  '75CL BACCHUS RED WINE X 6',
  '20cl Calypso Coconut Liqueur X 24',
  '70cl Calyspo Coconut Liqueur X 12',
  '70cl Calyspo Chocolate Liqueur X 12',
  '33CL Calyspo Passion Fruits X 24',
  '75cl St Lauren Red X 6',
  '75cl St Lauren White X 6',
  '75CL ST. LAUREN GOLD SPAKLING RED GRAPE X 12',
  '33CL St. Lauren White X 24',
  '33CL St. Lauren Red X 24',
  'TOTAL ST. LAUREN',
  '75CL LA RIVIERA SPARKING ROSE WINE X 6',
  'LA RIVIERA ROSE WINE',
  '100CL BOLS VODKA X 6',
  '70CL BOLS VODKA X 12',
  '70CL BOLS VODKA CHOCOLATE X 12',
  'BOLS VODKA',
  '70CL BOLS CURACAO TRIPPLE SEC X 6',
  '70CL BOLS NATURAL YOGHURT 15\' X 6',
  '70CL BOLS BLUE 21 X 6',
  '70CL BOLS APRICOT BRANDY X 6',
  '70CL BOLS AMARETTO 24 X 6',
  '20cl Encore Aromatic Liqueur x 24',
  '37.5cl Encore Aromatic Liqueur x 12',
  '75cl Encore Aromatic Liqueur x 12',
  '75cl Oriki11  X 6',
].map(name => name.trim()));

// ----------------------------------------------------------------------
// TARGET FILE PARSING (STANDARD CASES TABLE – SIDE‑BY‑SIDE)
// ----------------------------------------------------------------------
export const parseTargetFile = (file: File): Promise<Map<string, TargetRow>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });

        console.log('=== DEBUG: Target Sheet Rows ===');
        console.log('Total rows:', rows.length);
        
        // Log first 10 rows to see structure
        for (let r = 0; r < Math.min(10, rows.length); r++) {
          const row = rows[r] ?? [];
          console.log(`Row ${r}:`, row.map(cell => String(cell).substring(0, 30)));
        }

        // Step 1: Find all occurrences of "sap product name"
        const sapOccurrences: { row: number; col: number; text: string }[] = [];
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r] ?? [];
          for (let c = 0; c < row.length; c++) {
            const cell = normalizeText(row[c]);
            if (cell.includes('sap') && cell.includes('product')) {
              sapOccurrences.push({ row: r, col: c, text: cell });
            }
          }
        }
        
        console.log('=== SAP Product Name occurrences ===');
        console.log('Count:', sapOccurrences.length);
        sapOccurrences.forEach((occ, i) => {
          console.log(`#${i + 1}: Row ${occ.row}, Col ${occ.col}, Text: "${occ.text}"`);
        });

        // Step 2: Locate the third occurrence
        let productNameColIndex = -1;
        if (sapOccurrences.length >= 3) {
          productNameColIndex = sapOccurrences[2].col; // zero-indexed, third is index 2
          console.log('Selected third occurrence at column:', productNameColIndex);
        } else {
          console.error('Only found', sapOccurrences.length, 'SAP Product Name occurrences, need at least 3');
          throw new Error(`Found only ${sapOccurrences.length} SAP Product Name columns, need 3. Check console for details.`);
        }

        // Step 3: Find row with month headers (using the column we found)
        let headerRowIndex = -1;
        for (let r = 0; r < rows.length; r++) {
          const row = rows[r] ?? [];
          let monthCount = 0;
          for (let c = productNameColIndex; c < row.length; c++) {
            const cell = normalizeText(row[c]);
            if (MONTH_NAMES.includes(cell)) monthCount++;
          }
          if (monthCount >= 6) {
            headerRowIndex = r;
            console.log('Found month header row at index:', r, 'with', monthCount, 'months');
            break;
          }
        }

        if (headerRowIndex === -1) {
          throw new Error('Could not find month header row for Standard Cases.');
        }

        const headerRow = rows[headerRowIndex] ?? [];
        console.log('Header row (truncated):', headerRow.slice(productNameColIndex, productNameColIndex + 15).map(c => String(c)));

        // Step 4: Map month columns
        const monthColIndices: number[] = [];
        for (let c = productNameColIndex + 1; c < headerRow.length; c++) {
          const cell = normalizeText(headerRow[c]);
          const monthIdx = MONTH_NAMES.indexOf(cell);
          if (monthIdx !== -1) {
            monthColIndices[monthIdx] = c;
          }
          if (monthColIndices.filter(idx => idx !== undefined).length === 12) break;
          if (cell === 'total') break;
        }

        // Fill gaps
        for (let i = 0; i < 12; i++) {
          if (monthColIndices[i] === undefined) {
            for (let offset = 1; offset <= 3; offset++) {
              const col = (monthColIndices[i - 1] ?? productNameColIndex) + offset;
              if (normalizeText(headerRow[col]) === MONTH_NAMES[i]) {
                monthColIndices[i] = col;
                break;
              }
            }
          }
        }

        console.log('Month column indices:', monthColIndices);

        if (monthColIndices.length !== 12 || monthColIndices.some(idx => idx === undefined)) {
          throw new Error('Could not locate all 12 month columns.');
        }

        // Step 5: Parse rows
        const targetMap = new Map<string, TargetRow>();
        for (let r = headerRowIndex + 1; r < rows.length; r++) {
          const row = rows[r] ?? [];
          const rawDesc = row[productNameColIndex];
          if (!rawDesc) continue;

          const description = String(rawDesc).trim();
          if (isSummaryTargetRow(description)) continue;
          if (!ALLOWED_PRODUCT_NAMES.has(description)) continue;

          const monthlyTargets = monthColIndices.map(colIdx => toNumber(row[colIdx]));

          const existing = targetMap.get(description);
          if (existing) {
            existing.monthlyTargets = existing.monthlyTargets.map(
              (val, idx) => val + monthlyTargets[idx]
            );
          } else {
            targetMap.set(description, { description, monthlyTargets });
          }
        }

        console.log('Parsed', targetMap.size, 'target SKUs');
        resolve(targetMap);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// ----------------------------------------------------------------------
// SALES FILE PARSING (UNCHANGED)
// ----------------------------------------------------------------------
export const parseSalesFile = (file: File): Promise<SalesRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
        const headerRowIndex = findSalesHeaderRowIndex(json);
        
        if (headerRowIndex === -1) {
          throw new Error('Sales dump must include Description, Date, and STD Cases Sold columns.');
        }
        
        const headers = (json[headerRowIndex] ?? []).map(cell => normalizeText(cell));
        const descIndex = headers.findIndex(h => h.includes('description'));
        const dateIndex = headers.findIndex(h => h.includes('date'));
        const casesIndex = headers.findIndex(h => h.includes('std') && h.includes('cases'));
        
        if (descIndex === -1 || dateIndex === -1 || casesIndex === -1) {
          throw new Error('Missing required columns in sales dump.');
        }
        
        const sales: SalesRow[] = [];
        for (let i = headerRowIndex + 1; i < json.length; i++) {
          const row = json[i] ?? [];
          const description = String(row[descIndex] ?? '').trim();
          if (!description || !ALLOWED_PRODUCT_NAMES.has(description)) continue;
          
          const date = parseSpreadsheetDate(row[dateIndex]);
          if (!date) continue;
          
          const casesSold = toNumber(row[casesIndex]);
          if (casesSold === 0) continue;
          
          sales.push({ description, date, casesSold });
        }
        resolve(sales);
      } catch (error) {
        reject(error);
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

// ----------------------------------------------------------------------
// HELPERS
// ----------------------------------------------------------------------
function normalizeText(value: unknown): string {
  return String(value ?? '').trim().toLowerCase();
}

function findSalesHeaderRowIndex(rows: unknown[][]): number {
  return rows.findIndex(row => {
    const norm = row.map(cell => normalizeText(cell));
    return norm.includes('description') && norm.includes('date') && norm.some(c => c.includes('std cases sold'));
  });
}

function isSummaryTargetRow(description: string): boolean {
  const lower = description.toLowerCase();
  return lower.startsWith('total') || lower.includes('revenue budget') || lower === '';
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') return isFinite(value) ? value : 0;
  const cleaned = String(value ?? '').replace(/,/g, '').trim();
  const parsed = Number(cleaned);
  return isFinite(parsed) ? parsed : 0;
}

function parseSpreadsheetDate(value: unknown): Date | null {
  if (value instanceof Date && !isNaN(value.getTime())) return value;
  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);
    if (!parsed) return null;
    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }
  const raw = String(value ?? '').trim();
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d;
}

// ----------------------------------------------------------------------
// BRAND GROUPING (UNCHANGED)
// ----------------------------------------------------------------------
export function getBrandGroupLabel(brand: string): string {
  // Remove leading size (e.g., "75cl", "3cl", "100cl")
  const withoutSize = brand.replace(/^\d+(?:\.\d+)?\s*(?:cl|ml|l)\s+/i, '').trim();
  
  // If there's a dash, take the part before it as the brand name
  const dashIndex = withoutSize.indexOf('-');
  if (dashIndex !== -1) {
    return withoutSize.slice(0, dashIndex).trim();
  }
  
  // For products without dash, try to remove common pack size patterns at the end
  // e.g., "X 336", "x 24", "X 12", etc.
  const cleaned = withoutSize.replace(/\s+[xX]\s*\d+.*$/, '').trim();
  
  // If we ended up with an empty string, fallback to the original
  return cleaned || withoutSize;
}

export function getComparableSkuKey(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[’`]/g, "'")
    .replace(/\s+/g, ' ');
}