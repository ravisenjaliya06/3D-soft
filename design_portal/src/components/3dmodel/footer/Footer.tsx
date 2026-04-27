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
  const [showColorPicker, setShowColorPicker] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(event.target as Node)) {
        setShowColorPicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleWireframeButtonClick = () => {
    if (!isWireframeVisible) {
      // If turning ON, also show the picker
      handleWireframeToggle(true);
      setShowColorPicker(true);
    } else {
      // If already ON, toggle the picker visibility
      setShowColorPicker(!showColorPicker);
    }
  };

  const handleWireframeToggle = (forcedValue?: boolean) => {
    const newValue = forcedValue !== undefined ? forcedValue : !isWireframeVisible;
    dispatch(toggleWireframe(newValue));

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

  const handleDisableWireframe = () => {
    handleWireframeToggle(false);
    setShowColorPicker(false);
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
    <footer className="fixed right-0 right-[15.5rem] bottom-[0.5rem] z-50">
      {/* temporary button created */}
      <div className="relative flex items-center justify-start gap-2 rounded-[0.4rem] bg-[#ffffff] p-[0.3rem]">
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

        {/* Wireframe Toggle and Popover */}
        <div className="relative flex items-center" ref={popoverRef}>
          <div className="mx-[0.15rem] h-[1.5rem] w-[1px] bg-[#E0E0E0]" />
          <button
            onClick={handleWireframeButtonClick}
            title="Wireframe Options"
            className={`m-[0.3rem] flex h-10 w-10 items-center justify-center rounded-lg border-none font-medium transition-all duration-200 ${
              isWireframeVisible
                ? 'bg-[#DEEBF9] hover:bg-gray-200'
                : 'bg-[#ffffff] hover:bg-[#DEEBF9]'
            }`}
          >
            <svg
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke={isWireframeVisible ? '#2563EB' : '#6B7280'}
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 2L2 7L12 12L22 7L12 2Z" />
              <path d="M2 17L12 22L22 17" />
              <path d="M2 12L12 17L22 12" />
              <path d="M2 7V17" />
              <path d="M22 7V17" />
              <path d="M12 12V22" />
            </svg>
          </button>

          {/* Popover - Box type design as requested */}
          {showColorPicker && (
            <div className="animate-in fade-in zoom-in-95 slide-in-from-bottom-2 absolute bottom-full left-1/2 mb-3 w-48 -translate-x-1/2 duration-200">
              <div className="relative overflow-hidden rounded-xl border border-gray-100 bg-white p-3 shadow-[0_10px_25px_-5px_rgba(0,0,0,0.1),0_8px_10px_-6px_rgba(0,0,0,0.1)]">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-[11px] font-bold tracking-wider text-gray-500 uppercase">
                    Wireframe
                  </span>
                  <button
                    onClick={handleDisableWireframe}
                    className="text-[10px] font-medium text-red-500 hover:text-red-600"
                  >
                    Disable
                  </button>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleColorChange('#000000')}
                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                      wireframeColor === '#000000' ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="h-5 w-5 rounded-full border border-gray-200 shadow-inner"
                      style={{ backgroundColor: '#000000' }}
                    />
                    <span
                      className={`text-sm ${wireframeColor === '#000000' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                    >
                      Black
                    </span>
                    {wireframeColor === '#000000' && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>

                  <button
                    onClick={() => handleColorChange('#FFFFFF')}
                    className={`flex items-center gap-3 rounded-lg p-2 transition-colors ${
                      wireframeColor === '#FFFFFF' ? 'bg-gray-50' : 'hover:bg-gray-50'
                    }`}
                  >
                    <div
                      className="h-5 w-5 rounded-full border border-gray-200 shadow-inner"
                      style={{ backgroundColor: '#FFFFFF' }}
                    />
                    <span
                      className={`text-sm ${wireframeColor === '#FFFFFF' ? 'font-semibold text-gray-900' : 'text-gray-600'}`}
                    >
                      White
                    </span>
                    {wireframeColor === '#FFFFFF' && (
                      <div className="ml-auto h-1.5 w-1.5 rounded-full bg-blue-500" />
                    )}
                  </button>
                </div>

                {/* Arrow at bottom of popover */}
                <div className="absolute -bottom-1 left-1/2 h-2 w-2 -translate-x-1/2 rotate-45 border-r border-b border-gray-100 bg-white" />
              </div>
            </div>
          )}
        </div>
      </div>
    </footer>
  );
};

export default Footer;
