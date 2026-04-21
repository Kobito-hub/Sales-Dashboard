import * as XLSX from 'xlsx';
import type { SalesRow, TargetRow } from '../types';

const MONTH_HEADERS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const parseTargetFile = (file: File): Promise<Map<string, TargetRow>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });
        const headers = (json[0] ?? []).map((cell) => normalizeText(cell));

        const descIndex = headers.findIndex(
          (header) => header.includes('product') || header.includes('description'),
        );

        if (descIndex === -1) {
          throw new Error('Target sheet must include a SAP Product Name or Description column.');
        }

        const monthIndices = MONTH_HEADERS.map((month) => headers.findIndex((header) => header === month));

        if (monthIndices.some((index) => index === -1)) {
          throw new Error('Target sheet must include Jan to Dec columns.');
        }

        const targetMap = new Map<string, TargetRow>();

        for (let i = 1; i < json.length; i += 1) {
          const row = json[i] ?? [];
          const description = normalizeSku(row[descIndex]);

          if (!description) {
            continue;
          }

          const monthlyTargets = monthIndices.map((index) => toNumber(row[index]));
          const existing = targetMap.get(description);

          if (existing) {
            existing.monthlyTargets = existing.monthlyTargets.map(
              (value, monthIndex) => value + monthlyTargets[monthIndex],
            );
          } else {
            targetMap.set(description, {
              description,
              monthlyTargets,
            });
          }
        }

        resolve(targetMap);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
};

export const parseSalesFile = (file: File): Promise<SalesRow[]> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false });
        const headers = (json[0] ?? []).map((cell) => normalizeText(cell));

        const descIndex = headers.findIndex((header) => header.includes('description'));
        const dateIndex = headers.findIndex((header) => header.includes('date'));
        const casesIndex = headers.findIndex(
          (header) => header.includes('std') && header.includes('cases'),
        );

        if (descIndex === -1 || dateIndex === -1 || casesIndex === -1) {
          throw new Error(
            'Sales dump must include Description, Date, and STD Cases Sold columns.',
          );
        }

        const sales: SalesRow[] = [];

        for (let i = 1; i < json.length; i += 1) {
          const row = json[i] ?? [];
          const description = normalizeSku(row[descIndex]);

          if (!description) {
            continue;
          }

          const date = parseSpreadsheetDate(row[dateIndex]);

          if (!date) {
            continue;
          }

          sales.push({
            description,
            date,
            casesSold: toNumber(row[casesIndex]),
          });
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

function normalizeText(value: unknown): string {
  return String(value ?? '')
    .trim()
    .toLowerCase();
}

function normalizeSku(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/\s+/g, ' ');
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  const cleaned = String(value ?? '')
    .replace(/,/g, '')
    .trim();

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseSpreadsheetDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === 'number') {
    const parsed = XLSX.SSF.parse_date_code(value);

    if (!parsed) {
      return null;
    }

    return new Date(parsed.y, parsed.m - 1, parsed.d);
  }

  const raw = String(value ?? '').trim();

  if (!raw) {
    return null;
  }

  const parts = raw.split(/[./-]/).map((part) => Number(part));

  if (parts.length === 3 && parts.every((part) => Number.isFinite(part))) {
    const [day, month, year] = parts;
    const parsed = new Date(year, month - 1, day);

    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  const fallback = new Date(raw);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}
