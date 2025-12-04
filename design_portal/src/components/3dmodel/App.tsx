import PlannerGrid from '@/components/3dmodel/2dmodel/PlannerGrid';
import Design from '@/components/3dmodel/design';
import { ThreeDView } from '@/components/3dmodel/design/interface';
import Footer from '@/components/3dmodel/footer/Footer';
import Header from '@/components/3dmodel/header/header';
import Sidebar from '@/components/3dmodel/sidebar/sidebar';
import Toolbar from '@/components/3dmodel/toolbar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonServices from '@/services/CommonService';
import React, { useEffect, useState } from 'react';
import { useAppDispatch } from './hooks';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppProps, CatalogApiResponse } from './interface';
import { setSettings } from './store/designSettingsSlice';

const App: React.FC<AppProps> = ({ router }) => {
  const dispatch = useAppDispatch();
  const designID = window.location.pathname.split('/')[2];
  const [design3D, setDesign3D] = useState<ThreeDView | null>(null);
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  const fetchDesignSettings = async () => {
    const response: { status: number; data: CatalogApiResponse } = await CommonServices.get(
      API_ENDPOINT.GET_DESIGN_SETTINGS(designID)
    );
    dispatch(setSettings(response.data));
  };

  useEffect(() => {
    fetchDesignSettings();
  });

  useKeyboardShortcuts();

  const handleViewModeChange = (mode: '3d' | '2d') => {
    setViewMode(mode);
  };

  return (
    <div className="h-screen w-screen overflow-hidden">
      {viewMode === '3d' ? <Design setDesign3D={setDesign3D} /> : <PlannerGrid />}
      <Header router={router} design3D={design3D} />
      <Toolbar threeDView={design3D as ThreeDView} onViewModeChange={handleViewModeChange} />
      <Sidebar />
      <Footer viewMode={viewMode} onViewModeChange={handleViewModeChange} />
    </div>
  );
};

export default App;
