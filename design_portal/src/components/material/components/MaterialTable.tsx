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
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
  materials,
  activeCategory,
  activeTab,
  onTabChange,
  onSort,
}) => {
  const initVisibleCount = 10;
  const [visibleCount, setVisibleCount] = useState(initVisibleCount);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setVisibleCount(initVisibleCount);
  }, [activeCategory, activeTab]);

  /** Convert vertical wheel → horizontal scroll */
  const handleWheel = useCallback((e: React.WheelEvent<HTMLDivElement>) => {
    const el = scrollRef.current;
    if (!el) return;
    // Only convert when content is wider than container
    if (el.scrollWidth > el.clientWidth) {
      e.preventDefault();
      el.scrollLeft += e.deltaY;
    }
  }, []);

  const visibleMaterials = materials.slice(0, visibleCount);
  const getCellValue = (row: TableRow, columnKey: string): string => {
    const value = row[columnKey as keyof TableRow];
    if (value === undefined || value === null) return 'N/A';
    if (typeof value === 'boolean') return value ? 'Yes' : 'No';
    return value.toString();
  };

  const withMandatoryNameColumn = (
    columns: { key: string; label: string; sortable: boolean }[]
  ) => {
    const nameColumn = { key: 'material_name', label: 'Name', sortable: true };
    const hasNameColumn = columns.some((col) => col.key === 'material_name');

    if (hasNameColumn) {
      return columns;
    } else {
      return [nameColumn, ...columns];
    }
  };

  if (!activeCategory || !CATEGORY_TABS[activeCategory]) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-xl border border-[var(--primary-color-grey-2)] bg-[var(--primary-white)] text-[0.8rem] text-[var(--text-gray)] shadow-sm">
        Please select a category
      </div>
    );
  }

  const activeTabObject = CATEGORY_TABS[activeCategory].find((t) => t.id === activeTab);
  const columns = activeTabObject ? withMandatoryNameColumn(activeTabObject.columns) : [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-xl border border-[var(--primary-color-grey-2)] bg-[var(--primary-white)] shadow-sm">
      {/* ─── Tabs ─── */}
      <div className="shrink-0 border-b border-[var(--table-title-border-color)] bg-[var(--primary-white)] px-[1rem]">
        <div className="flex gap-[0.25rem]">
          {CATEGORY_TABS[activeCategory].map((tab) => (
            <div
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className="cursor-pointer px-[0.5rem]"
            >
              <p
                className={`m-0 inline-block py-[0.6rem] text-[0.8rem] font-medium transition-all duration-200 ${
                  activeTab === tab.id
                    ? 'border-b-2 border-[var(--primary-color)] font-semibold text-[var(--primary-color)]'
                    : 'border-b-2 border-transparent text-[var(--text-gray)] hover:text-[var(--primary-color)]'
                }`}
              >
                {tab.label}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* ─── Table ─── */}
      <div
        ref={scrollRef}
        onWheel={handleWheel}
        className={`${styles.scrollContainer} flex-1 overflow-x-auto overflow-y-auto`}
      >
        <table className="w-full table-auto border-collapse bg-white text-left text-[0.8rem]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`sticky top-0 z-10 border-b border-[var(--table-title-border-color)] bg-[var(--thbackground-color)] px-[1rem] py-[0.6rem] text-[0.7rem] font-semibold whitespace-nowrap text-[var(--soft-dark-grey)] uppercase tracking-wider ${column.sortable ? 'cursor-pointer select-none transition-colors hover:bg-[var(--hover-background-color-2)] hover:text-[var(--text-color)]' : ''}`}
                  onClick={() => column.sortable && onSort(column.key)}
                >
                  <div className="flex items-center gap-[0.25rem]">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="ml-[0.2rem] flex flex-col items-center">
                        <img
                          src={MENU_UP_SVG.menu_up}
                          alt="Sort"
                          className="mb-[-5px] h-[1rem] w-[1rem] opacity-60"
                        />
                        <img
                          src={MENU_DOWN_SVG.menu_down}
                          alt="Sort"
                          className="ml-[0.2rem] mt-[-5px] h-[1rem] w-[1rem] opacity-60"
                        />
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
                <td
                  colSpan={columns.length}
                  className="py-[10rem] text-center text-[0.75rem] font-medium text-[var(--text-gray)]"
                >
                  No items available
                </td>
              </tr>
            ) : (
              visibleMaterials.map((row) => (
                <tr
                  key={row.id}
                  className="border-b border-[var(--table-title-border-color)] text-sm transition-colors duration-150 odd:bg-[var(--designpage-background-color)] hover:bg-[var(--primary-table-hover)]"
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="max-w-[220px] min-w-[80px] truncate px-[1rem] py-[0.6rem] text-[0.73rem] whitespace-nowrap text-[var(--project-item-text)]"
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
          <div className="flex justify-center border-t border-[var(--table-title-border-color)] py-[0.75rem]">
            <button
              onClick={() => setVisibleCount((prev) => prev + initVisibleCount)}
              className="flex items-center gap-[0.5rem] rounded-lg border border-[var(--primary-color-grey-2)] bg-white px-[1rem] py-[0.4rem] text-[0.8rem] font-medium text-[var(--primary-color)] shadow-sm transition-all hover:bg-[var(--primary-hover)] hover:shadow"
            >
              <span>Load More</span>
              <img src={assets.loadMore || '/placeholder.svg'} alt="" className="h-[0.75rem] w-[0.75rem]" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
