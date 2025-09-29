import close from '@/assets/design/close.svg';
import tableicon from '@/assets/sidebar/tabledata.svg';
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './MaterialChangePopup.module.css';

interface RulePartMaterial {
  id?: string;
  name?: string;
}

interface RulePart {
  id: string;
  name?: string;
  material?: RulePartMaterial;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  position?: unknown;
  handle_position?: unknown;
}

interface CatalogRule {
  id: string;
  name: string;
  rule_parts: RulePart[];
}

interface MaterialChangePopupProps {
  onClose: () => void;
  onSave: (selectedMaterials: string[]) => void;
  rules?: CatalogRule[];
}

export const MaterialChangePopup: React.FC<MaterialChangePopupProps> = ({
  onClose,
  onSave,
  rules = [],
}) => {
  const initialTab = rules.length > 0 ? rules[0].name : 'Banding';
  const [activeTab, setActiveTab] = useState(initialTab);
  const [selectedCategory, setSelectedCategory] = useState(initialTab);
  const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
  const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
    null,
  );

  // Derive current rule and parts list from props
  const currentRule = rules.find((r) => r.name === activeTab) || rules[0];
  const currentParts: RulePart[] = currentRule?.rule_parts || [];

  // Display model for parts table with mutable material name string
  const [partsData, setPartsData] = useState(
    currentParts.map((p) => ({
      id: p.id,
      part: p.name || 'Part',
      material: p.material?.name || '-',
    })),
  );

  // Whenever the active rule changes, refresh partsData
  React.useEffect(() => {
    const next = (currentRule?.rule_parts || []).map((p) => ({
      id: p.id,
      part: p.name || 'Part',
      material: p.material?.name || '-',
    }));
    setPartsData(next);
    setSelectedPartId(null);
    setSelectedMaterialId(null);
  }, [activeTab]);

  // Build material list from current rule parts' materials (unique by id)
  const materialData = Array.from(
    new Map(
      (currentRule?.rule_parts || [])
        .filter((p) => p.material?.id)
        .map((p) => [p.material!.id!, { id: p.material!.id!, name: p.material!.name || 'Material', company: '' }]),
    ).values(),
  );

  const handleAssignMaterial = (partId: string, materialId: string) => {
    const material = materialData.find((m) => m.id === materialId);
    if (!material) return;

    setPartsData((prev) =>
      prev.map((part) =>
        part.id === partId ? { ...part, material: material.name } : part,
      ),
    );
  };

  const handleSave = () => {
    // Collect assigned materials
    const assigned = Object.entries(partsData).reduce(
      (acc, [part, material]) => {
        acc.push(`${part}: ${material}`);
        return acc;
      },
      [] as string[],
    );
    onSave(assigned);
    onClose();
  };

  if (typeof window === 'undefined') return null;

  // const content = (
  //     <div className={styles.popupOverlay}>
  //         <div className={styles.popup}>
  //             <div className={styles.header}>
  //                 <h2>Custom Design created</h2>
  //                 <img
  //                     src={close.src || '/placeholder.svg'}
  //                     className={styles.closeButton}
  //                     alt="close"
  //                     onClick={onClose}
  //                 />
  //             </div>

  //             <div className={styles.content}>
  //                 <div className={styles.topSection}>
  //                     <div className={styles.leftTabs}>
  //                         <span className={styles.doorLabel}>Door</span>
  //                         <div className={styles.tabs}>
  //                             {['Banding', 'Frame', 'Molding', 'Panel'].map((tab) => (
  //                                 <button
  //                                     key={tab}
  //                                     className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''}`}
  //                                     onClick={() => setActiveTab(tab)}
  //                                 >
  //                                     {tab}
  //                                 </button>
  //                             ))}
  //                         </div>
  //                     </div>

  //                     <div className={styles.rightDropdown}>
  //                         <select
  //                             className={styles.dropdown}
  //                             value={selectedCategory}
  //                             onChange={(e) => setSelectedCategory(e.target.value)}
  //                         >
  //                             <option value="Banding">Banding</option>
  //                             <option value="Other">Other</option>
  //                         </select>
  //                     </div>
  //                 </div>

  //                 <div className={styles.mainContent}>
  //                     <div className={styles.tableWrapper}>
  //                         <table className={styles.partsTable}>
  //                             <thead>
  //                                 <tr>
  //                                     <th>Parts</th>
  //                                     <th>Material</th>
  //                                 </tr>
  //                             </thead>
  //                             <tbody>
  //                                 {partsData.map((part) => (
  //                                     <tr
  //                                         key={part.id}
  //                                         className={selectedPartId === part.id ? styles.selectedRow : ''}
  //                                         onDragOver={(e) => e.preventDefault()}
  //                                         onDrop={(e) => {
  //                                             const materialId = e.dataTransfer.getData('materialId');
  //                                             handleAssignMaterial(part.id, materialId);
  //                                         }}
  //                                         onClick={() => setSelectedPartId(part.id)}
  //                                     >
  //                                         <td>{part.part}</td>
  //                                         <td>{part.material}</td>
  //                                     </tr>
  //                                 ))}

  //                                 {Array.from({
  //                                     length: Math.max(0, 8 - partsData.length),
  //                                 }).map((_, idx) => (
  //                                     <tr key={`empty-${idx}`}>
  //                                         <td>&nbsp;</td>
  //                                         <td>&nbsp;</td>
  //                                     </tr>
  //                                 ))}
  //                             </tbody>
  //                         </table>
  //                     </div>

  //                     <div className={styles.rightTable}>
  //                         <table className={styles.materialTable}>
  //                             <thead>
  //                                 <tr>
  //                                     <th>Material Name</th>
  //                                     <th>company</th>
  //                                 </tr>
  //                             </thead>
  //                             <tbody>
  //                                 {materialData.map((item) => (
  //                                     <tr
  //                                         key={item.id}
  //                                         draggable
  //                                         className={selectedMaterialId === item.id ? styles.selectedRow : ''}
  //                                         onDragStart={(e) => e.dataTransfer.setData('materialId', item.id)}
  //                                         onClick={() => setSelectedMaterialId(item.id)}
  //                                     >
  //                                         <td>
  //                                             <div className={styles.materialItem}>
  //                                                 <span className={styles.materialIcon}></span>
  //                                                 {item.name}
  //                                             </div>
  //                                         </td>
  //                                         <td>{item.company}</td>
  //                                     </tr>
  //                                 ))}
  //                             </tbody>
  //                         </table>
  //                     </div>
  //                 </div>
  //             </div>

  //             <div className={styles.buttonGroup}>
  //                 <button className={styles.cancelButton} onClick={onClose}>
  //                     Cancel
  //                 </button>
  //                 <button className={styles.saveButton} onClick={handleSave}>
  //                     Save
  //                 </button>
  //             </div>
  //         </div>
  //     </div>
  // );

  const content = (
    <div className={styles.popupOverlay}>
      <div className={styles.popup}>
        {/* Header */}
        <div className={styles.header}>
          <h2>Custom Design created</h2>
          <img
            src={close.src || '/placeholder.svg'}
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
                  className={`${styles.tab} ${
                    activeTab === tab ? styles.activeTab : ''
                  }`}
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
              {(rules.length ? rules : [{ name: 'Banding', id: 'banding', rule_parts: [] } as CatalogRule]).map((r) => (
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
                    className={
                      selectedPartId === part.id ? styles.selectedRow : ''
                    }
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      const materialId = e.dataTransfer.getData('materialId');
                      handleAssignMaterial(part.id, materialId);
                    }}
                    onClick={() => setSelectedPartId(part.id)}
                  >
                    <td>
                      <div className={styles.partlItem}>
                        <img src={tableicon.src} alt="" />
                        {part.part}
                      </div>
                    </td>

                    <td>{part.material}</td>
                  </tr>
                ))}

                {/* Empty rows for consistent height */}
                {Array.from({ length: Math.max(0, 50 - partsData.length) }).map(
                  (_, idx) => (
                    <tr key={`empty-${idx}`}>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>

          {/* Right Table (Materials) */}
          <div className={styles.rightTable}>
            <table className={styles.materialTable}>
              <thead>
                <tr>
                  <th>Material Name</th>
                  <th>Company</th>
                </tr>
              </thead>
              <tbody>
                {materialData.map((item) => (
                  <tr
                    key={item.id}
                    draggable
                    className={
                      selectedMaterialId === item.id ? styles.selectedRow : ''
                    }
                    onDragStart={(e) =>
                      e.dataTransfer.setData('materialId', item.id)
                    }
                    onClick={() => setSelectedMaterialId(item.id)}
                  >
                    <td>
                      <div className={styles.materialItem}>
                        <img src={tableicon.src} alt="" />
                        {item.name}
                      </div>
                    </td>
                    <td>{item.company}</td>
                  </tr>
                ))}
                {Array.from({ length: Math.max(0, 50 - partsData.length) }).map(
                  (_, idx) => (
                    <tr key={`empty-${idx}`}>
                      <td>&nbsp;</td>
                      <td>&nbsp;</td>
                    </tr>
                  ),
                )}
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
