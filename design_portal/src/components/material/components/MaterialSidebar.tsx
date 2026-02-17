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
          className={`mx-[0.35rem] my-[0.1rem] flex cursor-pointer items-center justify-between rounded-lg px-[0.75rem] py-[0.5rem] text-[0.8rem] transition-all duration-200 ease-in-out hover:bg-[var(--primary-hover)] ${isSubItemActive ? 'bg-[var(--primary-hover)] font-semibold text-[var(--primary-color)]' : ''} ${!isSubItem && isExpanded ? 'bg-[var(--primary-hover)] font-semibold text-[var(--primary-color)] shadow-sm' : ''}`}
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
            className={`group grid w-full grid-cols-[auto_1fr_auto] items-center gap-[0.75rem] transition-all duration-200 ${isSubItemActive || isExpanded ? 'font-semibold text-[var(--primary-color)]' : ''}`}
          >
            {/* LEFT ICON / PLACEHOLDER (IMPORTANT) */}
            {!isSubItem && item.icon ? (
              <img src={item.icon} className={`h-[1rem] w-[1rem] transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-70'}`} />
            ) : (
              <div className="h-[0rem] w-[0rem]" />
            )}

            {/* NAME */}
            <span className={`truncate text-[0.75rem] leading-tight ${!isSubItem && !isExpanded ? 'text-[var(--project-item-text)]' : ''} ${isSubItem && !isSubItemActive ? 'text-[var(--soft-dark-grey)]' : ''}`}>
              {item.name}
            </span>

            {/* RIGHT BUTTON */}
            {!isSubItem && isExpanded ? (
              /* CATEGORY BUTTON */
              <button
                className={`mr-[0.25rem] flex h-[1.25rem] w-[1.25rem] cursor-pointer items-center justify-center rounded border-0 bg-transparent p-[0rem] opacity-0 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : ''} `}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddCompany();
                  setMaterialType(item.name);
                }}
              >
                <img src={assets.addCompany} className="h-[1rem] w-[1rem]" />
              </button>
            ) : (
              isSubItem && (
                /* SUB ITEM BUTTON */
                <button
                  className={`mr-[0.5rem] flex h-[1.25rem] w-[1.25rem] cursor-pointer items-center justify-center border-[0rem] bg-transparent p-[0rem] opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${isSubItemActive ? 'opacity-100' : ''} `}
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubItemClick(item.id);
                    setCompanyID(item.id);
                    setAddMaterialPopup(true);
                  }}
                >
                  <img src={assets.addMaterial} className="h-[1rem] w-[1rem]" />
                </button>
              )
            )}
          </div>

          {!isSubItem && hasSubItems && (
            <span
              className={`shrink-0 p-[0rem] text-[0.625rem] text-[var(--primary-color)] transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-0' : ''}`}
            >
              <img
                src={isExpanded ? assets.up_arrow : assets.down_arrow}
                alt=""
                className={`h-[0.65rem] w-[0.65rem] transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-50'}`}
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
    <div className="flex w-[15rem] min-w-[15rem] flex-col rounded-xl border border-[var(--primary-color-grey-2)] bg-[var(--primary-white)] py-[0.5rem] shadow-sm">
      <div className={`${styles.scrollContainer} flex-1 overflow-y-auto`}>
        {materialCategories.map((category) => renderMenuItem(category))}
      </div>
    </div>
  );
};
