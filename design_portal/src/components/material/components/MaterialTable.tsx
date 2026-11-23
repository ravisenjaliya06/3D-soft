import type React from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  LuArrowUpDown,
  LuChevronsDown,
  LuInbox,
  LuMousePointerClick,
  LuPencil,
  LuTrash2,
} from 'react-icons/lu';
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
      <div className={`${styles.tableCard} ${styles.tableEmptyCard}`}>
        <span className={styles.emptyIcon}>
          <LuMousePointerClick aria-hidden="true" />
        </span>
        <strong>Select a category</strong>
        <span>Choose a material category on the left to see its boards, edging and hardware.</span>
      </div>
    );
  }

  const activeTabObject = CATEGORY_TABS[activeCategory].find((t) => t.id === activeTab);
  const columns = activeTabObject ? withMandatoryNameColumn(activeTabObject.columns) : [];

  return (
    <div className={styles.tableCard}>
      {/* ─── Tabs ─── */}
      <div className={styles.tabsBar}>
        {CATEGORY_TABS[activeCategory].map((tab) => (
          <button
            type="button"
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`${styles.tab} ${activeTab === tab.id ? styles.tabActive : ''}`}
          >
            {tab.label}
          </button>
        ))}
        <span className={styles.tabsCount}>
          {materials.length} {materials.length === 1 ? 'item' : 'items'}
        </span>
      </div>

      {/* ─── Table ─── */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className={`${styles.scrollContainer} ${styles.tableScroll}`}
      >
        <table className={styles.dataTable}>
          <thead>
            <tr>
              <th className={styles.stickyActions}>Actions</th>
              {columns.map((column, idx) => (
                <th
                  key={column.key}
                  className={`${column.sortable ? styles.sortable : ''} ${idx === 0 ? styles.stickyName : ''}`}
                  onClick={() => column.sortable && onSort(column.key)}
                >
                  <span className={styles.thInner}>
                    {column.label}
                    {column.sortable && (
                      <LuArrowUpDown className={styles.sortIcon} aria-hidden="true" />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visibleMaterials.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className={styles.noItemsCell}>
                  <div className={styles.noItems}>
                    <span className={styles.emptyIcon}>
                      <LuInbox aria-hidden="true" />
                    </span>
                    <strong>No items yet</strong>
                    <span>Pick a company on the left, or add a material with the + button.</span>
                  </div>
                </td>
              </tr>
            ) : (
              visibleMaterials.map((row) => (
                <tr key={row.id} className={styles.dataRow}>
                  <td className={styles.stickyActions}>
                    <div className={styles.rowActions}>
                      <button
                        onClick={() => onEdit(row.id)}
                        className={styles.rowBtn}
                        title="Edit"
                        aria-label="Edit"
                      >
                        <LuPencil aria-hidden="true" />
                      </button>
                      <button
                        onClick={() => onDelete(row.id)}
                        className={`${styles.rowBtn} ${styles.rowBtnDanger}`}
                        title="Delete"
                        aria-label="Delete"
                      >
                        <LuTrash2 aria-hidden="true" />
                      </button>
                    </div>
                  </td>
                  {columns.map((column, idx) => (
                    <td
                      key={column.key}
                      className={`${idx === 0 ? `${styles.stickyName} ${styles.nameCell}` : ''} ${
                        getCellValue(row, column.key) === 'N/A' ? styles.naCell : ''
                      }`}
                    >
                      {getCellValue(row, column.key)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* ─── Load More ─── */}
        {visibleCount < materials.length && (
          <div className={styles.loadMoreRow}>
            <button
              onClick={() => setVisibleCount((prev) => prev + initVisibleCount)}
              className={styles.loadMoreBtn}
            >
              <LuChevronsDown aria-hidden="true" />
              Load more
              <span className={styles.loadMoreCount}>
                {visibleCount} of {materials.length}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
