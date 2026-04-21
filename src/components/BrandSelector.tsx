import { useMemo, useState } from 'react';

interface Props {
  brands: string[];
  selected: string[];
  onChange: (selected: string[]) => void;
  getGroupLabel?: (brand: string) => string;
}

export default function BrandSelector({
  brands,
  selected,
  onChange,
  getGroupLabel = () => 'other',
}: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const groupedBrands = useMemo(() => {
    const groups = brands.reduce<Map<string, string[]>>((accumulator, brand) => {
      const groupLabel = getGroupLabel(brand);
      const current = accumulator.get(groupLabel) ?? [];
      current.push(brand);
      accumulator.set(groupLabel, current);
      return accumulator;
    }, new Map());

    return Array.from(groups.entries())
      .map(([groupLabel, groupItems]) => [groupLabel, groupItems.sort((a, b) => a.localeCompare(b))] as const)
      .sort(([a], [b]) => compareGroupLabels(a, b));
  }, [brands, getGroupLabel]);

  const handleToggle = (brand: string) => {
    if (selected.includes(brand)) {
      onChange(selected.filter((item) => item !== brand));
    } else {
      onChange([...selected, brand]);
    }
  };

  const handleSelectAll = () => onChange(brands);
  const handleClear = () => onChange([]);

  const toggleGroupSelection = (groupBrands: string[]) => {
    const areAllSelected = groupBrands.every((brand) => selected.includes(brand));

    if (areAllSelected) {
      onChange(selected.filter((brand) => !groupBrands.includes(brand)));
      return;
    }

    onChange(Array.from(new Set([...selected, ...groupBrands])));
  };

  const toggleGroupOpen = (groupLabel: string) => {
    setOpenGroups((current) => ({
      ...current,
      [groupLabel]: !current[groupLabel],
    }));
  };

  return (
    <div className="dashboard-selector">
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        className="dashboard-selector__trigger"
      >
        <div>
          <p className="dashboard-selector__title">Choose brands</p>
          <p className="dashboard-selector__meta">
            {selected.length > 0 ? `${selected.length} selected` : 'No brand selected yet'}
          </p>
        </div>
        <span className="dashboard-selector__toggle">{isOpen ? 'Hide' : 'Show'}</span>
      </button>

      {isOpen && (
        <div className="dashboard-selector__panel">
          <div className="dashboard-selector__actions">
            <button type="button" onClick={handleSelectAll} className="dashboard-selector__action dashboard-selector__action--primary">
              Select All
            </button>
            <button type="button" onClick={handleClear} className="dashboard-selector__action dashboard-selector__action--danger">
              Clear
            </button>
          </div>

          <div className="dashboard-selector__groups">
            {groupedBrands.map(([groupLabel, groupBrands]) => {
              const selectedCount = groupBrands.filter((brand) => selected.includes(brand)).length;
              const displayLabel = groupLabel === 'other' ? 'Other' : groupLabel.toUpperCase();
              const isGroupOpen = openGroups[groupLabel] ?? false;

              return (
                <section key={groupLabel} className="dashboard-selector__group">
                  <div className="dashboard-selector__group-head">
                    <button
                      type="button"
                      onClick={() => toggleGroupOpen(groupLabel)}
                      className="dashboard-selector__group-info"
                    >
                      <p className="dashboard-selector__group-title">{displayLabel}</p>
                      <p className="dashboard-selector__group-meta">
                        {selectedCount}/{groupBrands.length} selected
                      </p>
                    </button>
                    <div className="dashboard-selector__group-actions">
                      <button
                        type="button"
                        onClick={() => toggleGroupSelection(groupBrands)}
                        className="dashboard-selector__chip"
                      >
                        {selectedCount === groupBrands.length ? 'Clear group' : 'Select group'}
                      </button>
                      <button
                        type="button"
                        onClick={() => toggleGroupOpen(groupLabel)}
                        className="dashboard-selector__chip"
                      >
                        {isGroupOpen ? 'Close' : 'Open'}
                      </button>
                    </div>
                  </div>

                  {isGroupOpen && (
                    <div className="dashboard-selector__group-body">
                      {groupBrands.map((brand) => (
                        <label key={brand} className="dashboard-selector__option">
                          <input
                            type="checkbox"
                            checked={selected.includes(brand)}
                            onChange={() => handleToggle(brand)}
                            className="dashboard-selector__checkbox"
                          />
                          <span>{brand}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </section>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function compareGroupLabels(a: string, b: string): number {
  if (a === 'other') {
    return 1;
  }

  if (b === 'other') {
    return -1;
  }

  const aValue = extractNumericPrefix(a);
  const bValue = extractNumericPrefix(b);

  if (aValue !== null && bValue !== null && aValue !== bValue) {
    return aValue - bValue;
  }

  return a.localeCompare(b);
}

function extractNumericPrefix(value: string): number | null {
  const match = value.match(/^(\d+(?:\.\d+)?)/);
  return match ? Number(match[1]) : null;
}
