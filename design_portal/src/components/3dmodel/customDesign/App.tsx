import Design from '@/components/3dmodel/customDesign/design';
import Header from '@/components/3dmodel/customDesign/header/header';
import { ThreeDView } from '@/components/3dmodel/customDesign/interface';
import Sidebar from '@/components/3dmodel/customDesign/sidebar/sidebar';
import Toolbar from '@/components/3dmodel/customDesign/toolbar/index';
import React, { useState } from 'react';
import { AppProps } from './interface';

const App: React.FC<AppProps> = ({ router }) => {
  const [design3D, setDesign3D] = useState<ThreeDView | null>(null);

  return (
    <div>
      <Header router={router} design3D={design3D} />
      <Design setDesign3D={setDesign3D} />
      <Toolbar threeDView={design3D} />
      <Sidebar design3D={design3D} />
    </div>
  );
};

export default App;
