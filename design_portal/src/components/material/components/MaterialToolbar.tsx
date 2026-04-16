import { assets } from '@/svgPaths';
import type React from 'react';

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
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      height: '3.5rem',
      padding: '0 1.25rem',
      background: 'white',
      borderRadius: '0.175rem',
      border: '1px solid #e8eaf0',
      boxShadow: '0 1px 6px rgba(57,37,121,0.06)',
      flexShrink: 0,
      gap: '1rem',
    }}>
      {/* Left — Breadcrumb */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
        {selectedType ? (
          <>
            <span style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: 'var(--primary-color)',
              letterSpacing: '-0.01em',
              whiteSpace: 'nowrap',
            }}>
              {selectedType}
            </span>
            {selectedName && (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="#b0b8c9" strokeWidth={2.5} width={10} height={10}>
                  <path strokeLinecap="round" d="m9 18 6-6-6-6" />
                </svg>
                <span style={{ fontSize: '0.78rem', color: '#7c8db5', fontWeight: 500, whiteSpace: 'nowrap' }}>
                  {selectedName}
                </span>
              </>
            )}
          </>
        ) : (
          <span style={{ fontSize: '0.82rem', color: '#b0b8c9', fontWeight: 500 }}>Select a category</span>
        )}
      </div>

      {/* Right — Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginLeft: 'auto', flexShrink: 0 }}>
        {/* Filter */}
        <button
          title="Filter"
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            width: '2.1rem', height: '2.1rem', borderRadius: '0.5rem',
            border: '1px solid #e8eaf0', background: 'white', cursor: 'pointer',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background = '#f4f0ff'; (e.currentTarget as HTMLButtonElement).style.borderColor = 'var(--primary-color)'; }}
          onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background = 'white'; (e.currentTarget as HTMLButtonElement).style.borderColor = '#e8eaf0'; }}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="var(--primary-color)" strokeWidth={2} width={14} height={14} style={{ opacity: 0.7 }}>
            <path strokeLinecap="round" d="M3 6h18M7 12h10M11 18h2" />
          </svg>
        </button>

        {/* Search */}
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <svg
            viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth={2.5}
            width={13} height={13}
            style={{ position: 'absolute', left: '0.7rem', pointerEvents: 'none' }}
          >
            <circle cx="11" cy="11" r="6" />
            <path strokeLinecap="round" d="m20 20-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search materials..."
            style={{
              height: '2.1rem',
              width: '16rem',
              borderRadius: '0.5rem',
              border: '1px solid #e8eaf0',
              background: '#f9fafc',
              color: '#2d2d3a',
              fontSize: '0.8rem',
              paddingLeft: '2.2rem',
              paddingRight: '0.85rem',
              outline: 'none',
              transition: 'all 0.2s ease',
              fontFamily: 'inherit',
            }}
            onFocus={e => { e.currentTarget.style.borderColor = 'var(--primary-color)'; e.currentTarget.style.background = 'white'; e.currentTarget.style.boxShadow = '0 0 0 3px rgba(57,37,121,0.08)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = '#e8eaf0'; e.currentTarget.style.background = '#f9fafc'; e.currentTarget.style.boxShadow = 'none'; }}
          />
        </div>

        {/* Action Button from parent */}
        {actionButton}
      </div>
    </div>
  );
};
