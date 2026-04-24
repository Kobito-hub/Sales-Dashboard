import { useRef } from 'react';
import * as XLSX from 'xlsx';
import type { TerritoryTableRow } from '../types';

interface Props {
  title: string;
  rows: TerritoryTableRow[];
  headerColor: string;
  firstColColor: string;
  outlineColor: string;
  headerTextColor: string;
  bodyTextColor: string;
  shortfallLabel: string;
}

export default function TerritoryTable({
  title, rows, headerColor, firstColColor, outlineColor,
  headerTextColor, bodyTextColor, shortfallLabel,
}: Props) {
  const tableRef = useRef<HTMLTableElement>(null);

  const exportToExcel = () => {
    if (!tableRef.current) return;
    const ws = XLSX.utils.table_to_sheet(tableRef.current);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Territory');
    const buf = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = 'territory.xlsx';
    a.click(); URL.revokeObjectURL(url);
  };

  const copyTable = async () => {
    const arr = [
      [title],
      ['Region', 'TGT', 'ACH', 'TGT vs ACH', '% Contr', shortfallLabel],
      ...rows.map(r => [r.territory, fmt(r.tgt), fmt(r.ach), `${fmt(r.tgtVsAch)}%`, `${fmt(r.contributionPercent)}%`, fmt(r.shortfall)]),
    ];
    await navigator.clipboard.writeText(arr.map(r => r.join('\t')).join('\n'));
  };

  return (
    <div>
      <div className="mb-2 flex gap-2">
        <button onClick={exportToExcel} className="rounded bg-green-600 px-4 py-1 text-white">Excel</button>
        <button onClick={copyTable} className="rounded bg-blue-600 px-4 py-1 text-white">Copy</button>
      </div>
      <table ref={tableRef} className="w-full border-collapse overflow-hidden rounded-2xl text-left text-sm"
        style={{ color: bodyTextColor }}>
        <thead>
          <tr>
            <th colSpan={6} className="px-4 py-3 text-center text-base font-semibold"
              style={{ backgroundColor: headerColor, color: headerTextColor, border: `1px solid ${outlineColor}` }}>
              {title}
            </th>
          </tr>
          <tr style={{ backgroundColor: headerColor, color: headerTextColor }}>
            <th style={cell(outlineColor, firstColColor)}>Region</th>
            <th style={cell(outlineColor)}>TGT</th>
            <th style={cell(outlineColor)}>ACH</th>
            <th style={cell(outlineColor)}>TGT vs ACH</th>
            <th style={cell(outlineColor)}>% Contr</th>
            <th style={cell(outlineColor)}>{shortfallLabel}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(r => (
            <tr key={r.territory} className="bg-white even:bg-stone-50/50">
              <td style={cell(outlineColor, firstColColor)}>{r.territory}</td>
              <td style={cell(outlineColor)}>{fmt(r.tgt)}</td>
              <td style={cell(outlineColor)}>{fmt(r.ach)}</td>
              <td style={cell(outlineColor)}>{fmt(r.tgtVsAch)}%</td>
              <td style={cell(outlineColor)}>{fmt(r.contributionPercent)}%</td>
              <td style={cell(outlineColor)}>{fmt(r.shortfall)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function cell(outline: string, bg?: string) {
  return { border: `1px solid ${outline}`, backgroundColor: bg };
}
function fmt(v: number) {
  return new Intl.NumberFormat('en-NG', { maximumFractionDigits: 0 }).format(Math.round(v));
}