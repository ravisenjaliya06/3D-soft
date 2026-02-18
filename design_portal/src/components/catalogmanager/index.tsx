import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useCallback, useEffect, useState } from 'react';
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

  const iconList: { [key: string]: string } = {
    Banding: assets.banding,
    'Board Stock': assets.brandstok,
    Caster: assets.caster,
    Connector: assets.connector,
    'Drawer Guide': assets.drawerguid,
    Hinge: assets.hinge,
    'Hinge Plate': assets.hinge,
    Laminate: assets.brandstok,
    Leg: assets.leg,
    'Leg Leveler': assets.leg_leveler,
    Miscellaneous: assets.mis,
    Molding: assets.molding,
    'Panel Stock': assets.panel_stock,
    Pull: assets.pull,
    Rod: assets.rod,
    'Sliding Door Rail': assets.door_rail,
    'Sliding Door Roller': assets.sliding_door_roller,
    'Wire Basket': assets.wire_basket,
  };

  return (
    <div className="flex h-screen flex-row overflow-hidden">
      <Sidebar />
      <div className="max-w-[85rem] flex-[3]">
        <Header isBorderRadius={true} dashboardName="Catalog Manager" />

        <div className="justify-between">
          {/* TOP TOOLBAR */}
          <div className="mx-auto w-[90rem] max-w-[90rem]">
            <div className="mt-[3rem] flex h-[5rem] flex-row gap-[0.5rem] pt-[1rem] pr-[1rem] pb-[0rem] pl-[7rem]">
              <div className="mb-[1rem] flex items-center gap-[0.5rem] rounded-[0.6rem] border-[0.063rem] border-[var(--border-color)] bg-[linear-gradient(90deg,var(--primary-white)_0%,var(--primary-light-pink)_100%)] p-[0rem] px-[1rem] py-[1.5rem]">
                <div className="flex items-center">
                  <div className="flex items-center gap-[0.75rem] pr-[1.4rem]">
                    <span className="text-[0.8rem] font-[var(--font-family)] font-medium tracking-[0.02rem] text-[var(--primary-color)]">
                      Catalog Part
                    </span>
                    <div className="relative inline-flex items-center">
                      <select
                        onFocus={() => setOpenpart(true)}
                        onBlur={() => setOpenpart(false)}
                        className="h-[1.5rem] w-[8rem] cursor-pointer appearance-none rounded-[0.3rem] border-[0.063rem] border-[var(--input-border-color)] bg-white px-[0.4rem] pr-[1.8rem] font-['Comfortaa'] text-[0.69rem] text-[var(--primary-color)] outline-none"
                        value={catalogType}
                        onChange={(e) => setCatalogType(e.target.value)}
                      >
                        {catalogTypes.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {formatEnumLabel(opt.label)}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute right-[0.25rem] flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-[0.2rem] border-none border-[var(--input-border-color)] bg-white">
                        <img
                          src={openpart ? assets.menuup : assets.menudown}
                          className="h-[1.5rem] w-[1.5rem]"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="h-[3rem] w-[0.01rem] bg-[var(--toolbar-border-color)]" />
                  <div className="flex items-center gap-[0.75rem] pl-[1.4rem]">
                    <span className="text-[0.8rem] font-[var(--font-family)] font-medium tracking-[0.02rem] text-[var(--primary-color)]">
                      Type
                    </span>
                    <div className="relative inline-flex items-center">
                      <select
                        onFocus={() => setOpentype(true)}
                        onBlur={() => setOpentype(false)}
                        className="rounded-md-[0.1rem] h-[1.5rem] w-[8.2rem] cursor-pointer appearance-none rounded-[0.3rem] border-[0.063rem] border-[var(--input-border-color)] bg-[var(--primary-white)] p-[0rem] px-[0.4rem] py-[0.2rem] pl-[0.2rem] font-['Comfortaa'] text-[0.69rem] text-[var(--primary-color)] outline-none"
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
                      <div className="pointer-events-none absolute right-[0.25rem] flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-[0.2rem] border-none border-[var(--input-border-color)] bg-white">
                        <img
                          src={opentype ? assets.menuup : assets.menudown}
                          className="h-[1.5rem] w-[1.5rem]"
                        />
                      </div>
                    </div>
                    <div className="ml-[1.7rem] h-[3rem] w-[0.01rem] bg-[var(--toolbar-border-color)]" />
                  </div>
                </div>
                <div className="flex">
                  <img
                    src={assets.addd}
                    alt="Add"
                    className="pointer-events-none ml-[34rem] h-[4.5rem] w-[4.5rem] cursor-pointer opacity-50"
                    onClick={handleAddCatalog}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex h-[40rem] flex-row gap-[1rem] px-[0rem] pr-[6.5rem] pb-[1rem] pl-[7rem]">
            {/* LEFT SIDEBAR */}
            <div className="flex h-full max-h-[66vh] w-[14rem] flex-col justify-between rounded-[0.6rem] border-[0.063rem] border-[var(--border-color)] bg-[var(--primary-white)] p-[0rem]">
              {/* ================= RULE LIST ================= */}
              <div className="flex flex-[1] flex-col overflow-y-auto">
                <div className="px-[0.5rem] pt-[0.6rem] pb-[0.3rem]">
                  <p className="mb-[0.4rem] px-[0.5rem] text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[var(--soft-dark-grey)]">Material Types</p>
                </div>
                <div className="flex flex-col gap-[0.25rem] px-[0.5rem] pb-[0.5rem]">
                  {ruleMaterialTypes.map((type) => (
                    <div
                      key={type}
                      onClick={() => setActiveRuleType(type)}
                      className={`flex cursor-pointer items-center gap-[0.6rem] rounded-[0.5rem] px-[0.7rem] py-[0.5rem] text-left text-[0.72rem] font-medium transition-all duration-200 ${
                        activeRuleType === type
                          ? 'bg-[var(--primary-color)] text-[var(--primary-white)] shadow-[0_2px_8px_var(--box-shadow-color)]'
                          : 'text-[var(--project-item-text)] hover:bg-[var(--active-button-color)] hover:text-[var(--primary-color)]'
                      }`}
                      style={activeRuleType === type ? { boxShadow: '0 2px 8px rgba(57,37,121,0.18)' } : {}}
                    >
                      <img src={iconList[type]} alt="" className={`h-[1.1rem] w-[1.1rem] transition-all duration-200 ${activeRuleType === type ? 'brightness-0 invert' : 'opacity-70'}`} style={activeRuleType === type ? { filter: 'brightness(0) invert(1)' } : {}} />
                      {type}
                    </div>
                  ))}
                </div>
              </div>

              {/* ================= DETAILS (BOTTOM) ================= */}
              <div className="border-t-[0.063rem] border-[var(--border-color)] p-[0rem]">
                <div className="rounded-b-[0.6rem] bg-[var(--active-button-color)] p-[0.5rem]">
                  {/* HEADER */}
                  <p className="mb-[0.4rem] text-center text-[0.65rem] font-semibold uppercase tracking-[0.08em] text-[var(--primary-color)]">
                    Part Details
                  </p>

                  {/* INPUTS */}
                  <div className="flex flex-col justify-center gap-[0.3rem] px-[0.3rem]">
                    {/* NAME */}
                    <div className="relative w-full">
                      <fieldset className="h-[1.5rem] rounded-[0.4rem] border-[0.063rem] border-[var(--border-color)] bg-[var(--primary-white)] px-[0.6rem] transition-all duration-200 focus-within:border-[var(--primary-color)]">
                        <legend className="px-[0.2rem] text-[0.5rem] text-[var(--soft-dark-grey)]">
                          Name
                        </legend>

                        {isEditingName ? (
                          <input
                            type="text"
                            value={formatEnumLabel(selectedCatalog?.name || '')}
                            onBlur={handleBlur(setIsEditingName)}
                            onKeyDown={(e) => handleKeyDown(e, setIsEditingName)}
                            className="mt-[0.1rem] w-full border-[0rem] bg-transparent text-[0.65rem] font-medium text-[var(--primary-color)] outline-none"
                          />
                        ) : (
                          <div
                            onClick={() => setIsEditingName(true)}
                            className="mt-[0.1rem] w-full cursor-pointer text-[0.65rem] font-medium text-[var(--primary-color)]"
                          >
                            {formatEnumLabel(selectedCatalog?.name || '')}
                          </div>
                        )}
                      </fieldset>
                    </div>

                    {/* DESCRIPTION */}
                    <div className="relative w-full">
                      <fieldset className="h-[1.5rem] rounded-[0.4rem] border-[0.063rem] border-[var(--border-color)] bg-[var(--primary-white)] px-[0.6rem] transition-all duration-200 focus-within:border-[var(--primary-color)]">
                        <legend className="px-[0.2rem] text-[0.5rem] text-[var(--soft-dark-grey)]">
                          Description
                        </legend>

                        {isEditingDescription ? (
                          <input
                            type="text"
                            value={selectedCatalog?.description}
                            onBlur={handleBlur(setIsEditingDescription)}
                            onKeyDown={(e) => handleKeyDown(e, setIsEditingDescription)}
                            className="mt-[0.1rem] w-full border-[0rem] bg-transparent text-[0.65rem] font-medium text-[var(--primary-color)] outline-none"
                          />
                        ) : (
                          <div
                            onClick={() => setIsEditingDescription(true)}
                            className="mt-[0.1rem] w-full cursor-pointer text-[0.65rem] font-medium text-[var(--primary-color)]"
                          >
                            {selectedCatalog?.description}
                          </div>
                        )}
                      </fieldset>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Table */}
            <div className="h-full max-h-[66vh] w-full max-w-[31.05rem] overflow-hidden rounded-[0.6rem] border-[0.063rem] border-[var(--border-color)] bg-[var(--primary-white)] p-[0rem]">
              {/* ================= TABLE SCROLL CONTAINER ================= */}
              <div className="overflow-y-auto pb-[0.75rem]">
                <table className="w-full border-collapse border-spacing-0 p-[0rem]">
                  {/* ================= TABLE HEADER ================= */}
                  <thead className="sticky top-0 z-10">
                    <tr>
                      <th
                        colSpan={3}
                        className="h-[2.8rem] border-b-[0.063rem] border-[var(--border-color)] bg-[var(--primary-color)] p-[0rem] px-[1rem] text-left font-[700] text-[var(--primary-white)]"
                      >
                        <div className="text-[0.85rem] tracking-[0.02em]">Material Properties</div>
                      </th>
                    </tr>

                    <tr>
                      <th className="h-[1.75rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] bg-[var(--active-button-color)] p-[0rem] px-[1rem] py-[0.3rem] text-left text-[0.7rem] font-[600] uppercase tracking-[0.06em] text-[var(--soft-dark-grey)]">
                        <div className="ml-[0rem] flex items-center text-left">
                          Part
                          <img
                            src={assets.up_down_arrow}
                            alt="Sort"
                            className="ml-[0.3rem] h-[0.7rem] w-[0.7rem] opacity-50"
                          />
                        </div>
                      </th>

                      <th className="h-[1.75rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] bg-[var(--active-button-color)] p-[0rem] px-[1rem] py-[0.3rem] text-left text-[0.7rem] font-[600] uppercase tracking-[0.06em] text-[var(--soft-dark-grey)]">
                        <div className="flex items-center">
                          Material
                          <img
                            src={assets.up_down_arrow}
                            alt="Sort"
                            className="ml-[0.3rem] h-[0.7rem] w-[0.7rem] opacity-50"
                          />
                        </div>
                      </th>

                      <th className="h-[1.75rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] bg-[var(--active-button-color)] p-[0rem] px-[1rem] py-[0.3rem] text-center text-[0.7rem] font-[600] uppercase tracking-[0.06em] text-[var(--soft-dark-grey)]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  {/* ================= TABLE BODY ================= */}
                  <tbody className="m-[0rem] p-[0rem]">
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
                          className={`cursor-pointer p-[0rem] transition-all duration-200 ${
                            selectedPartId === part.id
                              ? 'bg-[var(--primary-hover)]'
                              : 'bg-[var(--primary-white)] hover:bg-[var(--active-button-color)]'
                          } `}
                          style={selectedPartId === part.id ? { boxShadow: 'inset 3px 0 0 var(--primary-color)' } : {}}
                        >
                          <td className="h-[2.2rem] min-h-[2.2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] px-[1rem]">
                            <div className={`flex h-full items-center text-left text-[0.72rem] ${selectedPartId === part.id ? 'font-semibold text-[var(--primary-color)]' : 'text-[var(--project-item-text)]'}`}>
                              {formatEnumLabel(part.name)}
                            </div>
                          </td>

                          <td className="h-[2.2rem] min-h-[2.2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] px-[1rem]">
                            <div className={`flex h-full items-center text-[0.72rem] ${part.material?.name ? 'text-[var(--project-item-text)]' : 'text-[var(--soft-dark-grey)] italic opacity-60'}`}>
                              {part.material?.name || 'No material assigned'}
                            </div>
                          </td>

                          <td className="h-[2.2rem] min-h-[2.2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] px-[1rem]">
                            <div className="flex h-full items-center justify-center gap-[0.5rem]">
                              {/* DELETE BUTTON */}
                              <button
                                disabled={true}
                                onClick={() => handleShowDeletePopup()}
                                className="m-[0rem] cursor-not-allowed rounded-[0.3rem] border-[0rem] bg-transparent p-[0.2rem] text-[0.6rem] text-[var(--delete-text-color)] opacity-40 transition-opacity duration-200"
                              >
                                <img
                                  src={assets.trash}
                                  alt="delete"
                                  className="m-[0rem] h-[0.9rem] min-h-[0.9rem] w-[0.9rem] min-w-[0.9rem] p-[0rem]"
                                />
                              </button>

                              {/* EDIT BUTTON */}
                              <button
                                disabled={true}
                                className="m-[0rem] cursor-not-allowed rounded-[0.3rem] border-[0rem] bg-transparent p-[0.2rem] text-[0.6rem] text-[var(--delete-text-color)] opacity-40 transition-opacity duration-200"
                              >
                                <img
                                  src={assets.edit}
                                  alt="edit"
                                  className="m-[0rem] h-[0.9rem] min-h-[0.9rem] w-[0.9rem] min-w-[0.9rem] p-[0rem]"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    {/* ===== EMPTY ROWS (Keep visual height) ===== */}
                    {Array.from({
                      length: Math.max(0, 18 - ruleParts.length),
                    }).map((_, idx) => (
                      <tr key={`empty-${idx}`} className="bg-[var(--primary-white)] p-[0rem]">
                        <td className="h-[2.2rem] min-h-[2.2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem] px-[1rem]">
                          &nbsp;
                        </td>
                        <td className="m-[0rem] h-[2.2rem] min-h-[2.2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem] px-[1rem]">
                          &nbsp;
                        </td>
                        <td className="m-[0rem] h-[2.2rem] min-h-[2.2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem] px-[1rem]">
                          &nbsp;
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT BOX */}
            <div className="relative flex h-full max-h-[66vh] flex-col rounded-[0.2rem] border-[0rem] bg-white p-[0rem]">
              <div className="flex h-full w-full max-w-[31.05rem] flex-col overflow-hidden rounded-[0.6rem] border-[0.063rem] border-[var(--border-color)] bg-[var(--primary-white)]">
                {/* ================= TOP BAR ================= */}
                <div className="m-[0rem] flex h-[2.8rem] shrink-0 items-center gap-[0.9375rem] border-b-[0.063rem] border-[var(--border-color)] bg-[var(--active-button-color)] p-[0rem] px-[1rem]">
                  {/* DROPDOWN */}
                  <div className="relative inline-flex items-center">
                    <select
                      onFocus={() => setOpen(true)}
                      onBlur={() => setOpen(false)}
                      value={selectedMaterialType}
                      onChange={(e) => setSelectedMaterialType(e.target.value)}
                      className="m-[0rem] h-[1.7rem] w-[8rem] min-w-[8rem] appearance-none overflow-y-auto rounded-[0.4rem] border-[0.063rem] border-[var(--border-color)] bg-[var(--primary-white)] p-[0rem] pr-[1.5rem] pl-[0.4rem] font-['Comfortaa'] text-[0.65rem] text-[var(--primary-color)] focus:outline-[0rem] [&::-webkit-scrollbar]:w-[0.45rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--primary-light-grey)] hover:[&::-webkit-scrollbar-thumb]:bg-[var(--primary-light-grey)] [&::-webkit-scrollbar-track]:bg-transparent"
                    >
                      {materialTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute right-[0.25rem] flex h-[1.1rem] w-[1.1rem] items-center justify-center rounded-[0.2rem] border-none bg-[var(--primary-white)]">
                      <img
                        src={open ? assets.menuup : assets.menudown}
                        className="m-[0rem] h-[1.5rem] w-[1.5rem] p-[0rem]"
                      />
                    </div>
                  </div>

                  {/* SEARCH */}
                  <div className="relative flex items-center">
                    <svg
                      className="pointer-events-none absolute right-3 h-[1.0625rem] p-[0rem] pb-[0.125rem] pl-[0.1875rem] text-[var(--soft-dark-grey)]"
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
                      className="m-[0rem] h-[1.5rem] w-[15rem] flex-1 rounded-[0.4375rem] border-[0.063rem] border-[var(--border-color)] bg-[var(--primary-white)] p-[0rem] pr-9 pl-[1.5rem] text-[0.65rem] text-[var(--primary-color)] placeholder:text-[var(--soft-dark-grey)] outline-none focus:border-[var(--primary-color)] focus:ring-[0.1rem] focus:ring-[var(--primary-hover)]"
                    />
                  </div>
                </div>

                {/* ================= TABLE ================= */}
                <div
                  style={{
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'var(--scrollbar-color-2) transparent',
                  }}
                  className="min-h-0 flex-1 overflow-y-auto [&::-webkit-scrollbar]:w-[0.35rem] [&::-webkit-scrollbar-button]:block [&::-webkit-scrollbar-button]:h-[0.6rem] [&::-webkit-scrollbar-button]:bg-transparent [&::-webkit-scrollbar-button:single-button:vertical:decrement]:bg-[var(--scrollbar-color-2)] [&::-webkit-scrollbar-button:single-button:vertical:increment]:bg-[var(--scrollbar-color-2)] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--scrollbar-color-2)] [&::-webkit-scrollbar-track]:bg-transparent"
                >
                  <table className="w-full border-collapse border-spacing-0 bg-[var(--primary-white)] p-[0rem]">
                    {/* ================= TABLE HEADER ================= */}
                    <thead className="sticky top-[0rem] z-[10] bg-[var(--active-button-color)] p-[0rem]">
                      <tr className="p-[0rem]">
                        <th className="m-[0rem] h-[1.75rem] w-[2.5rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem]"></th>

                        <th className="m-[0rem] h-[1.75rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem] py-[0.3rem] text-left text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-[var(--soft-dark-grey)]">
                          <div className="flex items-center p-[0rem]">
                            Material Name
                            <img
                              src={assets.up_down_arrow}
                              alt="Sort"
                              className="ml-[0.3rem] h-[0.8rem] w-[0.8rem] p-[0rem]"
                            />
                          </div>
                        </th>

                        <th className="m-[0rem] h-[1.75rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem] py-[0.3rem] text-left text-[0.7rem] font-semibold uppercase tracking-[0.06em] text-[var(--soft-dark-grey)]">
                          <div className="flex items-center p-[0rem]">
                            Description
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
                      {filteredMaterials.length > 0 ? (
                        <>
                          {filteredMaterials.map((row) => (
                            <tr
                              key={row.id}
                              draggable
                              onDragStart={(e) => e.dataTransfer.setData('materialId', row.id)}
                              onClick={() => setSelectedMaterialId(row.id)}
                              className={`cursor-pointer transition-all duration-200 ${
                                selectedMaterialId === row.id
                                  ? 'bg-[var(--primary-hover)]'
                                  : 'bg-[var(--primary-white)] hover:bg-[var(--active-button-color)]'
                              } `}
                              style={selectedMaterialId === row.id ? { boxShadow: 'inset 3px 0 0 var(--primary-color)' } : {}}
                            >
                              {/* RADIO */}
                              <td className="m-[0rem] h-[2rem] min-h-[2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem] px-[1rem]">
                                <input
                                  type="radio"
                                  checked={selectedMaterialId === row.id}
                                  onChange={() => setSelectedMaterialId(row.id)}
                                  className="m-[0rem] h-[1.15rem] min-h-[1.15rem] w-[1.15rem] min-w-[1.15rem] cursor-pointer border-[0.1rem] p-[0rem]"
                                />
                              </td>

                              {/* NAME */}
                              <td className="m-[0rem] h-[2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem] pl-[0.5rem] text-left text-[0.68rem] font-medium text-[var(--project-item-text)]">
                                {row.name}
                              </td>

                              {/* DESCRIPTION */}
                              <td className="m-[0rem] h-[2rem] border-b-[0.063rem] border-[rgba(57,37,121,0.08)] p-[0rem] pl-[0.5rem] text-left text-[0.65rem] text-[var(--soft-dark-grey)]">
                                {row.description}
                              </td>
                            </tr>
                          ))}

                          {/* ===== Spacer row to avoid cut-off ===== */}
                          <tr>
                            <td colSpan={3} className="h-[0.75rem]"></td>
                          </tr>
                        </>
                      ) : (
                        <tr>
                          <td
                            colSpan={3}
                            className="h-[1.75rem] text-center text-[0.65rem] text-gray-400"
                          >
                            No materials found
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* ================= BOTTOM ACTION BAR ================= */}
                <div className="shrink-0 border-t-[0.063rem] border-[rgba(57,37,121,0.08)] bg-[var(--primary-white)] px-[0.75rem] py-[0.5rem]">
                  <div
                    onClick={handleAssignMaterialButton}
                    className="flex h-[2rem] w-full cursor-pointer items-center justify-center gap-[0.4rem] rounded-[0.4rem] border-[0.063rem] border-[var(--primary-color)] bg-[var(--primary-white)] text-[0.7rem] font-medium text-[var(--primary-color)] transition-all duration-200 hover:bg-[var(--primary-hover)] hover:shadow-[0_2px_8px_rgba(57,37,121,0.12)]"
                  >
                    <img
                      src={assets.addMaterialIcon}
                      alt="Add Material"
                      className="h-[0.9rem] w-[0.9rem]"
                    />
                    Add to Material
                  </div>
                </div>
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
