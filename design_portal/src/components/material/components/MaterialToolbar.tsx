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
    <div className="mb-[1rem] flex h-[7vh] items-center justify-between rounded-[10px] border border-[rgba(57,37,121,0.3)] bg-gradient-to-r from-white to-[#f5e5ff] px-[1.5rem] py-[0rem]">
      <div className="flex items-center">{/* Dropdown can be added here if needed */}</div>

      <div className="flex items-center space-x-3">
        <button className="flex items-center border-0 bg-transparent pr-[17px]">
          <img src={assets.filter || '/placeholder.svg'} alt="" />
        </button>
        <div className="relative flex items-center">
          <svg
            className="pointer-events-none absolute right-3 h-[17px] pb-[2px] pl-[7px] text-[#392579]/50"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={3}
          >
            <circle cx="11" cy="11" r="5" />
            <path d="m20 20-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-[24px] w-[170px] rounded-[7px] border border-[#392579]/50 bg-transparent pr-9 pl-4 text-sm text-gray-700 outline-none focus:border-purple-400 focus:ring-2 focus:ring-purple-300"
          />
        </div>
        {actionButton}
      </div>
    </div>
  );
};
