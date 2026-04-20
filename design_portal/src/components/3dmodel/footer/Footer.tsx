import { assets } from '@/svgPaths';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as THREE from 'three';
import { FLOOR_PLAN_TYPES, OBJECT_TYPES } from '../sceneCreator/interface';
import { RootState } from '../store';
import { toggleWireframe } from '../store/dataSlice';
import { FooterProps } from './interface';

const Footer: React.FC<FooterProps> = ({ viewMode, onViewModeChange }) => {
  const dispatch = useDispatch();
  const isWireframeVisible = useSelector((state: RootState) => state.data.isWireframeVisible);
  const scene = useSelector((state: RootState) => state.scene.scene);

  const handleWireframeToggle = () => {
    const newValue = !isWireframeVisible;
    dispatch(toggleWireframe(newValue));

    if (!scene) return;

    scene.traverse((obj) => {
      if (!(obj instanceof THREE.Mesh)) return;

      // Skip floors, sinks, models, and invisible boxes
      const type = obj.userData.type;
      if (
        type === OBJECT_TYPES.SINK ||
        type === OBJECT_TYPES.MODEL ||
        type === FLOOR_PLAN_TYPES.FLOOR ||
        obj.userData.isInvisibleBox
      ) {
        return;
      }

      // Find wireframe edge children and toggle visibility
      obj.children.forEach((child) => {
        if (child.userData.isWireframeEdge) {
          child.visible = newValue;
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

        {/* Wireframe Toggle */}
        <div className="mx-[0.15rem] h-[1.5rem] w-[1px] bg-[#E0E0E0]" />
        <button
          onClick={handleWireframeToggle}
          title={isWireframeVisible ? 'Hide Wireframe' : 'Show Wireframe'}
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
            {/* 3D wireframe cube icon */}
            <path d="M12 2L2 7L12 12L22 7L12 2Z" />
            <path d="M2 17L12 22L22 17" />
            <path d="M2 12L12 17L22 12" />
            <path d="M2 7V17" />
            <path d="M22 7V17" />
            <path d="M12 12V22" />
          </svg>
        </button>
      </div>
    </footer>
  );
};

export default Footer;
