import type React from "react"
import type { TableRow } from "../types"
import { CATEGORY_TABS } from "../constants"
import styles from "../material.module.css"

interface MaterialTableProps {
    materials: TableRow[]
    activeCategory: string | null
    activeTab: string | null
    onTabChange: (tabId: string) => void
    onSort: (column: string) => void
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
    materials,
    activeCategory,
    activeTab,
    onTabChange,
    onSort,
}) => {
    const getCellValue = (row: TableRow, columnKey: string): string => {
        const value = row[columnKey as keyof TableRow]
        if (value === undefined || value === null) return "N/A"
        if (typeof value === "boolean") return value ? "Yes" : "No"
        return value.toString()
    }


    const withMandatoryNameColumn = (columns: any[]) => {
        const nameColumn = { key: 'material_name', label: 'Name', sortable: true };
        const hasNameColumn = columns.some(col => col.key === 'material_name');

        if (hasNameColumn) {
            return columns;
        } else {
            return [nameColumn, ...columns];
        }
    }

    if (!activeCategory || !CATEGORY_TABS[activeCategory]) {
        return <div>Please select a category</div>
    }

    const activeTabObject = CATEGORY_TABS[activeCategory].find((t) => t.id === activeTab);
    const columns = activeTabObject ? withMandatoryNameColumn(activeTabObject.columns) : [];

    return (
        <div className={styles.tableContainer}>
            <div className={styles.tableTabsContainer}>
                <div className={styles.tabletabsbox}>
                    {CATEGORY_TABS[activeCategory].map((tab) => (
                        <div
                            key={tab.id}
                            className={`${styles.tabletabs} ${activeTab === tab.id ? styles.activeTab : ""}`}
                            onClick={() => onTabChange(tab.id)}
                        >
                            {tab.label}
                        </div>
                    ))}
                </div>
            </div>
            <hr className={styles.tableHr} />
            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        {columns.map((column) => (
                            <th
                                key={column.key}
                                className={`${styles.tableHeader} ${column.sortable ? styles.sortable : ""}`}
                                onClick={() => column.sortable && onSort(column.key)}
                            >
                                {column.label}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {materials.map((row) => (
                        <tr key={row.id} className={styles.tableRow}>
                            {columns.map((column) => (
                                <td key={column.key} className={styles.tableCell}>
                                    {getCellValue(row, column.key)}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
