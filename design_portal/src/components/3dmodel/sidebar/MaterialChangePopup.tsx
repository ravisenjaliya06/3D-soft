import close from '@/assets/design/close.svg';
import tableicon from '@/assets/sidebar/tabledata.svg';
import type React from 'react';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import styles from './MaterialChangePopup.module.css';

interface MaterialChangePopupProps {
    onClose: () => void;
    onSave: (selectedMaterials: string[]) => void;
}

export const MaterialChangePopup: React.FC<MaterialChangePopupProps> = ({
    onClose,
    onSave,
}) => {
    const [activeTab, setActiveTab] = useState('Banding');
    const [selectedCategory, setSelectedCategory] = useState('Banding');
    const [selectedPartId, setSelectedPartId] = useState<string | null>(null);
    const [selectedMaterialId, setSelectedMaterialId] = useState<string | null>(
        null,
    );
    const [partsData, setPartsData] = useState([
        { id: '1', part: 'Door Edge Banding', material: 'PVC Wood grain' },
        { id: '2', part: 'Door Edge Banding', material: 'PVC Wood grain' },
        { id: '3', part: 'Door Edge Banding', material: 'PVC Wood grain' },
        { id: '4', part: 'Door Edge Banding', material: 'PVC Wood grain' },
    ]);

    const materialData = [
        { id: '1', name: 'Elder ven EB', company: 'company 1' },
        { id: '2', name: 'Elder ven EB', company: 'company 2' },
        { id: '3', name: 'Elder ven EB', company: 'company 3' },
        { id: '4', name: 'Elder ven EB', company: 'company 4' },
    ];

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
        const assigned = Object.entries(partsData).reduce((acc, [part, material]) => {
            acc.push(`${part}: ${material}`);
            return acc;
        }, [] as string[]);
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
                        <span className={styles.doorLabel}>Door</span>
                        <div className={styles.tabs}>
                            {['Banding', 'Frame', 'Molding', 'Panel'].map((tab) => (
                                <button
                                    key={tab}
                                    className={`${styles.tab} ${activeTab === tab ? styles.activeTab : ''
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
                            <option value="Banding">Banding</option>
                            <option value="Other">Other</option>
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
