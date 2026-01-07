import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useCallback, useEffect, useState } from 'react';
import { MeshObjectData } from '../3dmodel/sceneCreator/interface';
import { convertKeysToCamel, formatEnumLabel } from '../3dmodel/sceneCreator/utils';
import Header from '../header/header';
import InputField from '../inputfields/InputField';
import Sidebar from '../sidebar/sidebar';
import styles from './catalogmanager.module.css';
import { Material } from './interface';

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
  const [ruleParts, setRuleParts] = useState<Material[]>([]);
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

  return (
    <div className="flex h-screen flex-row overflow-hidden">
      <Sidebar />
      <div className="max-w-[85rem] flex-[3]">
        <Header isBorderRadius={true} />

        <div className="justify-between">
          {/* TOP TOOLBAR */}
          <div className="mx-auto w-[88rem]">
            <div className="mt-[3rem] flex h-[5rem] flex-row gap-[0.5rem] pt-[1rem] pr-[1rem] pb-[0rem] pl-[7rem]">
              <div className="mb-[1rem] flex items-center gap-[0.8rem] rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] bg-[linear-gradient(90deg,#fff_0%,#f5e5ff_100%)] p-[0rem] px-[1rem] py-[1.5rem]">
                <div className="flex items-center">
                  <div className="flex items-center gap-[0.75rem] pr-[1.4rem]">
                    <span className="text-[0.7rem] font-[var(--font-family)] font-medium tracking-[0.02rem] text-[#392579]">
                      Catalog Type
                    </span>
                    <select
                      className="rounded-md-[0.1rem] w-[8rem] cursor-pointer rounded-[0.3rem] border-[0.1rem] border-[#d1d5db] bg-[#ffff] p-[0rem] px-[0.4rem] py-[0.2rem] pl-[0.2rem] font-['Comfortaa'] text-[0.69rem] text-[#392579] outline-none"
                      value={catalogType}
                      onChange={(e) => setCatalogType(e.target.value)}
                    >
                      {catalogTypes.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {formatEnumLabel(opt.label)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="h-[3rem] w-[0.01rem] bg-[#D7D3E4]" />
                  <div className="flex items-center gap-[0.75rem] pl-[1.4rem]">
                    <span className="text-[0.7rem] font-[var(--font-family)] font-medium tracking-[0.02rem] text-[#392579]">
                      Part
                    </span>
                    <select
                      className="rounded-md-[0.1rem] w-[8rem] cursor-pointer rounded-[0.3rem] border-[0.1rem] border-[#d1d5db] bg-[#ffff] p-[0rem] px-[0.4rem] py-[0.2rem] pl-[0.2rem] font-['Comfortaa'] text-[0.69rem] text-[#392579] outline-none"
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
                    <div className="ml-[1.7rem] h-[3rem] w-[0.01rem] bg-[#D7D3E4]" />
                  </div>
                </div>
                <div className="flex">
                  <img
                    src={assets.addd}
                    alt="Add"
                    className="ml-[34rem] h-[4.5rem] w-[4.5rem] cursor-pointer"
                    onClick={handleAddCatalog}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* MAIN CONTENT */}
          <div className="flex h-[41rem] flex-row gap-[2rem] px-0 pr-[1rem] pb-[1rem] pl-[2rem]">
            {/* LEFT SIDEBAR */}
            <div className="flex h-full max-h-[70vh] w-[14rem] flex-col justify-between rounded-[0.5rem] border border-[rgba(57,37,121,0.3)] bg-[white] p-2">
              {/* ================= RULE LIST ================= */}
              <div className="flex flex-[1] flex-col">
                <div className="m-[0.5rem] flex flex-col gap-[0.3rem] space-y-[1] overflow-y-auto pr-[1]">
                  {ruleMaterialTypes.map((type) => (
                    <div
                      key={type}
                      onClick={() => setActiveRuleType(type)}
                      className={`flex cursor-pointer items-center gap-[0.5rem] rounded-[0.2rem] p-[0.5rem] text-left text-[0.7rem] font-medium transition ${
                        activeRuleType === type
                          ? 'bg-[var(--primary-hover)] text-[var(--primary-color)]'
                          : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      <img src={assets.banding} alt="" className="h-[0.8rem] w-[0.8rem]" />
                      {type}
                    </div>
                  ))}
                </div>
              </div>

              {/* ================= DETAILS (BOTTOM) ================= */}
              <div className="border-t-[0.1rem] border-[var(--border-color)] p-[0rem] pt-[2]">
                <div className="rounded-[0.35rem] bg-white p-3">
                  {/* HEADER */}
                  <p className="mb-[1] text-center text-[0.75rem] font-medium text-[var(--primary-color)]">
                    Part Details
                  </p>

                  {/* INPUTS */}
                  <div className="mr-[1rem] ml-[1rem] flex flex-col justify-center gap-[1]">
                    {/* NAME */}
                    <div className="relative mb-[0.5rem]">
                      {isEditingName ? (
                        <input
                          type="text"
                          value={selectedCatalog?.name}
                          // onChange={(e) => setName(e.target.value)}
                          onBlur={handleBlur(setIsEditingName)}
                          onKeyDown={(e) => handleKeyDown(e, setIsEditingName)}
                          className="h-[0.9375rem] w-[11rem] rounded-[0.5rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[0.875rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)] outline-[0rem] focus:border-[var(--border-color)]"
                        />
                      ) : (
                        <div
                          onClick={() => setIsEditingName(true)}
                          className="flex h-[0.9375rem] w-[11rem] cursor-pointer items-start rounded-[0.5rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[1.125rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)]"
                        >
                          {formatEnumLabel(selectedCatalog?.name ? selectedCatalog.name : '')}
                        </div>
                      )}

                      {/* FLOATING LABEL */}
                      <span className="pointer-events-none absolute top-[0.125rem] left-3 pl-[1rem] text-[0.55rem] text-[var(--border-color)]">
                        name
                      </span>
                    </div>

                    {/* DESCRIPTION */}
                    <div className="relative mb-[0.5rem]">
                      {isEditingDescription ? (
                        <input
                          type="text"
                          value={selectedCatalog?.description}
                          // onChange={(e) => setDescription(e.target.value)}
                          onBlur={handleBlur(setIsEditingDescription)}
                          onKeyDown={(e) => handleKeyDown(e, setIsEditingDescription)}
                          className="h-[0.9375rem] w-[11rem] rounded-[0.5rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[0.875rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)] outline-[0rem] focus:border-[var(--primary-color)]"
                        />
                      ) : (
                        <div
                          onClick={() => setIsEditingDescription(true)}
                          className="flex h-[0.9375rem] w-[11rem] cursor-pointer items-start rounded-[0.5rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[1.125rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)]"
                        >
                          {selectedCatalog?.description}
                        </div>
                      )}

                      {/* FLOATING LABEL */}
                      <span className="pointer-events-none absolute top-[2px] left-3 pl-[1rem] text-[0.55rem] text-[rgba(57,37,121,0.55)]">
                        Description
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Table */}
            <div className="h-full max-h-[70vh] w-full max-w-[31.05rem] overflow-hidden rounded-[0.5rem] rounded-xl border border-[rgba(57,37,121,0.2)] bg-white">
              {/* TABLE SCROLL CONTAINER */}
              <div className="overflow-y-auto">
                <table className="w-full border-collapse">
                  {/* TABLE HEADER */}
                  <thead className="sticky top-0 z-10 bg-[#ffffff]">
                    <tr>
                      <th
                        colSpan={3}
                        className="h-[3rem] border-b border-[rgba(57,37,121,0.15)] bg-[rgba(250,250,250,1)] px-[5] text-left font-[700] text-[#392579]"
                      >
                        <div className="ml-[0.87rem] text-[0.85rem]">Material Properties</div>
                      </th>
                    </tr>
                    <tr>
                      <th className="h-[28px] border-b border-[rgba(57,37,121,0.15)] px-[5] py-[3] text-left text-[0.85rem] font-[700] text-[#392579]">
                        <div className="ml-[0.87rem]">Part</div>
                      </th>
                      <th className="h-[28px] border-b border-[rgba(57,37,121,0.15)] px-[5] py-[3] text-left text-[0.85rem] font-[700] text-[#392579]">
                        Material
                      </th>
                      <th className="h-[28px] border-b border-[rgba(57,37,121,0.15)] px-[5] py-[3] text-left text-[0.85rem] font-[700] text-[#392579]">
                        Action
                      </th>
                    </tr>
                  </thead>

                  {/* TABLE BODY */}
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
                          className={`cursor-pointer border-b border-[rgba(57,37,121,0.1)] bg-[rgba(255,255,255,1)] hover:bg-[rgba(250,250,250,1)] ${
                            selectedPartId === part.id ? 'bg-[rgba(245,242,255,1)]' : ''
                          } `}
                        >
                          <td className="ml-[0.87rem] h-[28px] px-[5] py-[2.5] text-[0.72rem] text-[#3F3F46]">
                            {formatEnumLabel(part.name)}
                          </td>

                          <td className="h-[1.75rem] px-[5] py-[2.5] text-[0.72rem] text-[#3F3F46]">
                            {formatEnumLabel(part.material?.name) || 'No Material Assigned'}
                          </td>

                          <td className="h-[1.75rem] px-[5] py-[2.5]">
                            <div className="flex items-center justify-center gap-[3] text-[var(--primary-color)]">
                              {/* DELETE */}
                              <button
                                className="flex items-center gap-1 rounded-md border-[0rem] bg-transparent p-[0rem] px-2 py-[0.1rem] text-[0.6rem] text-[var(--delete-text-color)] outline-[0rem] hover:bg-[var(--delete-border-color)] hover:text-[var(--delete-text-color)]"
                                onClick={() => handleShowDeletePopup()}
                              >
                                <img src={assets.trash} alt="" className="h-[0.8rem] w-[0.8rem]" />
                              </button>

                              {/* EDIT */}
                              <button className="border-[0rem] bg-transparent p-[0rem] transition outline-none hover:text-[var(--primary-color)]">
                                <img
                                  src={assets.edit}
                                  alt=""
                                  className="mt-[0.2rem] h-[0.9rem] w-[0.9rem]"
                                />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}

                    {/* EMPTY ROWS (KEEP HEIGHT LIKE IMAGE) */}
                    {Array.from({
                      length: Math.max(0, 18 - ruleParts.length),
                    }).map((_, idx) => (
                      <tr
                        key={`empty-${idx}`}
                        className="border-b-[0.1rem] border-[var(--primary-light-grey)] bg-[var(--primary-white)] p-[0rem]"
                      >
                        <td className="h-[1.75rem] px-5 py-2.5">&nbsp;</td>
                        <td className="h-[1.75rem] px-5 py-2.5">&nbsp;</td>
                        <td className="h-[1.75rem] px-5 py-2.5">&nbsp;</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* RIGHT BOX */}
            <div className="relative mb-[2rem] flex h-full flex-col gap-[1rem] rounded-[0.35rem] border-[0rem] bg-white p-[0rem]">
              <div className="h-full max-h-[66vh] w-full max-w-[31.05rem] overflow-hidden rounded-[0.35rem] border-[0.1rem] border-[var(--border-color)] bg-[var(--primary-white)] p-[0rem]">
                {/* ================= TOP BAR ================= */}
                <div className="flex h-[3rem] items-center gap-[0.9375rem] border-b-[0.1rem] border-[var(--border-color)] bg-[var(--thbackground-color)] p-[0rem] px-[1rem]">
                  {/* DROPDOWN */}
                  <select
                    value={selectedMaterialType}
                    onChange={(e) => setSelectedMaterialType(e.target.value)}
                    className="h-[1.7rem] rounded-[0.3rem] rounded-md border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] font-['Comfortaa'] text-[0.65rem] text-[var(--primary-color)] focus:outline-[0rem]"
                  >
                    {materialTypes.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>

                  {/* SEARCH */}
                  <div className="relative flex items-center">
                    <svg
                      className="pointer-events-none absolute right-3 h-[1.0625rem] pb-[0.125rem] pl-[0.1875rem] text-[#392579]/50"
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
                      className="h-[1.5rem] w-[15rem] flex-1 rounded-[0.4375rem] border-[0.1rem] border-[#C4BED7]/50 bg-white p-[0rem] pr-9 pl-[1.5rem] text-[0.65rem] text-[#A0AEC0] outline-none focus:border-purple-400 focus:ring-[0.1rem] focus:ring-purple-300"
                    />
                  </div>
                </div>

                {/* ================= TABLE ================= */}
                <div className="/* Firefox */ /* Webkit (Chrome, Edge, Safari) */ h-full w-full overflow-y-auto [scrollbar-color:var(--scrollbar-color)_transparent] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[0.175rem] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[var(--common-text-color)] [&::-webkit-scrollbar-thumb:hover]:bg-[var(--common-text-color)] [&::-webkit-scrollbar-track]:bg-transparent">
                  <table className="w-full border-collapse bg-[var(--primary-white)] p-[0rem]">
                    {/* TABLE HEADER */}
                    <thead className="sticky top-[0rem] z-10 bg-[var(--primary-white))]">
                      <tr>
                        <th className="h-[1.75rem] w-[2.5rem] border-b-[0.1rem] border-[var(--primary-light-grey)] p-[0rem]"></th>
                        <th className="h-[1.75rem] border-b-[0.1rem] border-[var(--primary-light-grey)] p-[0rem] py-[3] text-left text-[0.87rem] font-[700] font-semibold text-[var(--primary-color)]">
                          <div>
                            Material Name
                            <img
                              src={assets.up_down_arrow}
                              alt="Sort"
                              className="ml-[0.3rem] inline-block h-[0.8rem] w-3"
                            />
                          </div>
                        </th>

                        <th className="h-[1.75rem] border-b-[0.1rem] border-[var(--primary-light-grey)] p-[0rem] py-[3] text-left text-[0.87rem] font-[700] font-semibold text-[var(--primary-color)]">
                          <div>
                            Description
                            <img
                              src={assets.up_down_arrow}
                              alt="Sort"
                              className="ml-[0.3rem] inline-block h-[0.8rem] w-3"
                            />
                          </div>
                        </th>
                      </tr>
                    </thead>

                    {/* TABLE BODY */}
                    <tbody>
                      {filteredMaterials.length > 0 ? (
                        filteredMaterials.map((row) => (
                          <tr
                            key={row.id}
                            draggable
                            onDragStart={(e) => e.dataTransfer.setData('materialId', row.id)}
                            onClick={() => setSelectedMaterialId(row.id)}
                            className={`cursor-pointer bg-white hover:bg-[rgba(250,250,250,1)] ${
                              selectedMaterialId === row.id ? 'bg-[rgba(245,242,255,1)]' : ''
                            } `}
                          >
                            {/* RADIO */}
                            <td className="h-[28px] border-b-[1px] border-[rgba(57,37,121,0.15)] px-[16px]">
                              <input
                                type="radio"
                                checked={selectedMaterialId === row.id}
                                onChange={() => setSelectedMaterialId(row.id)}
                                className="cursor-pointer"
                              />
                            </td>

                            {/* NAME */}
                            <td className="h-[1.75rem] border-b-[0.1rem] border-[var(--primary-light-grey)] p-[0rem] text-left text-[0.65rem] text-[#3F3F46]">
                              {row.name}
                            </td>

                            {/* DESCRIPTION */}
                            <td className="h-[1.75rem] border-b-[0.1rem] border-[var(--primary-light-grey)] p-[0rem] text-left text-[0.65rem] text-[#3F3F46]">
                              {row.description}
                            </td>
                          </tr>
                        ))
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
              </div>
              {/* ================= BOTTOM ACTION BAR ================= */}
              <div className="sticky bottom-0 z-20 border-[0rem] border-[var(--border-color)] bg-white p-3 p-[0rem]">
                <div
                  onClick={handleAssignMaterialButton}
                  className="flex h-[1.875rem] w-[8.9375rem] cursor-pointer items-center gap-[0.5rem] rounded-[0.1rem] border-[0.1rem] border-[var(--border-color)] bg-[var(--primary-white)] bg-white p-[0rem] px-[0.875rem] text-[0.8rem] text-[var(--primary-color)]"
                >
                  <img src={assets.addMaterialIcon} alt="Add Material" className="h-4 w-4" />
                  Add to Material
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
