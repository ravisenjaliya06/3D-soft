export interface MaterialItem {
  id: string;
  name: string;
  icon?: string;
  subItems?: MaterialItem[];
}

export interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
}

export interface MaterialResponse {
  status: number;
  data: [];
}

export interface TableRow {
  id: string;
  name: string;
  description?: string;
  material_type?: string;
  unit_of_issue?: string;
  default_cost?: number;
  default_markup?: number;
  sell_price?: number;
  sales_tax?: boolean;
  default_tax_rate?: number;
  waste?: number;
  estimate?: boolean;
  model?: boolean;
  [key: string]: any;
}

export interface ContextMenu {
  x: number;
  y: number;
  categoryId: string;
}

export interface MaterialContextMenu {
  x: number;
  y: number;
  companyId: string;
}

export interface MaterialState {
  expandedCategory: string;
  selectedType: string | null;
  selectedSubItem: string | null;
  searchQuery: string;
  sortColumn: string;
  addMaterialPopup: boolean;
  companyMaterials: TableRow[];
  materialCategories: MaterialItem[];
  companyID: string;
  activeCategory: string | null;
  activeTab: string | null;
  contextMenu: ContextMenu | null;
  contextMaterialMenu: MaterialContextMenu | null;
  createCompanyPopup: boolean;
  companyName: string;
  error: string | null;
}
