import PlannerGrid from '@/components/3dmodel/2dmodel/PlannerGrid';
import Design from '@/components/3dmodel/design';
import { ThreeDView } from '@/components/3dmodel/design/interface';
import Footer from '@/components/3dmodel/footer/Footer';
import Header from '@/components/3dmodel/header/header';
import Sidebar from '@/components/3dmodel/sidebar/sidebar';
import Toolbar from '@/components/3dmodel/toolbar';
import React, { useState } from 'react';
import { ToastContainer } from 'react-toastify';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppProps } from './interface';

const App: React.FC<AppProps> = ({ router }) => {
  const [design3D, setDesign3D] = useState<ThreeDView | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  useKeyboardShortcuts();

  const handleViewModeChange = (mode: '3d' | '2d') => {
    setViewMode(mode);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      <Footer viewMode={viewMode} onViewModeChange={handleViewModeChange} />
      {viewMode === '3d' ? <Design setDesign3D={setDesign3D} /> : <PlannerGrid />}
      <Header router={router} design3D={design3D} />
      <Toolbar
        threeDView={design3D as ThreeDView}
        onViewModeChange={handleViewModeChange}
        viewMode={viewMode}
      />
      {viewMode === '3d' && <Sidebar />}
      <ToastContainer position="top-right" theme="dark" style={{ marginTop: '60px' }} />
    </div>
  );
};

export default App;
