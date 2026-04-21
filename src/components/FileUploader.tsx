// components/FileUploader.tsx
import { useRef } from 'react';

interface Props {
  label: string;
  onUpload: (file: File) => void;
  accept?: string;
}

export default function FileUploader({ label, onUpload, accept = ".xlsx,.xls" }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) onUpload(file);
  };
  
  return (
    <div className="mb-4">
      <label className="mb-1 block text-sm font-medium text-stone-700">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="w-full rounded-xl border border-stone-300 px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-amber-100 file:px-3 file:py-2 file:font-medium file:text-amber-900"
      />
    </div>
  );
}
