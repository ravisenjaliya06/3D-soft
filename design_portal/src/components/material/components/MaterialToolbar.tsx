import filter from '@/assets/material/filter.svg';
import type React from 'react';
import styles from '../material.module.css';

interface MaterialToolbarProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export const MaterialToolbar: React.FC<MaterialToolbarProps> = ({
  searchQuery,
  onSearchChange,
}) => {
  return (
    <div className={styles.topToolbar}>
      <div className={styles.toolbarLeft}>
        {/* Dropdown can be added here if needed */}
      </div>

      <div className={styles.toolbarRight}>
        <button className={styles.filterButton}>
          <img src={filter.src || '/placeholder.svg'} alt="" />
        </button>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search..."
            className={styles.searchInput}
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
          />
          <svg
            className={styles.searchIcon}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
        </div>
      </div>
    </div>
  );
};
