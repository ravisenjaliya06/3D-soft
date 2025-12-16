import { assets, MENU_UP_SVG } from '@/svgPaths';
import type React from 'react';
import { useEffect, useState } from 'react';
import { CATEGORY_TABS } from '../constants';
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

  useEffect(() => {
    setVisibleCount(initVisibleCount);
  }, [activeCategory, activeTab]);

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
    return <div>Please select a category</div>;
  }

  const activeTabObject = CATEGORY_TABS[activeCategory].find((t) => t.id === activeTab);
  const columns = activeTabObject ? withMandatoryNameColumn(activeTabObject.columns) : [];

  return (
    <div className="custom-scrollbar flex-1 overflow-auto rounded-[10px] border border-[var(--primary-color-grey-2)] bg-[var(--primary-white)] p-0">
      <div className="sticky z-20 mt-[0.4rem] mb-6 ml-[0.2rem] bg-[var(--primary-white)]">
        <div className="flex min-w-max">
          {CATEGORY_TABS[activeCategory].map((tab) => (
            <div
              key={tab.id}
              className={`mb-[-2px] cursor-pointer px-[1rem] py-[0.5rem] text-[0.75rem] font-[var(--font-family)] whitespace-nowrap transition-all duration-200 ease-in-out ${
                activeTab === tab.id
                  ? `rounded-[0.199rem] border-t border-r border-b-0 border-l border-[var(--primary-color)] bg-[var(--primary-white)] font-semibold text-[var(--primary-color)]`
                  : `text-[var(--primary-color)] hover:rounded-[0.199rem] hover:border hover:border-b-0 hover:border-[var(--primary-color-grey-2)] hover:bg-[var(--primary-hover)]`
              } `}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>
      <hr className="mt-14 h-[0.02rem] border-0 bg-[var(--secondry-background-color)]" />
      <table className="w-full table-auto border-collapse overflow-auto bg-white text-center align-middle text-[0.85rem]">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`sticky top-0 z-10 border-r border-l border-[#39257933] bg-white p-[0.75rem] text-xs font-[var(--font-family)] font-semibold whitespace-nowrap text-gray-700 ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-50' : ''}`}
                onClick={() => column.sortable && onSort(column.key)}
              >
                <div className="flex items-center justify-center">
                  {column.label}
                  {column.sortable && (
                    <div className="ml-2 flex flex-col">
                      <img src={MENU_UP_SVG.menu_up} alt="Sort icon" className="w-[1rem]" />
                    </div>
                  )}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleMaterials.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-[#39257933] text-[0.65rem] font-[var(--font-family)] transition-colors odd:bg-[#F4F7FA] hover:bg-[#f0f9ff] odd:hover:bg-[#e9f0f7]"
            >
              {columns.map((column) => (
                <td
                  key={column.key}
                  className="h-[20px] max-w-[250px] min-w-[100px] truncate border-r border-l border-[#39257933] p-[0.75rem] whitespace-nowrap text-gray-700"
                >
                  {getCellValue(row, column.key)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {visibleCount < materials.length && (
        <div className="flex justify-center p-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + initVisibleCount)}
            className="m-[1.5rem] space-x-[0.5rem] border-none bg-transparent px-6 py-2 text-[1.05rem] font-medium text-[var(--primary-color)] transition-colors"
          >
            <div className="flex items-center space-x-[0.5rem]">
              <span>Load More</span>
              <img src={assets.loadMore || '/placeholder.svg'} alt="" className="top-[0.5rem]" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
