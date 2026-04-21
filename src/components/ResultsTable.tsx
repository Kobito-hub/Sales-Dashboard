// components/ResultsTable.tsx
import { useRef } from 'react';
import * as XLSX from 'xlsx';
import type { TableRow } from '../types';

interface Props {
  title: string;
  rows: TableRow[];
  totals: TableRow | null;
  headerColor: string;
  firstColColor: string;
  fileName: string;
}

export default function ResultsTable({
  title,
  rows,
  totals,
  headerColor,
  firstColColor,
  fileName,
}: Props) {
  const tableRef = useRef<HTMLTableElement>(null);
  
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
    if (!tableRef.current) {
      return;
    }

    const rowsToCopy = [
      ["SKU", "FY '26 TGT", "FY '26 ACT", "%contr. (Act. Vs Tgt.)", "vs'25"],
      ...rows.map((row) => [
        row.sku,
        row.fy26Target.toFixed(2),
        row.fy26Act.toFixed(2),
        `${row.percentVsTarget.toFixed(2)}%`,
        `${row.vs25.toFixed(2)}%`,
      ]),
    ];

    if (totals) {
      rowsToCopy.push([
        'TOTAL',
        totals.fy26Target.toFixed(2),
        totals.fy26Act.toFixed(2),
        `${totals.percentVsTarget.toFixed(2)}%`,
        `${totals.vs25.toFixed(2)}%`,
      ]);
    }

    const tabSeparated = rowsToCopy.map((row) => row.join('\t')).join('\n');
    await navigator.clipboard.writeText(tabSeparated);
  };
  
  return (
    <div>
      <div className="flex gap-2 mb-2">
        <button onClick={exportToExcel} className="bg-green-600 text-white px-4 py-1 rounded">Download Excel</button>
        <button onClick={copyTable} className="bg-blue-600 text-white px-4 py-1 rounded">Copy Table</button>
      </div>
      <table ref={tableRef} className="w-full border-collapse overflow-hidden rounded-2xl text-left text-sm">
        <thead>
          <tr style={{ backgroundColor: headerColor }}>
            <th className="border border-stone-200 px-4 py-3 font-semibold" style={{ backgroundColor: firstColColor }}>SKU</th>
            <th className="border border-stone-200 px-4 py-3 font-semibold">FY '26 TGT</th>
            <th className="border border-stone-200 px-4 py-3 font-semibold">FY '26 ACT</th>
            <th className="border border-stone-200 px-4 py-3 font-semibold">%contr. (Act. Vs Tgt.)</th>
            <th className="border border-stone-200 px-4 py-3 font-semibold">vs'25</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="bg-white even:bg-stone-50/50">
              <td className="border border-stone-200 px-4 py-3 font-medium" style={{ backgroundColor: firstColColor }}>{row.sku}</td>
              <td className="border border-stone-200 px-4 py-3">{row.fy26Target.toFixed(2)}</td>
              <td className="border border-stone-200 px-4 py-3">{row.fy26Act.toFixed(2)}</td>
              <td className="border border-stone-200 px-4 py-3">{row.percentVsTarget.toFixed(2)}%</td>
              <td className="border border-stone-200 px-4 py-3">{row.vs25.toFixed(2)}%</td>
            </tr>
          ))}
          {totals && (
            <tr className="font-bold">
              <td className="border border-stone-200 px-4 py-3" style={{ backgroundColor: firstColColor }}>TOTAL</td>
              <td className="border border-stone-200 px-4 py-3">{totals.fy26Target.toFixed(2)}</td>
              <td className="border border-stone-200 px-4 py-3">{totals.fy26Act.toFixed(2)}</td>
              <td className="border border-stone-200 px-4 py-3">{totals.percentVsTarget.toFixed(2)}%</td>
              <td className="border border-stone-200 px-4 py-3">{totals.vs25.toFixed(2)}%</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
