'use client';

import { RootState } from '@/components/3dmodel/store';
import { ReactNode } from 'react';
import { useSelector } from 'react-redux';
import BackendDownOverlay from './BackendDownOverlay';

interface BackendStatusGateProps {
  children: ReactNode;
}

const BackendStatusGate = ({ children }: BackendStatusGateProps) => {
  const isDown = useSelector((state: RootState) => state.backendStatus.isDown);

  return (
    <>
      {isDown && <BackendDownOverlay />}
      {children}
    </>
  );
};

export default BackendStatusGate;
