import { assets } from '@/svgPaths';
import type React from 'react';

interface MaterialToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  actionButton?: React.ReactNode;
}

export const MaterialToolbar: React.FC<MaterialToolbarProps> = ({
  searchQuery,
  onSearchChange,
  actionButton,
}) => {
  return (
    <div className="mt-[0.75rem] mb-[1rem] flex h-[7vh] items-center justify-between rounded-[0.4rem] border-[0.063rem] border-[rgba(57,37,121,0.3)] bg-gradient-to-r from-white to-[#f5e5ff] px-[1.5rem] py-[0rem]">
      <div className="ml-[43.5rem] flex items-center">
        <button className="flex items-center border-[0rem] bg-transparent pr-[1rem]">
          <img src={assets.filter || '/placeholder.svg'} alt="" className="h-[1rem] w-[1rem]" />
        </button>
        <div className="relative flex items-center">
          {/* Search Icon */}
          <svg
            className="pointer-events-none absolute left-[0.5rem] h-[1rem] w-[1rem] text-[#392579]/50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
            <circle cx="11" cy="11" r="5" />
            <path d="m20 20-4.35-4.35" />
          </svg>

          {/* Input */}
          <div className="relative z-25">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="h-[1.5rem] w-[8.625rem] overflow-visible rounded-[0.3rem] border-[0.1rem] border-[var(--border-color)] bg-transparent pr-3 pl-[2.25rem] text-[0.75rem] text-[var(--text-color)] outline-none focus:border-[var(--border-color)]"
            />
          </div>
        </div>

        {actionButton}
      </div>
    </div>
  );
};
