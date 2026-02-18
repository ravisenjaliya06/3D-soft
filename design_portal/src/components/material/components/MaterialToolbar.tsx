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
    <div className="flex h-[3.2rem] shrink-0 items-center justify-between rounded-2xl border border-[rgba(124,92,191,0.12)] bg-gradient-to-r from-[#ffffff] via-[#fcfaff] to-[#f5f1ff] px-[1rem] shadow-[0_4px_24px_rgba(57,37,121,0.06),0_1px_4px_rgba(57,37,121,0.04)]">
      {/* Left side — Type / Name breadcrumb */}
      <div className="flex items-center gap-[0.5rem] text-[0.8rem]">
        {selectedType && (
          <>
            <div className="flex items-center gap-[0.35rem]">
              <div className="h-[0.5rem] w-[0.5rem] rounded-full bg-gradient-to-br from-[#7c5cbf] to-[#4b2aad]" />
              <span className="font-bold tracking-wide text-[#4b2aad]">{selectedType}</span>
            </div>
            {selectedName && (
              <>
                <svg
                  className="h-[0.7rem] w-[0.7rem] text-[#c9b8f0]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path strokeLinecap="round" d="m9 18 6-6-6-6" />
                </svg>
                <span className="font-medium text-[#5a6577]">{selectedName}</span>
              </>
            )}
          </>
        )}
      </div>

      {/* Right side — filter + search + action */}
      <div className="ml-auto flex items-center gap-[0.6rem]">
        <button className="flex h-[2.1rem] w-[2.1rem] items-center justify-center rounded-xl border border-[rgba(124,92,191,0.12)] bg-gradient-to-br from-[#faf8ff] to-[#f0ebff] transition-all duration-200 hover:scale-105 hover:border-[#7c5cbf] hover:shadow-[0_4px_12px_rgba(124,92,191,0.15)] active:scale-95">
          <img
            src={assets.filter || '/placeholder.svg'}
            alt="Filter"
            className="h-[0.9rem] w-[0.9rem] opacity-70"
          />
        </button>
        <div className="relative flex items-center">
          {/* Search Icon */}
          <svg
            className="pointer-events-none absolute left-[0.65rem] h-[0.85rem] w-[0.85rem] text-[#7c5cbf] opacity-50"
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
            placeholder="Search materials..."
            className="h-[2.1rem] w-[14rem] rounded-xl border border-[rgba(124,92,191,0.12)] bg-gradient-to-r from-[#faf8ff] to-[#f5f1ff] py-1 pr-3 pl-[2.2rem] text-[0.75rem] text-[#2d3748] transition-all duration-200 outline-none placeholder:text-[#a8b0bf] focus:border-[#7c5cbf] focus:bg-white focus:shadow-[0_0_0_3px_rgba(124,92,191,0.1)] focus:placeholder:text-[#c9b8f0]"
          />
        </div>

        {actionButton}
      </div>
    </div>
  );
};
