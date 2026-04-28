import { assets } from '@/svgPaths';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { FLOOR_PLAN_TYPES, OBJECT_TYPES } from '../sceneCreator/interface';
import { RootState } from '../store';
import { setWireframeColor, toggleWireframe } from '../store/dataSlice';
import { FooterProps } from './interface';

const Footer: React.FC<FooterProps> = ({ viewMode, onViewModeChange }) => {
  const dispatch = useDispatch();
  const isWireframeVisible = useSelector((state: RootState) => state.data.isWireframeVisible);
  const wireframeColor = useSelector((state: RootState) => state.data.wireframeColor);
  const scene = useSelector((state: RootState) => state.scene.scene);
  const [showModeDropdown, setShowModeDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowModeDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWireframeToggle = (newValue: boolean) => {
    dispatch(toggleWireframe(newValue));
    setShowModeDropdown(false);

    if (!scene) return;

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      const type = obj.userData.type;
      if (
        type === OBJECT_TYPES.SINK ||
        type === OBJECT_TYPES.MODEL ||
        type === FLOOR_PLAN_TYPES.FLOOR ||
        obj.userData.isMain ||
        obj.userData.isInvisibleBox
      ) {
        return;
      }

      obj.children.forEach((child) => {
        if (child.userData.isWireframeEdge) {
          child.visible = newValue;
        }
      });
    });
  };

  const handleColorChange = (color: string) => {
    dispatch(setWireframeColor(color));

    if (!scene) return;

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      obj.children.forEach((child) => {
        if (child.userData.isWireframeEdge && child instanceof THREE.LineSegments) {
          if (child.material instanceof THREE.LineBasicMaterial) {
            child.material.color.set(color);
          }
        }
      });
    });
  };

  return (
    <div className="fixed right-[15.1rem] bottom-[0rem] z-[10] flex h-[3rem] items-center justify-center gap-[0.5rem] border-none select-none">
      {/* 2. Color Toggle Pill */}
      {isWireframeVisible && (
        <div className="flex h-[1.5rem] items-center rounded-[1rem] bg-[#FFFFFF] p-[0.35rem]">
          {/* BLACK OPTION */}
          <div
            onClick={() => handleColorChange('#000000')}
            className={`flex h-full cursor-pointer items-center gap-[0.4rem] rounded-[1rem] px-[0.6rem] transition-all duration-200 ${wireframeColor === '#000000' ? 'bg-[#DCE6F2]' : 'hover:bg-[#DCE6F2]'}`}
          >
            <div className="h-[0.7rem] w-[0.7rem] rounded-full bg-[#000000]"></div>
            <p className="text-[0.8rem] font-medium text-[#3B3B6D]">Black</p>
          </div>

          {/* WHITE OPTION */}
          <div
            onClick={() => handleColorChange('#FFFFFF')}
            className={`flex h-full cursor-pointer items-center gap-[0.4rem] rounded-[1rem] px-[0.6rem] transition-all duration-200 ${wireframeColor === '#FFFFFF' ? 'bg-[#DCE6F2]' : 'hover:bg-[#DCE6F2]'}`}
          >
            <div className="h-[0.7rem] w-[0.7rem] rounded-full border border-[#3B3B6D] bg-[#FFFFFF]"></div>
            <p className="text-[0.8rem] font-medium text-[#3B3B6D]">White</p>
          </div>
        </div>
      )}
      {/* 1. Wireframe Mode Dropdown Pill */}
      <div
        className="relative flex h-[1.5rem] w-[7.5rem] items-center rounded-[1rem] bg-[#FFFFFF] p-[0.35rem]"
        ref={dropdownRef}
      >
        {showModeDropdown && (
          <div className="absolute right-0 bottom-[2.2rem] left-0 z-[10001] overflow-hidden rounded-[0.4rem] border-none bg-[#FFFFFF]">
            <button
              onClick={() => handleWireframeToggle(false)}
              className="flex h-[2rem] w-[7.5rem] items-center justify-center border-none bg-[#FFFFFF] bg-white text-[0.75rem] font-medium text-[#3B3B6D] transition-colors hover:bg-[#DCE6F2]"
            >
              Solid
            </button>
            <div className="mx-2 h-[1px] bg-[#F1F5F9]" />
            <button
              onClick={() => handleWireframeToggle(true)}
              className="flex h-[2rem] w-[7.5rem] items-center justify-center border-none bg-[#ffffff] bg-white text-[0.75rem] font-medium text-[#3B3B6D] transition-colors hover:bg-[#DCE6F2]"
            >
              Solid + Edge
            </button>
          </div>
        )}
        <div
          onClick={() => setShowModeDropdown(!showModeDropdown)}
          className="flex h-full w-full cursor-pointer items-center justify-center gap-[0.4rem] rounded-[1rem] transition-all duration-200 hover:bg-[#D2DEED]"
        >
          <img src={assets.circle_footer_icon} alt="" className="h-[0.7rem] w-[0.8rem]" />

          <p className="w-[4.8rem] text-center text-[0.75rem] font-medium tracking-wide whitespace-nowrap text-[#3B3B6D]">
            {isWireframeVisible ? 'Solid + Edge' : 'Solid'}
          </p>

          <img
            src={assets.dropdown}
            alt=""
            className={`h-[0.8rem] w-[0.8rem] transition-transform duration-200 ${showModeDropdown ? 'rotate-180' : ''}`}
          />
        </div>
      </div>

      {/* 3. View Mode Toggle Pill */}
      <div className="flex h-[1.5rem] items-center rounded-[1rem] bg-[#FFFFFF] p-[0.35rem]">
        {/* 2D */}
        <button
          onClick={() => onViewModeChange('2d')}
          className={`flex h-full items-center justify-center gap-[0.4rem] rounded-[1rem] border-none px-[0.4rem] transition-all duration-200 ${viewMode === '2d' ? 'bg-[#DCE6F2]' : 'bg-transparent hover:bg-[#DCE6F2]'}`}
        >
          <img
            src={viewMode === '2d' ? assets.active_2d : assets.icon_2d}
            alt="2d"
            className="h-[0.8rem] w-auto"
          />
        </button>

        {/* 3D */}
        <button
          onClick={() => onViewModeChange('3d')}
          className={`flex h-full items-center justify-center gap-[0.4rem] rounded-[1rem] border-none px-[0.5rem] transition-all duration-200 ${viewMode === '3d' ? 'bg-[#DCE6F2]' : 'bg-transparent hover:bg-[#DCE6F2]'}`}
        >
          <img
            src={viewMode === '3d' ? assets.active_3d : assets.icon_3d}
            alt="3d"
            className="h-[0.8rem] w-auto"
          />
        </button>
      </div>
    </div>
  );
};

export default Footer;
