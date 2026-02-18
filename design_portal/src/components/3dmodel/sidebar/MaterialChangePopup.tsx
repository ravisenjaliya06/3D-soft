import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { RulePart } from '../handler/interface';
import styles from './MaterialChangePopup.module.css';
import { MaterialChangePopupProps, MaterialResponse } from './interface';

export const MaterialChangePopup: React.FC<MaterialChangePopupProps> = ({
  onClose,
  onSave,
  rules = [],
}) => {
  const initialTab = rules.length > 0 ? rules[0].name : 'Banding';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(null);
  const [materialData, setMaterialData] = useState<MaterialResponse[]>([]);
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('Banding');
  const [materialSearch, setMaterialSearch] = useState<string>('');

  // Derive current rule and parts list from props
  const currentRule = rules.find((r) => r.name === activeTab) || rules[0];
  const currentParts: RulePart[] = currentRule?.rule_parts || [];

  // Keep editable parts state mirroring current rule parts
  const [partsData, setPartsData] = useState<RulePart[]>(currentParts);

  // Fetch materials once
  React.useEffect(() => {
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

  // Build material type options (fallback to a default list)
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

  const [open, setOpen] = useState(false);

  const discoveredTypes = Array.from(
    new Set((materialData || []).map((m) => m.type).filter(Boolean))
  ) as string[];
  const materialTypes = discoveredTypes.length > 0 ? discoveredTypes : defaultMaterialTypes;

  // Filtered materials by type and search
  const filteredMaterials = (materialData || [])
    .filter((m) => (selectedMaterialType ? m.type === selectedMaterialType : true))
    .filter((m) =>
      materialSearch
        ? (m.name || '').toLowerCase().includes(materialSearch.toLowerCase()) ||
          (m.description || '').toLowerCase().includes(materialSearch.toLowerCase())
        : true
    );

  // Whenever the active rule changes, refresh partsData
  React.useEffect(() => {
    const next = (currentRule?.rule_parts || []) as RulePart[];
    setPartsData(next);
    setSelectedPartId(null);
    setSelectedMaterialId(null);
  }, [activeTab]);

  const handleAssignMaterial = async (partId: string, materialId: string) => {
    /* Update part material */

    const material = materialData.find((m) => m.id === materialId);
    if (!material) return;

    // optimistic update
    setPartsData((prev) =>
      prev.map((part) =>
        part.id === partId ? { ...part, material: { id: material.id, name: material.name } } : part
      )
    );

    try {
      const response: { status: number } = await commonService.put(
        API_ENDPOINT.UPDATE_PART_MATERIAL(partId),
        { material_id: materialId }
      );
      if (response.status === 200) {
        setSelectedPartId(null);
        setSelectedMaterialId(null);
      }
    } catch {
      // revert on error
      setPartsData((prev) =>
        prev.map((part) => (part.id === partId ? { ...part, material: undefined } : part))
      );
    }
  };

  const handleSave = () => {
    /* Build list of assigned materials */

    const assigned = partsData.map((p) => `${p.name || 'Part'}: ${p.material?.name || '-'}`);
    onSave(assigned);
    onClose();
  };

  if (typeof window === 'undefined') return null;

  const content = (
    <div className={styles.popupOverlay}>
      <div className={styles.popup}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Custom Design created</h2>
          <img
            src={assets.close || '/placeholder.svg'}
            className={styles.closeButton}
            alt="close"
            onClick={onClose}
          />
        </div>
        <hr className={styles.divider} />

        {/* Top Section (Tabs + Dropdown) */}
        <div className={styles.topSection}>
          <div className={styles.leftTabs}>
            <span className={styles.doorLabel}>Rules</span>
            <div className={styles.tabs}>
              {(rules.length ? rules.map((r) => r.name) : ['Banding']).map((tab) => (
                <button
                  key={tab}
                  className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Content (Two Tables Side by Side) */}
        <div className={styles.mainContent}>
          {/* Left Table (Parts) */}
          <div className={styles.tableWrapper}>
            <div className={styles.lefttopbar}>Material Properties</div>
            <table className={styles.partsTable}>
              <thead>
                <tr>
                  <th>
                    <div className="flex items-center p-[0rem]">
                      Part
                      <img
                        src={assets.up_down_arrow}
                        alt="Sort"
                        className="ml-[0.3rem] h-[0.8rem] w-[0.8rem] p-[0rem]"
                      />
                    </div>
                  </th>
                  <th>
                    <div className="flex items-center p-[0rem]">
                      Material
                      <img
                        src={assets.up_down_arrow}
                        alt="Sort"
                        className="ml-[0.3rem] h-[0.8rem] w-[0.8rem] p-[0rem]"
                      />
                    </div>
                  </th>
                </tr>
              </thead>
              <tbody>
                {partsData.map((part) => (
                  <tr
                    key={part.id}
                    className={selectedPartId === part.id ? styles.selectedRow : ''}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const materialId = e.dataTransfer.getData('materialId');
                      handleAssignMaterial(part.id, materialId);
                    }}
                    onClick={() => setSelectedPartId(part.id)}
                  >
                    <td>
                      <div className={styles.partlItem}>
                        <img src={assets.tabledata} alt="" />
                        {part.name || 'Part'}
                      </div>
                    </td>

                    <td>{part.material?.name || '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Table (Materials) */}
          <div className="mt-[0.5rem] h-[30rem] max-h-[30rem] w-full max-w-[29rem] rounded-[0.2rem] border-[0.1rem] border-[var(--border-color)] bg-[var(--primary-white)] p-[0rem]">
            {/* ================= TOP BAR ================= */}
            <div className="sticky top-[0rem] m-[0rem] flex h-[3rem] items-center gap-[0.9375rem] border-b-[0.1rem] border-[var(--border-color)] bg-[var(--thbackground-color)] p-[0rem] px-[1rem]">
              {/* DROPDOWN */}
              <div className="relative sticky top-[0rem] inline-flex items-center">
                <select
                  onFocus={() => setOpen(true)}
                  onBlur={() => setOpen(false)}
                  value={selectedMaterialType}
                  onChange={(e) => setSelectedMaterialType(e.target.value)}
                  className="m-[0rem] h-[1.7rem] w-[8rem] min-w-[8rem] appearance-none overflow-y-auto rounded-[0.3rem] rounded-md border-[0.1rem] border-[var(--border-color)] bg-transparent bg-white p-[0rem] pr-[1.5rem] pl-[0.4rem] font-['Comfortaa'] text-[0.65rem] text-[var(--primary-color)] focus:outline-[0rem] [&::-webkit-scrollbar]:w-[0.45rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--primary-light-grey)] hover:[&::-webkit-scrollbar-thumb]:bg-[var(--primary-light-grey)] [&::-webkit-scrollbar-track]:bg-transparent"
                >
                  {materialTypes.map((type) => (
                    <option key={type} value={type}>
                      {type}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-[0.25rem] flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-[0.2rem] border-none border-[#d1d5db] bg-white">
                  <img
                    src={open ? assets.menuup : assets.menudown}
                    className="m-[0rem] h-[1.5rem] w-[1.5rem] p-[0rem]"
                  />
                </div>
              </div>

              {/* SEARCH */}
              <div className="relative sticky top-[0rem] flex items-center">
                <svg
                  className="pointer-events-none absolute right-3 h-[1.0625rem] p-[0rem] pb-[0.125rem] pl-[0.1875rem] text-[#392579]/50"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1}
                >
                  <circle cx="11" cy="11" r="5" />
                  <path d="m20 20-4.35-4.35" />
                </svg>
                <input
                  type="text"
                  placeholder="Search"
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                  className="m-[0rem] h-[1.5rem] w-[15rem] flex-1 rounded-[0.4375rem] border-[0.1rem] border-[#C4BED7]/50 bg-white p-[0rem] pr-9 pl-[1.5rem] text-[0.65rem] text-[#A0AEC0] outline-none focus:border-purple-400 focus:ring-[0.1rem] focus:ring-purple-300"
                />
              </div>
            </div>

            {/* ================= TABLE ================= */}
            <div
              style={{
                scrollbarWidth: 'thin',
                scrollbarColor: 'var(--scrollbar-color-2) transparent',
              }}
              className="h-[26.9rem] max-h-[26.9rem] w-full max-w-[29rem] overflow-y-auto [&::-webkit-scrollbar]:w-[0.35rem] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-[0.6rem] [&::-webkit-scrollbar-button]:bg-transparent [&::-webkit-scrollbar-button:single-button:vertical:decrement]:bg-[var(--scrollbar-color-2)] [&::-webkit-scrollbar-button:single-button:vertical:increment]:bg-[var(--scrollbar-color-2)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--scrollbar-color-2)] [&::-webkit-scrollbar-track]:bg-transparent"
            >
              <table className="w-full border-collapse border-spacing-0 bg-[var(--primary-white)] p-[0rem]">
                {/* ================= TABLE HEADER ================= */}
                <thead className="sticky top-[0rem] z-[10] bg-[var(--primary-white)] p-[0rem]">
                  <tr className="p-[0rem]">
                    <th className="m-[0rem] h-[1.75rem] w-[2.5rem] border-b-[0.1rem] border-[var(--sidebarhadding-background-color-20)] p-[0rem]"></th>

                    <th className="m-[0rem] h-[1.75rem] border-b-[0.1rem] border-[var(--sidebarhadding-background-color-20)] p-[0rem] py-[0.3rem] text-left text-[0.87rem] font-semibold text-[var(--primary-color)]">
                      <div className="flex items-center p-[0rem]">
                        Part
                        <img
                          src={assets.up_down_arrow}
                          alt="Sort"
                          className="ml-[0.3rem] h-[0.8rem] w-[0.8rem] p-[0rem]"
                        />
                      </div>
                    </th>

                    <th className="m-[0rem] h-[1.75rem] border-b-[0.1rem] border-[var(--sidebarhadding-background-color-20)] p-[0rem] py-[0.3rem] text-left text-[0.87rem] font-semibold text-[var(--primary-color)]">
                      <div className="flex items-center p-[0rem]">
                        Material
                        <img
                          src={assets.up_down_arrow}
                          alt="Sort"
                          className="ml-[0.3rem] h-[0.8rem] w-[0.8rem]"
                        />
                      </div>
                    </th>
                  </tr>
                </thead>

                {/* ================= TABLE BODY ================= */}
                <tbody>
                  {filteredMaterials.map((item) => (
                    <tr
                      key={item.id}
                      draggable
                      onDragStart={(e) => e.dataTransfer.setData('materialId', item.id)}
                      onClick={() => setSelectedMaterialId(item.id)}
                      className={`cursor-pointer transition-colors duration-150 hover:bg-[var(--primary-table-hover)] ${
                        selectedMaterialId === item.id
                          ? 'bg-[var(--primary-hover)]'
                          : 'bg-[var(--primary-white)]'
                      } `}
                    >
                      {/* RADIO */}
                      <td className="m-[0rem] h-[1.75rem] min-h-[1.75rem] border-b-[0.1rem] border-[var(--sidebarhadding-background-color-20)] p-[0rem] px-[1rem]">
                        <input
                          type="radio"
                          checked={selectedMaterialId === item.id}
                          onChange={() => setSelectedMaterialId(item.id)}
                          className="m-[0rem] h-[1.15rem] min-h-[1.15rem] w-[1.15rem] min-w-[1.15rem] cursor-pointer border-[0.1rem] p-[0rem]"
                        />
                      </td>

                      {/* NAME */}
                      <td className="m-[0rem] h-[1.75rem] border-b-[0.1rem] border-[var(--sidebarhadding-background-color-20)] p-[0rem] text-left text-[0.65rem] text-[#3F3F46]">
                        {item.name}
                      </td>

                      {/* DESCRIPTION */}
                      <td className="m-[0rem] h-[1.75rem] border-b-[0.1rem] border-[var(--sidebarhadding-background-color-20)] p-[0rem] text-left text-[0.65rem] text-[#3F3F46]">
                        {item.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className={styles.buttonGroup}>
          <button className={styles.addMaterialButton}>Add to Material</button>
          <button className={styles.cancelButton} onClick={onClose}>
            Cancel
          </button>
          <button className={styles.saveButton} onClick={handleSave}>
            Save
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(content, document.body);
};
