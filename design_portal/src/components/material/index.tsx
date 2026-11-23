import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import type React from 'react';
import { useEffect } from 'react';
import AddMaterialPopup from './addItem';
// import { ContextMenus } from './components/ContextMenus';
import { ConfirmDeletePopup, CreateCompanyPopup } from './components/CreateCompanyPopup';
import { MaterialSidebar } from './components/MaterialSidebar';
import { MaterialTable } from './components/MaterialTable';
import { MaterialToolbar } from './components/MaterialToolbar';
import { CATEGORY_TABS } from './constants';
import { useMaterialData } from './hooks/useMaterialData';
import { useMaterialState } from './hooks/useMaterialState';
import styles from './material.module.css';
import { flattenMaterial } from './utils/materialMapper';
const Material: React.FC = () => {
  const {
    companyMaterials,
    materialCategories,
    error,
    fetchCompanies,
    fetchMaterialsByType,
    fetchCompanyMaterials,
    createCompany,
    deleteMaterial,
  } = useMaterialData();

  const {
    expandedCategory,
    selectedType,
    selectedSubItem,
    searchQuery,
    sortColumn,
    addMaterialPopup,
    companyID,
    activeCategory,
    activeTab,

    createCompanyPopup,
    companyName,
    setExpandedCategory,
    setSelectedType,
    setSelectedSubItem,
    setSearchQuery,
    setSortColumn,
    setAddMaterialPopup,
    setCompanyID,
    setActiveCategory,
    setActiveTab,
    setContextMenu,
    setContextMaterialMenu,
    setCreateCompanyPopup,
    setCompanyName,
    editingMaterial,
    setEditingMaterial,
    deletingMaterial,
    setDeletingMaterial,
  } = useMaterialState();

  /** When a category is clicked, open it and load its materials */
  const handleCategoryClick = (categoryId: string, name: string) => {
    setActiveCategory(categoryId);
    setSelectedType(name);
    const tabs = CATEGORY_TABS[categoryId];
    if (tabs && tabs.length > 0) {
      setActiveTab(tabs[0].id);
    }
    fetchMaterialsByType(name);
  };

  /** Open or close a category section when the arrow is clicked */
  const handleToggleCategory = (categoryId: string) => {
    setExpandedCategory(expandedCategory === categoryId ? '' : categoryId);
    setSelectedSubItem(null);
  };

  /** Select a sub-item and load all materials for that company */
  const handleSubItemClick = (itemId: string) => {
    setSelectedSubItem(itemId);
    setCompanyID(itemId);
    fetchCompanyMaterials(itemId);
  };

  /** Show right-click menu for a category */
  const handleContextMenu = (e: React.MouseEvent, categoryId: string, name: string) => {
    e.preventDefault();
    setExpandedCategory(categoryId);
    setSelectedType(name);
    setContextMenu({ x: e.clientX, y: e.clientY, categoryId });
  };

  /** Show right-click menu for a company’s materials */
  const handleMaterialContextMenu = (e: React.MouseEvent, companyId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMaterialMenu({
      x: e.clientX,
      y: e.clientY,
      companyId,
    });
  };

  /** Create a new company and reset popup fields */
  const handleCreateCompany = async () => {
    const success = await createCompany(companyName, selectedType);
    if (success) {
      setCreateCompanyPopup(false);
      setCompanyName('');
      setSelectedType(null);
    }
  };

  /** Open the popup to add a new company */
  const handleAddCompany = () => {
    setCreateCompanyPopup(true);
    setContextMenu(null);
  };

  /** Open the popup to add a new material under a company */
  const handleEditMaterial = (materialId: string) => {
    const materialRow = companyMaterials.find((m) => m.id === materialId);
    if (materialRow && materialRow._original) {
      const flattened = flattenMaterial(materialRow._original as any);
      setEditingMaterial(flattened);
      setAddMaterialPopup(true);
    }
  };

  const handleDeleteMaterial = (materialId: string) => {
    const material = companyMaterials.find((m) => m.id === materialId);
    if (material) {
      setDeletingMaterial(material);
    }
  };

  const confirmDeleteMaterial = async () => {
    if (deletingMaterial) {
      const success = await deleteMaterial(
        deletingMaterial.id,
        selectedSubItem || undefined,
        selectedType || undefined
      );
      if (success) {
        setDeletingMaterial(null);
      }
    }
  };

  /** Open the popup to add a new material */
  const handleAddNewMaterial = () => {
    setEditingMaterial(null);
    setAddMaterialPopup(true);
  };

  // Filter and sort materials
  const getFilteredMaterials = () => {
    let filteredMaterials = companyMaterials;

    if (expandedCategory && !selectedSubItem) {
      const categoryName = materialCategories.find((c) => c.id === expandedCategory)?.name;
      filteredMaterials = filteredMaterials.filter((m) => m.material_type === categoryName);
    }

    const searchedMaterials = filteredMaterials.filter((row) =>
      Object.values(row).some((value) =>
        value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
      )
    );

    return [...searchedMaterials].sort((a, b) => {
      if (!sortColumn) return 0;
      const aValue = a[sortColumn as keyof typeof a] || 0;
      const bValue = b[sortColumn as keyof typeof b] || 0;
      if (aValue === undefined || bValue === undefined) return 0;
      return aValue < bValue ? 1 : -1;
    });
  };

  // Effects
  useEffect(() => {
    fetchCompanies();
    fetchMaterialsByType('Banding');
  }, [fetchCompanies, fetchMaterialsByType]);

  useEffect(() => {
    const handleClickOutside = () => {
      setContextMenu(null);
      setContextMaterialMenu(null);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, []);

  return (
    <div className={styles.page}>
      <Sidebar />

      <div className={styles.pageRight}>
        <Header isBorderRadius={true} dashboardName="Materials" />

        {!addMaterialPopup ? (
          <div className={styles.maincontainer}>
            <MaterialSidebar
              materialCategories={materialCategories}
              expandedCategory={expandedCategory}
              onCategoryClick={handleCategoryClick}
              onToggleCategory={handleToggleCategory}
              onSubItemClick={handleSubItemClick}
              onContextMenu={handleContextMenu}
              onMaterialContextMenu={handleMaterialContextMenu}
              selectedSubItem={selectedSubItem}
              onAddCompany={handleAddCompany}
              setAddMaterialPopup={handleAddNewMaterial}
              setCompanyID={setCompanyID}
              setMaterialType={setSelectedType}
            />

            <div className={styles.materialrightside}>
              <MaterialToolbar
                searchQuery={searchQuery}
                onSearchChange={setSearchQuery}
                selectedType={selectedType}
                selectedName={
                  selectedSubItem
                    ? materialCategories
                        .flatMap((c) => c.subItems || [])
                        .find((s) => s.id === selectedSubItem)?.name || null
                    : null
                }
              />

              <MaterialTable
                materials={getFilteredMaterials()}
                activeCategory={activeCategory}
                activeTab={activeTab}
                onTabChange={setActiveTab}
                onSort={setSortColumn}
                onEdit={handleEditMaterial}
                onDelete={handleDeleteMaterial}
              />
            </div>
          </div>
        ) : (
          <AddMaterialPopup
            setCreateWorkOrderPopup={setAddMaterialPopup}
            companyId={companyID}
            handleGetCompanyMaterials={fetchCompanyMaterials}
            selectedType={expandedCategory}
            initialData={editingMaterial}
          />
        )}
      </div>

      {createCompanyPopup && (
        <CreateCompanyPopup
          companyName={companyName}
          error={error}
          onCompanyNameChange={setCompanyName}
          onCreateCompany={handleCreateCompany}
          onClose={() => setCreateCompanyPopup(false)}
        />
      )}

      {deletingMaterial && (
        <ConfirmDeletePopup
          itemName={deletingMaterial.name}
          onConfirm={confirmDeleteMaterial}
          onClose={() => setDeletingMaterial(null)}
        />
      )}
    </div>
  );
};

export default Material;
