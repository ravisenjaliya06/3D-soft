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
    <div className="mb-[1rem] flex h-[7vh] items-center justify-between rounded-[0.600rem] border border-[rgba(57,37,121,0.3)] bg-gradient-to-r from-white to-[#f5e5ff] px-[1.5rem] py-[0rem]">
      <div className="flex items-center">{/* Dropdown can be added here if needed */}</div>

      <div className="flex items-center space-x-3">
        <button className="flex items-center border-0 bg-transparent pr-[1rem]">
          <img src={assets.filter || '/placeholder.svg'} alt="" />
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
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-[1.5rem] w-[8.625rem] rounded-[0.5rem] border-[0.1rem] border-[#392579] bg-[#F6F1FF] pr-3 pl-[2.25rem] text-[0.75rem] text-[#392579] outline-none focus:border-[#392579]"
          />
        </div>

        {actionButton}
      </div>
    </div>
  );
};
