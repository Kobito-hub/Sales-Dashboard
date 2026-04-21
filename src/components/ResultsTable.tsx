import { useRef } from 'react';
import * as XLSX from 'xlsx';
import type { AnalysisPeriod, TableRow } from '../types';

interface Props {
  period: AnalysisPeriod;
  rows: TableRow[];
  totals: TableRow | null;
  headerColor: string;
  firstColColor: string;
  outlineColor: string;
  headerTextColor: string;
  bodyTextColor: string;
  fileName: string;
}

const PERIOD_TITLES: Record<AnalysisPeriod, string> = {
  wtd: 'SKU CONTRIBUTION WTD',
  mtd: 'SKU CONTRIBUTION MTD',
  ytd: 'SKU CONTRIBUTION YTD',
};

export default function ResultsTable({
  period,
  rows,
  totals,
  headerColor,
  firstColColor,
  outlineColor,
  headerTextColor,
  bodyTextColor,
  fileName,
}: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  const title = PERIOD_TITLES[period];

  const exportToExcel = () => {
    if (!tableRef.current) {
      return;
    }

    const ws = XLSX.utils.table_to_sheet(tableRef.current);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, title);
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');

    anchor.href = url;
    anchor.download = fileName;
    anchor.click();

    URL.revokeObjectURL(url);
  };

  const copyTable = async () => {
    const rowsToCopy = [
      [title],
      ['SKU', "FY '26 TGT", "FY '26 ACT", '%CONTR.', 'Act vs Tgt', "vs'25"],
      ...rows.map((row) => [
        row.sku,
        formatNumber(row.fy26Target),
        formatNumber(row.fy26Act),
        `${formatNumber(row.contributionPercent)}%`,
        `${formatNumber(row.actVsTarget)}%`,
        `${formatNumber(row.vs25)}%`,
      ]),
    ];

    if (totals) {
      rowsToCopy.push([
        'TOTAL',
        formatNumber(totals.fy26Target),
        formatNumber(totals.fy26Act),
        `${formatNumber(totals.contributionPercent)}%`,
        `${formatNumber(totals.actVsTarget)}%`,
        `${formatNumber(totals.vs25)}%`,
      ]);
    }

    await navigator.clipboard.writeText(rowsToCopy.map((row) => row.join('\t')).join('\n'));
  };

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <button onClick={exportToExcel} className="rounded bg-green-600 px-4 py-1 text-white">
          Download Excel
        </button>
        <button onClick={copyTable} className="rounded bg-blue-600 px-4 py-1 text-white">
          Copy Table
        </button>
      </div>
      <table
        ref={tableRef}
        className="w-full border-collapse overflow-hidden rounded-2xl text-left text-sm"
        style={{ color: bodyTextColor }}
      >
        <thead>
          <tr>
            <th
              colSpan={6}
              className="px-4 py-3 text-center text-base font-semibold"
              style={{
                backgroundColor: headerColor,
                color: headerTextColor,
                border: `1px solid ${outlineColor}`,
              }}
            >
              {title}
            </th>
          </tr>
          <tr style={{ backgroundColor: headerColor, color: headerTextColor }}>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor, firstColColor)}>
              SKU
            </th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>
              FY '26 TGT
            </th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>
              FY '26 ACT
            </th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>
              %CONTR.
            </th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>
              Act vs Tgt
            </th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>
              vs'25
            </th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sku} className="bg-white even:bg-stone-50/50">
              <td className="px-4 py-3 font-medium" style={getCellStyle(outlineColor, firstColColor)}>
                {row.sku}
              </td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.fy26Target)}</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.fy26Act)}</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.contributionPercent)}%</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.actVsTarget)}%</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.vs25)}%</td>
            </tr>
          ))}
          {totals && (
            <tr className="font-bold">
              <td className="px-4 py-3" style={getCellStyle(outlineColor, firstColColor)}>TOTAL</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(totals.fy26Target)}</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(totals.fy26Act)}</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(totals.contributionPercent)}%</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(totals.actVsTarget)}%</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(totals.vs25)}%</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function getCellStyle(outlineColor: string, backgroundColor?: string) {
  return {
    border: `1px solid ${outlineColor}`,
    backgroundColor,
  };
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-NG', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
}
