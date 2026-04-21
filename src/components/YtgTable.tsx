import { useRef } from 'react';
import * as XLSX from 'xlsx';
import type { YtgRow } from '../types';

interface Props {
  rows: YtgRow[];
  total: YtgRow | null;
  headerColor: string;
  firstColColor: string;
}

export default function YtgTable({ rows, total, headerColor, firstColColor }: Props) {
  const tableRef = useRef<HTMLTableElement>(null);

  const exportToExcel = () => {
    if (!tableRef.current) {
      return;
    }

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
      ['SKU', '2026 Target', 'YTD Actual %Achieved of FY', 'YTG VOL BALANCE'],
      ...rows.map((row) => [
        row.sku,
        row.target2026.toFixed(2),
        `${row.ytdAchievedPercent.toFixed(2)}%`,
        row.ytgBalance.toFixed(2),
      ]),
    ];

    if (total) {
      rowsToCopy.push([
        'TOTAL',
        total.target2026.toFixed(2),
        `${total.ytdAchievedPercent.toFixed(2)}%`,
        total.ytgBalance.toFixed(2),
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
      <table ref={tableRef} className="w-full border-collapse overflow-hidden rounded-2xl text-left text-sm">
        <thead>
          <tr style={{ backgroundColor: headerColor }}>
            <th className="border border-stone-200 px-4 py-3 font-semibold" style={{ backgroundColor: firstColColor }}>
              SKU
            </th>
            <th className="border border-stone-200 px-4 py-3 font-semibold">2026 Target</th>
            <th className="border border-stone-200 px-4 py-3 font-semibold">YTD Actual %Achieved of FY</th>
            <th className="border border-stone-200 px-4 py-3 font-semibold">YTG VOL BALANCE</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sku} className="bg-white even:bg-stone-50/50">
              <td className="border border-stone-200 px-4 py-3 font-medium" style={{ backgroundColor: firstColColor }}>
                {row.sku}
              </td>
              <td className="border border-stone-200 px-4 py-3">{row.target2026.toFixed(2)}</td>
              <td className="border border-stone-200 px-4 py-3">{row.ytdAchievedPercent.toFixed(2)}%</td>
              <td className="border border-stone-200 px-4 py-3">{row.ytgBalance.toFixed(2)}</td>
            </tr>
          ))}
          {total && (
            <tr className="font-bold">
              <td className="border border-stone-200 px-4 py-3" style={{ backgroundColor: firstColColor }}>
                TOTAL
              </td>
              <td className="border border-stone-200 px-4 py-3">{total.target2026.toFixed(2)}</td>
              <td className="border border-stone-200 px-4 py-3">{total.ytdAchievedPercent.toFixed(2)}%</td>
              <td className="border border-stone-200 px-4 py-3">{total.ytgBalance.toFixed(2)}</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
