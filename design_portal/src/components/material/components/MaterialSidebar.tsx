import { getMaterialTypeIcon } from '@/components/common/materialTypeIcons';
import type React from 'react';
import { LuBuilding2, LuPlus, LuStore } from 'react-icons/lu';
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

/**
 * Material "shelf": material types as a horizontal strip, and the
 * suppliers (companies) of the open type as a bar underneath.
 * Same handlers as the former vertical category list.
 */
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
  const openCategory = materialCategories.find((c) => c.id === expandedCategory);
  const suppliers = openCategory?.subItems || [];

  return (
    <section className={styles.categoryPanel} aria-label="Material types and suppliers">
      {/* Row 1: material types */}
      <div className={styles.shelfHead}>
        <span className={styles.shelfEyebrow}>Material types</span>
        <span className={styles.sidebarCount}>{materialCategories.length}</span>
      </div>

      <div className={`${styles.scrollContainer} ${styles.categoryList}`} role="tablist">
        {materialCategories.map((item) => {
          const isExpanded = expandedCategory === item.id;
          const CategoryIcon = getMaterialTypeIcon(item.name);
          const supplierCount = item.subItems?.length || 0;

          return (
            <button
              type="button"
              key={item.id}
              role="tab"
              aria-selected={isExpanded}
              className={`${styles.navItem} ${isExpanded ? styles.navItemActive : ''}`}
              onContextMenu={(e) => onContextMenu(e, item.id, item.name)}
              onClick={() => {
                onToggleCategory(item.id);
                onCategoryClick(item.id, item.name);
              }}
            >
              <span className={styles.navIcon}>
                <CategoryIcon aria-hidden="true" />
              </span>
              <span className={styles.navLabel}>{item.name}</span>
              {supplierCount > 0 && (
                <span className={styles.navCount} title={`${supplierCount} suppliers`}>
                  {supplierCount}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Row 2: suppliers of the open type */}
      {openCategory && (
        <div className={styles.subItemsContainer}>
          <div className={styles.supplierLead}>
            <LuStore aria-hidden="true" />
            <span>
              Suppliers in <strong>{openCategory.name}</strong>
            </span>
          </div>

          <button
            type="button"
            className={styles.addSupplierBtn}
            onClick={(e) => {
              e.stopPropagation();
              onAddCompany();
              setMaterialType(openCategory.name);
            }}
          >
            <LuPlus aria-hidden="true" />
            New supplier
          </button>

          <div className={`${styles.scrollContainer} ${styles.supplierList}`}>
            {suppliers.length === 0 && (
              <span className={styles.supplierEmpty}>
                No suppliers yet — add one to start listing materials.
              </span>
            )}

            {suppliers.map((subItem) => {
              const isActive = selectedSubItem === subItem.id;
              return (
                <div
                  key={subItem.id}
                  className={`${styles.navSubItem} ${isActive ? styles.navSubItemActive : ''}`}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    onMaterialContextMenu(e, subItem.id);
                  }}
                  onClick={() => onSubItemClick(subItem.id)}
                >
                  <LuBuilding2 className={styles.navSubIcon} aria-hidden="true" />
                  <span className={styles.navLabel}>{subItem.name}</span>
                  <button
                    type="button"
                    className={`${styles.navAction} ${styles.navActionHover} ${
                      isActive ? styles.navActionVisible : ''
                    }`}
                    title="Add material"
                    aria-label={`Add material for ${subItem.name}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onSubItemClick(subItem.id);
                      setCompanyID(subItem.id);
                      setAddMaterialPopup(true);
                    }}
                  >
                    <LuPlus aria-hidden="true" />
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
};
