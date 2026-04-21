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
import { parseSalesFile, parseTargetFile } from './utils/excelParser';

const PERIOD_LABELS: Record<AnalysisPeriod, string> = {
  wtd: 'Week to Date',
  mtd: 'Month to Date',
  ytd: 'Year to Date',
};

function App() {
  const [targets, setTargets] = useState<Map<string, TargetRow>>(new Map());
  const [sales2026, setSales2026] = useState<SalesRow[]>([]);
  const [sales2025, setSales2025] = useState<SalesRow[]>([]);
  const [selectedBrands, setSelectedBrands] = useState<string[]>([]);
  const [weekDays, setWeekDays] = useState<number>(5);
  const [monthDays, setMonthDays] = useState<number>(15);
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth());
  const [headerColor, setHeaderColor] = useState('#4F81BD');
  const [firstColColor, setFirstColColor] = useState('#DCE6F1');
  const [activePeriod, setActivePeriod] = useState<AnalysisPeriod>('ytd');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const availableBrands = useMemo(() => {
    const brands = new Set<string>();

    sales2026.forEach((sale) => brands.add(sale.description));

    return Array.from(brands).sort((a, b) => a.localeCompare(b));
  }, [sales2026]);

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
        sales2026,
        sales2025,
        selectedMonth,
        monthDays,
        weekDays,
        period: 'wtd',
      }),
      mtd: buildPeriodTableRows({
        brands: effectiveBrands,
        targets,
        sales2026,
        sales2025,
        selectedMonth,
        monthDays,
        weekDays,
        period: 'mtd',
      }),
      ytd: buildPeriodTableRows({
        brands: effectiveBrands,
        targets,
        sales2026,
        sales2025,
        selectedMonth,
        monthDays,
        weekDays,
        period: 'ytd',
      }),
    }),
    [effectiveBrands, monthDays, sales2025, sales2026, selectedMonth, targets, weekDays],
  );

  const activeResults = periodResults[activePeriod];

  const ytgResults = useMemo(
    () =>
      buildYtgRows({
        brands: effectiveBrands,
        targets,
        sales2026,
        selectedMonth,
        monthDays,
      }),
    [effectiveBrands, monthDays, sales2026, selectedMonth, targets],
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
      setSelectedBrands((current) => current.filter((brand) => availableBrands.includes(brand)));
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
            <div className="dashboard-body grid gap-4 md:grid-cols-3">
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
                  weekDays={weekDays}
                  setWeekDays={setWeekDays}
                  monthDays={monthDays}
                  setMonthDays={setMonthDays}
                  selectedMonth={selectedMonth}
                  setSelectedMonth={setSelectedMonth}
                />
              </div>
              <ColorPicker
                headerColor={headerColor}
                setHeaderColor={setHeaderColor}
                firstColColor={firstColColor}
                setFirstColColor={setFirstColColor}
              />
            </div>

            <div className="dashboard-card">
              <div className="dashboard-card__header">
                <h2 className="dashboard-heading">Brand selector</h2>
                <span className="dashboard-meta">Populated from 2026 sales dump</span>
              </div>
              <div className="dashboard-body">
                <BrandSelector
                  brands={availableBrands}
                  selected={selectedBrands}
                  onChange={setSelectedBrands}
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
                    Choose a period to view `SKU, FY '26 TGT, FY '26 ACT, %contr. (Act.
                    Vs Tgt.), vs'25`.
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
                WTD uses `(month sales / 26) * worked days`, MTD uses selected month
                days, and YTD adds full months before the selected month plus the
                current MTD portion.
              </div>
              <div className="dashboard-body">
                <ResultsTable
                  title={`${activePeriod.toUpperCase()} Analysis`}
                  rows={activeResults.rows}
                  totals={activeResults.totals}
                  headerColor={headerColor}
                  firstColColor={firstColColor}
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

export default App;
