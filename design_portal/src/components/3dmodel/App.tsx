import PlannerGrid from '@/components/3dmodel/2dmodel/PlannerGrid';
import Design, { gettingDesignID } from '@/components/3dmodel/design';
import { ThreeDView } from '@/components/3dmodel/design/interface';
import Footer from '@/components/3dmodel/footer/Footer';
import Header from '@/components/3dmodel/header/header';
import Sidebar from '@/components/3dmodel/sidebar/sidebar';
import Toolbar from '@/components/3dmodel/toolbar';
import React, { useEffect, useState } from 'react';
import { ToastContainer } from 'react-toastify';
import { releaseDesignScene } from './design/sceneSingleton';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppProps } from './interface';

const App: React.FC<AppProps> = ({ router }) => {
  const [design3D, setDesign3D] = useState<ThreeDView | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  useKeyboardShortcuts();

  const handleViewModeChange = (mode: '3d' | '2d') => {
    setViewMode(mode);
  };

  useEffect(() => {
    // Capture the design ID from the current route before it changes
    const designId = gettingDesignID();
    // When the App component entirely unmounts (e.g. user goes to Dashboard),
    // clear the scene cache for this design to prevent stale state on reload
    // but without destroying it during regular 2D/3D toggles (where App stays mounted).
    return () => {
      if (designId) {
        releaseDesignScene(designId);
      }
    };
  }, [router.query.id]);

  return (
    <div className="h-screen w-screen overflow-hidden">
      {viewMode === '3d' ? <Design setDesign3D={setDesign3D} /> : <PlannerGrid />}
      <Header router={router} design3D={design3D} />
      <Toolbar
        threeDView={design3D as ThreeDView}
        onViewModeChange={handleViewModeChange}
        viewMode={viewMode}
      />
      <Sidebar />
      <Footer viewMode={viewMode} onViewModeChange={handleViewModeChange} />
      <ToastContainer position="top-right" theme="dark" style={{ marginTop: '60px' }} />
    </div>
  );
};

export default App;
