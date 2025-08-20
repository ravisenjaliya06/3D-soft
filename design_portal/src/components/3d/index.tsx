import styles from '@/components/3d/catalog.module.css';
import Design from '@/components/3d/design';
import Header from '@/components/3d/header/header';
import Sidebar from '@/components/3d/sidebar/sidebar';
import Toolbar from '@/components/3d/toolbar';
import React, { useState } from 'react';
import * as THREE from 'three';
import { DesignProps, cupBoardData } from './interface';

const Viewer3D: React.FC = () => {
  const [scene, setScene] = useState<THREE.Scene | null>(null);
  const [selectedObject, setSelectedObject] = useState<THREE.Object3D | null>(
    null,
  );
  const [cupBoardData, setcupBoardData] = useState<cupBoardData[]>([]);
  const [selectedObjectLine, setSelectedObjectLine] =
    useState<THREE.LineSegments | null>(null);
  const [selectedEgdeLine, setSelectedEgdeLine] =
    useState<THREE.LineSegments | null>(null);
  const [isReady, setIsReady] = useState(false);

  const designProps: DesignProps = {
    isReady,
    scene,
    selectedObject,
    selectedObjectLine,
    selectedEgdeLine,
    cupBoardData,
    setIsReady,
    setScene,
    setSelectedObject,
    setcupBoardData,
    setSelectedObjectLine,
    setSelectedEgdeLine,
  };

  return (
    <div className={styles.viewer3D}>
      <Toolbar DesignProps={designProps} />
      <Header />
      <Sidebar DesignProps={designProps} />
      <Design DesignProps={designProps} />
    </div>
  );
};

export default Viewer3D;
