// components/ColorPicker.tsx
interface Props {
  headerColor: string;
  setHeaderColor: (c: string) => void;
  firstColColor: string;
  setFirstColColor: (c: string) => void;
  outlineColor: string;
  setOutlineColor: (c: string) => void;
  headerTextColor: string;
  setHeaderTextColor: (c: string) => void;
  bodyTextColor: string;
  setBodyTextColor: (c: string) => void;
}

export default function ColorPicker({
  headerColor,
  setHeaderColor,
  firstColColor,
  setFirstColColor,
  outlineColor,
  setOutlineColor,
  headerTextColor,
  setHeaderTextColor,
  bodyTextColor,
  setBodyTextColor,
}: Props) {
  return (
    <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <label className="text-sm font-medium text-stone-700">
        Header row color
        <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="mt-2 block h-11 w-full rounded-lg border border-stone-300 bg-white p-1" />
      </label>
      <label className="text-sm font-medium text-stone-700">
        First column color
        <input type="color" value={firstColColor} onChange={e => setFirstColColor(e.target.value)} className="mt-2 block h-11 w-full rounded-lg border border-stone-300 bg-white p-1" />
      </label>
      <label className="text-sm font-medium text-stone-700">
        Outline color
        <input type="color" value={outlineColor} onChange={e => setOutlineColor(e.target.value)} className="mt-2 block h-11 w-full rounded-lg border border-stone-300 bg-white p-1" />
      </label>
      <label className="text-sm font-medium text-stone-700">
        Header text color
        <input type="color" value={headerTextColor} onChange={e => setHeaderTextColor(e.target.value)} className="mt-2 block h-11 w-full rounded-lg border border-stone-300 bg-white p-1" />
      </label>
      <label className="text-sm font-medium text-stone-700">
        Body text color
        <input type="color" value={bodyTextColor} onChange={e => setBodyTextColor(e.target.value)} className="mt-2 block h-11 w-full rounded-lg border border-stone-300 bg-white p-1" />
      </label>
    </div>
  );
}
