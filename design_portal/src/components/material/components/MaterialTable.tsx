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
      <div className="flex flex-1 flex-col items-center justify-center gap-[0.75rem] rounded-2xl border border-[rgba(124,92,191,0.12)] bg-gradient-to-b from-[#ffffff] to-[#f8f5ff] shadow-[0_4px_24px_rgba(57,37,121,0.06)]">
        <svg
          className="h-[2rem] w-[2rem] text-[#c9b8f0]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <path d="M3 9h18M9 21V9" />
        </svg>
        <span className="text-[0.8rem] font-medium text-[#8e9cb3]">Please select a category</span>
      </div>
    );
  }

  const activeTabObject = CATEGORY_TABS[activeCategory].find((t) => t.id === activeTab);
  const columns = activeTabObject ? withMandatoryNameColumn(activeTabObject.columns) : [];

  return (
    <div className="flex flex-1 flex-col overflow-hidden rounded-2xl border border-[rgba(124,92,191,0.12)] bg-[#ffffff] shadow-[0_4px_24px_rgba(57,37,121,0.06),0_1px_4px_rgba(57,37,121,0.04)]">
      {/* ─── Tabs ─── */}
      <div className="shrink-0 border-b border-[rgba(124,92,191,0.08)] bg-gradient-to-r from-[#fcfaff] via-[#faf8ff] to-[#ffffff] px-[1.25rem]">
        <div className="flex gap-[0.15rem]">
          {CATEGORY_TABS[activeCategory].map((tab) => (
            <div
              key={tab.id}
              onClick={() => onTabChange(tab.id)}
              className={`relative cursor-pointer px-[0.75rem] py-[0.7rem] transition-all duration-200 ${
                activeTab === tab.id ? '' : 'hover:bg-[rgba(124,92,191,0.04)]'
              } rounded-t-lg`}
            >
              <p
                className={`m-0 inline-block text-[0.8rem] font-medium transition-all duration-250 ${
                  activeTab === tab.id
                    ? 'font-bold text-[#4b2aad]'
                    : 'text-[#8e9cb3] hover:text-[#7c5cbf]'
                }`}
              >
                {tab.label}
              </p>
              {/* Active indicator */}
              <div
                className={`absolute right-0 bottom-0 left-0 h-[2.5px] rounded-full transition-all duration-300 ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-[#7c5cbf] to-[#4b2aad] opacity-100'
                    : 'bg-transparent opacity-0'
                }`}
              />
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
        <table className="w-full table-auto border-collapse text-left text-[0.8rem]">
          <thead>
            <tr>
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`sticky top-0 z-10 border-b border-[rgba(124,92,191,0.08)] bg-gradient-to-b from-[#f8f5ff] to-[#f3eeff] px-[1.25rem] py-[0.7rem] text-[0.68rem] font-bold tracking-[0.08em] whitespace-nowrap text-[#7c5cbf] uppercase ${column.sortable ? 'cursor-pointer transition-all duration-200 select-none hover:bg-[#ece5ff] hover:text-[#4b2aad]' : ''}`}
                  onClick={() => column.sortable && onSort(column.key)}
                >
                  <div className="flex items-center gap-[0.3rem]">
                    <span>{column.label}</span>
                    {column.sortable && (
                      <div className="ml-[0.15rem] flex flex-col items-center opacity-40 transition-opacity duration-200 group-hover:opacity-70">
                        <img
                          src={MENU_UP_SVG.menu_up}
                          alt="Sort"
                          className="mb-[-5px] h-[1rem] w-[1rem]"
                        />
                        <img
                          src={MENU_DOWN_SVG.menu_down}
                          alt="Sort"
                          className="mt-[-5px] ml-[0.2rem] h-[1rem] w-[1rem]"
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
                  className="py-[10rem] text-center text-[0.75rem] font-medium text-[#a8b0bf]"
                >
                  No items available
                </td>
              </tr>
            ) : (
              visibleMaterials.map((row, idx) => (
                <tr
                  key={row.id}
                  className={`border-b border-[rgba(124,92,191,0.05)] text-sm transition-all duration-200 hover:bg-gradient-to-r hover:from-[#f5f1ff] hover:to-[#faf8ff] hover:shadow-[inset_3px_0_0_#7c5cbf] ${
                    idx % 2 === 1 ? 'bg-[#faf9ff]' : 'bg-white'
                  }`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className="max-w-[220px] min-w-[80px] truncate px-[1.25rem] py-[0.65rem] text-[0.73rem] whitespace-nowrap text-[#4a5568]"
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
          <div className="flex justify-center border-t border-[rgba(124,92,191,0.08)] bg-gradient-to-b from-transparent to-[#faf8ff] py-[0.85rem]">
            <button
              onClick={() => setVisibleCount((prev) => prev + initVisibleCount)}
              className="flex items-center gap-[0.5rem] rounded-xl border border-[rgba(124,92,191,0.15)] bg-gradient-to-r from-[#faf8ff] to-[#f0ebff] px-[1.25rem] py-[0.45rem] text-[0.78rem] font-semibold text-[#4b2aad] shadow-[0_2px_8px_rgba(57,37,121,0.06)] transition-all duration-200 hover:scale-[1.02] hover:border-[#7c5cbf] hover:shadow-[0_4px_16px_rgba(57,37,121,0.12)] active:scale-[0.98]"
            >
              <span>Load More</span>
              <img
                src={assets.loadMore || '/placeholder.svg'}
                alt=""
                className="h-[0.75rem] w-[0.75rem]"
              />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
