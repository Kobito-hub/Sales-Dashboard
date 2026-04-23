import { useMemo, useState } from "react";
import type { Dispatch, SetStateAction } from "react";
import type { AnalysisPeriod, SalesRow, TargetRow } from "./types";
import "./App.css";
import FileUploader from "./components/FileUploader";
import BrandSelector from "./components/BrandSelector";
import DateControls from "./components/DateControls";
import ResultsTable from "./components/ResultsTable";
import YtgTable from "./components/YtgTable";
import ColorPicker from "./components/ColorPicker";
import { buildPeriodTableRows, buildYtgRows } from "./utils/calculations";
import {
  getBrandGroupLabel,
  getComparableSkuKey,
  parseSalesFile,
  parseTargetFile,
} from "./utils/excelParser";

const PERIOD_LABELS: Record<AnalysisPeriod, string> = {
  wtd: "Week to Date",
  mtd: "Month to Date",
  ytd: "Year to Date",
};

// Legacy SKU mapping: old 2025 product name → current 2026 product name
const LEGACY_SKU_MAP: Record<string, string> = {
  "3Cl Korect Bitters X 336": "5Cl Korect Bitters X 120",
  "3cl Korect Bitters X 336": "5Cl Korect Bitters X 120",
  "3CL KORECT BITTERS X 336": "5Cl Korect Bitters X 120",
};

function extractUnitValue(sku: string): number {
  const match = sku.match(/^(\d+(?:\.\d+)?)\s*(?:cl|ml|l)/i);
  return match ? parseFloat(match[1]) : Infinity;
}

function App() {
  const today = new Date();

  const [targets, setTargets] = useState<Map<string, TargetRow>>(new Map());
  const [sales2026, setSales2026] = useState<SalesRow[]>([]);
  const [sales2025, setSales2025] = useState<SalesRow[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [targetDaysInMonth, setTargetDaysInMonth] = useState<number>(26);
  const [targetDaysInWeek, setTargetDaysInWeek] = useState<number>(6);
  const [currentDayWorked, setCurrentDayWorked] = useState<number>(16);
  const [selectedMonth, setSelectedMonth] = useState<number>(3); // April = 3
  const [actualWeekStartMonth, setActualWeekStartMonth] = useState<number>(3);
  const [actualWeekStartDay, setActualWeekStartDay] = useState<number>(13);
  const [actualWeekEndMonth, setActualWeekEndMonth] = useState<number>(3);
  const [actualWeekEndDay, setActualWeekEndDay] = useState<number>(18);
  const [headerColor, setHeaderColor] = useState("#4F81BD");
  const [firstColColor, setFirstColColor] = useState("#DCE6F1");
  const [outlineColor, setOutlineColor] = useState("#D6D3D1");
  const [headerTextColor, setHeaderTextColor] = useState("#FFFFFF");
  const [bodyTextColor, setBodyTextColor] = useState("#1C1917");
  const [activePeriod, setActivePeriod] = useState<AnalysisPeriod>("ytd");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBrands = useMemo(() => {
    const allProducts = new Set([
      ...targets.keys(),
      ...sales2026.map((s) => s.description),
      ...sales2025.map((s) => s.description),
    ]);
    return Array.from(allProducts).sort((a, b) => a.localeCompare(b));
  }, [targets, sales2026, sales2025]);

  const relevantSales2026 = useMemo(() => {
    if (!targets.size) return sales2026;
    return mapSalesToTargetBrands(sales2026, targets);
  }, [sales2026, targets]);

  const relevantSales2025 = useMemo(() => {
    if (!targets.size) return sales2025;
    // Apply legacy mapping before matching to targets
    const mappedSales = sales2025.map((sale) => ({
      ...sale,
      description: LEGACY_SKU_MAP[sale.description] || sale.description,
    }));
    return mapSalesToTargetBrands(mappedSales, targets);
  }, [sales2025, targets]);

  const effectiveBrands = useMemo(() => {
    const base = selectedBrands.length > 0 ? selectedBrands : availableBrands;
    return [...base].sort((a, b) => extractUnitValue(a) - extractUnitValue(b));
  }, [availableBrands, selectedBrands]);

  const periodResults = useMemo(() => {
    // Derive MTD and YTD ranges from the week end date
    const weekEnd = new Date(2026, actualWeekEndMonth, actualWeekEndDay);
    const mtdStart = new Date(2026, selectedMonth, 1);
    const ytdStart = new Date(2026, 0, 1);

    const baseArgs = {
      brands: effectiveBrands,
      targets,
      sales2026: relevantSales2026,
      sales2025: relevantSales2025,
      selectedMonth,
      targetDaysInMonth,
      targetDaysInWeek,
      currentDayWorked,
      actualWeekStartMonth,
      actualWeekStartDay,
      actualWeekEndMonth,
      actualWeekEndDay,
      actualMonthStartMonth: 0,
      actualMonthStartDay: 1,
      actualMonthEndMonth: 0,
      actualMonthEndDay: 1,
      actualYearStartMonth: 0,
      actualYearStartDay: 1,
      actualYearEndMonth: 0,
      actualYearEndDay: 1,
    };

    return {
      wtd: buildPeriodTableRows({ ...baseArgs, period: "wtd" }),
      mtd: buildPeriodTableRows({
        ...baseArgs,
        actualMonthStartMonth: mtdStart.getMonth(),
        actualMonthStartDay: mtdStart.getDate(),
        actualMonthEndMonth: weekEnd.getMonth(),
        actualMonthEndDay: weekEnd.getDate(),
        period: "mtd",
      }),
      ytd: buildPeriodTableRows({
        ...baseArgs,
        actualYearStartMonth: ytdStart.getMonth(),
        actualYearStartDay: ytdStart.getDate(),
        actualYearEndMonth: weekEnd.getMonth(),
        actualYearEndDay: weekEnd.getDate(),
        period: "ytd",
      }),
    };
  }, [
    actualWeekEndMonth,
    actualWeekEndDay,
    actualWeekStartMonth,
    actualWeekStartDay,
    selectedMonth,
    targetDaysInMonth,
    targetDaysInWeek,
    currentDayWorked,
    effectiveBrands,
    targets,
    relevantSales2026,
    relevantSales2025,
  ]);

  const activeResults = periodResults[activePeriod];

  const summary = useMemo(
    () => ({
      brandsShown: effectiveBrands.length,
      totalWtd: periodResults.wtd.totals?.fy26Act ?? 0,
      totalMtd: periodResults.mtd.totals?.fy26Act ?? 0,
      totalYtd: periodResults.ytd.totals?.fy26Act ?? 0,
    }),
    [effectiveBrands.length, periodResults],
  );

  const ytgData = useMemo(() => {
    const weekEnd = new Date(2026, actualWeekEndMonth, actualWeekEndDay);
    const sortedBrands = [...effectiveBrands].sort(
      (a, b) => extractUnitValue(a) - extractUnitValue(b),
    );
    const groupToProducts = new Map<string, string[]>();
    sortedBrands.forEach((brand) => groupToProducts.set(brand, [brand]));

    return buildYtgRows({
      brands: sortedBrands,
      targets,
      sales2026: relevantSales2026,
      actualYearStartMonth: 0,
      actualYearStartDay: 1,
      actualYearEndMonth: weekEnd.getMonth(),
      actualYearEndDay: weekEnd.getDate(),
      groupToProducts,
    });
  }, [
    effectiveBrands,
    targets,
    relevantSales2026,
    actualWeekEndMonth,
    actualWeekEndDay,
  ]);

  // Comprehensive debug for all periods
  const vs25Debug = useMemo(() => {
    const periods = ["wtd", "mtd", "ytd"] as const;
    const result: any = {};

    const weekEnd2026 = new Date(2026, actualWeekEndMonth, actualWeekEndDay);
    const weekStart2026 = new Date(
      2026,
      actualWeekStartMonth,
      actualWeekStartDay,
    );
    const mtdStart2026 = new Date(2026, selectedMonth, 1);
    const ytdStart2026 = new Date(2026, 0, 1);

    for (const period of periods) {
      let start2026: Date, end2026: Date;
      if (period === "wtd") {
        start2026 = weekStart2026;
        end2026 = weekEnd2026;
      } else if (period === "mtd") {
        start2026 = mtdStart2026;
        end2026 = weekEnd2026;
      } else {
        start2026 = ytdStart2026;
        end2026 = weekEnd2026;
      }

      // Shift to 2025
      const start2025 = new Date(
        2025,
        start2026.getMonth(),
        start2026.getDate(),
      );
      const end2025 = new Date(2025, end2026.getMonth(), end2026.getDate());

      // Aggregate 2026
      const act2026: Record<string, number> = {};
      relevantSales2026.forEach((s) => {
        if (s.date >= start2026 && s.date <= end2026) {
          act2026[s.description] = (act2026[s.description] || 0) + s.casesSold;
        }
      });

      // Aggregate 2025 (with mapping)
      const act2025: Record<string, number> = {};
      relevantSales2025.forEach((s) => {
        if (s.date >= start2025 && s.date <= end2025) {
          act2025[s.description] = (act2025[s.description] || 0) + s.casesSold;
        }
      });

      // Target for period
      const tgt: Record<string, number> = {};
      effectiveBrands.forEach((brand) => {
        const targetRow = targets.get(brand);
        if (!targetRow) return;
        if (period === "wtd") {
          tgt[brand] =
            (targetRow.monthlyTargets[selectedMonth] / targetDaysInMonth) *
            targetDaysInWeek;
        } else if (period === "mtd") {
          tgt[brand] =
            (targetRow.monthlyTargets[selectedMonth] / targetDaysInMonth) *
            currentDayWorked;
        } else {
          const completed = targetRow.monthlyTargets
            .slice(0, selectedMonth)
            .reduce((a, b) => a + b, 0);
          tgt[brand] =
            completed +
            (targetRow.monthlyTargets[selectedMonth] / targetDaysInMonth) *
              currentDayWorked;
        }
      });

      result[period] = {
        ranges: {
          "2026": `${start2026.toDateString()} – ${end2026.toDateString()}`,
          "2025": `${start2025.toDateString()} – ${end2025.toDateString()}`,
        },
        bySku: effectiveBrands.map((brand) => ({
          sku: brand,
          tgt: tgt[brand] || 0,
          act2026: act2026[brand] || 0,
          act2025: act2025[brand] || 0,
          vs25: act2025[brand]
            ? (act2026[brand] / act2025[brand] - 1) * 100
            : 0,
        })),
      };
    }

    return result;
  }, [
    actualWeekStartMonth,
    actualWeekStartDay,
    actualWeekEndMonth,
    actualWeekEndDay,
    selectedMonth,
    targetDaysInMonth,
    targetDaysInWeek,
    currentDayWorked,
    effectiveBrands,
    targets,
    relevantSales2026,
    relevantSales2025,
  ]);
  const handleTargetUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);
    try {
      const parsedTargets = await parseTargetFile(file);
      setTargets(parsedTargets);
      setSelectedBrands((current) =>
        current.filter((brand) => parsedTargets.has(brand)),
      );
    } catch (uploadError) {
      setError(
        getErrorMessage(uploadError, "Unable to parse the target file."),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalesUpload =
    (setSales: Dispatch<SetStateAction<SalesRow[]>>) => async (file: File) => {
      setIsLoading(true);
      setError(null);
      try {
        const parsedSales = await parseSalesFile(file);
        setSales(parsedSales);
      } catch (uploadError) {
        setError(
          getErrorMessage(uploadError, "Unable to parse the sales file."),
        );
      } finally {
        setIsLoading(false);
      }
    };

  return (
    <main className="dashboard-app">
      <div className="dashboard-shell">
        <section className="dashboard-hero">
          <p className="dashboard-kicker">Mancom Dashboard</p>
          <h1 className="dashboard-title">Weekly sales volume analysis</h1>
          <p className="dashboard-subtitle">
            Upload the 2026 sales dump, 2026 target sheet, and 2025 sales dump
            to calculate WTD, MTD, YTD, and YTG performance by SKU.
          </p>
        </section>

        <section className="dashboard-grid dashboard-grid--intro">
          <div className="dashboard-card dashboard-card--soft">
            <h2 className="dashboard-heading">Upload source files</h2>
            <div className="dashboard-body dashboard-upload-grid">
              <FileUploader
                label="Sales dump 2026"
                onUpload={handleSalesUpload(setSales2026)}
              />
              <FileUploader label="Target" onUpload={handleTargetUpload} />
              <FileUploader
                label="Sales dump 2025"
                onUpload={handleSalesUpload(setSales2025)}
              />
            </div>
            {isLoading && (
              <p className="dashboard-status dashboard-status--loading">
                Processing workbook...
              </p>
            )}
            {error && (
              <p className="dashboard-status dashboard-status--error">
                {error}
              </p>
            )}
          </div>

          <div className="dashboard-card dashboard-card--soft">
            <h2 className="dashboard-heading">Quick summary</h2>
            <div className="dashboard-body dashboard-summary-grid">
              <SummaryCard
                label="Brands in scope"
                value={String(summary.brandsShown)}
              />
              <SummaryCard
                label="WTD actual"
                value={formatNumber(summary.totalWtd)}
              />
              <SummaryCard
                label="MTD actual"
                value={formatNumber(summary.totalMtd)}
              />
              <SummaryCard
                label="YTD actual"
                value={formatNumber(summary.totalYtd)}
              />
            </div>
          </div>
        </section>

        <section className="dashboard-grid dashboard-grid--content">
          <div className="dashboard-stack">
            <div className="dashboard-card">
              <h2 className="dashboard-heading">Controls</h2>
              <div className="dashboard-body">
                <DateControls
                  targetDaysInMonth={targetDaysInMonth}
                  setTargetDaysInMonth={setTargetDaysInMonth}
                  targetDaysInWeek={targetDaysInWeek}
                  setTargetDaysInWeek={setTargetDaysInWeek}
                  currentDayWorked={currentDayWorked}
                  setCurrentDayWorked={setCurrentDayWorked}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                  actualWeekStartMonth={actualWeekStartMonth}
                  setActualWeekStartMonth={setActualWeekStartMonth}
                  actualWeekStartDay={actualWeekStartDay}
                  setActualWeekStartDay={setActualWeekStartDay}
                  actualWeekEndMonth={actualWeekEndMonth}
                  setActualWeekEndMonth={setActualWeekEndMonth}
                  actualWeekEndDay={actualWeekEndDay}
                  setActualWeekEndDay={setActualWeekEndDay}
                />
              </div>
              <ColorPicker
                headerColor={headerColor}
                setHeaderColor={setHeaderColor}
                firstColColor={firstColColor}
                setFirstColColor={setFirstColColor}
                outlineColor={outlineColor}
                setOutlineColor={setOutlineColor}
                headerTextColor={headerTextColor}
                setHeaderTextColor={setHeaderTextColor}
                bodyTextColor={bodyTextColor}
                setBodyTextColor={setBodyTextColor}
              />
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <h2 className="dashboard-heading">Brand selector</h2>
                <span className="dashboard-meta">
                  Populated from target sheet
                </span>
              </div>
              <div className="dashboard-body">
                <BrandSelector
                  brands={availableBrands}
                  selected={selectedBrands}
                  onChange={setSelectedBrands}
                  getGroupLabel={getBrandGroupLabel}
                />
              </div>
            </div>
          </div>

          <div className="dashboard-stack">
            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <div>
                  <h2 className="dashboard-heading">Performance analysis</h2>
                  <p className="dashboard-copy">
                    Choose a period to view `SKU, FY '26 TGT, FY '26 ACT,
                    %CONTR., Act vs Tgt, vs'25`.
                  </p>
                </div>
                <div className="dashboard-pill-group">
                  {(["wtd", "mtd", "ytd"] as AnalysisPeriod[]).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setActivePeriod(period)}
                      className={`dashboard-pill ${activePeriod === period ? "is-active" : ""}`}
                    >
                      {period.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dashboard-body dashboard-note">
                <strong>{PERIOD_LABELS[activePeriod]}:</strong> Target uses its
                own controls while actuals come from the week range you choose.
                MTD and YTD actuals automatically use the Week End date as the
                cut‑off.
              </div>
              <div className="dashboard-body">
                <ResultsTable
                  period={activePeriod}
                  rows={activeResults.rows}
                  totals={activeResults.totals}
                  headerColor={headerColor}
                  firstColColor={firstColColor}
                  outlineColor={outlineColor}
                  headerTextColor={headerTextColor}
                  bodyTextColor={bodyTextColor}
                  fileName={`${activePeriod}-analysis.xlsx`}
                />
              </div>
            </div>

            <div className="dashboard-card">
              <div>
                <h2 className="dashboard-heading">YTG Volume Analysis</h2>
                <p className="dashboard-copy">
                  Year‑to‑Go balance based on full‑year targets and YTD actuals.
                </p>
              </div>
              <div className="dashboard-body">
                <YtgTable
                  rows={ytgData.rows}
                  total={ytgData.total}
                  headerColor={headerColor}
                  firstColColor={firstColColor}
                  outlineColor={outlineColor}
                  headerTextColor={headerTextColor}
                  bodyTextColor={bodyTextColor}
                />
                <div className="dashboard-card">
                  <h2>vs25 Full Debug</h2>
                  {(["wtd", "mtd", "ytd"] as const).map((period) => (
                    <div key={period} style={{ marginBottom: "2rem" }}>
                      <h3>{period.toUpperCase()}</h3>
                      <p>
                        <strong>2026 Range:</strong>{" "}
                        {vs25Debug[period].ranges["2026"]}
                      </p>
                      <p>
                        <strong>2025 Range:</strong>{" "}
                        {vs25Debug[period].ranges["2025"]}
                      </p>
                      <table className="dashboard-table">
                        <thead>
                          <tr>
                            <th>SKU</th>
                            <th>TGT</th>
                            <th>ACT 2026</th>
                            <th>ACT 2025</th>
                            <th>vs25%</th>
                          </tr>
                        </thead>
                        <tbody>
                          {vs25Debug[period].bySku.map((row: any) => (
                            <tr key={row.sku}>
                              <td>{row.sku}</td>
                              <td>{formatNumber(row.tgt)}</td>
                              <td>{formatNumber(row.act2026)}</td>
                              <td>{formatNumber(row.act2025)}</td>
                              <td>{formatNumber(row.vs25)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="dashboard-summary-card">
      <p className="dashboard-summary-label">{label}</p>
      <p className="dashboard-summary-value">{value}</p>
    </div>
  );
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("en-NG", {
    maximumFractionDigits: 0,
    minimumFractionDigits: 0,
  }).format(Math.round(value));
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

function mapSalesToTargetBrands(
  sales: SalesRow[],
  targets: Map<string, TargetRow>,
): SalesRow[] {
  const targetKeyMap = new Map<string, string>();
  for (const targetName of targets.keys()) {
    targetKeyMap.set(getComparableSkuKey(targetName), targetName);
  }
  return sales
    .map((sale) => {
      const matchedTarget = targetKeyMap.get(
        getComparableSkuKey(sale.description),
      );
      if (!matchedTarget) return null;
      return { ...sale, description: matchedTarget };
    })
    .filter((sale): sale is SalesRow => sale !== null);
}

export default App;
