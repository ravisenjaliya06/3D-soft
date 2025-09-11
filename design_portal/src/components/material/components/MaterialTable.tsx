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

    if (!activeCategory || !CATEGORY_TABS[activeCategory]) {
        return <div>Please select a category</div>
    }

    return (
        <div className={styles.tableContainer}>
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

            <table className={styles.dataTable}>
                <thead>
                    <tr>
                        {activeTab &&
                            CATEGORY_TABS[activeCategory]
                                .find((t) => t.id === activeTab)
                                ?.columns.map((column) => (
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
                            {activeTab &&
                                CATEGORY_TABS[activeCategory]
                                    .find((t) => t.id === activeTab)
                                    ?.columns.map((column) => (
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
