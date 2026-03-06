import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  INVISIBLE_BOXES,
  OBJECT_TYPES,
  PART_TYPES,
  MATERIAL_TYPES as SCENE_MATERIAL_TYPES,
} from '../sceneCreator/interface';
import { formatEnumLabel } from '../sceneCreator/utils';
import { RootState } from '../store';
import { updateObject } from '../store/dataSlice';
import styles from './MaterialChangePopup.module.css';
import { MaterialChangePopupProps, MaterialResponse } from './interface';

export const MaterialChangePopup: React.FC<
  MaterialChangePopupProps & { onApplyMaterial?: (part: any, material: any) => void }
> = ({
  onClose,
  // this is typically not used directly here anymore due to part-specific saving, but kept for interface compliance
  selectedObject,
  onApplyMaterial,
}) => {
  const objects = useSelector((state: RootState) => state.data.objects);
  const dispatch = useDispatch();

  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [materialData, setMaterialData] = useState<MaterialResponse[]>([]);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('Banding');
  const [materialSearch, setMaterialSearch] = useState<string>('');
  const [openDropdown, setOpenDropdown] = useState(false);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);

  // States for category-wise filtering
  const [activeRuleType, setActiveRuleType] = useState<string | null>(null);
  const [ruleMaterialTypes, setRuleMaterialTypes] = useState<string[]>([]);
  const [ruleParts, setRuleParts] = useState<any[]>([]);

  // Determine parts to display
  const [partsList, setPartsList] = useState<any[]>([]);

  useEffect(() => {
    if (!selectedObject) return;
    const isFullCupboard =
      selectedObject.type === OBJECT_TYPES.MODEL &&
      !selectedObject.name?.includes('Handle') &&
      !selectedObject.name?.includes('Leg');

    let newPartsList = [];
    if (isFullCupboard) {
      newPartsList = objects.filter(
        (obj) =>
          obj.parent === selectedObject.id &&
          obj.type !== PART_TYPES.HANDLE &&
          obj.name !== 'Leg' &&
          obj.type !== INVISIBLE_BOXES.INVISIBLE_BOX &&
          !obj.name?.toLowerCase().includes('cam') &&
          !obj.name?.toLowerCase().includes('minifix') &&
          !obj.name?.toLowerCase().includes('screw') &&
          !obj.name?.toLowerCase().includes('drawer guide') &&
          !obj.name?.toLowerCase().includes('leg leveler')
      );
    } else {
      newPartsList = [selectedObject];
    }

    setPartsList(newPartsList);
    if (newPartsList.length > 0 && !selectedPartId) {
      setSelectedPartId(newPartsList[0].id);
    }

    // Extract all unique material types present in this object and its children
    const allMaterials = newPartsList.flatMap((p) => {
      if (Array.isArray(p.material)) return p.material;
      if (p.material) return [p.material];
      return [];
    });

    // Add default types if none exist to ensure categories like Panel Stock appear
    const types = Array.from(new Set(allMaterials.map((m) => m?.type).filter(Boolean))) as string[];
    if (!types.includes(SCENE_MATERIAL_TYPES.PANEL_STOCK))
      types.unshift(SCENE_MATERIAL_TYPES.PANEL_STOCK);
    if (!types.includes('Banding')) types.push('Banding');

    setRuleMaterialTypes(types);
    if (types.length > 0 && !activeRuleType) {
      setActiveRuleType(types[0]);
    }
  }, [selectedObject, objects]);

  // Update rule parts when active type or parts list changes
  useEffect(() => {
    if (!activeRuleType || partsList.length === 0) return;

    const matchingChildren = partsList.filter((child) => {
      const mats = Array.isArray(child.material)
        ? child.material
        : child.material
          ? [child.material]
          : [];
      // If no material is assigned at all, still show the part so we can assign to it
      if (activeRuleType === SCENE_MATERIAL_TYPES.PANEL_STOCK) return true; // always show for main type
      return mats.some((m: any) => m?.type === activeRuleType) || true; // show all parts to allow assigning new types
    });

    setRuleParts(
      matchingChildren.map((child) => {
        const mats = Array.isArray(child.material)
          ? child.material
          : child.material
            ? [child.material]
            : [];
        return {
          ...child,
          currentMaterial: mats.find((m: any) => m?.type === activeRuleType) || null,
        };
      })
    );
  }, [partsList, activeRuleType]);

  // Fetch materials once
  useEffect(() => {
    const getMaterial = async () => {
      const response: { status: number; data: MaterialResponse[] } = await commonService.get(
        API_ENDPOINT.GET_MATERIAL
      );
      if (response.status === 200) {
        setMaterialData(response.data);
      }
    };
    getMaterial();
  }, []);

  // Filtered materials by type and search
  const filteredMaterials = (materialData || [])
    .filter((m) => (selectedMaterialType ? m.type === selectedMaterialType : true))
    .filter((m) =>
      materialSearch
        ? (m.name || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
          (m.description || '').toLowerCase().includes(materialSearch.toLowerCase())
        : true
    );

  const defaultMaterialTypes = [
    'Banding',
    'Board Stock',
    'Caster',
    'Connector',
    'Drawer Guide',
    'Hinge',
    'Hinge Plate',
    'Laminate',
    'Leg',
    'Leg Leveler',
    'Miscellaneous',
    'Molding',
    'Panel Stock',
    'Pull',
    'Rod',
    'Sliding Door Rail',
    'Sliding Door Roller',
    'Wire Basket',
    'Connection',
  ];

  const discoveredTypes = Array.from(
    new Set((materialData || []).map((m) => m.type).filter(Boolean))
  ) as string[];
  const materialTypes = discoveredTypes.length > 0 ? discoveredTypes : defaultMaterialTypes;

  const handleAssignMaterial = (targetPartId: string, assignedMaterialId: string) => {
    if (!targetPartId || !assignedMaterialId) {
      alert('Please select a part and a material');
      return;
    }

    const materialConfig = materialData.find((m) => m.id === assignedMaterialId);
    if (!materialConfig) return;

    const targetPart = partsList.find((p) => p.id === targetPartId);
    if (targetPart) {
      const materialArray = Array.isArray(targetPart.material)
        ? [...targetPart.material]
        : targetPart.material
          ? [targetPart.material]
          : [];

      // Update or add the material for the currently active tab type
      const targetType = activeRuleType || materialConfig.type || SCENE_MATERIAL_TYPES.PANEL_STOCK;
      const existingTypeIndex = materialArray.findIndex((mat: any) => mat?.type === targetType);

      const newMaterial = { ...materialConfig, type: targetType };

      if (existingTypeIndex !== -1) {
        materialArray[existingTypeIndex] = { ...materialArray[existingTypeIndex], ...newMaterial };
      } else {
        materialArray.push(newMaterial);
      }

      const updatedPart = {
        ...targetPart,
        material: materialArray,
      };

      // Apply the update locally
      dispatch(updateObject(updatedPart));
      if (onApplyMaterial) {
        onApplyMaterial(targetPart, updatedPart.material);
      } else {
        const applyObjUpdate = require('../handler/updateHandler').applyObjectUpdate;
        if (applyObjUpdate) {
          applyObjUpdate(targetPart, { material: updatedPart.material });
        }
      }

      if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
        console.log('Assigned material to part:', targetPart.name, materialConfig.name);
      }
    }
  };

  if (typeof window === 'undefined') return null;

  const content = (
    <div className={styles.popupOverlay}>
      <div className={styles.popup} style={{ width: '65rem' }}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Assign Materials to Parts</h2>
          <img
            src={assets.close || '/placeholder.svg'}
            className={styles.closeButton}
            alt="close"
            onClick={onClose}
          />
        </div>
        <hr className={styles.divider} />

        {/* Main Content */}
        <div className={styles.mainContent}>
          {/* Left Table (Parts) */}
          <div className={styles.leftPanel} style={{ flex: '0.45' }}>
            <div
              className={styles.lefttopbar}
              style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
            >
              <span>Target Object: {formatEnumLabel(selectedObject?.name || '')}</span>
            </div>

            <div
              className={styles.tabs}
              style={{
                display: 'flex',
                gap: '0.5rem',
                marginBottom: '0.5rem',
                overflowX: 'auto',
                paddingBottom: '0.5rem',
              }}
            >
              {ruleMaterialTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setActiveRuleType(type);
                    setSelectedMaterialType(type);
                  }}
                  className={`${styles.tab} ${activeRuleType === type ? styles.activeTab : ''}`}
                  style={{
                    padding: '0.3rem 0.6rem',
                    borderRadius: '0.3rem',
                    border: '1px solid var(--border-color)',
                    background: activeRuleType === type ? 'var(--primary-color)' : 'transparent',
                    color:
                      activeRuleType === type ? 'var(--primary-white)' : 'var(--primary-color)',
                    cursor: 'pointer',
                    fontSize: '0.75rem',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {type}
                </button>
              ))}
            </div>

            <div
              className={styles.tableScrollArea}
              style={{ minHeight: '10rem', maxHeight: '25rem' }}
            >
              <table className={styles.materialTable}>
                <thead>
                  <tr>
                    <th>Part Name</th>
                    <th>Current Material</th>
                  </tr>
                </thead>
                <tbody>
                  {ruleParts.map((part) => {
                    let currentMaterialName = part.currentMaterial?.name || '-';

                    return (
                      <tr
                        key={part.id}
                        onClick={() => setSelectedPartId(part.id)}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          const materialId = e.dataTransfer.getData('materialId');
                          if (materialId) {
                            handleAssignMaterial(part.id, materialId);
                            setSelectedPartId(part.id);
                            setSelectedMaterialId(materialId);
                          }
                        }}
                        className={
                          selectedPartId === part.id ? styles.selectedRow : styles.tableRow
                        }
                      >
                        <td className={styles.cellName}>
                          {formatEnumLabel(part.name || 'Unknown')}
                        </td>
                        <td className={styles.cellDesc}>{currentMaterialName}</td>
                      </tr>
                    );
                  })}
                  {ruleParts.length === 0 && (
                    <tr>
                      <td
                        colSpan={2}
                        style={{
                          textAlign: 'center',
                          padding: '1rem',
                          color: 'var(--subtext-color)',
                        }}
                      >
                        No parts available
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Right Table (Materials) */}
          <div className={styles.rightPanel} style={{ flex: '0.55' }}>
            {/* ================= TOP BAR ================= */}
            <div className={styles.righttopbar}>
              {/* DROPDOWN */}
              <div className={styles.dropdownWrapper}>
                <select
                  onFocus={() => setOpenDropdown(true)}
                  onBlur={() => setOpenDropdown(false)}
                  value={selectedMaterialType}
                  onChange={(e) => setSelectedMaterialType(e.target.value)}
                  className={styles.typeDropdown}
                >
                  {materialTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <div className={styles.dropdownIconWrapper}>
                  <img
                    src={openDropdown ? assets.menuup : assets.menudown}
                    className={styles.dropdownIcon}
                  />
                </div>
              </div>

              {/* SEARCH */}
              <div className={styles.searchWrapper}>
                <svg
                  className={styles.searchIcon}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <circle cx="11" cy="11" r="5" />
                  <path d="m20 20-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search materials..."
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {/* ================= TABLE ================= */}
            <div className={styles.tableScrollArea}>
              <table className={styles.materialTable}>
                {/* ================= TABLE HEADER ================= */}
                <thead>
                  <tr>
                    <th className={styles.checkboxTh}></th>
                    <th>Material</th>
                    <th>Description</th>
                  </tr>
                </thead>

                {/* ================= TABLE BODY ================= */}
                <tbody>
                  {filteredMaterials.map((item) => (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('materialId', item.id);
                        setSelectedMaterialId(item.id);
                      }}
                      onClick={() => setSelectedMaterialId(item.id)}
                      className={
                        selectedMaterialId === item.id ? styles.selectedRow : styles.tableRow
                      }
                    >
                      {/* RADIO */}
                      <td className={styles.checkboxTd}>
                        <input
                          type="radio"
                          checked={selectedMaterialId === item.id}
                          onChange={() => setSelectedMaterialId(item.id)}
                          className={styles.radioInput}
                        />
                      </td>

                      {/* NAME */}
                      <td className={styles.cellName}>{item.name}</td>

                      {/* DESCRIPTION */}
                      <td className={styles.cellDesc}>{item.description}</td>
                    </tr>
                  ))}
                  {filteredMaterials.length === 0 && (
                    <tr>
                      <td
                        colSpan={3}
                        style={{
                          textAlign: 'center',
                          padding: '1rem',
                          color: 'var(--subtext-color)',
                        }}
                      >
                        No materials found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* ACTION FOOTER */}
            <div
              style={{
                padding: '0.75rem',
                borderTop: '1px solid var(--table-title-border-color)',
                backgroundColor: 'var(--primary-white)',
                display: 'flex',
                justifyContent: 'flex-end',
              }}
            >
              <button
                onClick={() => {
                  if (selectedPartId && selectedMaterialId) {
                    handleAssignMaterial(selectedPartId, selectedMaterialId);
                  } else {
                    alert('Please select a part from the left and a material from the right.');
                  }
                }}
                className={styles.saveButton}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.5rem 1rem',
                }}
              >
                <img
                  src={assets.addMaterialIcon || assets.addd}
                  alt="Add"
                  style={{ width: '0.9rem', height: '0.9rem', filter: 'brightness(0) invert(1)' }}
                />
                Apply to Selected Part
              </button>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className={styles.buttonGroup}>
          <button className={styles.cancelButton} onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
