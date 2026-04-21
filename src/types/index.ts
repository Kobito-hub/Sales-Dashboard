export interface TargetRow {
  description: string;
  monthlyTargets: number[]; // index 0 = Jan, 11 = Dec
}

export interface SalesRow {
  description: string;
  date: Date;
  casesSold: number;
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
  percentVsTarget: number; // (Act / Tgt)*100
  vs25: number; // (Act2026 / Act2025 - 1)*100
}

export interface YtgRow {
  sku: string;
  target2026: number;
  ytdAchievedPercent: number;
  ytgBalance: number;
}

export type AnalysisPeriod = 'wtd' | 'mtd' | 'ytd';
