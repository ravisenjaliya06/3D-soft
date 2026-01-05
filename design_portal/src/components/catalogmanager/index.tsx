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
                          {opt.label}
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
                      {catalogData.map((opt) => (
                        <option key={opt.id} value={opt.id}>
                          {opt.name}
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
          <div className="flex h-[40rem] flex-row gap-[0.9rem] px-0 pr-[7rem] pb-[1rem] pl-[7rem]">
            {/* LEFT SIDEBAR */}
            <div className="flex h-full max-h-[66vh] w-[14rem] flex-col justify-between rounded-[0.3rem] border-[0.1rem] border-[var(--border-color)] bg-[white] p-2 p-[0rem]">
              {/* ================= RULE LIST ================= */}
              <div className="flex flex-[1] flex-col">
                <div className="mt-[1] flex-[1] space-y-[1] overflow-y-auto pr-[1]">
                  {selectedCatalog?.catalog_rules.map((rule: CatalogRule) => (
                    <div
                      key={rule.id}
                      onClick={() => fetchRuleParts(rule.id)}
                      className={`relative mt-[0.3125rem] ml-[1rem] flex h-[2rem] w-[11rem] cursor-pointer items-center gap-[0.5rem] rounded-[0.5rem] px-[3] py-[2] transition-colors duration-150 ${
                        activeRuleId === rule.id
                          ? 'bg-[#E6DEFF]'
                          : 'hover:bg-[var(--primary-hover)]'
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
                            : 'text-[var(--primary-hover)]'
                        } `}
                      >
                        {rule.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ================= DETAILS (BOTTOM) ================= */}
              <div className="border-t-[0.1rem] border-[var(--border-color)] p-[0rem] pt-[2]">
                <div className="rounded-[0.35rem] bg-white p-3">
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
                          className="h-[0.9375rem] w-[11rem] rounded-[0.8rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[0.875rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)] outline-[0rem] focus:border-[var(--border-color)]"
                        />
                      ) : (
                        <div
                          onClick={() => setIsEditingName(true)}
                          className="flex h-[0.9375rem] w-[11rem] cursor-pointer items-start rounded-[0.8rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[1.125rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)]"
                        >
                          {selectedCatalog?.name}
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
                          onChange={(e) => setDescription(e.target.value)}
                          onBlur={handleBlur(setIsEditingDescription)}
                          onKeyDown={(e) => handleKeyDown(e, setIsEditingDescription)}
                          className="h-[0.9375rem] w-[11rem] rounded-[0.8rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[0.875rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)] outline-[0rem] focus:border-[var(--primary-color)]"
                        />
                      ) : (
                        <div
                          onClick={() => setIsEditingDescription(true)}
                          className="flex h-[0.9375rem] w-[11rem] cursor-pointer items-start rounded-[0.8rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[1.125rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)]"
                        >
                          {selectedCatalog?.description}
                        </div>
                      )}

                      {/* FLOATING LABEL */}
                      <span className="pointer-events-none absolute top-[0.125rem] left-3 pl-[1rem] text-[0.55rem] text-[var(--primary-color)]">
                        Description
                      </span>
                    </div>

                    {/* UP CHARGE */}
                    <div className="relative mb-[0.5rem]">
                      <div className="flex h-[0.9375rem] w-[11rem] items-start rounded-[0.8rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[1.125rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)]">
                        10%
                      </div>

                      {/* FLOATING LABEL */}
                      <span className="pointer-events-none absolute top-[0.125rem] left-3 pl-[1rem] text-[0.55rem] text-[var(--primary-color)]">
                        up charge
                      </span>
                    </div>

                    {/* BUYOUT */}
                    <div className="relative mb-[0.5rem]">
                      <div className="flex h-[0.9375rem] w-[11rem] items-start rounded-[0.8rem] border-[0.1rem] border-[var(--border-color)] bg-white p-[0rem] px-3 pt-[1.125rem] pl-[1rem] text-[0.65rem] text-[var(--primary-color)]">
                        NO
                      </div>

                      {/* FLOATING LABEL */}
                      <span className="pointer-events-none absolute top-[0.125rem] left-3 pl-[1rem] text-[0.55rem] text-[var(--primary-color)]">
                        buyout
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Table */}
            <div className="h-full max-h-[66vh] w-full max-w-[31.05rem] overflow-hidden rounded-[0.35rem] border-[0.1rem] border-[var(--primary-light-grey)] bg-white p-[0rem]">
              {/* TABLE SCROLL CONTAINER */}
              <div className="overflow-y-auto">
                <table className="w-full border-collapse">
                  {/* TABLE HEADER */}
                  <thead className="sticky top-0 z-10 bg-[#ffffff]">
                    <tr>
                      <th
                        colSpan={3}
                        className="h-[3rem] border-b-[0.1rem] border-[var(--primary-light-grey)] bg-[var(--thbackground-color)] px-[5] text-left font-[700] text-[#392579]"
                      >
                        <div className="ml-[0.87rem] text-[0.85rem]">Material Properties</div>
                      </th>
                    </tr>
                    <tr>
                      <th className="h-[1.75rem] border-b-[0.1rem] border-[var(--primary-light-grey)] px-[5] py-[3] text-left text-[0.85rem] font-[700] text-[#392579]">
                        <div className="ml-[0.87rem]">
                          Part
                          <img
                            src={assets.up_down_arrow}
                            alt="Sort"
                            className="ml-[0.3rem] inline-block h-[0.8rem] w-3"
                          />
                        </div>
                      </th>
                      <th className="h-[1.75rem] border-b-[0.1rem] border-[var(--primary-light-grey)] px-[5] py-[3] text-left text-[0.85rem] font-[700] text-[#392579]">
                        Material{' '}
                        <img
                          src={assets.up_down_arrow}
                          alt="Sort"
                          className="ml-[0.3rem] inline-block h-[0.8rem] w-3"
                        />
                      </th>
                      <th className="h-[1.75rem] border-b-[0.1rem] border-[var(--primary-light-grey)] px-[5] py-[3] text-left text-[0.85rem] font-[700] text-[#392579]">
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
                          className={`cursor-pointer border-b-[0.1rem] border-[var(--primary-light-grey)] bg-[var(--primary-hover)] hover:bg-[var(--primary-hover)] ${
                            selectedPartId === part.id ? 'bg-[var(--primary-hover)]' : ''
                          } `}
                        >
                          <td className="h-[1.75rem] px-[5] py-[2.5] text-[0.72rem] text-[#3F3F46]">
                            {part.name}
                          </td>

                          <td className="h-[1.75rem] px-[5] py-[2.5] text-[0.72rem] text-[#3F3F46]">
                            {part.material?.name || 'NO MATERIAL ASSIGNED'}
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
                            className={`cursor-pointer bg-white hover:bg-[var(--primary-hover)] ${
                              selectedMaterialId === row.id ? 'bg-[var(--primary-white)]' : ''
                            } `}
                          >
                            {/* RADIO */}
                            <td className="h-[1.75rem] border-b-[0.1rem] border-[var(--primary-light-grey)] p-[0rem] px-[1rem]">
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
