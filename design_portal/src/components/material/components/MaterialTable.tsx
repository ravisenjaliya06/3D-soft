import { assets, MENU_DOWN_SVG, MENU_UP_SVG } from '@/svgPaths';
import type React from 'react';
import { useEffect, useState } from 'react';
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
    <div
      className={`${styles.custom_scrollbar} h-full flex-1 overflow-auto rounded-[0.63rem] border-[0.06rem] border-[var(--primary-color-grey-2)] bg-[var(--primary-white)] p-0 pb-[0.31rem]`}
    >
      <div className="sticky top-0 z-20 mb-[0.75rem] ml-[0.2rem] bg-[var(--primary-white)] pb-[0.44rem]">
        <div className="flex min-w-max">
          {CATEGORY_TABS[activeCategory].map((tab) => (
            <div
              key={tab.id}
              className={`mr-[0.7rem] mb-[-0.13rem] ml-[0.7rem] cursor-pointer border-[0rem] border-[#EAEAEA] px-[1rem] text-[0.85rem] whitespace-nowrap transition-all duration-200 ease-in-out ${
                activeTab === tab.id
                  ? `relative mr-[0.7rem] ml-[0.7rem] rounded-t-[0.199rem] border-b-[0.13rem] border-[black] bg-[var(--primary-white)] pr-[0rem] pl-[0rem] font-[700] text-[var(--primary-color)]`
                  : `mr-[0.7rem] pr-[0rem] pl-[0rem] text-[var(--primary-color-grey-2)] hover:border-b hover:border-[black] hover:text-[var(--primary-color)]`
              } `}
              onClick={() => onTabChange(tab.id)}
            >
              <p className="mb-[0rem] pb-[0.31rem] text-[0.85rem]">{tab.label}</p>
            </div>
          ))}
        </div>
      </div>
      <table className="w-full table-auto border-collapse overflow-auto bg-white text-left align-middle text-[0.85rem]">
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                className={`sticky top-0 z-10 border-t-[0.06rem] border-r-[0.06rem] border-l-[0.06rem] border-[#39257933] bg-white p-[0.75rem] py-[0rem] pb-[0.31rem] text-xs font-[600] whitespace-nowrap text-gray-700 ${column.sortable ? 'cursor-pointer select-none hover:bg-gray-50' : ''}`}
                onClick={() => column.sortable && onSort(column.key)}
              >
                <div className="flex items-center justify-start">
                  <p className="text-[0.80rem] font-[500]">{column.label}</p>
                  {column.sortable && (
                    <div className="flex flex-col items-center">
                      <img
                        src={MENU_UP_SVG.menu_up}
                        alt="Sort icon"
                        className="mb-[-0.38rem] ml-[0.19rem] w-[1rem]"
                      />
                      <img
                        src={MENU_DOWN_SVG.menu_down}
                        alt="Sort icon"
                        className="mt-[-0.16rem] ml-[0.38rem] w-[1rem]"
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
                className="py-[10rem] text-center text-[0.75rem] font-medium text-gray-500"
              >
                No items available
              </td>
            </tr>
          ) : (
            visibleMaterials.map((row, rowIndex) => (
              <tr
                key={row.id}
                className="border-[#39257933] text-sm transition-colors odd:bg-[#F4F7FA] hover:bg-[#f0f9ff] odd:hover:bg-[#e9f0f7]"
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={`h-[1.25rem] max-w-[15.63rem] min-w-[6.25rem] truncate border-r-[0.06rem] border-b-[0.06rem] border-l-[0.06rem] border-[#39257933] p-[0.75rem] text-[0.65rem] whitespace-nowrap text-gray-700 ${rowIndex === visibleMaterials.length - 1 ? 'border-b border-[#39257933]' : ''}`}
                  >
                    {getCellValue(row, column.key)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {visibleCount < materials.length && (
        <div className="flex justify-center p-4">
          <button
            onClick={() => setVisibleCount((prev) => prev + initVisibleCount)}
            className="m-[1.5rem] space-x-[0.5rem] border-[0rem] border-[#392579] bg-transparent px-6 py-2 text-[1.05rem] font-medium text-[var(--primary-color)] transition-colors"
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
