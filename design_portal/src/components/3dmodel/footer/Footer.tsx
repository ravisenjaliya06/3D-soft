import React from 'react';
import { FooterProps } from './interface';

const Footer: React.FC<FooterProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <footer className="fixed right-0 bottom-0 left-0 z-50 border-t border-gray-200">
      {/* temporary button created */}
      <div className="relative left-[14.5rem] flex w-52 items-center justify-start gap-2 px-4 py-3">
        <button
          onClick={() => onViewModeChange('3d')}
          className={`h-10 w-28 rounded-lg font-medium transition-all duration-200 ${
            viewMode === '3d'
              ? 'bg-blue-700 text-white hover:bg-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } `}
        >
          3D
        </button>

        <button
          onClick={() => onViewModeChange('2d')}
          className={`h-10 w-28 rounded-lg font-medium transition-all duration-200 ${
            viewMode === '2d'
              ? 'bg-blue-700 text-white hover:bg-blue-800'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          } `}
        >
          2D
        </button>
      </div>
    </footer>
  );
};

export default Footer;
