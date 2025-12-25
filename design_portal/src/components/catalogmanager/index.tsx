import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import React, { useCallback, useEffect, useState } from 'react';
import { CatalogRule, RulePart } from '../3dmodel/handler/interface';
import Header from '../header/header';
import InputField from '../inputfields/InputField';
import Sidebar from '../sidebar/sidebar';
import styles from './catalogmanager.module.css';
import { Catalog, Material } from './interface';

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

  /** Open the popup to create a new catalog */
  const handleAddCatalog = () => setShowPopup(true);

  /** Fetch catalog list based on the selected catalog type */
  const getCatalog = useCallback(async () => {
    const response: { status: number; data: Catalog[] } = await commonService.get(
      API_ENDPOINT.GET_CATALOG_USING_TYPE(catalogType)
    );

    if (response.status === 200) {
      setCatalogData(response.data);
    }
  }, [catalogType]);

  /** Load all rule parts for the selected rule */
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

  /** Create a new catalog and refresh the catalog list */
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

  /** Fetch all available materials from the server */
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
  }, []);

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

  return (
    <div className="flex h-screen flex-row overflow-hidden">
      <Sidebar />
      <div className="max-w-[85rem] flex-[3]">
        <Header isBorderRadius={true} dashboardName="Catalog Manager" />

        {/* TOP TOOLBAR */}
        <div className="mt-[1rem] flex h-[5rem] flex-row gap-[0.5rem] pt-[1rem] pr-[1rem] pb-[0rem] pl-[2rem]">
          <div className="mb-[1rem] flex w-[78.6rem] items-center gap-[0.8rem] rounded-2xl rounded-[0.5rem] border border-[rgba(57,37,121,0.3)] bg-[linear-gradient(90deg,#fff_0%,#f5e5ff_100%)] px-[1rem] py-[1.5rem]">
            <div className="flex items-center">
              <div className="flex items-center gap-[0.75rem]">
                <span className="ml-[1rem] text-[0.7rem] font-[var(--font-family)] font-medium tracking-[0.02rem] text-[var(--primary-color)]">
                  Catalog Type
                </span>
                <select
                  className="min-w-[10rem] cursor-pointer rounded-[0.3rem] rounded-md border border-[#d1d5db] bg-[#f4f3ff] px-[0.4rem] py-[0.2rem] pl-[0.2rem] text-[0.69rem] font-[var(--font-family)] text-[var(--primary-black)] outline-none"
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
            <div className="h-full w-px self-stretch bg-[#ccc]" />
            <div className="flex items-center">
              <div className="flex items-center gap-[0.75rem]">
                <span className="text-[0.7rem] font-[var(--font-family)] font-medium tracking-[0.02rem] text-[var(--primary-color)]">
                  Part
                </span>
                <select
                  className="min-w-[10rem] cursor-pointer rounded-[0.3rem] rounded-md border border-[#d1d5db] bg-[#f4f3ff] px-[0.4rem] py-[0.2rem] pl-[0.2rem] text-[0.69rem] font-[var(--font-family)] text-[var(--primary-black)] outline-none"
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
                <div className="ml-[0.5rem] flex">
                  <img
                    src={assets.addd}
                    alt="Add"
                    className="ml-[40rem] h-[5rem] w-[5rem] cursor-pointer"
                    onClick={handleAddCatalog}
                  />
                </div>
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
              <div className="mt-[1] flex-[1] space-y-[1] overflow-y-auto pr-[1]">
                {selectedCatalog?.catalog_rules.map((rule: CatalogRule) => (
                  <div
                    key={rule.id}
                    onClick={() => fetchRuleParts(rule.id)}
                    className={`relative mt-[5px] ml-[1rem] flex h-[32px] w-[11rem] cursor-pointer items-center gap-[0.5rem] rounded-[0.5rem] px-[3] py-[2] transition-colors duration-150 ${
                      activeRuleId === rule.id
                        ? 'bg-[#E6DEFF]'
                        : 'hover:bg-[rgba(229, 221, 255, 1)]'
                    } `}
                  >
                    <img
                      src={assets.matariel}
                      alt=""
                      className="h-[1.2rem] w-[1.2rem] bg-[#F3F4F6]"
                    />

                    <span
                      className={`text-[0.7rem] ${
                        activeRuleId === rule.id
                          ? 'font-medium text-[var(--primary-color)]'
                          : 'text-[rgba(229, 221, 255, 1)]'
                      } `}
                    >
                      {rule.name}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ================= DETAILS (BOTTOM) ================= */}
            <div className="border-t border-[rgba(57,37,121,0.15)] pt-[2]">
              <div className="rounded-xl bg-white p-3">
                {/* HEADER */}
                <p className="mb-[1] text-center text-[0.75rem] font-medium text-[var(--primary-color)]">
                  Door ID 45
                </p>

                {/* INPUTS */}
                <div className="mr-[1rem] ml-[1rem] flex flex-col justify-center gap-[1]">
                  {/* NAME */}
                  <div className="relative mb-[0.5rem]">
                    {isEditingName ? (
                      <input
                        type="text"
                        value={selectedCatalog?.name}
                        onChange={(e) => setName(e.target.value)}
                        onBlur={handleBlur(setIsEditingName)}
                        onKeyDown={(e) => handleKeyDown(e, setIsEditingName)}
                        className="h-[15px] w-[11rem] rounded-[0.8rem] border border-[rgba(57,37,121,0.15)] bg-white px-3 pt-[14px] pl-[1rem] text-[0.65rem] text-[rgba(57,37,121,0.9)] outline-none focus:border-[rgba(57,37,121,0.35)]"
                      />
                    ) : (
                      <div
                        onClick={() => setIsEditingName(true)}
                        className="flex h-[15px] w-[11rem] cursor-pointer items-start rounded-[0.8rem] border border-[rgba(57,37,121,0.15)] bg-white px-3 pt-[18px] pl-[1rem] text-[0.65rem] text-[rgba(57,37,121,0.9)]"
                      >
                        {selectedCatalog?.name}
                      </div>
                    )}

                    {/* FLOATING LABEL */}
                    <span className="pointer-events-none absolute top-[2px] left-3 pl-[1rem] text-[0.55rem] text-[rgba(57,37,121,0.55)]">
                      name
                    </span>
                  </div>

                  {/* DESCRIPTION */}
                  <div className="relative mb-[0.5rem]">
                    {isEditingDescription ? (
                      <input
                        type="text"
                        value={selectedCatalog?.description}
                        onChange={(e) => setDescription(e.target.value)}
                        onBlur={handleBlur(setIsEditingDescription)}
                        onKeyDown={(e) => handleKeyDown(e, setIsEditingDescription)}
                        className="h-[15px] w-[11rem] rounded-[0.8rem] border border-[rgba(57,37,121,0.15)] bg-white px-3 pt-[14px] pl-[1rem] text-[0.65rem] text-[rgba(57,37,121,0.9)] outline-none focus:border-[rgba(57,37,121,0.35)]"
                      />
                    ) : (
                      <div
                        onClick={() => setIsEditingDescription(true)}
                        className="flex h-[15px] w-[11rem] cursor-pointer items-start rounded-[0.8rem] border border-[rgba(57,37,121,0.15)] bg-white px-3 pt-[18px] pl-[1rem] text-[0.65rem] text-[rgba(57,37,121,0.9)]"
                      >
                        {selectedCatalog?.description}
                      </div>
                    )}

                    {/* FLOATING LABEL */}
                    <span className="pointer-events-none absolute top-[2px] left-3 pl-[1rem] text-[0.55rem] text-[rgba(57,37,121,0.55)]">
                      Description
                    </span>
                  </div>

                  {/* UP CHARGE */}
                  <div className="relative mb-[0.5rem]">
                    <div className="flex h-[15px] w-[11rem] items-start rounded-[0.8rem] border border-[rgba(57,37,121,0.15)] bg-white px-3 pt-[18px] pl-[1rem] text-[0.65rem] text-[rgba(57,37,121,0.9)]">
                      10%
                    </div>

                    {/* FLOATING LABEL */}
                    <span className="pointer-events-none absolute top-[2px] left-3 pl-[1rem] text-[0.55rem] text-[rgba(57,37,121,0.55)]">
                      up charge
                    </span>
                  </div>

                  {/* BUYOUT */}
                  <div className="relative mb-[0.5rem]">
                    <div className="flex h-[15px] w-[11rem] items-start rounded-[0.8rem] border border-[rgba(57,37,121,0.15)] bg-white px-3 pt-[18px] pl-[1rem] text-[0.65rem] text-[rgba(57,37,121,0.9)]">
                      NO
                    </div>

                    {/* FLOATING LABEL */}
                    <span className="pointer-events-none absolute top-[2px] left-3 pl-[1rem] text-[0.55rem] text-[rgba(57,37,121,0.55)]">
                      buyout
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
                <thead className="sticky top-0 z-10 bg-[rgba(255,255,255,1)]">
                  <tr>
                    <th
                      colSpan={3}
                      className="h-[30px] border-b border-[rgba(57,37,121,0.15)] bg-[rgba(250,250,250,1)] px-[5] py-[3] text-left font-[400] text-[rgba(57,37,121,1)]"
                    >
                      Material Properties
                    </th>
                  </tr>
                  <tr>
                    <th className="h-[28px] border-b border-[rgba(57,37,121,0.15)] px-[5] py-[3] text-left text-xs font-[400] font-semibold text-[rgba(57,37,121,1)]">
                      Part ↑↓
                    </th>
                    <th className="h-[28px] border-b border-[rgba(57,37,121,0.15)] px-[5] py-[3] text-left text-xs font-[400] font-semibold text-[rgba(57,37,121,1)]">
                      Material ↑↓
                    </th>
                    <th className="h-[28px] border-b border-[rgba(57,37,121,0.15)] px-[5] py-[3] text-center text-xs font-[400] font-semibold text-[rgba(57,37,121,1)]">
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
                        <td className="h-[28px] px-[5] py-[2.5] text-[0.72rem] text-[#3F3F46]">
                          {part.name}
                        </td>

                        <td className="h-[28px] px-[5] py-[2.5] text-[0.72rem] text-[#3F3F46]">
                          {part.material?.name || 'NO MATERIAL ASSIGNED'}
                        </td>

                        <td className="h-[28px] px-[5] py-[2.5]">
                          <div className="flex items-center justify-center gap-[3] text-[rgba(57,37,121,1)]">
                            {/* DELETE */}
                            <button
                              className="flex items-center gap-1 rounded-md border-none bg-transparent px-2 py-[0.1rem] text-[0.6rem] text-[var(--delete-text-color)] outline-none hover:bg-[rgba(255,0,0,0.05)]"
                              onClick={() => handleShowDeletePopup()}
                            >
                              <img src={assets.trash} alt="" className="h-[0.8rem] w-[0.8rem]" />
                            </button>

                            {/* EDIT */}
                            <button className="border-none bg-transparent transition outline-none hover:text-[rgba(57,37,121,0.8)]">
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
                    length: Math.max(0, 16 - ruleParts.length),
                  }).map((_, idx) => (
                    <tr
                      key={`empty-${idx}`}
                      className="border-b border-[rgba(57,37,121,0.1)] bg-[rgba(255,255,255,1)]"
                    >
                      <td className="h-[28px] px-5 py-2.5">&nbsp;</td>
                      <td className="h-[28px] px-5 py-2.5">&nbsp;</td>
                      <td className="h-[28px] px-5 py-2.5">&nbsp;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* RIGHT BOX */}
          <div className="h-full max-h-[70vh] w-full max-w-[31.05rem] overflow-hidden rounded-[0.5rem] border border-[rgba(57,37,121,0.2)] bg-[rgba(255,255,255,1)]">
            {/* ================= TOP BAR ================= */}
            <div className="flex h-[40px] items-center gap-[15px] border-b border-[rgba(57,37,121,0.15)] bg-[rgba(250,250,250,1)] px-[16px]">
              {/* DROPDOWN */}
              <select
                value={selectedMaterialType}
                onChange={(e) => setSelectedMaterialType(e.target.value)}
                className="h-[26px] rounded-[0.3rem] rounded-md border border-[rgba(57,37,121,0.25)] bg-white px-[12px] text-[0.65rem] text-[rgba(57,37,121,1)] focus:outline-none"
              >
                {materialTypes.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>

              {/* SEARCH */}
              <input
                type="text"
                placeholder="Search"
                value={materialSearch}
                onChange={(e) => setMaterialSearch(e.target.value)}
                className="h-[26px] flex-1 rounded-[0.3rem] border border-[rgba(57,37,121,0.25)] bg-white px-[12px] text-[0.65rem] focus:outline-none"
              />
            </div>

            {/* ================= TABLE ================= */}
            <div className="/* Webkit (Chrome, Edge, Safari) */ h-full w-full overflow-y-auto [scrollbar-color:rgba(57,37,121,0.4)_transparent] [&::-webkit-scrollbar]:w-[6px] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-[rgba(57,37,121,0.35)] [&::-webkit-scrollbar-thumb:hover]:bg-[rgba(57,37,121,0.6)] [&::-webkit-scrollbar-track]:bg-transparent">
              <table className="w-full border-collapse bg-[rgba(255,255,255,1)]">
                {/* TABLE HEADER */}
                <thead className="sticky top-[0rem] z-10 bg-[rgba(255,255,255,1)]">
                  <tr>
                    <th className="h-[28px] w-[40px] border-b-[0.5px] border-[rgba(57,37,121,0.2)]"></th>
                    <th className="h-[28px] border-b border-[rgba(57,37,121,0.15)] px-[5] py-[3] text-left text-xs font-[400] font-semibold text-[rgba(57,37,121,1)]">
                      Material Name
                    </th>

                    <th className="h-[28px] border-b border-[rgba(57,37,121,0.15)] px-[5] py-[3] text-left text-xs font-[400] font-semibold text-[rgba(57,37,121,1)]">
                      Description
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
                        <td className="h-[28px] border-b-[1px] border-[rgba(57,37,121,0.15)] px-[16px] last:pr-[6]">
                          <input
                            type="radio"
                            checked={selectedMaterialId === row.id}
                            onChange={() => setSelectedMaterialId(row.id)}
                            className="cursor-pointer"
                          />
                        </td>

                        {/* NAME */}
                        <td className="h-[28px] border-b-[0.5px] border-[rgba(57,37,121,0.15)] px-[16px] text-[0.65rem] text-[#3F3F46] last:pr-[6]">
                          {row.name}
                        </td>

                        {/* DESCRIPTION */}
                        <td className="h-[28px] border-b-[0.5px] border-[rgba(57,37,121,0.15)] px-[16px] text-[0.65rem] text-[#3F3F46] last:pr-[6]">
                          {row.description}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="h-[28px] text-center text-[0.65rem] text-gray-400">
                        No materials found
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        {/* ================= BOTTOM ACTION BAR ================= */}
        <div
          onClick={handleAssignMaterialButton}
          className="absolute right-[21.50rem] bottom-[1rem] flex h-[30px] w-[10rem] cursor-pointer items-center gap-[8px] rounded-[0.8rem] border-t border-l border-[rgba(57,37,121,0.15)] bg-[rgba(250,250,250,1)] px-[14px] text-[0.80rem] text-[rgba(57,37,121,1)] hover:bg-[rgba(245,245,245,1)]"
        >
          <img src={assets.addMaterialIcon} alt="Add Material" className="h-4 w-4" />
          Add to Material
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
