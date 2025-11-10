import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useCallback, useEffect, useState } from 'react';
import Header from '../header/header';
import InputField from '../inputfields/InputField';
import Sidebar from '../sidebar/sidebar';
import styles from './catalogmanager.module.css';
import { Catalog, CatalogRule, Material, RulePart } from './interface';

const CatalogManager = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showDeletePopup, setshowDeletePopup] = useState(false);
  const [newName, setNewName] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [name, setName] = useState('Data 1');
  const [isEditingName, setIsEditingName] = useState(false);
  const [description, setDescription] = useState('1/2 millimeter');
  const [isEditingDescription, setIsEditingDescription] = useState(false);
  const [catalogType, setCatalogType] = useState('Door');
  const [activeRuleId, setActiveRuleId] = useState<string | null>(null);
  const [selectedCatalog, setSelectedCatalog] = useState<Catalog | null>(null);
  const [catalogData, setCatalogData] = useState<Catalog[]>([]);
  const [ruleParts, setRuleParts] = useState<RulePart[]>([]);
  const [materialData, setMaterialData] = useState<Material[]>([]);
  const [selectedMaterialType, setSelectedMaterialType] = useState('Banding');
  const [materialSearch, setMaterialSearch] = useState('');
  const [selectedPartId, setSelectedPartId] = useState<string>('');
  const [selectedMaterialId, setSelectedMaterialId] = useState<string>('');

  useEffect(() => {
    if (catalogData.length > 0) {
      setSelectedCatalog(catalogData[0]);
    }
  }, [catalogData]);

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('name', name);
      console.log('description', description);
    }
  });

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
  const catalogTypes = [
    { value: 'Plank', label: 'Plank' },
    { value: 'Door', label: 'Door' },
    { value: 'Drawer', label: 'Drawer' },
    { value: 'Sliding Door', label: 'Sliding Door' },
    { value: 'Cabinet', label: 'Cabinet' },
  ];

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

  const handleAddCatalog = () => setShowPopup(true);

  const getCatalog = useCallback(async () => {
    const response: { status: number; data: Catalog[] } = await commonService.get(
      API_ENDPOINT.GET_MATERIAL_USING_TYPE(catalogType)
    );

    if (response.status === 200) {
      setCatalogData(response.data);
    }
  }, [catalogType]);

  const fetchRuleParts = async (ruleId: string) => {
    setActiveRuleId(ruleId); // mark active rule
    try {
      const response: { status: number; data: RulePart[] } = await commonService.get(
        API_ENDPOINT.GET_CATALOG_RULES_PARTS(ruleId)
      );
      if (response.status === 200) {
        setRuleParts(response.data);
      }
    } catch (error) {
      console.error('Error fetching rule parts:', error);
      setRuleParts([]);
    }
  };

  useEffect(() => {
    getCatalog();
  }, [getCatalog]);

  useEffect(() => {
    if (selectedCatalog && selectedCatalog.catalog_rules.length > 0) {
      fetchRuleParts(selectedCatalog.catalog_rules[0].id);
    } else {
      setActiveRuleId(null);
      setRuleParts([]);
    }
  }, [selectedCatalog]);

  useEffect(() => {
    if (catalogData.length > 0) {
      if (!selectedCatalog) {
        setSelectedCatalog(catalogData[0]);
      }
    }
  }, [catalogData, selectedCatalog]);

  const handleCreateCatalog = async () => {
    const payload = {
      type: catalogType,
      name: newName,
      description: newDescription,
    };

    const response: { status: number; data: Catalog } = await commonService.post(
      API_ENDPOINT.CREATE_MATERIAL_CATALOG,
      payload
    );

    if (response.status === 201) {
      // fetch all catalogs
      const catalogResponse: { status: number; data: Catalog[] } = await commonService.get(
        API_ENDPOINT.GET_CATALOG_USING_TYPE(catalogType)
      );
      if (catalogResponse.status === 200) {
        setCatalogData(catalogResponse.data);
        setSelectedCatalog(response.data);
      }
      setShowPopup(false);
    }
  };

  const getMaterial = async () => {
    const response: { status: number; data: Material[] } = await commonService.get(
      API_ENDPOINT.GET_MATERIAL
    );
    if (response.status === 200) {
      setMaterialData(response.data);
    }
  };

  useEffect(() => {
    getMaterial();
  });

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

  const handleAssignMaterialButton = () => {
    if (!selectedPartId || !selectedMaterialId) {
      alert('Please select a part and material');
      setSelectedPartId('');
      setSelectedMaterialId('');
    }
    handleAssignMaterial(selectedPartId, selectedMaterialId);
    setSelectedPartId('');
    setSelectedMaterialId('');
  };

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

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Catalog Manager" />

        {/* TOP TOOLBAR */}
        {/* TOP TOOLBAR */}
        <div className={styles.maincontainer}>
          <div className={styles.topToolbar}>
            <div className={styles.toolbarRight}>
              <div className={styles.toolbarRightContent}>
                <span>Catalog Type</span>
                <select
                  className={styles.dropdown}
                  value={catalogType}
                  onChange={(e) => setCatalogType(e.target.value)}
                >
                  {catalogTypes.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className={styles.dividerLine} />
            <div className={styles.toolbarLeft}>
              <div className={styles.toolbarLeftContent}>
                <span>Part</span>
                <select
                  className={styles.dropdown}
                  value={selectedCatalog?.id || ''}
                  onChange={(e) => {
                    const catalog = catalogData.find((c) => c.id === e.target.value);
                    setSelectedCatalog(catalog || null);
                  }}
                >
                  {catalogData.map((opt) => (
                    <option key={opt.id} value={opt.id}>
                      {opt.name}
                    </option>
                  ))}
                </select>
                <div className={styles.iconContainer}>
                  <img
                    src={assets.add}
                    alt="Add"
                    className={styles.addIcon}
                    onClick={handleAddCatalog}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* MAIN CONTENT */}
        <div className={styles.mainContent}>
          {/* LEFT BOX */}
          <div className={styles.leftBox}>
            {/* RULES */}
            <div className={styles.topBox}>
              <div className={styles.topBoxContent}>
                <h3>Rules</h3>
                <div className={styles.buttonContainer}>
                  <button
                    className={styles.deleteButtonRule}
                    onClick={() => handleShowDeletePopup()}
                  >
                    <img src={assets.deleteIconOne} alt="" className={styles.deleteIconButton} />{' '}
                    Delete
                  </button>
                </div>
              </div>
              <hr className={styles.divider} />
              <div className={styles.content}>
                {/* MENU */}
                <div className={styles.topBoxLeft}>
                  <div className={styles.matirealmanu}>
                    {selectedCatalog?.catalog_rules.map((rule: CatalogRule) => (
                      <div
                        key={rule.id}
                        className={`${styles.rulematireal} ${activeRuleId === rule.id ? styles.activeRule : ''}`}
                        onClick={() => fetchRuleParts(rule.id)}
                      >
                        <img src={assets.matariel} alt="" />
                        <span>{rule.name}</span>
                      </div>
                    )) || <p>No rules available</p>}
                  </div>
                </div>

                {/* PARTS TABLE */}
                <div className={styles.tableWrapper}>
                  <table className={styles.partsTable}>
                    <thead>
                      <tr>
                        <th>Part Name</th>
                        <th>Material Name</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ruleParts.length > 0
                        ? ruleParts.map((part) => (
                            <tr
                              key={part.id}
                              className={selectedPartId === part.id ? styles.selectedRow : ''}
                              onDragOver={(e) => e.preventDefault()}
                              onDrop={(e) => {
                                const materialId = e.dataTransfer.getData('materialId');
                                handleAssignMaterial(part.id, materialId);
                              }}
                              onClick={() => {
                                setSelectedPartId(part.id);
                              }}
                            >
                              <td>{part.name}</td>
                              <td>{part.material?.name || 'NO MATERIAL ASSIGNED'}</td>
                            </tr>
                          ))
                        : null}

                      {/* Fill remaining rows up to 8 */}
                      {Array.from({
                        length: Math.max(0, 8 - ruleParts.length),
                      }).map((_, idx) => (
                        <tr key={`empty-${idx}`}>
                          <td>&nbsp;</td>
                          <td>&nbsp;</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* DETAILS TABLE */}
            <div className={styles.bottomBox}>
              <div className={styles.table_container}>
                <table className={styles.custom_table}>
                  <thead>
                    <tr>
                      <th colSpan={2}>Details</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Name</td>
                      <td>
                        {isEditingName ? (
                          <input
                            type="text"
                            value={selectedCatalog?.name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleBlur(setIsEditingName)}
                            onKeyDown={(e) => handleKeyDown(e, setIsEditingName)}
                          />
                        ) : (
                          <p onClick={() => setIsEditingName(true)}>{selectedCatalog?.name}</p>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td>Description</td>
                      <td>
                        {isEditingDescription ? (
                          <input
                            type="text"
                            value={selectedCatalog?.description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleBlur(setIsEditingDescription)}
                            onKeyDown={(e) => handleKeyDown(e, setIsEditingDescription)}
                          />
                        ) : (
                          <p onClick={() => setIsEditingDescription(true)}>
                            {selectedCatalog?.description}
                          </p>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>
                        {isEditingDescription ? (
                          <input
                            type="text"
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleBlur(setIsEditingDescription)}
                          />
                        ) : (
                          <p>{}</p>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>
                        {isEditingDescription ? (
                          <input
                            type="text"
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleBlur(setIsEditingDescription)}
                          />
                        ) : (
                          <p>{}</p>
                        )}
                      </td>
                    </tr>
                    <tr>
                      <td></td>
                      <td>
                        {isEditingDescription ? (
                          <input
                            type="text"
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleBlur(setIsEditingDescription)}
                          />
                        ) : (
                          <p>{}</p>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* RIGHT BOX */}
          <div className={styles.rightBox}>
            <div className={styles.righttopbar}>
              <select
                className={styles.rightBoxdropdown}
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
            <hr className={styles.divider} />

            <div className={styles.bottomBox}>
              <div className={styles.doorTableWrapper}>
                <table className={styles.doorTable}>
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredMaterials.length > 0 ? (
                      filteredMaterials.map((row) => (
                        <tr
                          key={row.id}
                          draggable
                          className={selectedMaterialId === row.id ? styles.selectedRow : ''}
                          onDragStart={(e) => e.dataTransfer.setData('materialId', row.id)}
                          onClick={() => {
                            setSelectedMaterialId(row.id);
                          }}
                        >
                          <td>{row.name}</td>
                          <td>{row.description}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={2}>No materials found</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div
                className={styles.addMaterialDesign}
                onClick={() => handleAssignMaterialButton()}
              >
                <img src={assets.addMaterialIcon} alt="Add Material"></img>
                Assign Material to Part
              </div>
            </div>
          </div>
        </div>
      </div>
      {/* add catalog popup  */}
      {showPopup && (
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <img src={assets.createicon} className={styles.createicon} alt="createicon" />
            <img
              src={assets.close}
              className={styles.createclose}
              alt="close"
              onClick={() => setShowPopup(false)}
            />
            <div className={styles.create_right_side}>
              <h2>Add Catalog</h2>
              <p>Please enter a name for this Material.</p>
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
            </div>
            <div className={styles.createButtonGrop}>
              <button className={styles.cancelcreateButton} onClick={() => setShowPopup(false)}>
                Cancel
              </button>
              <button className={styles.createcontinueButton} onClick={handleCreateCatalog}>
                continue
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
            <img
              src={assets.deletepopup}
              alt="deletepopupicon"
              className={styles.deletepopupicon}
            />

            <img
              src={assets.close}
              alt="close"
              onClick={() => setshowDeletePopup(false)}
              className={styles.close}
            />

            <div className={styles.right_side}>
              <h2>Delete Design</h2>
              <p className={styles.deletemassage}>
                Are you sure you want to delete this design? This action cannot be undone.
              </p>
            </div>
            <div className={styles.deleteButtonGrop}>
              <button className={styles.cancelButton} onClick={() => setshowDeletePopup(false)}>
                Cancel
              </button>
              <button className={styles.deleteButton} onClick={handleDeleteAssignMaterial}>
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogManager;
