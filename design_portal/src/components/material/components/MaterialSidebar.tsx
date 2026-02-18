import { assets } from '@/svgPaths';
import type React from 'react';
import styles from '../material.module.css';
import type { MaterialItem } from '../types';

interface MaterialSidebarProps {
  materialCategories: MaterialItem[];
  expandedCategory: string;
  selectedSubItem: string | null;
  onCategoryClick: (categoryId: string, name: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onSubItemClick: (itemId: string) => void;
  onContextMenu: (e: React.MouseEvent, categoryId: string, name: string) => void;
  onMaterialContextMenu: (e: React.MouseEvent, companyId: string) => void;
  onAddCompany: () => void;
  setAddMaterialPopup: (show: boolean) => void;
  setCompanyID: (id: string) => void;
  setMaterialType: (type: string) => void;
}

export const MaterialSidebar: React.FC<MaterialSidebarProps> = ({
  materialCategories,
  expandedCategory,
  selectedSubItem,
  onCategoryClick,
  onToggleCategory,
  onSubItemClick,
  onContextMenu,
  onMaterialContextMenu,
  onAddCompany,
  setAddMaterialPopup,
  setCompanyID,
  setMaterialType,
}) => {
  const renderMenuItem = (item: MaterialItem, parentType?: string) => {
    const isExpanded = expandedCategory === item.id;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isSubItem = !!parentType;
    const isSubItemActive = isSubItem && selectedSubItem === item.id;

    return (
      <div
        className="p-[0]"
        key={item.id}
        onContextMenu={(e) => {
          if (!parentType) {
            onContextMenu(e, item.id, item.name);
          }
        }}
      >
        <div
          className={`group mx-[0.4rem] my-[0.15rem] flex cursor-pointer items-center justify-between rounded-[0.6rem] px-[0.75rem] py-[0.55rem] text-[0.8rem] transition-all duration-250 ease-[cubic-bezier(0.34,1.56,0.64,1)] hover:bg-gradient-to-r hover:from-[#f0ebff] hover:to-[#f8f5ff] hover:shadow-[0_2px_8px_rgba(57,37,121,0.06)] ${isSubItemActive ? 'border-l-[3px] border-[#7c5cbf] bg-gradient-to-r from-[#ece5ff] to-[#f5f1ff] font-semibold text-[#4b2aad] shadow-[inset_0_0_0_1px_rgba(124,92,191,0.08),0_2px_8px_rgba(57,37,121,0.06)]' : ''} ${!isSubItem && isExpanded ? 'bg-gradient-to-r from-[#ece5ff] via-[#f0ebff] to-[#f8f5ff] font-semibold text-[#4b2aad] shadow-[0_2px_12px_rgba(57,37,121,0.08)]' : ''}`}
          onClick={() => {
            if (!isSubItem) {
              onToggleCategory(item.id);
              onCategoryClick(item.id, item.name);
            } else {
              onSubItemClick(item.id);
            }
          }}
        >
          <div
            className={`grid w-full grid-cols-[auto_1fr_auto] items-center gap-[0.75rem] transition-all duration-200 ${isSubItemActive || isExpanded ? 'font-semibold text-[#4b2aad]' : ''}`}
          >
            {/* LEFT ICON / PLACEHOLDER (IMPORTANT) */}
            {!isSubItem && item.icon ? (
              <img
                src={item.icon}
                className={`h-[1rem] w-[1rem] transition-all duration-200 ${isExpanded ? 'scale-110 opacity-100' : 'opacity-60'}`}
              />
            ) : (
              <div className="h-[0rem] w-[0rem]" />
            )}

            {/* NAME */}
            <span
              className={`truncate text-[0.75rem] leading-tight transition-colors duration-200 ${!isSubItem && !isExpanded ? 'text-[#5a6577]' : ''} ${isSubItem && !isSubItemActive ? 'text-[#7a8699]' : ''}`}
            >
              {item.name}
            </span>

            {/* RIGHT BUTTON */}
            {!isSubItem && isExpanded ? (
              /* CATEGORY BUTTON */
              <button
                className={`mr-[0.25rem] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-md border-0 bg-[rgba(124,92,191,0.08)] p-[0rem] opacity-0 transition-all duration-200 hover:scale-110 hover:bg-[rgba(124,92,191,0.15)] ${isExpanded ? 'opacity-100' : ''} `}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddCompany();
                  setMaterialType(item.name);
                }}
              >
                <img src={assets.addCompany} className="h-[0.85rem] w-[0.85rem]" />
              </button>
            ) : (
              isSubItem && (
                /* SUB ITEM BUTTON */
                <button
                  className={`mr-[0.5rem] flex h-[1.4rem] w-[1.4rem] cursor-pointer items-center justify-center rounded-md border-[0rem] bg-[rgba(124,92,191,0.08)] p-[0rem] opacity-0 transition-all duration-200 group-hover:opacity-100 hover:scale-110 hover:bg-[rgba(124,92,191,0.15)] ${isSubItemActive ? 'opacity-100' : ''} `}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubItemClick(item.id);
                    setCompanyID(item.id);
                    setAddMaterialPopup(true);
                  }}
                >
                  <img src={assets.addMaterial} className="h-[0.85rem] w-[0.85rem]" />
                </button>
              )
            )}
          </div>

          {!isSubItem && hasSubItems && (
            <span
              className={`shrink-0 p-[0rem] text-[0.625rem] text-[#7c5cbf] transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isExpanded ? 'rotate-0' : ''}`}
            >
              <img
                src={isExpanded ? assets.up_arrow : assets.down_arrow}
                alt=""
                className={`h-[0.65rem] w-[0.65rem] transition-all duration-200 ${isExpanded ? 'opacity-100' : 'opacity-40'}`}
              />
            </span>
          )}
        </div>

        {hasSubItems && isExpanded && !isSubItem && (
          <div className={`${styles.subItemsContainer}`}>
            {item.subItems!.map((subItem) => (
              <div
                key={subItem.id}
                onContextMenu={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onMaterialContextMenu(e, subItem.id);
                }}
              >
                {renderMenuItem(subItem, item.name)}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex w-[15rem] min-w-[15rem] flex-col overflow-hidden rounded-2xl border border-[rgba(124,92,191,0.12)] bg-gradient-to-b from-[#ffffff] via-[#fcfaff] to-[#f8f5ff] shadow-[0_4px_24px_rgba(57,37,121,0.06),0_1px_4px_rgba(57,37,121,0.04)]">
      {/* Sidebar Header */}
      <div className={styles.sidebarTitle}>
        <svg
          className="h-[0.8rem] w-[0.8rem] text-[#7c5cbf]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
        >
          <rect x="3" y="3" width="7" height="7" rx="1.5" />
          <rect x="14" y="3" width="7" height="7" rx="1.5" />
          <rect x="3" y="14" width="7" height="7" rx="1.5" />
          <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
        Categories
      </div>

      {/* Sidebar Items */}
      <div className={`${styles.scrollContainer} flex-1 overflow-y-auto`}>
        {materialCategories.map((category) => renderMenuItem(category))}
      </div>
    </div>
  );
};
