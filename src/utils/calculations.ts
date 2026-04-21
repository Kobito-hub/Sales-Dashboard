import type { AnalysisPeriod, SalesRow, TableRow, TargetRow, YtgRow } from '../types';

export const WORKING_DAYS_PER_MONTH = 26;

export function aggregateSalesMTD(
  sales: SalesRow[],
  monthIndex: number,
  daysInMonth: number,
  year: number,
): Map<string, number> {
  const result = new Map<string, number>();

  sales.forEach((sale) => {
    if (
      sale.date.getFullYear() === year &&
      sale.date.getMonth() === monthIndex &&
      sale.date.getDate() <= daysInMonth
    ) {
      result.set(sale.description, (result.get(sale.description) ?? 0) + sale.casesSold);
    }
  });

  return result;
}

export function aggregateSalesYTD(
  sales: SalesRow[],
  monthIndex: number,
  daysInMonth: number,
  year: number,
): Map<string, number> {
  const result = new Map<string, number>();

  sales.forEach((sale) => {
    const saleYear = sale.date.getFullYear();
    const saleMonth = sale.date.getMonth();
    const saleDay = sale.date.getDate();

    if (saleYear !== year) {
      return;
    }

    if (saleMonth < monthIndex || (saleMonth === monthIndex && saleDay <= daysInMonth)) {
      result.set(sale.description, (result.get(sale.description) ?? 0) + sale.casesSold);
    }
  });

  return result;
}

export function calculateMtdTarget(targetRow: TargetRow, monthIndex: number, daysInMonth: number): number {
  const monthlyTarget = targetRow.monthlyTargets[monthIndex] ?? 0;
  return (monthlyTarget / WORKING_DAYS_PER_MONTH) * daysInMonth;
}

export function calculateWtdTarget(targetRow: TargetRow, monthIndex: number, workedDays: number): number {
  const monthlyTarget = targetRow.monthlyTargets[monthIndex] ?? 0;
  return (monthlyTarget / WORKING_DAYS_PER_MONTH) * workedDays;
}

export function calculateYtdTarget(targetRow: TargetRow, monthIndex: number, daysInMonth: number): number {
  const completedMonthsTarget = targetRow.monthlyTargets
    .slice(0, monthIndex)
    .reduce((sum, value) => sum + value, 0);

  return completedMonthsTarget + calculateMtdTarget(targetRow, monthIndex, daysInMonth);
}

export function buildPeriodTableRows(params: {
  brands: string[];
  targets: Map<string, TargetRow>;
  sales2026: SalesRow[];
  sales2025: SalesRow[];
  selectedMonth: number;
  monthDays: number;
  weekDays: number;
  period: AnalysisPeriod;
}): { rows: TableRow[]; totals: TableRow | null } {
  const {
    brands,
    targets,
    sales2026,
    sales2025,
    selectedMonth,
    monthDays,
    weekDays,
    period,
  } = params;

  const sales2026Mtd = aggregateSalesMTD(sales2026, selectedMonth, monthDays, 2026);
  const sales2025Mtd = aggregateSalesMTD(sales2025, selectedMonth, monthDays, 2025);
  const sales2026Ytd = aggregateSalesYTD(sales2026, selectedMonth, monthDays, 2026);
  const sales2025Ytd = aggregateSalesYTD(sales2025, selectedMonth, monthDays, 2025);

  const rows: TableRow[] = [];
  let total2025Actual = 0;

  brands.forEach((brand) => {
    const targetRow = targets.get(brand);

    if (!targetRow) {
      return;
    }

    let fy26Target = 0;
    let fy26Act = 0;
    let fy25Act = 0;

    if (period === 'wtd') {
      fy26Target = calculateWtdTarget(targetRow, selectedMonth, weekDays);
      fy26Act = ((sales2026Mtd.get(brand) ?? 0) / WORKING_DAYS_PER_MONTH) * weekDays;
      fy25Act = ((sales2025Mtd.get(brand) ?? 0) / WORKING_DAYS_PER_MONTH) * weekDays;
    } else if (period === 'mtd') {
      fy26Target = calculateMtdTarget(targetRow, selectedMonth, monthDays);
      fy26Act = sales2026Mtd.get(brand) ?? 0;
      fy25Act = sales2025Mtd.get(brand) ?? 0;
    } else {
      fy26Target = calculateYtdTarget(targetRow, selectedMonth, monthDays);
      fy26Act = sales2026Ytd.get(brand) ?? 0;
      fy25Act = sales2025Ytd.get(brand) ?? 0;
    }

    total2025Actual += fy25Act;

    rows.push({
      sku: brand,
      fy26Target,
      fy26Act,
      percentVsTarget: fy26Target > 0 ? (fy26Act / fy26Target) * 100 : 0,
      vs25: fy25Act > 0 ? ((fy26Act / fy25Act) - 1) * 100 : 0,
    });
  });

  const totalTarget = rows.reduce((sum, row) => sum + row.fy26Target, 0);
  const totalActual = rows.reduce((sum, row) => sum + row.fy26Act, 0);

  return {
    rows,
    totals: rows.length
      ? {
          sku: 'TOTAL',
          fy26Target: totalTarget,
          fy26Act: totalActual,
          percentVsTarget: totalTarget > 0 ? (totalActual / totalTarget) * 100 : 0,
          vs25: total2025Actual > 0 ? ((totalActual / total2025Actual) - 1) * 100 : 0,
        }
      : null,
  };
}

export function buildYtgRows(params: {
  brands: string[];
  targets: Map<string, TargetRow>;
  sales2026: SalesRow[];
  selectedMonth: number;
  monthDays: number;
}): { rows: YtgRow[]; total: YtgRow | null } {
  const { brands, targets, sales2026, selectedMonth, monthDays } = params;
  const sales2026Ytd = aggregateSalesYTD(sales2026, selectedMonth, monthDays, 2026);

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
        ytdAchievedPercent: target2026 > 0 ? (ytdActual / target2026) * 100 : 0,
        ytgBalance: target2026 - ytdActual,
      };
    })
    .filter((row): row is YtgRow => row !== null);

  const totalTarget = rows.reduce((sum, row) => sum + row.target2026, 0);
  const totalYtdActual = rows.reduce(
    (sum, row) => sum + row.target2026 - row.ytgBalance,
    0,
  );
  const totalBalance = rows.reduce((sum, row) => sum + row.ytgBalance, 0);

  return {
    rows,
    total: rows.length
      ? {
          sku: 'TOTAL',
          target2026: totalTarget,
          ytdAchievedPercent: totalTarget > 0 ? (totalYtdActual / totalTarget) * 100 : 0,
          ytgBalance: totalBalance,
        }
      : null,
  };
}
