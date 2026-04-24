export interface TargetRow {
  description: string;
  monthlyTargets: number[]; // index 0 = Jan, 11 = Dec
}

export interface SalesRow {
  description: string;
  date: Date;
  casesSold: number;
  territory: string;
  region: string;
}

export interface ProcessedData {
  targets: Map<string, TargetRow>;
  sales2026: SalesRow[];
  sales2025: SalesRow[];
}

export interface TableRow {
  sku: string;
  fy26Target: number;
  fy26Act: number;
  fy25Act: number;
  contributionPercent: number;
  actVsTarget: number;
  vs25: number;
}

export interface YtgRow {
  sku: string;
  target2026: number;
  ytdActual: number;
  ytdAchievedPercent: number;
  ytgBalance: number;
}

export interface TerritoryTargetRow {
  territory: string;
  region: string;
  description: string;
  brand: string;
  month: number;
  stdCases: number;
}

export interface TerritoryTableRow {
  territory: string;    // territory or region name
  tgt: number;
  ach: number;
  tgtVsAch: number;
  contributionPercent: number;
  shortfall: number;
}

export type AnalysisPeriod = 'wtd' | 'mtd' | 'ytd';