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
          className={`mx-[0.4rem] my-[0.05rem] mb-[0.5rem] flex cursor-pointer items-center justify-between rounded-[0.19rem] p-[0rem] py-[0.75rem] pr-[1.2rem] pl-[0.6rem] text-[0.875rem] transition-all duration-[0.2s] ease-in-out hover:bg-[var(--primary-hover)] ${isSubItemActive ? 'bg-[var(--primary-hover)] font-semibold text-[#392579]' : ''} ${!isSubItem && isExpanded ? `bg-[var(--primary-hover)] font-semibold text-[var(--primary-white)]` : ''}`}
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
            className={`group grid w-full grid-cols-[auto_1fr_auto] items-center gap-[0.75rem] border-[0rem] p-[0rem] transition-all duration-200 hover:bg-[var(--primary-hover)] ${isSubItemActive || isExpanded ? 'bg-[var(--primary-hover)] font-semibold text-[#392579]' : ''} `}
          >
            {/* LEFT ICON / PLACEHOLDER (IMPORTANT) */}
            {!isSubItem && item.icon ? (
              <img src={item.icon} className="h-[1rem] w-[1rem]" />
            ) : (
              <div className="h-[0rem] w-[0rem]" />
            )}

            {/* NAME */}
            <span className="truncate text-[0.7rem]">{item.name}</span>

            {/* RIGHT BUTTON */}
            {!isSubItem && isExpanded ? (
              /* CATEGORY BUTTON */
              <button
                className={`mr-[0.5rem] flex h-[1.25rem] w-[1.25rem] cursor-pointer items-center justify-center border-0 bg-transparent p-[0rem] opacity-0 transition-opacity duration-200 ${isExpanded ? 'opacity-100' : ''} `}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddCompany();
                }}
              >
                <img src={assets.addCompany} className="h-[1rem] w-[1rem]" />
              </button>
            ) : (
              isSubItem && (
                /* SUB ITEM BUTTON */
                <button
                  className={`mr-[1rem] flex h-[1.25rem] w-[1.25rem] cursor-pointer items-center justify-center border-[0rem] bg-transparent p-[0rem] opacity-0 transition-opacity duration-200 group-hover:opacity-100 ${isSubItemActive ? 'opacity-100' : ''} `}
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
              className={`shrink-0 p-[0rem] text-[0.625rem] text-[#392579] transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-0' : ''}`}
            >
              <img
                src={isExpanded ? assets.up_arrow : assets.down_arrow}
                alt=""
                className={'h-[0.75rem] w-[0.75rem] ' + (isExpanded ? 'invert' : 'p-[0rem]')}
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
    <div
      style={{
        scrollbarWidth: 'thin',
        scrollbarColor: 'var(--scrollbar-color-2) transparent',
      }}
      className="h-[42rem] w-[14rem] overflow-x-hidden overflow-y-auto rounded-[0.625rem] border border-[0.063rem] border-[var(--primary-color-grey-2)] bg-[var(--primary-white)] py-[0.7rem]"
    >
      <div>{materialCategories.map((category) => renderMenuItem(category))}</div>
    </div>
  );
};
