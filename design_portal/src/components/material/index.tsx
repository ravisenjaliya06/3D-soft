import createicon from '@/assets/createicon.svg';
import close from '@/assets/design/close.svg';
import banding from '@/assets/material/banding.svg';
import boardstock from '@/assets/material/brandstok.svg';
import caster from '@/assets/material/caster.svg';
import connector from '@/assets/material/connector.svg';
import down_arrow from '@/assets/material/down arrow.svg';
import drawerguide from '@/assets/material/drawerguid.svg';
import filter from '@/assets/material/filter.svg';
import hinge from '@/assets/material/hing.svg';
import misc from '@/assets/material/mis.svg';
import molding from '@/assets/material/molding.svg';
import up_arrow from '@/assets/material/up arrow.svg';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import commonService from '@/services/CommonService';
import { SetStateAction, useCallback, useEffect, useState } from 'react';
import InputField from '../inputfields/InputField';
import AddMaterialPopup from './addItem';
import styles from './material.module.css';

interface MaterialItem {
  id: string;
  name: string;
  icon?: string;
  subItems?: MaterialItem[];
}

interface TableColumn {
  key: string;
  label: string;
  sortable: boolean;
}

interface MaterialResponse {
  status: number;
  data: [];
}

interface TableRow {
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
}

const staticMaterialTypes: MaterialItem[] = [
  { id: 'banding', name: 'Banding', icon: banding.src },
  { id: 'board-stock', name: 'Board Stock', icon: boardstock.src },
  { id: 'caster', name: 'Caster', icon: caster.src },
  { id: 'connector', name: 'Connector', icon: connector.src },
  { id: 'drawer-guide', name: 'Drawer Guide', icon: drawerguide.src },
  { id: 'hinge', name: 'Hinge', icon: hinge.src },
  { id: 'hinge-plate', name: 'Hinge Plate', icon: hinge.src },
  { id: 'laminate', name: 'Laminate', icon: boardstock.src },
  { id: 'leg', name: 'Leg', icon: banding.src },
  { id: 'leg-leveler', name: 'Leg Leveler', icon: banding.src },
  { id: 'miscellaneous', name: 'Miscellaneous', icon: misc.src },
  { id: 'molding', name: 'Molding', icon: molding.src },
  { id: 'panel-stock', name: 'Panel Stock', icon: banding.src },
  { id: 'rod', name: 'Rod', icon: banding.src },
  { id: 'sliding-door-rail', name: 'Sliding Door Rail', icon: banding.src },
  { id: 'wire-basket', name: 'Wire Basket', icon: banding.src },
];

const tableColumns: TableColumn[] = [
  { key: 'name', label: 'Name', sortable: true },
  { key: 'description', label: 'Description', sortable: false },
  { key: 'material_type', label: 'Type', sortable: true },
  { key: 'unit_of_issue', label: 'Unit of issue', sortable: false },
  { key: 'default_cost', label: 'Default Cost', sortable: false },
  { key: 'sell_price', label: 'Sell Price', sortable: false },
  { key: 'default_markup', label: 'Default markup', sortable: false },
  { key: 'sales_tax', label: 'Sales Tax', sortable: false },
  { key: 'default_tax_rate', label: 'Default Tax Rate', sortable: false },
  { key: 'waste', label: 'Waste', sortable: false },
  { key: 'estimate', label: 'Estimate', sortable: false },
  { key: 'model', label: 'Load Model', sortable: false },
];

const Material = () => {
  const [expandedCategory, setExpandedCategory] = useState<string>('banding');
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortColumn, setSortColumn] = useState<string>('');
  const [addMaterialPopup, setAddMaterialPopup] = useState<boolean>(false);
  const [companyMaterials, setCompanyMaterials] = useState<TableRow[]>([]);
  const [materialCategories, setMaterialCategories] = useState<MaterialItem[]>(staticMaterialTypes);
  const [companyID, setCompanyID] = useState<string>('');
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; categoryId: string } | null>(null);
  const [contextMaterialMenu, setContextMaterialMenu] = useState<{ x: number; y: number; companyId: string } | null>(null);
  const [createCompanyPopup, setCreateCompanyPopup] = useState<boolean>(false);
  const [companyName, setCompanyName] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const fetchCompanies = useCallback(async () => {
    try {
      const response: MaterialResponse = await commonService.get('material', 'company');
      if (response.status === 200) {
        const companies: TableRow[] = response.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          material_type: m.material_type || m.type,
          unit_of_issue: m.unit_of_issue,
          default_cost: m.default_cost || m.default_code,
          sell_price: m.sell_price,
          default_markup: m.default_markup,
          sales_tax: m.sales_tax,
          default_tax_rate: m.default_tax_rate,
          waste: m.waste,
          estimate: m.estimate || m.eslimate,
          model: m.model,
          ...m,
        }));

        const updatedCategories = staticMaterialTypes.map((category) => {
          const matchingCompanies = companies.filter((c) => c.material_type === category.name);
          return {
            ...category,
            subItems: matchingCompanies.map((c) => ({ id: c.id, name: c.name })),
          };
        });

        setMaterialCategories(updatedCategories);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to fetch companies.');
    }
  }, []);

  const fetchMaterialsByType = useCallback(async (type: string) => {
    try {
      const response: MaterialResponse = await commonService.getWithQueryParam('material', '', 'type', type);
      if (response.status === 200) {
        const materials: TableRow[] = response.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          material_type: m.properties?.[0]?.material_type || m.type,
          unit_of_issue: m.properties?.[0]?.unit_of_issue,
          default_cost: m.properties?.[0]?.default_cost,
          sell_price: m.properties?.[0]?.sell_price,
          default_markup: m.properties?.[0]?.default_markup,
          sales_tax: m.properties?.[0]?.sales_tax,
          default_tax_rate: m.properties?.[0]?.default_tax_rate,
          waste: m.properties?.[0]?.waste,
          estimate: m.properties?.[0]?.estimate || m.properties?.[0]?.eslimate,
          model: m.properties?.[0]?.model,
          ...m,
        }));
        setCompanyMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching materials by type:', error);
      setError('Failed to fetch materials by type.');
    }
  }, []);

  const fetchCompanyMaterials = useCallback(async (companyId: string) => {
    try {
      const response: MaterialResponse = await commonService.get(`material`, `company/${companyId}/material`);
      if (response.status === 200) {
        const materials: TableRow[] = response.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          material_type: m.properties?.[0]?.material_type || m.type,
          unit_of_issue: m.properties?.[0]?.unit_of_issue,
          default_cost: m.properties?.[0]?.default_cost,
          sell_price: m.properties?.[0]?.sell_price,
          default_markup: m.properties?.[0]?.default_markup,
          sales_tax: m.properties?.[0]?.sales_tax,
          default_tax_rate: m.properties?.[0]?.default_tax_rate,
          waste: m.properties?.[0]?.waste,
          estimate: m.properties?.[0]?.estimate || m.properties?.[0]?.eslimate,
          model: m.properties?.[0]?.model,
          ...m,
        }));
        setCompanyMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching company materials:', error);
      setError('Failed to fetch company materials.');
    }
  }, []);

  const createCompany = useCallback(async () => {
    if (!companyName.trim()) {
      setError('Company name is required');
      return;
    }

    try {
      const payload = {
        name: companyName,
        material_type: selectedType || '',
      };
      const response = await commonService.post('material', 'company', payload);
      if (response.status === 201 || response.status === 200) {
        setCreateCompanyPopup(false);
        setCompanyName('');
        setSelectedType(null);
        setError(null);
        fetchCompanies();
      } else {
        setError('Failed to create company. Try again.');
      }
    } catch (err) {
      console.error('Error creating company:', err);
      setError('Something went wrong.');
    }
  }, [companyName, selectedType, fetchCompanies]);

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

  const handleContextMenu = (e: React.MouseEvent, categoryId: string, name: string) => {
    e.preventDefault();
    setExpandedCategory(categoryId);
    setSelectedType(name);
    setContextMenu({ x: e.clientX, y: e.clientY, categoryId });
  };

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? '' : categoryId));
    setSelectedSubItem(null);
  };

  const getCellValue = (row: TableRow, columnKey: string): string => {
    const value = row[columnKey as keyof TableRow];
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  let filteredMaterials = companyMaterials;
  if (expandedCategory && !selectedSubItem) {
    const categoryName = materialCategories.find((c) => c.id === expandedCategory)?.name;
    filteredMaterials = filteredMaterials.filter((m) => m.material_type === categoryName);
  }

  const searchedMaterials = filteredMaterials.filter((row) =>
    Object.values(row).some((value) =>
      value?.toString().toLowerCase().includes(searchQuery.toLowerCase()),
    ),
  );

  const sortedMaterials = [...searchedMaterials].sort((a, b) => {
    if (!sortColumn) return 0;
    const aValue = a[sortColumn as keyof TableRow];
    const bValue = b[sortColumn as keyof TableRow];
    if (aValue === undefined || bValue === undefined) return 0;
    return aValue < bValue ? 1 : -1;
  });

  const renderMenuItem = (item: MaterialItem, parentType?: string) => {
    const isExpanded = expandedCategory === item.id;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isSubItem = !!parentType;

    return (
      <div
        key={item.id}
        className={styles.categoryContainer}
        onContextMenu={(e) => {
          if (!parentType) {
            handleContextMenu(e, item.id, item.name);
          }
        }}
      >
        <div
          className={`${styles.categoryItem} ${isExpanded ? styles.expanded : ''}`}
          onClick={() => {
            if (!isSubItem) {
              toggleCategory(item.id);
              fetchMaterialsByType(item.name);
            } else {
              setSelectedSubItem(item.id);
              fetchCompanyMaterials(item.id);
            }
          }}
        >
          <div className={styles.categoryContent}>
            {!isSubItem && item.icon && (
              <span className={styles.categoryIcon}>
                <img src={item.icon} alt="" />
              </span>
            )}
            <span className={styles.categoryName}>{item.name}</span>
          </div>
          {!isSubItem && hasSubItems && (
            <span className={styles.dropdownArrow}>
              <img src={isExpanded ? up_arrow.src : down_arrow.src} alt="" />
            </span>
          )}
        </div>

        {hasSubItems && isExpanded && !isSubItem && (
          <div className={styles.subItemsContainer}>
            {item.subItems!.map((subItem) => (
              <div
                key={subItem.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setContextMaterialMenu({
                    x: e.clientX,
                    y: e.clientY,
                    companyId: subItem.id,
                  });
                }}
              >
                {renderMenuItem(subItem, item.name)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Material Manager" />

        <div className={styles.maincontainer}>
          {/* Left Sidebar */}
          <div className={styles.materialleftside}>
            <div className={styles.menuContainer}>
              {materialCategories.map((category) => renderMenuItem(category))}
            </div>
          </div>

          {/* Right Content */}
          <div className={styles.materialrightside}>
            {/* Toolbar */}
            <div className={styles.topToolbar}>
              <div className={styles.toolbarLeft}>
                {/* Dropdown can be added here if needed */}
              </div>

              <div className={styles.toolbarRight}>
                <button className={styles.filterButton}>
                  <img src={filter.src} alt="" />
                </button>
                <div className={styles.searchContainer}>
                  <input
                    type="text"
                    placeholder="Search..."
                    className={styles.searchInput}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                  <svg
                    className={styles.searchIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <path d="m21 21-4.35-4.35" />
                  </svg>
                </div>
                <button
                  className={styles.addNewButton}
                  onClick={() => setAddMaterialPopup(true)}
                >
                  <span className={styles.plusIcon}>+</span>
                  Add New
                </button>
              </div>
            </div>

            {/* Table */}
            <div className={styles.tableContainer}>
              <table className={styles.dataTable}>
                <thead>
                  <tr>
                    {tableColumns.map((column) => (
                      <th
                        key={column.key}
                        className={`${styles.tableHeader} ${column.sortable ? styles.sortable : ''}`}
                        onClick={() => column.sortable && setSortColumn(column.key)}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedMaterials.map((row) => (
                    <tr key={row.id} className={styles.tableRow}>
                      {tableColumns.map((column) => (
                        <td key={column.key} className={styles.tableCell}>
                          {getCellValue(row, column.key)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{ top: contextMenu.y, left: contextMenu.x, position: 'absolute' }}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setCreateCompanyPopup(true);
              setContextMenu(null);
            }}
          >
            ➕ Add Company
          </button>
        </div>
      )}

      {contextMaterialMenu && (
        <div
          className={styles.contextMenu}
          style={{ top: contextMaterialMenu.y, left: contextMaterialMenu.x, position: 'absolute' }}
        >
          <button
            className={styles.contextMenuItem}
            onClick={() => {
              setAddMaterialPopup(true);
              setContextMaterialMenu(null);
              setCompanyID(contextMaterialMenu.companyId);
            }}
          >
            ➕ Add Material
          </button>
        </div>
      )}

      {createCompanyPopup && (
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <img src={createicon.src} className={styles.createicon} alt="createicon" />
            <img
              src={close.src}
              className={styles.createclose}
              alt="close"
              onClick={() => setCreateCompanyPopup(false)}
            />
            <div className={styles.create_right_side}>
              <h2>Create Company</h2>
              <p>Please fill all the details to create company.</p>
              <form className={styles.form} onSubmit={(e) => { e.preventDefault(); createCompany(); }}>
                <div className={styles.createinputGroup}>
                  <InputField
                    mediumField={true}
                    className={styles.inputField}
                    borderColor="var(--primary-color-grey-2)"
                    value={companyName}
                    onChange={(e: { target: { value: SetStateAction<string> } }) => setCompanyName(e.target.value)}
                    placeholder="Enter Company Name"
                    label={companyName ? 'Company Name' : ''}
                    error={error || ''}
                  />
                </div>
              </form>
            </div>
            <div className={styles.createButtonGrop}>
              <button className={styles.cancelcreateButton} onClick={() => setCreateCompanyPopup(false)}>
                Cancel
              </button>
              <button className={styles.createcontinueButton} onClick={createCompany}>
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {addMaterialPopup && (
        <AddMaterialPopup
          setCreateWorkOrderPopup={setAddMaterialPopup}
          companyState={companyID}
          handleGetCompanyMaterials={fetchCompanyMaterials}
        />
      )}
    </div>
  );
};

export default Material;