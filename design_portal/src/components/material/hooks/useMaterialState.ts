import { useState } from 'react';
import type { ContextMenu, MaterialContextMenu, MaterialState } from '../types';

/** Initial state for the material state which we show in matirial page-relod  */
const initialState: Omit<MaterialState, 'companyMaterials' | 'materialCategories' | 'error'> = {
  expandedCategory: 'banding',
  selectedType: null,
  selectedSubItem: null,
  searchQuery: '',
  sortColumn: '',
  addMaterialPopup: false,
  companyID: '',
  activeCategory: 'banding',
  activeTab: 'material',
  contextMenu: null,
  contextMaterialMenu: null,
  createCompanyPopup: false,
  companyName: '',
};


// * Update manage material state
export const useMaterialState = () => {
  const [state, setState] = useState(initialState);

  const updateState = (updates: Partial<typeof state>) => {
    setState((prev) => ({ ...prev, ...updates }));
  };

  const setExpandedCategory = (category: string) => {
    updateState({ expandedCategory: category });
  };

  const setSelectedType = (type: string | null) => {
    updateState({ selectedType: type });
  };

  const setSelectedSubItem = (item: string | null) => {
    updateState({ selectedSubItem: item });
  };

  const setSearchQuery = (query: string) => {
    updateState({ searchQuery: query });
  };

  const setSortColumn = (column: string) => {
    updateState({ sortColumn: column });
  };

  const setAddMaterialPopup = (show: boolean) => {
    updateState({ addMaterialPopup: show });
  };

  const setCompanyID = (id: string) => {
    updateState({ companyID: id });
  };

  const setActiveCategory = (category: string | null) => {
    updateState({ activeCategory: category });
  };

  const setActiveTab = (tab: string | null) => {
    updateState({ activeTab: tab });
  };

  const setContextMenu = (menu: ContextMenu | null) => {
    updateState({ contextMenu: menu });
  };

  const setContextMaterialMenu = (menu: MaterialContextMenu | null) => {
    updateState({ contextMaterialMenu: menu });
  };

  const setCreateCompanyPopup = (show: boolean) => {
    updateState({ createCompanyPopup: show });
  };

  const setCompanyName = (name: string) => {
    updateState({ companyName: name });
  };

  return {
    ...state,
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
  };
};
