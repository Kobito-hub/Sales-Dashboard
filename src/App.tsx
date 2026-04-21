import { useMemo, useState } from 'react';
import type { Dispatch, SetStateAction } from 'react';
import type { AnalysisPeriod, SalesRow, TargetRow } from './types';
import './App.css';
import FileUploader from './components/FileUploader';
import BrandSelector from './components/BrandSelector';
import DateControls from './components/DateControls';
import ResultsTable from './components/ResultsTable';
import ColorPicker from './components/ColorPicker';
import YtgTable from './components/YtgTable';
import { buildPeriodTableRows, buildYtgRows } from './utils/calculations';
import {
  getBrandGroupLabel,
  getComparableSkuKey,
  parseSalesFile,
  parseTargetFile,
} from './utils/excelParser';

const PERIOD_LABELS: Record<AnalysisPeriod, string> = {
  wtd: 'Week to Date',
  mtd: 'Month to Date',
  ytd: 'Year to Date',
};

function App() {
  const today = new Date();

  const [targets, setTargets] = useState<Map<string, TargetRow>>(new Map());
  const [sales2026, setSales2026] = useState<SalesRow[]>([]);
  const [sales2025, setSales2025] = useState<SalesRow[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [targetDaysInMonth, setTargetDaysInMonth] = useState<number>(31);
  const [targetDaysInWeek, setTargetDaysInWeek] = useState<number>(5);
  const [currentDayWorked, setCurrentDayWorked] = useState<number>(today.getDate());
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [actualWeekStartMonth, setActualWeekStartMonth] = useState<number>(today.getMonth());
  const [actualWeekStartDay, setActualWeekStartDay] = useState<number>(today.getDate());
  const [actualWeekEndMonth, setActualWeekEndMonth] = useState<number>(today.getMonth());
  const [actualWeekEndDay, setActualWeekEndDay] = useState<number>(today.getDate());
  const [actualMonthStartMonth, setActualMonthStartMonth] = useState<number>(today.getMonth());
  const [actualMonthStartDay, setActualMonthStartDay] = useState<number>(1);
  const [actualMonthEndMonth, setActualMonthEndMonth] = useState<number>(today.getMonth());
  const [actualMonthEndDay, setActualMonthEndDay] = useState<number>(today.getDate());
  const [actualYearStartMonth, setActualYearStartMonth] = useState<number>(0);
  const [actualYearStartDay, setActualYearStartDay] = useState<number>(1);
  const [actualYearEndMonth, setActualYearEndMonth] = useState<number>(today.getMonth());
  const [actualYearEndDay, setActualYearEndDay] = useState<number>(today.getDate());
  const [headerColor, setHeaderColor] = useState('#4F81BD');
  const [firstColColor, setFirstColColor] = useState('#DCE6F1');
  const [outlineColor, setOutlineColor] = useState('#D6D3D1');
  const [headerTextColor, setHeaderTextColor] = useState('#FFFFFF');
  const [bodyTextColor, setBodyTextColor] = useState('#1C1917');
  const [activePeriod, setActivePeriod] = useState<AnalysisPeriod>('ytd');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBrands = useMemo(() => {
    const targetBrands = new Set(targets.keys());
    const salesBrands = new Set([...sales2026, ...sales2025].map(sale => sale.description));
    return Array.from(new Set([...targetBrands, ...salesBrands])).sort((a, b) => a.localeCompare(b));
  }, [targets, sales2026, sales2025]);

  const relevantSales2026 = useMemo(() => {
    if (!targets.size) {
      return sales2026;
    }

    return mapSalesToTargetBrands(sales2026, targets);
  }, [sales2026, targets]);

  const relevantSales2025 = useMemo(() => {
    if (!targets.size) {
      return sales2025;
    }

    return mapSalesToTargetBrands(sales2025, targets);
  }, [sales2025, targets]);

  const effectiveBrands = useMemo(() => {
    if (selectedBrands.length > 0) {
      return selectedBrands;
    }

    return availableBrands;
  }, [availableBrands, selectedBrands]);

  const periodResults = useMemo(
    () => ({
      wtd: buildPeriodTableRows({
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
        actualMonthStartMonth,
        actualMonthStartDay,
        actualMonthEndMonth,
        actualMonthEndDay,
        actualYearStartMonth,
        actualYearStartDay,
        actualYearEndMonth,
        actualYearEndDay,
        period: 'wtd',
      }),
      mtd: buildPeriodTableRows({
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
        actualMonthStartMonth,
        actualMonthStartDay,
        actualMonthEndMonth,
        actualMonthEndDay,
        actualYearStartMonth,
        actualYearStartDay,
        actualYearEndMonth,
        actualYearEndDay,
        period: 'mtd',
      }),
      ytd: buildPeriodTableRows({
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
        actualMonthStartMonth,
        actualMonthStartDay,
        actualMonthEndMonth,
        actualMonthEndDay,
        actualYearStartMonth,
        actualYearStartDay,
        actualYearEndMonth,
        actualYearEndDay,
        period: 'ytd',
      }),
    }),
    [
      actualYearEndDay,
      actualYearEndMonth,
      actualYearStartDay,
      actualYearStartMonth,
      actualMonthEndDay,
      actualMonthEndMonth,
      actualMonthStartDay,
      actualMonthStartMonth,
      actualWeekEndDay,
      actualWeekEndMonth,
      actualWeekStartDay,
      actualWeekStartMonth,
      currentDayWorked,
      effectiveBrands,
      relevantSales2025,
      relevantSales2026,
      selectedMonth,
      targetDaysInMonth,
      targetDaysInWeek,
      targets,
    ],
  );

  const activeResults = periodResults[activePeriod];

  const ytgResults = useMemo(
    () =>
      buildYtgRows({
        brands: effectiveBrands,
        targets,
        sales2026: relevantSales2026,
        actualYearStartMonth,
        actualYearStartDay,
        actualYearEndMonth,
        actualYearEndDay,
      }),
    [
      actualYearEndDay,
      actualYearEndMonth,
      actualYearStartDay,
      actualYearStartMonth,
      effectiveBrands,
      relevantSales2026,
      targets,
    ],
  );

  const summary = useMemo(() => {
    const totalWtd = periodResults.wtd.totals?.fy26Act ?? 0;
    const totalMtd = periodResults.mtd.totals?.fy26Act ?? 0;
    const totalYtd = periodResults.ytd.totals?.fy26Act ?? 0;

    return {
      brandsShown: effectiveBrands.length,
      totalWtd,
      totalMtd,
      totalYtd,
    };
  }, [effectiveBrands.length, periodResults]);

  const handleTargetUpload = async (file: File) => {
    setIsLoading(true);
    setError(null);

    try {
      const parsedTargets = await parseTargetFile(file);
      setTargets(parsedTargets);
      setSelectedBrands((current) => current.filter((brand) => parsedTargets.has(brand)));
    } catch (uploadError) {
      setError(getErrorMessage(uploadError, 'Unable to parse the target file.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleSalesUpload =
    (setSales: Dispatch<SetStateAction<SalesRow[]>>) =>
    async (file: File) => {
      setIsLoading(true);
      setError(null);

      try {
        const parsedSales = await parseSalesFile(file);
        setSales(parsedSales);
      } catch (uploadError) {
        setError(getErrorMessage(uploadError, 'Unable to parse the sales file.'));
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
            Upload the 2026 sales dump, 2026 target sheet, and 2025 sales dump to
            calculate WTD, MTD, YTD, and YTG performance by SKU. The tables below
            match `Description` to `SAP Product Name`, merge repeated products,
            and show totals automatically.
          </p>
        </section>

        <section className="dashboard-grid dashboard-grid--intro">
          <div className="dashboard-card dashboard-card--soft">
            <h2 className="dashboard-heading">Upload source files</h2>
            <div className="dashboard-body dashboard-upload-grid">
              <FileUploader label="Sales dump 2026" onUpload={handleSalesUpload(setSales2026)} />
              <FileUploader label="Target" onUpload={handleTargetUpload} />
              <FileUploader label="Sales dump 2025" onUpload={handleSalesUpload(setSales2025)} />
            </div>
            {isLoading && (
              <p className="dashboard-status dashboard-status--loading">Processing workbook...</p>
            )}
            {error && (
              <p className="dashboard-status dashboard-status--error">{error}</p>
            )}
          </div>

          <div className="dashboard-card dashboard-card--soft">
            <h2 className="dashboard-heading">Quick summary</h2>
            <div className="dashboard-body dashboard-summary-grid">
              <SummaryCard label="Brands in scope" value={String(summary.brandsShown)} />
              <SummaryCard label="WTD actual" value={formatNumber(summary.totalWtd)} />
              <SummaryCard label="MTD actual" value={formatNumber(summary.totalMtd)} />
              <SummaryCard label="YTD actual" value={formatNumber(summary.totalYtd)} />
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
                  actualMonthStartMonth={actualMonthStartMonth}
                  setActualMonthStartMonth={setActualMonthStartMonth}
                  actualMonthStartDay={actualMonthStartDay}
                  setActualMonthStartDay={setActualMonthStartDay}
                  actualMonthEndMonth={actualMonthEndMonth}
                  setActualMonthEndMonth={setActualMonthEndMonth}
                  actualMonthEndDay={actualMonthEndDay}
                  setActualMonthEndDay={setActualMonthEndDay}
                  actualYearStartMonth={actualYearStartMonth}
                  setActualYearStartMonth={setActualYearStartMonth}
                  actualYearStartDay={actualYearStartDay}
                  setActualYearStartDay={setActualYearStartDay}
                  actualYearEndMonth={actualYearEndMonth}
                  setActualYearEndMonth={setActualYearEndMonth}
                  actualYearEndDay={actualYearEndDay}
                  setActualYearEndDay={setActualYearEndDay}
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
                <span className="dashboard-meta">Populated from target sheet</span>
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
                    Choose a period to view `SKU, FY '26 TGT, FY '26 ACT, %CONTR.,
                    Act vs Tgt, vs'25`.
                  </p>
                </div>
                <div className="dashboard-pill-group">
                  {(['wtd', 'mtd', 'ytd'] as AnalysisPeriod[]).map((period) => (
                    <button
                      key={period}
                      type="button"
                      onClick={() => setActivePeriod(period)}
                      className={`dashboard-pill ${activePeriod === period ? 'is-active' : ''}`}
                    >
                      {period.toUpperCase()}
                    </button>
                  ))}
                </div>
              </div>
              <div className="dashboard-body dashboard-note">
                <strong>{PERIOD_LABELS[activePeriod]}:</strong>{' '}
                Target uses its own controls while actuals come from the date ranges
                you choose for week and month. YTD actual sums from January to the
                selected month and current day worked.
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
                <h2 className="dashboard-heading">YTG volume analysis</h2>
                <p className="dashboard-copy">
                  `SKU, 2026 Target, YTD Actual %Achieved of FY, YTG VOL BALANCE`
                </p>
              </div>
              <div className="dashboard-body">
                <YtgTable
                  rows={ytgResults.rows}
                  total={ytgResults.total}
                  headerColor={headerColor}
                  firstColColor={firstColColor}
                  outlineColor={outlineColor}
                  headerTextColor={headerTextColor}
                  bodyTextColor={bodyTextColor}
                />
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
  return new Intl.NumberFormat('en-NG', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  }).format(value);
}

function getErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message) {
    return error.message;
  }

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
      const matchedTarget = targetKeyMap.get(getComparableSkuKey(sale.description));

      if (!matchedTarget) {
        return null;
      }

      return {
        ...sale,
        description: matchedTarget,
      };
    })
    .filter((sale): sale is SalesRow => sale !== null);
}

export default App;

