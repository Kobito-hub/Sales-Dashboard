import { useRef } from 'react';
import * as XLSX from 'xlsx';
import type { YtgRow } from '../types';

interface Props {
  rows: YtgRow[];
  total: YtgRow | null;
  headerColor: string;
  firstColColor: string;
  outlineColor: string;
  headerTextColor: string;
  bodyTextColor: string;
  title?: string; // new prop
}

export default function YtgTable({
  rows,
  total,
  headerColor,
  firstColColor,
  outlineColor,
  headerTextColor,
  bodyTextColor,
  title = 'YTG VOLUME ANALYSIS',
}: Props) {
  const tableRef = useRef<HTMLTableElement>(null);

  const exportToExcel = () => {
    if (!tableRef.current) return;
    const ws = XLSX.utils.table_to_sheet(tableRef.current);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'YTG Analysis');
    const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([excelBuffer], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = 'ytg-analysis.xlsx';
    anchor.click();
    URL.revokeObjectURL(url);
  };

  const copyTable = async () => {
    const rowsToCopy = [
      [title],
      ['SKU', '2026 Target', 'YTD Actual', '% Achieved of FY', 'YTG VOL. BALANCE'],
      ...rows.map((row) => [
        row.sku,
        formatNumber(row.target2026),
        formatNumber(row.ytdActual),
        `${row.ytdAchievedPercent.toFixed(2)}%`,
        formatNumber(row.ytgBalance),
      ]),
    ];
    if (total) {
      rowsToCopy.push([
        'TOTAL',
        formatNumber(total.target2026),
        formatNumber(total.ytdActual),
        `${total.ytdAchievedPercent.toFixed(2)}%`,
        formatNumber(total.ytgBalance),
      ]);
    }
    const tabSeparated = rowsToCopy.map((row) => row.join('\t')).join('\n');
    await navigator.clipboard.writeText(tabSeparated);
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
          {/* Title row */}
          <tr>
            <th
              colSpan={5}
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
          {/* Column headers */}
          <tr style={{ backgroundColor: headerColor, color: headerTextColor }}>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor, firstColColor)}>
              SKU
            </th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>2026 Target</th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>YTD Actual</th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>% Achieved of FY</th>
            <th className="px-4 py-3 font-semibold" style={getCellStyle(outlineColor)}>YTG VOL. BALANCE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sku} className="bg-white even:bg-stone-50/50">
              <td className="px-4 py-3 font-medium" style={getCellStyle(outlineColor, firstColColor)}>
                {row.sku}
              </td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.target2026)}</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.ytdActual)}</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.ytdAchievedPercent)}%</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(row.ytgBalance)}</td>
            </tr>
          ))}
          {total && (
            <tr className="font-bold">
              <td className="px-4 py-3" style={getCellStyle(outlineColor, firstColColor)}>
                TOTAL
              </td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(total.target2026)}</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(total.ytdActual)}</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(total.ytdAchievedPercent)}%</td>
              <td className="px-4 py-3" style={getCellStyle(outlineColor)}>{formatNumber(total.ytgBalance)}</td>
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
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(value));
}