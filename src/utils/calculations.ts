import type { AnalysisPeriod, SalesRow, TableRow, TargetRow, YtgRow } from '../types';

const REPORT_YEAR = 2026;
const PRIOR_YEAR = 2025;

export function buildPeriodTableRows(params: {
  brands: string[];
  targets: Map<string, TargetRow>;
  sales2026: SalesRow[];
  sales2025: SalesRow[];
  selectedMonth: number;
  targetDaysInMonth: number;
  targetDaysInWeek: number;
  currentDayWorked: number;
  actualWeekStartMonth: number;
  actualWeekStartDay: number;
  actualWeekEndMonth: number;
  actualWeekEndDay: number;
  actualMonthStartMonth: number;
  actualMonthStartDay: number;
  actualMonthEndMonth: number;
  actualMonthEndDay: number;
  actualYearStartMonth: number;
  actualYearStartDay: number;
  actualYearEndMonth: number;
  actualYearEndDay: number;
  period: AnalysisPeriod;
}): { rows: TableRow[]; totals: TableRow | null } {
  const {
    brands,
    targets,
    sales2026,
    sales2025,
    selectedMonth,
    targetDaysInMonth,
    targetDaysInWeek,
    currentDayWorked,
    actualWeekStartMonth,
    actualWeekStartDay,
    actualWeekEndMonth,
    actualWeekEndDay,
    actualMonthStartMonth,
    actualMonthStartDay,
    actualMonthEndMonth,
    actualMonthEndDay,
    actualYearStartMonth,
    actualYearStartDay,
    actualYearEndMonth,
    actualYearEndDay,
    period,
  } = params;

  const clampedMonthDays = Math.max(1, targetDaysInMonth);
  const clampedWeekDays = Math.max(1, targetDaysInWeek);
  const clampedCurrentDay = Math.max(1, currentDayWorked);
  const weekRange2026 = normalizeDateRange(
    actualWeekStartMonth,
    actualWeekStartDay,
    actualWeekEndMonth,
    actualWeekEndDay,
    REPORT_YEAR,
  );
  const weekRange2025 = shiftRangeToYear(weekRange2026, PRIOR_YEAR);
  const monthRange2026 = normalizeDateRange(
    actualMonthStartMonth,
    actualMonthStartDay,
    actualMonthEndMonth,
    actualMonthEndDay,
    REPORT_YEAR,
  );
  const monthRange2025 = shiftRangeToYear(monthRange2026, PRIOR_YEAR);
  const yearRange2026 = normalizeDateRange(
    actualYearStartMonth,
    actualYearStartDay,
    actualYearEndMonth,
    actualYearEndDay,
    REPORT_YEAR,
  );
  const yearRange2025 = shiftRangeToYear(yearRange2026, PRIOR_YEAR);

  const sales2026Wtd = weekRange2026
    ? aggregateSalesBetweenDates(sales2026, weekRange2026.start, weekRange2026.end)
    : new Map<string, number>();
  const sales2025Wtd = weekRange2025
    ? aggregateSalesBetweenDates(sales2025, weekRange2025.start, weekRange2025.end)
    : new Map<string, number>();
  const sales2026Mtd = monthRange2026
    ? aggregateSalesBetweenDates(sales2026, monthRange2026.start, monthRange2026.end)
    : new Map<string, number>();
  const sales2025Mtd = monthRange2025
    ? aggregateSalesBetweenDates(sales2025, monthRange2025.start, monthRange2025.end)
    : new Map<string, number>();
  const sales2026Ytd = yearRange2026
    ? aggregateSalesBetweenDates(sales2026, yearRange2026.start, yearRange2026.end)
    : new Map<string, number>();
  const sales2025Ytd = yearRange2025
    ? aggregateSalesBetweenDates(sales2025, yearRange2025.start, yearRange2025.end)
    : new Map<string, number>();

  const intermediateRows = brands
    .map((brand) => {
      const targetRow = targets.get(brand);

      if (!targetRow) {
        return null;
      }

      let fy26Target = 0;
      let fy26Act = 0;
      let fy25Act = 0;

      if (period === 'wtd') {
        fy26Target = calculateSelectedMonthTarget(targetRow, selectedMonth, clampedMonthDays, clampedWeekDays);
        fy26Act = sales2026Wtd.get(brand) ?? 0;
        fy25Act = sales2025Wtd.get(brand) ?? 0;
      } else if (period === 'mtd') {
        fy26Target = calculateMtdTarget(targetRow, selectedMonth, clampedWeekDays, clampedCurrentDay);
        fy26Act = sales2026Mtd.get(brand) ?? 0;
        fy25Act = sales2025Mtd.get(brand) ?? 0;
      } else {
        fy26Target = calculateYtdTarget(targetRow, selectedMonth, clampedWeekDays, clampedCurrentDay);
        fy26Act = sales2026Ytd.get(brand) ?? 0;
        fy25Act = sales2025Ytd.get(brand) ?? 0;
      }

      return {
        sku: brand,
        fy26Act,
        fy26Target,
        fy25Act,
      };
    })
    .filter(
      (row): row is { sku: string; fy26Act: number; fy26Target: number; fy25Act: number } =>
        row !== null,
    );

  const totalActual = intermediateRows.reduce((sum, row) => sum + row.fy26Act, 0);
  const totalTarget = intermediateRows.reduce((sum, row) => sum + row.fy26Target, 0);
  const total2025Actual = intermediateRows.reduce((sum, row) => sum + row.fy25Act, 0);

  const rows: TableRow[] = intermediateRows.map((row) => ({
    sku: row.sku,
    fy26Target: row.fy26Target,
    fy26Act: row.fy26Act,
    contributionPercent: totalActual > 0 ? (row.fy26Act / totalActual) * 100 : 0,
    actVsTarget: row.fy26Target > 0 ? (row.fy26Act / row.fy26Target) * 100 : 0,
    vs25: row.fy25Act > 0 ? ((row.fy26Act / row.fy25Act) - 1) * 100 : 0,
  }));

  return {
    rows,
    totals: rows.length
      ? {
          sku: 'TOTAL',
          fy26Target: totalTarget,
          fy26Act: totalActual,
          contributionPercent: totalActual > 0 ? 100 : 0,
          actVsTarget: totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0,
          vs25: total2025Actual > 0 ? ((totalActual / total2025Actual) - 1) * 100 : 0,
        }
      : null,
  };
}

export function buildYtgRows(params: {
  brands: string[];
  targets: Map<string, TargetRow>;
  sales2026: SalesRow[];
  actualYearStartMonth: number;
  actualYearStartDay: number;
  actualYearEndMonth: number;
  actualYearEndDay: number;
}): { rows: YtgRow[]; total: YtgRow | null } {
  const {
    brands,
    targets,
    sales2026,
    actualYearStartMonth,
    actualYearStartDay,
    actualYearEndMonth,
    actualYearEndDay,
  } = params;
  const yearRange2026 = normalizeDateRange(
    actualYearStartMonth,
    actualYearStartDay,
    actualYearEndMonth,
    actualYearEndDay,
    REPORT_YEAR,
  );
  const sales2026Ytd = yearRange2026
    ? aggregateSalesBetweenDates(sales2026, yearRange2026.start, yearRange2026.end)
    : new Map<string, number>();

  const rows: YtgRow[] = brands
    .map((brand) => {
      const targetRow = targets.get(brand);

      if (!targetRow) {
        return null;
      }

      const target2026 = targetRow.monthlyTargets.reduce((sum, value) => sum + value, 0);
      const ytdActual = sales2026Ytd.get(brand) ?? 0;

      return {
        sku: brand,
        target2026,
        ytdActual,
        ytdAchievedPercent: target2026 > 0 ? (ytdActual / target2026) * 100 : 0,
        ytgBalance: target2026 - ytdActual,
      };
    })
    .filter((row): row is YtgRow => row !== null);

  const totalTarget = rows.reduce((sum, row) => sum + row.target2026, 0);
  const totalYtdActual = rows.reduce((sum, row) => sum + row.ytdActual, 0);
  const totalBalance = rows.reduce((sum, row) => sum + row.ytgBalance, 0);

  return {
    rows,
    total: rows.length
        ? {
          sku: 'TOTAL',
          target2026: totalTarget,
          ytdActual: totalYtdActual,
          ytdAchievedPercent: totalTarget > 0 ? (totalYtdActual / totalTarget) * 100 : 0,
          ytgBalance: totalBalance,
        }
      : null,
  };
}

export function aggregateSalesBetweenDates(
  sales: SalesRow[],
  startDate: Date,
  endDate: Date,
): Map<string, number> {
  const result = new Map<string, number>();
  const normalizedStart = startOfDay(startDate);
  const normalizedEnd = endOfDay(endDate);

  sales.forEach((sale) => {
    const saleDate = startOfDay(sale.date);

    if (saleDate >= normalizedStart && saleDate <= normalizedEnd) {
      result.set(sale.description, (result.get(sale.description) ?? 0) + sale.casesSold);
    }
  });

  return result;
}

function calculateSelectedMonthTarget(
  targetRow: TargetRow,
  monthIndex: number,
  targetDaysInMonth: number,
  targetDaysInWeek: number,
): number {
  const monthlyTarget = targetRow.monthlyTargets[monthIndex] ?? 0;
  return (monthlyTarget / targetDaysInMonth) * targetDaysInWeek;
}

export function calculateMtdTarget(targetRow: TargetRow, monthIndex: number, daysInWeek: number, currentDayWorked: number): number {
  const monthlyTarget = targetRow.monthlyTargets[monthIndex] ?? 0;
  return (monthlyTarget / daysInWeek) * currentDayWorked;
}

export function calculateYtdTarget(targetRow: TargetRow, monthIndex: number, daysInWeek: number, currentDayWorked: number): number {
  const completedMonthsTarget = targetRow.monthlyTargets
    .slice(0, monthIndex)
    .reduce((sum, value) => sum + value, 0);

  return completedMonthsTarget + calculateMtdTarget(targetRow, monthIndex, daysInWeek, currentDayWorked);
}

function normalizeDateRange(
  startMonth: number,
  startDay: number,
  endMonth: number,
  endDay: number,
  expectedYear: number,
): { start: Date; end: Date } | null {
  const normalizedStart = new Date(expectedYear, startMonth, startDay);
  const normalizedEnd = new Date(expectedYear, endMonth, endDay);

  if (Number.isNaN(normalizedStart.getTime()) || Number.isNaN(normalizedEnd.getTime())) {
    return null;
  }

  if (normalizedStart > normalizedEnd) {
    return { start: normalizedEnd, end: normalizedStart };
  }

  return { start: normalizedStart, end: normalizedEnd };
}

function shiftRangeToYear(range: { start: Date; end: Date } | null, year: number) {
  if (!range) {
    return null;
  }

  return {
    start: new Date(year, range.start.getMonth(), range.start.getDate()),
    end: new Date(year, range.end.getMonth(), range.end.getDate()),
  };
}

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function endOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
}
