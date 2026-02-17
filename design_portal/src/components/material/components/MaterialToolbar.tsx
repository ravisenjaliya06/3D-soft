import { assets } from '@/svgPaths';
import type React from 'react';

interface MaterialToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  actionButton?: React.ReactNode;
  selectedType?: string | null;
  selectedName?: string | null;
}

export const MaterialToolbar: React.FC<MaterialToolbarProps> = ({
  searchQuery,
  onSearchChange,
  actionButton,
  selectedType,
  selectedName,
}) => {
  return (
    <div className="flex h-[3rem] shrink-0 items-center justify-between rounded-xl border border-[var(--primary-color-grey-2)] bg-gradient-to-r from-white to-[var(--primary-light-pink)] px-[0.5rem] shadow-sm">
      {/* Left side — Type / Name breadcrumb */}
      <div className="flex items-center gap-[0.4rem] text-[0.75rem]">
        {selectedType && (
          <>
            <span className="font-semibold text-[var(--primary-color)]">{selectedType}</span>
            {selectedName && (
              <>
                <span className="text-[var(--text-gray)]">/</span>
                <span className="text-[var(--project-item-text)]">{selectedName}</span>
              </>
            )}
          </>
        )}
      </div>

      {/* Right side — filter + search + action */}
      <div className="ml-auto flex items-center gap-[0.75rem]">
        <button className="flex h-[2rem] w-[2rem] items-center justify-center rounded-lg border border-[var(--primary-color-grey-2)] bg-white transition-all hover:border-[var(--primary-color)] hover:bg-[var(--primary-hover)]">
          <img src={assets.filter || '/placeholder.svg'} alt="Filter" className="h-[0.9rem] w-[0.9rem]" />
        </button>
        <div className="relative flex items-center">
          {/* Search Icon */}
          <svg
            className="pointer-events-none absolute left-[0.6rem] h-[0.85rem] w-[0.85rem] text-[var(--primary-color)] opacity-50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <circle cx="11" cy="11" r="6" />
            <path strokeLinecap="round" d="m20 20-4.35-4.35" />
          </svg>

          {/* Input */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search..."
            className="h-[2rem] w-[12rem] rounded-lg border border-[var(--primary-color-grey-2)] bg-white py-1 pr-3 pl-[2.2rem] text-[0.75rem] text-[var(--text-color)] outline-none transition-all placeholder:text-[var(--text-gray)] focus:border-[var(--primary-color)] focus:ring-2 focus:ring-[var(--primary-hover)]"
          />
        </div>

        {actionButton}
      </div>
    </div>
  );
};
