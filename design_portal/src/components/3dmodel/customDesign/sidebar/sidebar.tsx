import { assets } from '@/svgPaths';
import { useAppDispatch, useAppSelector } from '@/components/3dmodel/hooks';
import { updateShape } from '@/components/3dmodel/store/customDesignSlice';
import commonService from '@/services/CommonService';

import React, { useEffect, useState } from 'react';
import { getDesignId } from '../handler/objectCreator';
import { ShapeData, SidebarProps, UpdatedData } from '../interface';
import style from './sidebar.module.css';

const Sidebar: React.FC<SidebarProps> = () => {
  const dispatch = useAppDispatch();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [issettingopen, setIssettingopen] = useState(true);
  const [isnavopen, setIsnavopen] = useState(false);
  const [isBasicOpen, setIsBasicOpen] = useState(true);

  const selectedShapeId = useAppSelector((state) => state.customDesign.selectedShapeId);
  const shapes = useAppSelector((state) => state.customDesign.shapes);
  const selectedObject = shapes.find((shape) => shape.id === selectedShapeId);

  const updateObjectInDatabase = async (
    objectData: ShapeData,
    updatedData: UpdatedData
  ): Promise<void> => {
    try {
      const designId = getDesignId();
      if (!designId) {
        throw new Error('Design ID not found');
      }

      // Prepare the base data object, preserving existing properties
      const mainDataObject = {
        // Preserve existing properties from objectData
        ...(objectData.properties?.dimensions || {}),
        points:
          objectData.type === 'line'
            ? objectData.properties?.dimensions?.points || undefined
            : objectData.properties?.points || undefined,
        position: {
          x: objectData.position ? objectData.position.x : 0,
          y: objectData.position ? objectData.position.y : 0,
          z: objectData.position ? objectData.position.z : 0,
        },
        rotateX: objectData.rotation ? objectData.rotation.x : 0,
        rotateY: objectData.rotation ? objectData.rotation.y : 0,
        rotateZ: objectData.rotation ? objectData.rotation.z : 0,
        scale: {
          x: objectData.scale ? objectData.scale.x : 1,
          y: objectData.scale ? objectData.scale.y : 1,
          z: objectData.scale ? objectData.scale.z : 1,
        },
        // Include image-specific properties if applicable
        ...(objectData.type === 'image' && {
          imageUrl: objectData.properties.imageUrl || '',
          imageSize: objectData.properties.imageSize || {
            width: 100,
            height: 100,
          },
          aspectRatio: objectData.properties.aspectRatio || 1,
          fileName: objectData.properties.fileName || 'image.png',
          imageMetadata: {
            timestamp: new Date().toISOString(),
            persistDuringTransform: true,
            originalUrl: objectData.properties.imageUrl || '',
          },
        }),
        // Apply updated data (position, rotation, scale)
        ...(updatedData && typeof updatedData === 'object' ? updatedData : {}),
      };

      const payload = {
        data: {
          catalog: {
            id: objectData.id,
            name: objectData.type || 'object',
            data: mainDataObject,
            is_custom: true,
            is_default: true,
          },
        },
      };

      await commonService.putObjectData('design', designId, 'object', payload);
    } catch (error) {
      console.error('Error updating object:', error);
      throw error;
    }
  };

  useEffect(() => {
    if (selectedShapeId) {
      setIssettingopen(true);
      setIsnavopen(false);
    }
  }, [selectedShapeId]);

  const handelsetting = () => {
    setIssettingopen(true);
    setIsnavopen(false);
  };

  const handelnavigation = () => {
    setIssettingopen(false);
    setIsnavopen(true);
  };

  const toggleSidebar = () => {
    setIsSidebarOpen(!isSidebarOpen);
  };

  const toggleBasic = () => {
    setIsBasicOpen(!isBasicOpen);
  };

  const handleDimensionChange = (dimension: 'width' | 'height' | 'depth', value: number) => {
    if (!selectedObject) return;

    const dimensions = selectedObject.properties.dimensions || {
      width: 1,
      height: 1,
      depth: 1,
    };

    const updatedDimensions = {
      ...dimensions,
      [dimension]: value,
    };

    const updates = {
      properties: {
        ...selectedObject.properties,
        dimensions: updatedDimensions,
      },
    };

    dispatch(
      updateShape({
        id: selectedObject.id,
        updates,
      })
    );

    updateObjectInDatabase(selectedObject, {
      [dimension]: value,
    });
  };

  const handleRadiusChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject) return;
    const newRadius = Number.parseFloat(e.target.value);
    dispatch(
      updateShape({
        id: selectedObject.id,
        updates: {
          properties: {
            ...selectedObject.properties,
            dimensions: {
              ...selectedObject.properties.dimensions,
              radius: newRadius,
            },
          },
        },
      })
    );
  };

  const handleRotationChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject) return;

    const newRotation = {
      ...selectedObject.rotation,
      [axis]: value,
    };

    const updates = {
      rotation: newRotation,
    };

    dispatch(
      updateShape({
        id: selectedObject.id,
        updates,
      })
    );

    updateObjectInDatabase(selectedObject, {
      [`rotate${axis.toUpperCase()}`]: value,
    });
  };

  const handleSegmentsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedObject) return;
    const newSegments = Number.parseFloat(e.target.value);
    const dimensions = selectedObject.properties.dimensions || {};

    dispatch(
      updateShape({
        id: selectedObject.id,
        updates: {
          properties: {
            ...selectedObject.properties,
            dimensions: {
              ...dimensions,
              segments: newSegments,
            },
          },
        },
      })
    );
  };

  const handleScaleChange = (axis: 'x' | 'y' | 'z', value: number) => {
    if (!selectedObject) return;
    const updates = {
      scale: {
        ...selectedObject.scale,
        [axis]: value,
      },
    };

    dispatch(
      updateShape({
        id: selectedObject.id,
        updates,
      })
    );

    updateObjectInDatabase(selectedObject, {
      scale: {
        x: axis === 'x' ? value : selectedObject.scale.x,
        y: axis === 'y' ? value : selectedObject.scale.y,
        z: axis === 'z' ? value : selectedObject.scale.z,
      },
    });
  };

  if (!isSidebarOpen) {
    return (
      <div className={style.sidebar_close_title} onClick={toggleSidebar}>
        <p>Viewport Navigation</p>
        <img
          src={assets.up_arrow}
          alt="Open Sidebar"
          title="Open Sidebar"
          style={{ cursor: 'pointer' }}
        />
      </div>
    );
  }

  return (
    <div className={style.sidebar}>
      <div className={style.sidebar_title} onClick={toggleSidebar}>
        <p>Viewport Navigation</p>
        <img
          src={assets.down_arrow}
          alt="Close Sidebar"
          title="Close Sidebar"
          style={{ cursor: 'pointer' }}
        />
      </div>
      <div className={style.switch_div}>
        <button onClick={handelsetting} className={issettingopen ? style.btnactive : style.btn}>
          Setting
        </button>
        <button onClick={handelnavigation} className={isnavopen ? style.btnactive : style.btn}>
          Navigation
        </button>
      </div>
      {isnavopen && (
        <div className={style.navigation}>
          <img src={assets.navigationdetail} alt="Navigation Details" />
        </div>
      )}
      {issettingopen && selectedObject && (
        <div className={style.field_main_div}>
          <div className={style.field_group_title_div}>
            <img
              src={isBasicOpen ? assets.up_arrow : assets.down_arrow}
              alt="toggle_arrow"
              onClick={toggleBasic}
              style={{ cursor: 'pointer' }}
            />
            <p className={style.field_group_title}>Basic</p>
          </div>
          {isBasicOpen && (
            <div className={style.field_group_div}>
              <div className={style.field_group}>
                <p>Width</p>
                <input
                  type="number"
                  value={selectedObject.properties.dimensions?.width ?? 0}
                  onChange={(e) =>
                    handleDimensionChange('width', Number.parseFloat(e.target.value))
                  }
                  min={1}
                />
              </div>
              <div className={style.field_group}>
                <p>Height</p>
                <input
                  type="number"
                  value={selectedObject.properties.dimensions?.height ?? 0}
                  onChange={(e) =>
                    handleDimensionChange('height', Number.parseFloat(e.target.value))
                  }
                  min={1}
                />
              </div>
              <div className={style.field_group}>
                <p>Depth</p>
                <input
                  type="number"
                  value={selectedObject.properties.dimensions?.depth ?? 0}
                  onChange={(e) =>
                    handleDimensionChange('depth', Number.parseFloat(e.target.value))
                  }
                  min={1}
                />
              </div>
              <div className={style.field_group}>
                <p>Radius</p>
                <input
                  type="number"
                  value={selectedObject?.properties?.dimensions?.radius || 0}
                  onChange={handleRadiusChange}
                  min={1}
                />
              </div>
              <div className={style.field_group}>
                <p>Scale X</p>
                <input
                  type="number"
                  value={selectedObject.scale?.x ?? 1}
                  onChange={(e) => handleScaleChange('x', Number.parseFloat(e.target.value))}
                  min={0.1}
                  step={0.1}
                />
              </div>
              <div className={style.field_group}>
                <p>Scale Y</p>
                <input
                  type="number"
                  value={selectedObject.scale?.y ?? 1}
                  onChange={(e) => handleScaleChange('y', Number.parseFloat(e.target.value))}
                  min={0.1}
                  step={0.1}
                />
              </div>
              <div className={style.field_group}>
                <p>Scale Z</p>
                <input
                  type="number"
                  value={selectedObject.scale?.z ?? 1}
                  onChange={(e) => handleScaleChange('z', Number.parseFloat(e.target.value))}
                  min={0.1}
                  step={0.1}
                />
              </div>
              <div className={style.field_group}>
                <p>Segments</p>
                <input
                  type="number"
                  value={selectedObject.properties.dimensions?.segments ?? 0}
                  onChange={handleSegmentsChange}
                  min={1}
                />
              </div>
              <div className={style.field_group}>
                <p>Rotation X</p>
                <input
                  type="number"
                  value={selectedObject.rotation?.x ?? 0}
                  onChange={(e) => handleRotationChange('x', Number.parseFloat(e.target.value))}
                  min={1}
                />
              </div>
              <div className={style.field_group}>
                <p>Rotation Y</p>
                <input
                  type="number"
                  value={selectedObject.rotation?.y ?? 0}
                  onChange={(e) => handleRotationChange('y', Number.parseFloat(e.target.value))}
                  min={1}
                />
              </div>
              <div className={style.field_group}>
                <p>Rotation Z</p>
                <input
                  type="number"
                  value={selectedObject.rotation?.z ?? 0}
                  onChange={(e) => handleRotationChange('z', Number.parseFloat(e.target.value))}
                  min={1}
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Sidebar;
