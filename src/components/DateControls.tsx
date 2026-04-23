// components/DateControls.tsx
import type { ReactNode } from 'react';

interface Props {
  targetDaysInMonth: number;
  setTargetDaysInMonth: (val: number) => void;
  targetDaysInWeek: number;
  setTargetDaysInWeek: (val: number) => void;
  currentDayWorked: number;
  setCurrentDayWorked: (val: number) => void;
  selectedMonth: number;
  setSelectedMonth: (val: number) => void;
  actualWeekStartMonth: number;
  setActualWeekStartMonth: (val: number) => void;
  actualWeekStartDay: number;
  setActualWeekStartDay: (val: number) => void;
  actualWeekEndMonth: number;
  setActualWeekEndMonth: (val: number) => void;
  actualWeekEndDay: number;
  setActualWeekEndDay: (val: number) => void;
}

const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export default function DateControls(props: Props) {
  const {
    targetDaysInMonth, setTargetDaysInMonth,
    targetDaysInWeek, setTargetDaysInWeek,
    currentDayWorked, setCurrentDayWorked,
    selectedMonth, setSelectedMonth,
    actualWeekStartMonth, setActualWeekStartMonth,
    actualWeekStartDay, setActualWeekStartDay,
    actualWeekEndMonth, setActualWeekEndMonth,
    actualWeekEndDay, setActualWeekEndDay,
  } = props;

  return (
    <div className="dashboard-controls">
      <section className="dashboard-controls__section">
        <h3 className="dashboard-controls__title">Target Controls</h3>
        <div className="dashboard-controls__grid dashboard-controls__grid--target">
          <Field label="Days in Month">
            <input
              type="number"
              min={1}
              max={31}
              value={targetDaysInMonth}
              onChange={(e) => setTargetDaysInMonth(clampNumber(e.target.value, 1, 31))}
              className="dashboard-input"
            />
          </Field>
          <Field label="Days in Week">
            <input
              type="number"
              min={1}
              max={6}
              value={targetDaysInWeek}
              onChange={(e) => setTargetDaysInWeek(clampNumber(e.target.value, 1, 6))}
              className="dashboard-input"
            />
          </Field>
          <Field label="Current Day Worked">
            <input
              type="number"
              min={1}
              max={31}
              value={currentDayWorked}
              onChange={(e) => setCurrentDayWorked(clampNumber(e.target.value, 1, 31))}
              className="dashboard-input"
            />
          </Field>
          <Field label="Current Month">
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(Number(e.target.value))}
              className="dashboard-input"
            >
              {months.map((m, i) => (
                <option key={m} value={i}>{m}</option>
              ))}
            </select>
          </Field>
        </div>
      </section>

      <section className="dashboard-controls__section">
        <h3 className="dashboard-controls__title">Week Range (Current Week)</h3>
        <div className="dashboard-controls__grid dashboard-controls__grid--ranges">
          <RangeField
            label="Week Start"
            month={actualWeekStartMonth}
            setMonth={setActualWeekStartMonth}
            day={actualWeekStartDay}
            setDay={setActualWeekStartDay}
          />
          <RangeField
            label="Week End"
            month={actualWeekEndMonth}
            setMonth={setActualWeekEndMonth}
            day={actualWeekEndDay}
            setDay={setActualWeekEndDay}
          />
        </div>
        <p className="text-sm text-stone-500 mt-2">
          MTD and YTD actuals automatically use the Week End date as the cut‑off.
        </p>
      </section>
    </div>
  );
}

function RangeField({
  label,
  month,
  setMonth,
  day,
  setDay,
}: {
  label: string;
  month: number;
  setMonth: (val: number) => void;
  day: number;
  setDay: (val: number) => void;
}) {
  return (
    <Field label={label}>
      <div className="dashboard-range">
        <select value={month} onChange={(e) => setMonth(Number(e.target.value))} className="dashboard-input">
          {months.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>
        <input
          type="number"
          min={1}
          max={31}
          value={day}
          onChange={(e) => setDay(clampNumber(e.target.value, 1, 31))}
          className="dashboard-input"
        />
      </div>
    </Field>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="dashboard-field">
      <span className="dashboard-field__label">{label}</span>
      {children}
    </label>
  );
}

function clampNumber(value: string, min: number, max: number): number {
  const parsed = Number(value) || min;
  return Math.min(max, Math.max(min, parsed));
}