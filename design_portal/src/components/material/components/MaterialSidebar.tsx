import down_arrow from '@/assets/material/down arrow.svg';
import up_arrow from '@/assets/material/up arrow.svg';
import type React from 'react';
import styles from '../material.module.css';
import type { MaterialItem } from '../types';

interface MaterialSidebarProps {
  materialCategories: MaterialItem[];
  expandedCategory: string;
  onCategoryClick: (categoryId: string, name: string) => void;
  onToggleCategory: (categoryId: string) => void;
  onSubItemClick: (itemId: string) => void;
  onContextMenu: (
    e: React.MouseEvent,
    categoryId: string,
    name: string,
  ) => void;
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
        className={styles.categoryContainer}
        onContextMenu={(e) => {
          if (!parentType) {
            onContextMenu(e, item.id, item.name);
          }
        }}
      >
        <div
          className={`${styles.categoryItem} ${isExpanded ? styles.expanded : ''}`}
          onClick={() => {
            if (!isSubItem) {
              onToggleCategory(item.id);
              onCategoryClick(item.id, item.name);
            } else {
              onSubItemClick(item.id);
            }
          }}
        >
          <div className={styles.categoryContent}>
            {!isSubItem && item.icon && (
              <span className={styles.categoryIcon}>
                <img src={item.icon || '/placeholder.svg'} alt="" />
              </span>
            )}
            <span className={styles.categoryName}>{item.name}</span>
          </div>
          {!isSubItem && hasSubItems && (
            <span className={styles.dropdownArrow}>
              <img src={isExpanded ? up_arrow.src : down_arrow.src} alt="" />
            </span>
          )}
        </div>

        {hasSubItems && isExpanded && !isSubItem && (
          <div className={styles.subItemsContainer}>
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
    <div className={styles.materialleftside}>
      <div className={styles.menuContainer}>
        {materialCategories.map((category) => renderMenuItem(category))}
      </div>
    </div>
  );
};
