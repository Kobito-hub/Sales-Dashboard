// components/ColorPicker.tsx
interface Props {
  headerColor: string;
  setHeaderColor: (c: string) => void;
  firstColColor: string;
  setFirstColColor: (c: string) => void;
}

export default function ColorPicker({ headerColor, setHeaderColor, firstColColor, setFirstColColor }: Props) {
  return (
    <div className="flex gap-4 mb-4">
      <label>
        Header row color:
        <input type="color" value={headerColor} onChange={e => setHeaderColor(e.target.value)} className="ml-2" />
      </label>
      <label>
        First column color:
        <input type="color" value={firstColColor} onChange={e => setFirstColColor(e.target.value)} className="ml-2" />
      </label>
    </div>
  );
}