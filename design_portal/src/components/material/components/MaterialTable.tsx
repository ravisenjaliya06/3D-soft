import type React from 'react';
import { useState, useEffect } from 'react';
import { CATEGORY_TABS } from '../constants';
import type { TableRow } from '../types';
import { assets } from '@/svgPaths';

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
    <div className="flex-1 overflow-auto p-0 bg-[var(--primary-white)] rounded-[10px] border border-[var(--primary-color-grey-2)] custom-scrollbar">
      <div className="sticky z-20 mt-[0.4rem] ml-[0.2rem] mb-6 bg-[var(--primary-white)]">
        <div className="flex min-w-max">
          {CATEGORY_TABS[activeCategory].map((tab) => (
            <div
              key={tab.id}
              className={`
            px-[1rem] py-[0.5rem]
            text-[0.75rem]
            font-[var(--font-family)]
            cursor-pointer
            whitespace-nowrap
            transition-all duration-200 ease-in-out
            mb-[-2px]

            ${activeTab === tab.id
                  ? `
                border-t border-l border-r
                border-[var(--primary-color)]
                rounded-[0.199rem]
                border-b-0
                font-semibold
                text-[var(--primary-color)]
                bg-[var(--primary-white)]
              `
                  : `
                text-[var(--primary-color)]
                hover:bg-[var(--primary-hover)]
                hover:border
                hover:border-b-0
                hover:border-[var(--primary-color-grey-2)]
                hover:rounded-[0.199rem]
              `}
          `}
              onClick={() => onTabChange(tab.id)}
            >
              {tab.label}
            </div>
          ))}
        </div>
      </div>
      <hr className="border-0 h-[0.02rem] bg-[var(--secondry-background-color)] mt-14" />
      <table className="w-full border-collapse text-[0.85rem] bg-white table-auto overflow-auto text-center align-middle">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`sticky top-0 z-10 bg-white border-l border-r p-[0.75rem] font-semibold text-gray-700 border-[#39257933] text-xs whitespace-nowrap font-[var(--font-family)] ${column.sortable ? "cursor-pointer select-none hover:bg-gray-50" : ""}`}
                onClick={() => column.sortable && onSort(column.key)}
              >
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {visibleMaterials.map((row) => (
            <tr key={row.id} className="cursor-pointer text-[0.65rem] font-[var(--font-family)] border-[#39257933] hover:bg-[#f0f9ff] odd:bg-[#F4F7FA] odd:hover:bg-[#e9f0f7] transition-colors">
              {columns.map((column) => (
                <td key={column.key} className="p-[0.75rem] text-gray-700 whitespace-nowrap truncate max-w-[250px] min-w-[100px] h-[20px] border-[#39257933] border-l border-r">
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
            className="text-[var(--primary-color)] text-[1.05rem] border-none bg-transparent font-medium py-2 px-6 m-[1.5rem] space-x-[0.5rem] transition-colors"
          >
            <div className='flex items-center space-x-[0.5rem]'>
              <span>
                Load More
              </span>
              <img src={assets.loadMore || '/placeholder.svg'} alt="" className="top-[0.5rem]" />
            </div>
          </button>
        </div>
      )}
    </div>
  );
};
