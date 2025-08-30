import { useState, useEffect } from "react"
import styles from "./material.module.css"
import Sidebar from "@/components/sidebar/sidebar"
import Header from "@/components/header/header"
import banding from "@/assets/material/banding.svg"
import filter from "@/assets/material/filter.svg"
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
  data: any[];
};
interface TableRow {
  id: string
  name: string
  description?: string
  material_type?: string
  [key: string]: any
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
    { id: "board-stock", name: "Board Stock", icon: banding.src },
    { id: "caster", name: "Caster", icon: banding.src },
    { id: "connector", name: "Connector", icon: banding.src },
    { id: "drawer-guide", name: "Drawer Guide", icon: banding.src },
    { id: "hinge", name: "Hinge", icon: banding.src },
    { id: "hinge-plate", name: "Hinge Plate", icon: banding.src },
    { id: "laminate", name: "Laminate", icon: banding.src },
    { id: "leg", name: "Leg", icon: banding.src },
    { id: "leg-leveler", name: "Leg Leveler", icon: banding.src },
    { id: "miscellaneous", name: "Miscellaneous", icon: banding.src },
    { id: "molding", name: "Molding", icon: banding.src },
    { id: "panel-stock", name: "Panel Stock", icon: banding.src },
    { id: "rod", name: "Rod", icon: banding.src },
    { id: "sliding-door-rail", name: "Sliding Door Rail", icon: banding.src },
    { id: "wire-basket", name: "Wire Basket", icon: banding.src },
  ]

  const tableColumns: TableColumn[] = [
    { key: "name", label: "Name", sortable: true },
    { key: "description", label: "Description", sortable: false },
    { key: "type", label: "Type", sortable: true },
    { key: "unitOfIssue", label: "Unit of issue", sortable: false },
    { key: "defaultVender", label: "Default vender", sortable: false },
    { key: "defaultCode", label: "Default code", sortable: false },
    { key: "sellPrice", label: "Sell Price", sortable: false },
    { key: "defaultMarkup", label: "Default markup", sortable: false },
    { key: "sales", label: "Sales", sortable: false },
  ]

  useEffect(() => {
    handleGetData()
  }, [])

  // ---- Fetch Materials ----
  const handleGetData = async () => {
    try {
      const response: MaterialResponse = await commonService.get("material", "company")
      if (response.status === 200) {
        console.log(response.data)
        const materials: TableRow[] = response.data.map((m: any) => ({
          ...m,
          type: m.material_type,
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


  let filtered = companyMaterials
  if (expandedCategory) {
    filtered = filtered.filter((m) => m.material_type === materialCategories.find(c => c.id === expandedCategory)?.name)
    if (selectedSubItem) {
      filtered = filtered.filter((m) => m.id === selectedSubItem)
    }
  }

  const filteredData = filtered.filter((row) =>
    Object.values(row).some((value) =>
      value?.toString().toLowerCase().includes(searchQuery.toLowerCase())
    )
  )

  const sortedData = [...filteredData].sort((a, b) => {
    if (!sortColumn) return 0
    const aValue = a[sortColumn]
    const bValue = b[sortColumn]
    // if (sortDirection === "asc") return aValue > bValue ? 1 : -1
    return aValue < bValue ? 1 : -1
  })

  // ---- Accordion Toggle ----
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

  // ---- Render Menu ----
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
        <Header isBorderRadius={true} dashboardName="Material" />

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
                {/* <select
//                   className={styles.dropdown}
//                   value={selectedDropdown}
//                   onChange={(e) => setSelectedDropdown(e.target.value)}
//                 >
//                   {dropdownOptions.map((option) => (
//                     <option key={option} value={option}>
//                       {option}
//                     </option>
//                   ))}
//                 </select> */}
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
                        {/* {column.sortable && (
                          <span className={styles.sortArrow}>
                            {sortColumn === column.key ? (sortDirection === "asc" ? "↑" : "↓") : "↕"}
                          </span>
                        )} */}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedData.map((row) => (
                    <tr key={row.id} className={styles.tableRow} onClick={() => handleRowClick(row)}>
                      {tableColumns.map((column) => (
                        <td key={column.key} className={styles.tableCell}>
                          {row[column.key] ?? "N/A"}
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

      {/* Modal */}
      {
        activePopup && selectedRowDetails && (
          <div className={styles.modalOverlay} onClick={() => setActivePopup(false)}>
            <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h2>Item Details</h2>
                <button className={styles.closeButton} onClick={() => setActivePopup(false)}>×</button>
              </div>
              <div className={styles.modalBody}>
                {Object.entries(selectedRowDetails).map(([key, value]) => (
                  <div key={key} className={styles.detailRow}>
                    <span className={styles.detailLabel}>
                      {key.charAt(0).toUpperCase() + key.slice(1).replace(/([A-Z])/g, " $1")}:
                    </span>
                    <span className={styles.detailValue}>{value}</span>
                  </div>
                ))}
              </div>
              <div className={styles.modalFooter}>
                <button className={styles.editButton}>Edit</button>
                <button className={styles.deleteButton}>Delete</button>
                <button className={styles.cancelButton} onClick={() => setActivePopup(false)}>Close</button>
              </div>
            </div>
          </div>
        )
      }

      {addMaterialPopup && <AddMaterialPopup setCreateWorkOrderPopup={setAddMaterialPopup} />}
    </div >
  )
}

export default Material
