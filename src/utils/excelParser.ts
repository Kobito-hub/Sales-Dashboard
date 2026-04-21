import * as XLSX from 'xlsx';
import type { SalesRow, TargetRow } from '../types';

const MONTH_HEADERS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const SHORT_MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

export const parseTargetFile = (file: File): Promise<Map<string, TargetRow>> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
        const headerRowIndex = findTargetHeaderRowIndex(json);

        if (headerRowIndex === -1) {
          throw new Error('Target sheet must include a SAP Product Name or Description column.');
        }

        const headers = (json[headerRowIndex] ?? []).map((cell) => normalizeText(cell));
        const descIndex = headers.findIndex(
          (header) => header.includes('product') || header.includes('description'),
        );
        const monthIndices = getTargetMonthIndices(sheet, json, headerRowIndex);

        if (monthIndices.some((index) => index === -1)) {
          throw new Error('Target sheet must include Jan to Dec columns under Standard Cases.');
        }

        const targetMap = new Map<string, TargetRow>();

        for (let i = headerRowIndex + 1; i < json.length; i += 1) {
          const row = json[i] ?? [];
          const description = canonicalizeSku(row[descIndex]);

          if (!description || isSummaryTargetRow(description)) {
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
        const json = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, raw: false, defval: '' });
        const headerRowIndex = findSalesHeaderRowIndex(json);

        if (headerRowIndex === -1) {
          throw new Error(
            'Sales dump must include Description, Date, and STD Cases Sold columns.',
          );
        }

        const headers = (json[headerRowIndex] ?? []).map((cell) => normalizeText(cell));

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

        for (let i = headerRowIndex + 1; i < json.length; i += 1) {
          const row = json[i] ?? [];
          const description = canonicalizeSku(row[descIndex]);

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

export function canonicalizeSku(value: unknown): string {
  const normalized = normalizeSku(value);
  return normalized.replace(/\s+[xX]\s*\d+\s*$/, '').trim();
}

export function getSizeGroupLabel(brand: string): string {
  const trimmed = brand.trim();
  const sizeMatch = trimmed.match(/^(\d+(?:\.\d+)?\s*(?:cl|ml|l))\b/i);

  if (sizeMatch) {
    return sizeMatch[1].replace(/\s+/g, '').toLowerCase();
  }

  return 'other';
}

export function getBrandGroupLabel(brand: string): string {
  const normalized = normalizeSku(brand).replace(/^\d+(?:\.\d+)?\s*(?:cl|ml|l)\s+/i, '');
  const withoutVariant = normalized.split('-')[0]?.trim() ?? normalized;
  const firstWord = withoutVariant.split(/\s+/)[0]?.trim();

  if (!firstWord) {
    return 'other';
  }

  return firstWord;
}

function findTargetHeaderRowIndex(rows: unknown[][]): number {
  return rows.findIndex((row) => {
    const normalizedRow = row.map((cell) => normalizeText(cell));
    const hasDescription = normalizedRow.some(
      (cell) => cell.includes('sap product name') || cell.includes('product') || cell.includes('description'),
    );
    const monthMatches = MONTH_HEADERS.filter((month) => normalizedRow.includes(month)).length;

    return hasDescription && monthMatches >= 6;
  });
}

function findSalesHeaderRowIndex(rows: unknown[][]): number {
  return rows.findIndex((row) => {
    const normalizedRow = row.map((cell) => normalizeText(cell));

    return (
      normalizedRow.some((cell) => cell === 'description') &&
      normalizedRow.some((cell) => cell === 'date') &&
      normalizedRow.some((cell) => cell.includes('std cases sold'))
    );
  });
}

function getTargetMonthIndices(
  sheet: XLSX.WorkSheet,
  rows: unknown[][],
  headerRowIndex: number,
): number[] {
  const headerRow = rows[headerRowIndex] ?? [];

  return MONTH_HEADERS.map((month) => {
    const candidateColumns: number[] = [];

    headerRow.forEach((cell, columnIndex) => {
      if (normalizeText(cell) === month) {
        candidateColumns.push(columnIndex);
      }
    });

    const standardCasesColumn = candidateColumns.find((columnIndex) =>
      columnBelongsToStandardCases(sheet, headerRowIndex, columnIndex),
    );

    if (standardCasesColumn !== undefined) {
      return standardCasesColumn;
    }

    return candidateColumns[0] ?? -1;
  });
}

function columnBelongsToStandardCases(
  sheet: XLSX.WorkSheet,
  headerRowIndex: number,
  columnIndex: number,
): boolean {
  const headerContext = [];

  for (let rowIndex = Math.max(0, headerRowIndex - 3); rowIndex <= headerRowIndex; rowIndex += 1) {
    headerContext.push(normalizeText(getCellValue(sheet, rowIndex, columnIndex)));
  }

  const combined = headerContext.join(' ');

  return (
    combined.includes('standard cases') &&
    !combined.includes('naira') &&
    !combined.includes('absolute cases')
  );
}

function getCellValue(sheet: XLSX.WorkSheet, rowIndex: number, columnIndex: number): unknown {
  const directAddress = XLSX.utils.encode_cell({ r: rowIndex, c: columnIndex });
  const directCell = sheet[directAddress];

  if (directCell) {
    return directCell.v;
  }

  const merges = sheet['!merges'] ?? [];
  const mergedRange = merges.find(
    (range) =>
      rowIndex >= range.s.r &&
      rowIndex <= range.e.r &&
      columnIndex >= range.s.c &&
      columnIndex <= range.e.c,
  );

  if (!mergedRange) {
    return '';
  }

  const anchorAddress = XLSX.utils.encode_cell({ r: mergedRange.s.r, c: mergedRange.s.c });
  return sheet[anchorAddress]?.v ?? '';
}

function isSummaryTargetRow(description: string): boolean {
  const normalized = normalizeText(description);

  return (
    normalized.startsWith('total') ||
    normalized.startsWith('grand total') ||
    normalized.includes('revenue budget')
  );
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

  const shortMonthMatch = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);

  if (shortMonthMatch) {
    const [, dayText, monthText, yearText] = shortMonthMatch;
    const monthIndex = SHORT_MONTHS.indexOf(monthText.toLowerCase());

    if (monthIndex !== -1) {
      const parsed = new Date(Number(yearText), monthIndex, Number(dayText));

      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
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
