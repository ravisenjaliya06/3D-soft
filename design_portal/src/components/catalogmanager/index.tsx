import { MATERIAL_TYPE_ICONS } from '@/components/common/materialTypeIcons';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import React, { useCallback, useEffect, useState } from 'react';
import {
  LuArrowRight,
  LuBox,
  LuCheck,
  LuChevronDown,
  LuGripVertical,
  LuInfo,
  LuLibrary,
  LuPackageOpen,
  LuPencil,
  LuPlus,
  LuSearch,
  LuTrash2,
  LuTriangleAlert,
  LuX,
} from 'react-icons/lu';
import { Material, MeshObjectData } from '../3dmodel/sceneCreator/interface';
import { convertKeysToCamel, formatEnumLabel } from '../3dmodel/sceneCreator/utils';
import Header from '../header/header';
import InputField from '../inputfields/InputField';
import Sidebar from '../sidebar/sidebar';
import styles from './catalogmanager.module.css';
import { RulePart } from './interface';

const CatalogManager = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showDeletePopup, setshowDeletePopup] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [editingName, setEditingName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [editingDescription, setEditingDescription] = useState('');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [catalogType, setCatalogType] = useState('Door');
  const [selectedCatalog, setSelectedCatalog] = useState<MeshObjectData | null>(null);
  const [catalogData, setCatalogData] = useState<MeshObjectData[]>([]);
  const [ruleParts, setRuleParts] = useState<RulePart[]>([]);
  const [materialData, setMaterialData] = useState<Material[]>([]);
  const [selectedMaterialType, setSelectedMaterialType] = useState('Banding');
  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');
  const [ruleMaterialTypes, setRuleMaterialTypes] = useState<string[]>([]);
  const [activeRuleType, setActiveRuleType] = useState<string | null>(null);

  useEffect(() => {
    if (selectedCatalog) {
      setEditingName(selectedCatalog.name || '');
      setEditingDescription(selectedCatalog.description || '');
    }
  }, [selectedCatalog]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(editingDescription, editingName);
    }
  }, []);

  const filteredMaterials = materialData
    .filter((mat) => mat.type === selectedMaterialType) // keep type filter
    .filter(
      (mat) =>
        mat.name.toLowerCase().includes(materialSearch.toLowerCase()) ||
        mat.description?.toLowerCase().includes(materialSearch.toLowerCase())
    );

  const fields = [
    {
      label: 'Name',
      type: 'name',
      placeholder: 'Enter catalog name',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value),
      error: '',
    },
    {
      label: 'Description',
      type: 'name',
      placeholder: 'Enter catalog description',
      onChange: (e: React.ChangeEvent<HTMLInputElement>) => setNewDescription(e.target.value),
      error: '',
    },
  ];

  // ---------- DROPDOWN DATA ----------
  const catalogTypes = React.useMemo(() => {
    const unique = new Map<string, string>();
    catalogData.forEach((c) => {
      if (c.type) unique.set(c.type, c.type.toUpperCase());
    });
    return Array.from(unique.entries()).map(([value, label]) => ({ value, label }));
  }, [catalogData]);

  const materialTypes = [
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

  const handleBlur = (setEditing: (v: boolean) => void) => () => setEditing(false);
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    setEditing: (v: boolean) => void
  ) => {
    if (e.key === 'Enter') setEditing(false);
  };

  /** Open the popup to create a new catalog */

  const handleAddCatalog = () => setShowPopup(true);

  /** Fetch catalog list based on the selected catalog type */
  const getCatalog = useCallback(async () => {
    const response: { status: number; data: MeshObjectData[][] } = await commonService.get(
      API_ENDPOINT.GET_CATALOG_ITEMS
    );

    if (response.status === 200) {
      const catalogs: MeshObjectData[] = [];
      response.data.forEach((catalog) => {
        catalog.forEach((item) => {
          catalogs.push(convertKeysToCamel(item));
        });
      });
      setCatalogData(catalogs);
    }
  }, []);

  useEffect(() => {
    getCatalog();
  }, [getCatalog]);

  /** Create a new catalog and refresh the catalog list */
  const handleCreateCatalog = async () => {
    const payload = {
      type: catalogType,
      name: newName,
      description: newDescription,
    };

    const response: { status: number; data: MeshObjectData } = await commonService.post(
      API_ENDPOINT.CREATE_MATERIAL_CATALOG,
      payload
    );

    if (response.status === 201) {
      // fetch all catalogs
      const catalogResponse: { status: number; data: MeshObjectData[] } = await commonService.get(
        API_ENDPOINT.GET_CATALOG_USING_TYPE(catalogType)
      );
      if (catalogResponse.status === 200) {
        setCatalogData(catalogResponse.data);
        setSelectedCatalog(response.data);
      }
      setShowPopup(false);
    }
  };

  /** Fetch all available materials from the server */
  const getMaterial = useCallback(async () => {
    const response: { status: number; data: Material[] } = await commonService.get(
      API_ENDPOINT.GET_MATERIAL
    );
    if (response.status === 200) {
      setMaterialData(response.data);
    }
  }, []);

  useEffect(() => {
    getMaterial();
  }, [getMaterial]);

  /** Assign a selected material to a selected part */
  const handleAssignMaterial = async (partId: string, materialId: string | null) => {
    const material = materialData.find((m) => m.id === materialId);
    if (!material) return;

    setRuleParts((prevParts) =>
      prevParts.map((part) => (part.id === partId ? { ...part, material } : part))
    );

    const response: { status: number } = await commonService.put(
      API_ENDPOINT.UPDATE_PART_MATERIAL(partId),
      {
        material_id: materialId,
      }
    );

    if (response.status === 200) {
      setRuleParts((prevParts) =>
        prevParts.map((part) => (part.id === partId ? { ...part, material } : part))
      );
    }

    setSelectedPartId('');
    setSelectedMaterialId('');
  };

  /** Remove the assigned material from a selected part */
  const handleDeleteMaterial = async (partId: string) => {
    setRuleParts((prevParts) =>
      prevParts.map((part) => (part.id === partId ? { ...part, material: null } : part))
    );

    const response: { status: number } = await commonService.put(
      API_ENDPOINT.UPDATE_PART_MATERIAL(partId),
      {
        material_id: null,
      }
    );

    if (response.status === 200) {
      setRuleParts((prevParts) =>
        prevParts.map((part) => (part.id === partId ? { ...part, material: null } : part))
      );
      setSelectedPartId('');
      setSelectedMaterialId('');
      setshowDeletePopup(false);
    } else {
      setSelectedPartId('');
      setSelectedMaterialId('');
      setshowDeletePopup(false);
    }
  };

  /** Confirm and assign the chosen material to the chosen part */
  const handleAssignMaterialButton = () => {
    if (!selectedPartId || !selectedMaterialId) {
      alert('Please select a part and material');
      setSelectedPartId('');
      setSelectedMaterialId('');
      return;
    }
    handleAssignMaterial(selectedPartId, selectedMaterialId);
    setSelectedPartId('');
    setSelectedMaterialId('');
  };

  /** Confirm and delete material assignment from the selected part */
  const handleDeleteAssignMaterial = () => {
    if (!selectedPartId) {
      alert('Please select a part');
      setSelectedPartId('');
      return;
    }
    handleDeleteMaterial(selectedPartId);
    setSelectedPartId('');
    setshowDeletePopup(false);
  };

  const handleShowDeletePopup = () => {
    if (!selectedPartId) {
      alert('Please select a part');
      setSelectedPartId('');
      return;
    }
    setshowDeletePopup(true);
  };

  useEffect(() => {
    const first = catalogData.find((c) => c.isMain && c.type === catalogType.toLowerCase());
    setSelectedCatalog(first || null);
  }, [catalogType, catalogData]);

  useEffect(() => {
    if (!selectedCatalog || !activeRuleType) {
      setRuleParts([]);
      return;
    }

    const children = catalogData.filter((c) => c.parent === selectedCatalog.id);

    const matchingChildren = children.filter((child) =>
      child.material?.some((m) => m.type === activeRuleType)
    );

    if (matchingChildren.length > 0) {
      setRuleParts(
        matchingChildren.map((child) => ({
          id: child.id,
          name: child.name,
          material: child.material?.find((m: Material) => m.type === activeRuleType) || null,
        }))
      );
      return;
    }

    const parentMaterial = selectedCatalog.material?.find(
      (m: Material) => m.type === activeRuleType
    );

    if (parentMaterial) {
      setRuleParts([
        {
          id: selectedCatalog.id,
          name: selectedCatalog.name,
          material: parentMaterial,
        },
      ]);
    } else {
      setRuleParts([]);
    }
  }, [selectedCatalog, activeRuleType, catalogData]);

  useEffect(() => {
    if (!selectedCatalog) return;

    const children = catalogData.filter((c) => c.parent === selectedCatalog.id);

    const allMaterials = [
      ...(selectedCatalog.material || []),
      ...children.flatMap((c) => c.material || []),
    ];

    const types = [...new Set(allMaterials.map((m) => m.type))];

    setRuleMaterialTypes(types);
    setActiveRuleType(types[0] || null);
  }, [selectedCatalog, catalogData]);

  /* Drop Down Arrow */
  const [openpart, setOpenpart] = useState(false);
  const [opentype, setOpentype] = useState(false);
  const [open, setOpen] = useState(false);

  const iconList = MATERIAL_TYPE_ICONS;

  const selectedPart = ruleParts.find((p) => p.id === selectedPartId);
  const selectedMaterial = materialData.find((m) => m.id === selectedMaterialId);

  return (
    <div className={styles.page}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Catalog" />

        <div className={styles.content}>
          {/* TOP TOOLBAR */}
          <div className={styles.toolbar}>
            <div className={styles.toolbarIntro}>
              <span className={styles.eyebrow}>
                <LuLibrary aria-hidden="true" />
                Furniture catalog
              </span>
              <h2 className={styles.toolbarTitle}>Assign materials to catalog parts</h2>
              <p className={styles.toolbarSub}>
                Pick a catalog item, choose a material type, then assign boards, edge banding or
                hardware to each part.
              </p>
            </div>

            <div className={styles.toolbarControls}>
              <label className={styles.selectField}>
                <span>Catalog part</span>
                <div className={styles.selectWrap}>
                  <select
                    onFocus={() => setOpenpart(true)}
                    onBlur={() => setOpenpart(false)}
                    value={catalogType}
                    onChange={(e) => setCatalogType(e.target.value)}
                  >
                    {catalogTypes.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {formatEnumLabel(opt.label)}
                      </option>
                    ))}
                  </select>
                  <LuChevronDown
                    className={`${styles.selectChevron} ${openpart ? styles.chevronOpen : ''}`}
                    aria-hidden="true"
                  />
                </div>
              </label>

              <label className={styles.selectField}>
                <span>Type</span>
                <div className={styles.selectWrap}>
                  <select
                    onFocus={() => setOpentype(true)}
                    onBlur={() => setOpentype(false)}
                    value={selectedCatalog?.id || ''}
                    onChange={(e) => {
                      const catalog = catalogData.find((c) => c.id === e.target.value);
                      setSelectedCatalog(catalog || null);
                    }}
                  >
                    {catalogData
                      .filter((c) => c.isMain && c.type === catalogType.toLowerCase())
                      .map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {formatEnumLabel(opt.name)}
                        </option>
                      ))}
                  </select>
                  <LuChevronDown
                    className={`${styles.selectChevron} ${opentype ? styles.chevronOpen : ''}`}
                    aria-hidden="true"
                  />
                </div>
              </label>

              <button
                type="button"
                className={styles.addCatalogButton}
                onClick={handleAddCatalog}
                disabled
                title="Adding catalogs isn't available yet"
              >
                <LuPlus aria-hidden="true" />
                New catalog
              </button>
            </div>
          </div>

          {/* STEP 1: material types strip + item details */}
          <section className={styles.typeBar}>
            <div className={styles.typeBarMain}>
              <div className={styles.panelHead}>
                <span className={styles.stepBadge}>1</span>
                <div>
                  <h3>Material types</h3>
                  <p>Used by this catalog item</p>
                </div>
              </div>
              <div className={styles.typeList} role="tablist" aria-label="Material types">
                {ruleMaterialTypes.map((type) => {
                  const TypeIcon = iconList[type] ?? LuBox;
                  return (
                    <button
                      type="button"
                      role="tab"
                      aria-selected={activeRuleType === type}
                      key={type}
                      onClick={() => setActiveRuleType(type)}
                      className={`${styles.typeItem} ${activeRuleType === type ? styles.typeItemActive : ''}`}
                    >
                      <span className={styles.typeIcon}>
                        <TypeIcon aria-hidden="true" />
                      </span>
                      {type}
                    </button>
                  );
                })}
                {ruleMaterialTypes.length === 0 && (
                  <p className={styles.mutedNote}>No material types on this item yet.</p>
                )}
              </div>
            </div>

            <div className={styles.partDetails}>
              <p className={styles.partDetailsTitle}>Item details</p>
              <fieldset className={styles.detailField}>
                <legend>Name</legend>
                {isEditingName ? (
                  <input
                    type="text"
                    value={formatEnumLabel(selectedCatalog?.name || '')}
                    onBlur={handleBlur(setIsEditingName)}
                    onKeyDown={(e) => handleKeyDown(e, setIsEditingName)}
                  />
                ) : (
                  <div onClick={() => setIsEditingName(true)}>
                    {formatEnumLabel(selectedCatalog?.name || '')}
                  </div>
                )}
              </fieldset>
              <fieldset className={styles.detailField}>
                <legend>Description</legend>
                {isEditingDescription ? (
                  <input
                    type="text"
                    value={selectedCatalog?.description}
                    onBlur={handleBlur(setIsEditingDescription)}
                    onKeyDown={(e) => handleKeyDown(e, setIsEditingDescription)}
                  />
                ) : (
                  <div onClick={() => setIsEditingDescription(true)}>
                    {selectedCatalog?.description}
                  </div>
                )}
              </fieldset>
            </div>
          </section>

          {/* MAIN CONTENT */}
          <div className={styles.workspace}>
            {/* MIDDLE: parts table */}
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <span className={styles.stepBadge}>2</span>
                <div>
                  <h3>Parts &amp; assigned material</h3>
                  <p>{activeRuleType ? `Showing ${activeRuleType}` : 'Select a material type'}</p>
                </div>
              </div>
              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>Part</th>
                      <th>Material</th>
                      <th className={styles.center}>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ruleParts.length > 0 &&
                      ruleParts.map((part) => (
                        <tr
                          key={part.id}
                          onDragOver={(e) => e.preventDefault()}
                          onDrop={(e) => {
                            const materialId = e.dataTransfer.getData('materialId');
                            handleAssignMaterial(part.id, materialId);
                          }}
                          onClick={() => setSelectedPartId(part.id)}
                          className={`${styles.row} ${selectedPartId === part.id ? styles.rowSelected : ''}`}
                        >
                          <td className={styles.partName}>{formatEnumLabel(part.name)}</td>
                          <td>
                            {part.material?.name ? (
                              <span className={styles.materialChip}>{part.material.name}</span>
                            ) : (
                              <span className={styles.noMaterial}>No material assigned</span>
                            )}
                          </td>
                          <td>
                            <div className={styles.rowActions}>
                              {/* DELETE BUTTON */}
                              <button
                                disabled={true}
                                onClick={() => handleShowDeletePopup()}
                                className={styles.iconBtn}
                                aria-label="Remove material"
                              >
                                <LuTrash2 aria-hidden="true" />
                              </button>

                              {/* EDIT BUTTON */}
                              <button disabled={true} className={styles.iconBtn} aria-label="Edit">
                                <LuPencil aria-hidden="true" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
                {ruleParts.length === 0 && (
                  <div className={styles.emptyState}>
                    <span className={styles.emptyIcon}>
                      <LuPackageOpen aria-hidden="true" />
                    </span>
                    <strong>No parts to show</strong>
                    <p>Choose a catalog item and a material type to see its parts.</p>
                  </div>
                )}
              </div>
              <div className={styles.panelFoot}>
                <LuInfo aria-hidden="true" />
                {selectedPart
                  ? `Selected part: ${formatEnumLabel(selectedPart.name)}`
                  : 'Click a part to select it, or drag a material onto it.'}
              </div>
            </div>

            {/* RIGHT: material library */}
            <div className={styles.panel}>
              <div className={styles.panelHead}>
                <span className={styles.stepBadge}>3</span>
                <div>
                  <h3>Material library</h3>
                  <p>Choose a material to assign</p>
                </div>
              </div>
              <div className={styles.libraryBar}>
                <div className={styles.selectWrap}>
                  <select
                    onFocus={() => setOpen(true)}
                    onBlur={() => setOpen(false)}
                    value={selectedMaterialType}
                    onChange={(e) => setSelectedMaterialType(e.target.value)}
                  >
                    {materialTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                  <LuChevronDown
                    className={`${styles.selectChevron} ${open ? styles.chevronOpen : ''}`}
                    aria-hidden="true"
                  />
                </div>
                <div className={styles.searchWrap}>
                  <LuSearch className={styles.searchIcon} aria-hidden="true" />
                  <input
                    type="text"
                    placeholder="Search materials…"
                    value={materialSearch}
                    onChange={(e) => setMaterialSearch(e.target.value)}
                  />
                </div>
              </div>

              <div className={styles.tableScroll}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th className={styles.radioCol}></th>
                      <th>Material name</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.length > 0 ? (
                      filteredMaterials.map((row) => (
                        <tr
                          key={row.id}
                          draggable
                          onDragStart={(e) => e.dataTransfer.setData('materialId', row.id)}
                          onClick={() => setSelectedMaterialId(row.id)}
                          className={`${styles.row} ${selectedMaterialId === row.id ? styles.rowSelected : ''}`}
                        >
                          <td className={styles.radioCol}>
                            <input
                              type="radio"
                              checked={selectedMaterialId === row.id}
                              onChange={() => setSelectedMaterialId(row.id)}
                              className={styles.radio}
                            />
                          </td>
                          <td className={styles.partName}>
                            <span className={styles.dragHandle}>
                              <LuGripVertical aria-hidden="true" />
                            </span>
                            {row.name}
                          </td>
                          <td className={styles.descCell}>{row.description}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className={styles.noRows}>
                          No materials found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* BOTTOM ACTION BAR */}
              <div className={styles.assignBar}>
                <div className={styles.assignSummary}>
                  <span>
                    {selectedPart ? formatEnumLabel(selectedPart.name) : 'No part selected'}
                  </span>
                  <LuArrowRight aria-hidden="true" />
                  <span>{selectedMaterial ? selectedMaterial.name : 'No material selected'}</span>
                </div>
                <button
                  type="button"
                  onClick={handleAssignMaterialButton}
                  className={styles.assignButton}
                >
                  <LuCheck aria-hidden="true" />
                  Assign to part
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* add catalog popup  */}
      {showPopup && (
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <div className={styles.modalHead}>
              <span className={styles.modalIcon}>
                <LuPlus aria-hidden="true" />
              </span>
              <div>
                <h2>Add catalog</h2>
                <p>Give the new catalog item a name and short description.</p>
              </div>
              <button
                type="button"
                className={styles.createclose}
                aria-label="Close"
                onClick={() => setShowPopup(false)}
              >
                <LuX aria-hidden="true" />
              </button>
            </div>
            <form
              className={styles.form}
              onSubmit={(e) => {
                e.preventDefault();
                // handleCreateDesign();
              }}
            >
              <div className={styles.createinputGroup}>
                {fields.map((field, index) => (
                  <InputField
                    className={styles.inputField}
                    key={index}
                    borderColor="var(--primary-color-grey-2)"
                    {...field}
                    error=""
                  />
                ))}
              </div>
            </form>
            <div className={styles.createButtonGrop}>
              <button className={styles.cancelcreateButton} onClick={() => setShowPopup(false)}>
                Cancel
              </button>
              <button className={styles.createcontinueButton} onClick={handleCreateCatalog}>
                Continue
              </button>
            </div>
          </div>
        </div>
      )}
      {showDeletePopup && (
        <div
          className={styles.deletepopupOverlay}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setshowDeletePopup(false);
            }
          }}
        >
          <div className={styles.deletepopup}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setshowDeletePopup(false)}
              className={styles.close}
            >
              <LuX aria-hidden="true" />
            </button>
            <span className={styles.deletepopupicon}>
              <LuTriangleAlert aria-hidden="true" />
            </span>
            <div className={styles.right_side}>
              <h2>Remove material?</h2>
              <p className={styles.deletemassage}>
                This removes the assigned material from the selected part. This can&apos;t be
                undone.
              </p>
            </div>
            <div className={styles.deleteButtonGrop}>
              <button className={styles.cancelButton} onClick={() => setshowDeletePopup(false)}>
                Cancel
              </button>
              <button className={styles.deleteButton} onClick={handleDeleteAssignMaterial}>
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogManager;
