// components/BrandSelector.tsx
interface Props {
  brands: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export default function BrandSelector({ brands, selected, onChange }: Props) {
  const handleToggle = (brand: string) => {
    if (selected.includes(brand)) {
      onChange(selected.filter(b => b !== brand));
    } else {
      onChange([...selected, brand]);
    }
  };
  
  const handleSelectAll = () => onChange(brands);
  const handleClear = () => onChange([]);
  
  return (
    <div className="border p-3 rounded max-h-60 overflow-y-auto">
      <div className="flex gap-2 mb-2">
        <button onClick={handleSelectAll} className="text-sm text-blue-600">Select All</button>
        <button onClick={handleClear} className="text-sm text-red-600">Clear</button>
      </div>
      {brands.map(brand => (
        <label key={brand} className="block">
          <input
            type="checkbox"
            checked={selected.includes(brand)}
            onChange={() => handleToggle(brand)}
            className="mr-2"
          />
          {brand}
        </label>
      ))}
    </div>
  );
}