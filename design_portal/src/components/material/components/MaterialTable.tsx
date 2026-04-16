import { assets, MENU_DOWN_SVG, MENU_UP_SVG } from '@/svgPaths';
import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORY_TABS } from '../constants';
import styles from '../material.module.css';
import type { TableRow } from '../types';

interface MaterialTableProps {
  materials: TableRow[];
  activeCategory: string | null;
  activeTab: string | null;
  onTabChange: (tabId: string) => void;
  onSort: (column: string) => void;
  onEdit: (materialId: string) => void;
  onDelete: (materialId: string) => void;
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
  materials,
  activeCategory,
  activeTab,
  onTabChange,
  onSort,
  onEdit,
  onDelete,
}) => {
  const initVisibleCount = 10;
  const [visibleCount, setVisibleCount] = useState(initVisibleCount);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(initVisibleCount);
  }, [activeCategory, activeTab]);

  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    if (el.scrollWidth > el.clientWidth) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  const visibleMaterials = materials.slice(0, visibleCount);
  const getCellValue = (row: TableRow, columnKey: string): string => {
    const value = row[columnKey as keyof TableRow];
    if (value === undefined || value === null) return '—';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  const withMandatoryNameColumn = (
    columns: { key: string; label: string; sortable: boolean }[]
  ) => {
    const nameColumn = { key: 'material_name', label: 'Name', sortable: true };
    const hasNameColumn = columns.some((col) => col.key === 'material_name');
    return hasNameColumn ? columns : [nameColumn, ...columns];
  };

  if (!activeCategory || !CATEGORY_TABS[activeCategory]) {
    return (
      <div className={styles.tableEmptyState}>
        <div className={styles.tableEmptyIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} width={30} height={30}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 21V9" />
          </svg>
        </div>
        <p className={styles.tableEmptyTitle}>No category selected</p>
        <p className={styles.tableEmptySubtitle}>Select a category from the sidebar to view materials</p>
      </div>
    );
  }

  const activeTabObject = CATEGORY_TABS[activeCategory].find((t) => t.id === activeTab);
  const columns = activeTabObject ? withMandatoryNameColumn(activeTabObject.columns) : [];

  return (
    <div className={styles.tableCard}>
      {/* ─── Tab Bar ─── */}
      <div className={styles.tabBar}>
        {CATEGORY_TABS[activeCategory].map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${styles.tabItem} ${activeTab === tab.id ? styles.tabItemActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ─── Table ─── */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className={`${styles.scrollContainer} ${styles.tableScrollArea}`}
      >
        <table className={styles.table}>
          <thead>
            <tr className={styles.tableHeaderRow}>
              <th className={`${styles.th} ${styles.thActions}`}>Actions</th>
              {columns.map((column, idx) => (
                <th
                  key={column.key}
                  className={`${styles.th} ${column.sortable ? styles.thSortable : ''} ${idx === 0 ? styles.thFirstCol : ''}`}
                  onClick={() => column.sortable && onSort(column.key)}
                >
                  <div className={styles.thInner}>
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className={styles.sortIcons}>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={8} height={8}>
                          <path strokeLinecap="round" d="m18 15-6-6-6 6" />
                        </svg>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={8} height={8}>
                          <path strokeLinecap="round" d="m6 9 6 6 6-6" />
                        </svg>
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleMaterials.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.tableNoData}>
                  No items available in this category
                </td>
              </tr>
            ) : (
              visibleMaterials.map((row, idx) => (
                <tr key={row.id} className={`${styles.tableRow} ${idx % 2 === 1 ? styles.tableRowAlt : ''}`}>
                  <td className={`${styles.td} ${styles.tdActions}`}>
                    <div className={styles.actionBtns}>
                      <button
                        onClick={() => onEdit(row.id)}
                        className={styles.editBtn}
                        title="Edit"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 0 0-2 2v11a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-5m-1.414-9.414a2 2 0 1 1 2.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => onDelete(row.id)}
                        className={styles.deleteBtn}
                        title="Delete"
                      >
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0 1 16.138 21H7.862a2 2 0 0 1-1.995-1.858L5 7m5 4v6m4-6v6M1 7h22M8 7V5a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                        </svg>
                      </button>
                    </div>
                  </td>
                  {columns.map((column) => (
                    <td key={column.key} className={styles.td}>
                      <span className={styles.tdText}>{getCellValue(row, column.key)}</span>
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ─── Load More ─── */}
        {visibleCount < materials.length && (
          <div className={styles.loadMoreContainer}>
            <button
              onClick={() => setVisibleCount((prev) => prev + initVisibleCount)}
              className={styles.loadMoreBtn}
            >
              Load More
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} width={13} height={13}>
                <path strokeLinecap="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
