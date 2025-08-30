import { useState, useEffect } from "react"
import styles from "./material.module.css"
import Sidebar from "@/components/sidebar/sidebar"
import Header from "@/components/header/header"
import banding from "@/assets/material/banding.svg"
import filter from "@/assets/material/filter.svg"
import brandstok from "@/assets/material/brandstok.svg"
import connator from "@/assets/material/connector.svg"
import hinge from "@/assets/material/hing.svg"
import molding from "@/assets/material/molding.svg"
import drawerguide from "@/assets/material/drawerguid.svg"
import mis from "@/assets/material/mis.svg"
import caster from "@/assets/material/caster.svg"
import AddMaterialPopup from "./addItem"
import commonService from "@/services/CommonService"

interface MaterialItem {
  id: string
  name: string
  icon?: string
  subItems?: MaterialItem[]
}

interface TableColumn {
  key: string
  label: string
  sortable: boolean
}

type MaterialResponse = {
  status: number;
  data: [];
};

interface TableRow {
  id: string
  name: string
  description?: string
  material_type?: string
  unit_of_issue?: string
  default_cost?: number
  default_markup?: number
  sell_price?: number
  sales_tax?: boolean
  default_tax_rate?: number
  waste?: number
  eslimate?: boolean
  model?: boolean
}

const Material = () => {
  const [expandedCategory, setExpandedCategory] = useState<string>("banding")
  const [selectedSubItem, setSelectedSubItem] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState<string>("")
  const [sortColumn, setSortColumn] = useState<string>("")
  const [activePopup, setActivePopup] = useState<boolean>(false)
  const [selectedRowDetails, setSelectedRowDetails] = useState<TableRow | null>(null)
  const [addMaterialPopup, setAddMaterialPopup] = useState<boolean>(false)
  const [companyMaterials, setCompanyMaterials] = useState<TableRow[]>([])
  const [materialCategories, setMaterialCategories] = useState<MaterialItem[]>([])

  const staticMaterialThings: MaterialItem[] = [
    { id: "banding", name: "Banding", icon: banding.src },
    { id: "board-stock", name: "Board Stock", icon: brandstok.src },
    { id: "caster", name: "Caster", icon: caster.src },
    { id: "connector", name: "Connector", icon: connator.src },
    { id: "drawer-guide", name: "Drawer Guide", icon: drawerguide.src },
    { id: "hinge", name: "Hinge", icon: hinge.src },
    { id: "hinge-plate", name: "Hinge Plate", icon: hinge.src },
    { id: "laminate", name: "Laminate", icon: brandstok.src },
    { id: "leg", name: "Leg", icon: banding.src },
    { id: "leg-leveler", name: "Leg Leveler", icon: banding.src },
    { id: "miscellaneous", name: "Miscellaneous", icon: mis.src },
    { id: "molding", name: "Molding", icon: molding.src },
    { id: "panel-stock", name: "Panel Stock", icon: banding.src },
    { id: "rod", name: "Rod", icon: banding.src },
    { id: "sliding-door-rail", name: "Sliding Door Rail", icon: banding.src },
    { id: "wire-basket", name: "Wire Basket", icon: banding.src },
  ]

  const tableColumns: TableColumn[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "description", label: "Description", sortable: false },
    { key: "material_type", label: "Type", sortable: true },
    { key: "unit_of_issue", label: "Unit of issue", sortable: false },
    { key: "defaultCode", label: "Default code", sortable: false },
    { key: "sell_price", label: "Sell Price", sortable: false },
    { key: "default_markup", label: "Default markup", sortable: false },
    { key: "sales_tax", label: "Sales Tax", sortable: false },
    { key: "default_tax_rate", label: "Default Tax Rate", sortable: false },
    { key: "waste", label: "Waste", sortable: false },
    { key: "eslimate", label: "Estimate", sortable: false },
    { key: "model", label: "Load Model", sortable: false },
  ]

  useEffect(() => {
    handleGetData()
  }, [])

  const handleGetData = async () => {
    try {
      const response: MaterialResponse = await commonService.get("material", "company")
      if (response.status === 200) {
        console.log("API Response:", response.data)

        const materials: TableRow[] = response.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          material_type: m.material_type || m.type,
          unit_of_issue: m.unit_of_issue,
          defaultVender: m.default_vender,
          defaultCode: m.default_code,
          sell_price: m.sell_price,
          default_markup: m.default_markup,
          sales_tax: m.sales_tax,
          default_tax_rate: m.default_tax_rate,
          waste: m.waste,
          eslimate: m.eslimate,
          model: m.model,
          ...m
        }))

        setCompanyMaterials(materials)

        const updatedCategories = staticMaterialThings.map((category) => {
          const matchingItems = materials.filter(
            (m) => m.material_type === category.name
          )
          return {
            ...category,
            subItems: matchingItems.map((m) => ({
              id: m.id,
              name: m.name,
            })),
          }
        })

        setMaterialCategories(updatedCategories)
      }
    } catch (error) {
      console.error("Error fetching materials:", error)
    }
  }

  const handleGetCompanyMaterials = async (companyId: string) => {
    try {
      const response: MaterialResponse = await commonService.get(
        `material`,
        `company/${companyId}/material`
      )
      if (response.status === 200) {
        console.log(response.data, "company materials")
        const companyData: TableRow[] = response.data.map((m: any) => ({
          id: m.id,
          name: m.name,
          description: m.description,
          material_type: m.properties[0].material_type || m.type,
          unit_of_issue: m.properties[0].unit_of_issue,
          defaultCode: m.properties[0].default_cost,
          sell_price: m.properties[0].sell_price,
          default_markup: m.properties[0].default_markup,
          sales_tax: m.properties[0].sales_tax,
          default_tax_rate: m.properties[0].default_tax_rate,
          waste: m.properties[0].waste,
          eslimate: m.properties[0].eslimate,
          model: m.properties[0].model,
          ...m
        }))
        setCompanyMaterials(companyData)
      }
    } catch (error) {
      console.error("Error fetching company materials:", error)
    }
  }

  // Helper function to get cell value based on column key
  const getCellValue = (row: TableRow, columnKey: string): string => {
    const value = row[columnKey as keyof TableRow];

    if (value === undefined || value === null) {
      return "N/A";
    }

    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }

    return value.toString();
  };

  let filtered = companyMaterials;
  if (expandedCategory && !selectedSubItem) {
    const categoryName = materialCategories.find(c => c.id === expandedCategory)?.name;
    filtered = filtered.filter(
      (m) => m.material_type === categoryName
    )
  }

  const filteredData = filtered.filter((row) =>
    Object.values(row).some((value) =>
      value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0
    const aValue = a[sortColumn as keyof TableRow]
    const bValue = b[sortColumn as keyof TableRow]

    if (aValue === undefined || bValue === undefined) {
      return 0;
    }

    return aValue < bValue ? 1 : -1
  })

  const toggleCategory = (categoryId: string) => {
    setExpandedCategory((prev) => (prev === categoryId ? "" : categoryId))
    setSelectedSubItem(null)
  }

  const handleRowClick = (row: TableRow) => {
    setSelectedRowDetails(row)
    setActivePopup(true)
  }

  const handleCreateItemOfMaterial = () => {
    setAddMaterialPopup(true)
  }

  const renderMenuItem = (item: MaterialItem, parentType?: string) => {
    const isExpanded = expandedCategory === item.id
    const hasSubItems = item.subItems && item.subItems.length > 0
    const isSubItem = !!parentType

    return (
      <div key={item.id} className={styles.categoryContainer}>
        <div
          className={`${styles.categoryItem} ${isExpanded ? styles.expanded : ""}`}
          onClick={() => {
            if (!isSubItem) {
              toggleCategory(item.id)
            } else {
              setSelectedSubItem(item.id)
              handleGetCompanyMaterials(item.id)
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
            <span className={`${styles.dropdownArrow} ${isExpanded ? styles.rotated : ""}`}>V</span>
          )}
        </div>

        {hasSubItems && isExpanded && !isSubItem && (
          <div className={styles.subItemsContainer}>
            {item.subItems!.map((subItem) => renderMenuItem(subItem, item.name))}
          </div>
        )}
      </div>
    )
  }

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
                  <svg className={styles.searchIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="11" cy="11" r="8"></circle>
                    <path d="m21 21-4.35-4.35"></path>
                  </svg>
                </div>
                <button className={styles.addNewButton} onClick={handleCreateItemOfMaterial}>
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
                        className={`${styles.tableHeader} ${column.sortable ? styles.sortable : ""}`}
                        onClick={() => column.sortable && setSortColumn(column.key)}
                      >
                        {column.label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row) => (
                    <tr key={row.id} className={styles.tableRow} onClick={() => handleRowClick(row)}>
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



      {addMaterialPopup && <AddMaterialPopup setCreateWorkOrderPopup={setAddMaterialPopup} />}
    </div>
  )
}

export default Material