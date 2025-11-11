import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './MaterialChangePopup.module.css';
import { CatalogRule, MaterialChangePopupProps, MaterialResponse, RulePart } from './interface';

export const MaterialChangePopup: React.FC<MaterialChangePopupProps> = ({
  onClose,
  onSave,
  rules = [],
}) => {
  const initialTab = rules.length > 0 ? rules[0].name : 'Banding';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedCategory, setSelectedCategory] = useState(initialTab);
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

          <div className={styles.rightDropdown}>
            <select
              className={styles.dropdown}
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              {(rules.length
                ? rules
                : [
                    {
                      name: 'Banding',
                      id: 'banding',
                      rule_parts: [],
                    } as CatalogRule,
                  ]
              ).map((r) => (
                <option key={r.id} value={r.name}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Main Content (Two Tables Side by Side) */}
        <div className={styles.mainContent}>
          {/* Left Table (Parts) */}
          <div className={styles.tableWrapper}>
            <table className={styles.partsTable}>
              <thead>
                <tr>
                  <th>Parts</th>
                  <th>Material</th>
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

                {/* Empty rows for consistent height */}
                {Array.from({ length: Math.max(0, 50 - partsData.length) }).map((_, idx) => (
                  <tr key={`empty-${idx}`}>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Right Table (Materials) */}
          <div className={styles.rightTable}>
            <div className={styles.righttopbar}>
              <select
                className={styles.dropdown}
                value={selectedMaterialType}
                onChange={(e) => setSelectedMaterialType(e.target.value)}
              >
                {materialTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
              <div className={styles.searchContainer}>
                <input
                  type="text"
                  placeholder="Search..."
                  className={styles.searchInput}
                  value={materialSearch}
                  onChange={(e) => setMaterialSearch(e.target.value)}
                />
              </div>
            </div>
            <table className={styles.materialTable}>
              <thead>
                <tr>
                  <th>Material Name</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                {filteredMaterials.map((item) => (
                  <tr
                    key={item.id}
                    draggable
                    className={selectedMaterialId === item.id ? styles.selectedRow : ''}
                    onDragStart={(e) => e.dataTransfer.setData('materialId', item.id)}
                    onClick={() => setSelectedMaterialId(item.id)}
                  >
                    <td>
                      <div className={styles.materialItem}>
                        <img src={assets.tabledata} alt="" />
                        {item.name}
                      </div>
                    </td>
                    <td>{item.description || ''}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 50 - partsData.length) }).map((_, idx) => (
                  <tr key={`empty-${idx}`}>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer Buttons */}
        <div className={styles.buttonGroup}>
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
