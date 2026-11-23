import { getMaterialTypeIcon } from '@/components/common/materialTypeIcons';
import type React from 'react';
import { LuChevronRight, LuSearch, LuSlidersHorizontal } from 'react-icons/lu';
import styles from '../material.module.css';

interface MaterialToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  actionButton?: React.ReactNode;
  selectedType?: string | null;
  selectedName?: string | null;
}

export const MaterialToolbar: React.FC<MaterialToolbarProps> = ({
  searchQuery,
  onSearchChange,
  actionButton,
  selectedType,
  selectedName,
}) => {
  const TypeIcon = getMaterialTypeIcon(selectedType);

  return (
    <div className={styles.toolbar}>
      {/* Left side — Type / Name breadcrumb */}
      <div className={styles.breadcrumb}>
        {selectedType ? (
          <>
            <span className={styles.breadcrumbIcon}>
              <TypeIcon aria-hidden="true" />
            </span>
            <div>
              <span className={styles.breadcrumbEyebrow}>Material library</span>
              <div className={styles.breadcrumbTrail}>
                <span className={styles.breadcrumbType}>{selectedType}</span>
                {selectedName && (
                  <>
                    <LuChevronRight className={styles.breadcrumbSep} aria-hidden="true" />
                    <span className={styles.breadcrumbName}>{selectedName}</span>
                  </>
                )}
              </div>
            </div>
          </>
        ) : (
          <span className={styles.breadcrumbEyebrow}>Material library</span>
        )}
      </div>

      {/* Right side — filter + search + action */}
      <div className={styles.toolbarRight}>
        <button type="button" className={styles.toolbarIconBtn} aria-label="Filter" title="Filter">
          <LuSlidersHorizontal aria-hidden="true" />
        </button>
        <div className={styles.toolbarSearch}>
          <LuSearch className={styles.toolbarSearchIcon} aria-hidden="true" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search materials…"
          />
        </div>

        {actionButton}
      </div>
    </div>
  );
};
