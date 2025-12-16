import { assets } from '@/svgPaths';
import type React from 'react';
import type { MaterialItem } from '../types';

interface MaterialSidebarProps {
  materialCategories: MaterialItem[];
  expandedCategory: string;
  onCategoryClick: (categoryId: string, name: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onSubItemClick: (itemId: string) => void;
  onContextMenu: (e: React.MouseEvent, categoryId: string, name: string) => void;
  onMaterialContextMenu: (e: React.MouseEvent, companyId: string) => void;
}

export const MaterialSidebar: React.FC<MaterialSidebarProps> = ({
  materialCategories,
  expandedCategory,
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
          className={`flex items-center justify-between py-[0.75rem] pl-[0.6rem] pr-[1.2rem] cursor-pointer transition-all duration-[0.2s] ease-in-out rounded-[0.375rem] mx-[0.5rem] my-[0.08rem] text-[0.875rem] hover:bg-[var(--primary-hover)] ${isExpanded ? `bg-[var(--primary-hover)] text-[var(--primary-white)] font-semibold` : ''}`}
          onClick={() => {
            if (!isSubItem) {
              onToggleCategory(item.id);
              onCategoryClick(item.id, item.name);
            } else {
              onSubItemClick(item.id);
            }
          }}
        >
          <div className="flex items-center gap-[0.75rem] flex-1 min-w-0">
            {!isSubItem && item.icon && (
              <span className="text-[0.875rem] text-center">
                <img src={item.icon || '/placeholder.svg'} alt="" className={`w-4 h-4 ${isExpanded ? 'invert brightness-[#392579] bg-[var(--primary-hover)]' : ''}`} />
              </span>
            )}
            <span className={`text-[0.7rem] overflow-hidden font-[var(--font-family)] ${isExpanded ? 'text-[#392579]' : 'text-[var(--primary-color)]'}`}>{item.name}</span>
          </div>
          {!isSubItem && hasSubItems && (
            <span className={`text-[0.625rem] transition-transform duration-200 ease-in-out text-[#392579] shrink-0 ${isExpanded ? 'rotate-0' : ''}`}>
              <img src={isExpanded ? assets.up_arrow : assets.down_arrow} alt="" className={isExpanded ? 'invert' : ''} />
            </span>
          )}
        </div>

        {hasSubItems && isExpanded && !isSubItem && (
          <div className="relative ml-6 mb-1 pl-0 animate-slide-down">
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
    <div className="w-[14rem] h-[42rem] custom-scrollbar bg-[var(--primary-white)] rounded-[0.3rem] border border-[0.063rem] border-[var(--primary-color-grey-2)] overflow-y-auto overflow-x-hidden ">
      <div className='py-[0.7rem] rounded-[10px]'>
        {materialCategories.map((category) => renderMenuItem(category))}
      </div>
    </div>
  );
};
