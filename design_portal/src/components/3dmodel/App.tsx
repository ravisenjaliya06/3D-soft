import Design from '@/components/3dmodel/design';
import { ThreeDView } from '@/components/3dmodel/design/interface';
import Header from '@/components/3dmodel/header/header';
import Sidebar from '@/components/3dmodel/sidebar/sidebar';
import Toolbar from '@/components/3dmodel/toolbar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonServices from '@/services/CommonService';
import React, { useEffect, useState } from 'react';
import { CatalogWithChildren } from './handler/items';
import { useAppDispatch } from './hooks';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { AppProps, CatalogApiResponse } from './interface';
import { setObjects } from './store/catalogSlice';
import { setSettings } from './store/designSettingsSlice';

const App: React.FC<AppProps> = ({ router }) => {
  const dispatch = useAppDispatch();
  const designID = window.location.pathname.split('/')[2];
  const [design3D, setDesign3D] = useState<ThreeDView | null>(null);

  const fetchCatalogData = async () => {
    const response: { status: number; data: CatalogWithChildren[] } = await CommonServices.get(
      API_ENDPOINT.GET_DEFAULT_CATALOG
    );
    dispatch(setObjects(response.data));
  };

  const fetchDesignSettings = async () => {
    const response: { status: number; data: CatalogApiResponse } = await CommonServices.get(
      API_ENDPOINT.GET_DESIGN_SETTINGS(designID)
    );
    dispatch(setSettings(response.data));
  };

  useEffect(() => {
    fetchCatalogData();
    fetchDesignSettings();
  });

  useKeyboardShortcuts();

  return (
    <div>
      <Header router={router} design3D={design3D} />
      <Design setDesign3D={setDesign3D} />
      <Toolbar threeDView={design3D as ThreeDView} />
      <Sidebar />
    </div>
  );
};

export default App;
