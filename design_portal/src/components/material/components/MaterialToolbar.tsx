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
    <div className="flex items-center h-[7vh] justify-between px-[1.5rem] py-[0rem] border border-[rgba(57,37,121,0.3)] bg-gradient-to-r from-white to-[#f5e5ff] rounded-[10px] mb-[1rem] ">
      <div className="flex items-center">{/* Dropdown can be added here if needed */}</div>

      <div className="flex items-center space-x-2">
        <button className="flex items-center bg-transparent border-0">
          <img src={assets.filter || '/placeholder.svg'} alt="" />
        </button>
        <div className="relative flex items-center">
          <input
            type="text"
            // placeholder="Search..."
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            className="h-[24px] w-[170px] pl-4 pr-9 text-sm text-gray-700 bg-transparent border border-gray-300 rounded-[7px] outline-none focus:ring-2 focus:ring-purple-300 focus:border-purple-400"
          />
          <svg className="absolute right-3 h-[1.5vh] w-64 text-gray-500 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor">
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
        <div className="flex items-center">
          {actionButton}
        </div>
      </div>
    </div>
  );
};
