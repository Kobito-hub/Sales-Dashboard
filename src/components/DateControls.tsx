// components/DateControls.tsx
interface Props {
  weekDays: number;
  setWeekDays: (val: number) => void;
  monthDays: number;
  setMonthDays: (val: number) => void;
  selectedMonth: number;
  setSelectedMonth: (val: number) => void;
}

const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export default function DateControls({ weekDays, setWeekDays, monthDays, setMonthDays, selectedMonth, setSelectedMonth }: Props) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Week Days Worked (1-7)</label>
        <input type="number" min={1} max={7} value={weekDays} onChange={e => setWeekDays(Math.min(7, Math.max(1, Number(e.target.value) || 1)))} className="w-full rounded-xl border border-stone-300 px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Month Days (1-31)</label>
        <input type="number" min={1} max={31} value={monthDays} onChange={e => setMonthDays(Math.min(31, Math.max(1, Number(e.target.value) || 1)))} className="w-full rounded-xl border border-stone-300 px-3 py-2" />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-stone-700">Current Month</label>
        <select value={selectedMonth} onChange={e => setSelectedMonth(+e.target.value)} className="w-full rounded-xl border border-stone-300 px-3 py-2">
          {months.map((m, idx) => <option key={m} value={idx}>{m}</option>)}
        </select>
      </div>
    </div>
  );
}
