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
    <div className="dashboard-upload-card">
      <label className="dashboard-upload-card__label">{label}</label>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        onChange={handleChange}
        className="dashboard-upload-card__input"
      />
    </div>
  );
}
