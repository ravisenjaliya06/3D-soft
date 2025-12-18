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
}) => {
  const renderMenuItem = (item: MaterialItem, parentType?: string) => {
    const isExpanded = expandedCategory === item.id;
    const hasSubItems = item.subItems && item.subItems.length > 0;
    const isSubItem = !!parentType;
    const isSubItemActive = isSubItem && selectedSubItem === item.id;

    return (
      <div
        key={item.id}
        onContextMenu={(e) => {
          if (!parentType) {
            onContextMenu(e, item.id, item.name);
          }
        }}
      >
        <div
          className={`mx-[0.5rem] my-[0.08rem] flex cursor-pointer items-center justify-between rounded-[0.375rem] py-[0.75rem] pr-[1.2rem] pl-[0.6rem] text-[0.875rem] transition-all duration-[0.2s] ease-in-out hover:bg-[var(--primary-hover)] ${isSubItemActive ? 'bg-[var(--primary-hover)] font-semibold text-[#392579]' : ''} ${!isSubItem && isExpanded ? `bg-[var(--primary-hover)] font-semibold text-[var(--primary-white)]` : ''}`}
          onClick={() => {
            if (!isSubItem) {
              onToggleCategory(item.id);
              onCategoryClick(item.id, item.name);
            } else {
              onSubItemClick(item.id);
            }
          }}
        >
          <div className="flex min-w-0 flex-1 items-center gap-[0.75rem]">
            {!isSubItem && item.icon && (
              <span className="text-center text-[0.875rem]">
                <img
                  src={item.icon || '/placeholder.svg'}
                  alt=""
                  className={`h-4 w-4 ${isExpanded ? 'bg-[var(--primary-hover)] brightness-[#392579] invert' : ''}`}
                />
              </span>
            )}
            <span
              className={`overflow-hidden text-[0.7rem] ${isExpanded ? 'text-[#392579]' : 'text-[var(--primary-color)]'}`}
            >
              {item.name}
            </span>
          </div>
          {!isSubItem && hasSubItems && (
            <span
              className={`shrink-0 text-[0.625rem] text-[#392579] transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-0' : ''}`}
            >
              <img
                src={isExpanded ? assets.up_arrow : assets.down_arrow}
                alt=""
                className={isExpanded ? 'invert' : ''}
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
      className={`${styles.custom_scrollbar} h-[42rem] w-[14rem] overflow-x-hidden overflow-y-auto rounded-[0.3rem] border border-[0.063rem] border-[var(--primary-color-grey-2)] bg-[var(--primary-white)]`}
    >
      <div className="rounded-[10px] py-[0.7rem]">
        {materialCategories.map((category) => renderMenuItem(category))}
      </div>
    </div>
  );
};
