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
      <div key={item.id} onContextMenu={(e) => { if (!parentType) onContextMenu(e, item.id, item.name); }}>
        <div
          className={styles.sidebarItem}
          data-active={!isSubItem && isExpanded ? 'category' : isSubItemActive ? 'subitem' : undefined}
          onClick={() => {
            if (!isSubItem) {
              onToggleCategory(item.id);
              onCategoryClick(item.id, item.name);
            } else {
              onSubItemClick(item.id);
            }
          }}
        >
          {/* Left accent bar */}
          {(isExpanded && !isSubItem) || isSubItemActive ? (
            <div className={styles.sidebarItemAccent} />
          ) : null}

          {/* Icon */}
          {!isSubItem && item.icon ? (
            <img
              src={item.icon}
              className={`${styles.sidebarItemIcon} ${isExpanded ? styles.sidebarItemIconActive : ''}`}
            />
          ) : (
            <div className={styles.sidebarSubDot} />
          )}

          {/* Name */}
          <span className={`${styles.sidebarItemName} ${isSubItemActive ? styles.sidebarItemNameActive : ''} ${isExpanded && !isSubItem ? styles.sidebarItemNameActive : ''}`}>
            {item.name}
          </span>

          {/* Right actions */}
          <div className={styles.sidebarItemActions}>
            {!isSubItem && isExpanded && (
              <button
                className={styles.sidebarAddBtnCategory}
                onClick={(e) => {
                  e.stopPropagation();
                  onAddCompany();
                  setMaterialType(item.name);
                }}
                title="Add company"
              >
                {/* Folder-plus icon for category */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} width={14} height={14}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 10v6m-3-3h6M2 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2z" />
                </svg>
              </button>
            )}
            {isSubItem && (
              <button
                className={styles.sidebarAddBtnSub}
                onClick={(e) => {
                  e.stopPropagation();
                  onSubItemClick(item.id);
                  setCompanyID(item.id);
                  setAddMaterialPopup(true);
                }}
                title="Add material"
              >
                {/* Document-plus icon for sub-item */}
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} width={13} height={13}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 13h6m-3-3v6M5 3h9l5 5v13a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z" />
                </svg>
              </button>
            )}
            {!isSubItem && hasSubItems && (
              <svg
                viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}
                className={`${styles.chevron} ${isExpanded ? styles.chevronOpen : ''}`}
                width={11} height={11}
              >
                <path strokeLinecap="round" d="m6 9 6 6 6-6" />
              </svg>
            )}
          </div>
        </div>

        {hasSubItems && isExpanded && !isSubItem && (
          <div className={styles.subItemsList}>
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
    <div className={styles.sidebarContainer}>
      {/* Header */}
      <div className={styles.sidebarHeader}>
        <div className={styles.sidebarHeaderIcon}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} width={13} height={13}>
            <path d="M4 6h16M4 10h16M4 14h8M4 18h8" strokeLinecap="round" />
          </svg>
        </div>
        <span className={styles.sidebarHeaderTitle}>Categories</span>
        <span className={styles.sidebarHeaderCount}>{materialCategories.length}</span>
      </div>

      {/* Items */}
      <div className={`${styles.scrollContainer} ${styles.sidebarItems}`}>
        {materialCategories.map((category) => renderMenuItem(category))}
      </div>
    </div>
  );
};
