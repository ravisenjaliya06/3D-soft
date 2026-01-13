import { assets } from '@/svgPaths';
import React from 'react';
import { FooterProps } from './interface';

const Footer: React.FC<FooterProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <footer className="fixed right-0 right-[15.5rem] bottom-[1rem] z-50">
      {/* temporary button created */}
      <div className="relative flex w-52 items-center justify-start gap-2 rounded-[0.4rem] bg-[#ffffff] p-[0.3rem]">
        <button
          onClick={() => onViewModeChange('2d')}
          className={`m-[0.3rem] h-10 w-28 rounded-lg border-none font-medium transition-all duration-200 ${
            viewMode === '2d' ? 'bg-[#DEEBF9] hover:bg-gray-200' : 'bg-[#ffffff] hover:bg-[#DEEBF9]'
          } `}
        >
          <img src={assets.icon_2d || '/placeholder.svg'} alt="2d Icon" />
        </button>

        <button
          onClick={() => onViewModeChange('3d')}
          className={`m-[0.3rem] h-10 w-28 rounded-lg border-none font-medium transition-all duration-200 ${
            viewMode === '3d' ? 'bg-[#DEEBF9] hover:bg-gray-200' : 'bg-[#ffffff] hover:bg-[#DEEBF9]'
          } `}
        >
          <img alt="3d Icon" src={assets.icon_3d || '/placeholder.svg'} />
        </button>
      </div>
    </footer>
  );
};

export default Footer;
