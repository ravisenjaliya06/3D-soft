import type React from 'react';
import styles from '../material.module.css';
import type { ContextMenu, MaterialContextMenu } from '../types';

interface ContextMenusProps {
  contextMenu: ContextMenu | null;
  contextMaterialMenu: MaterialContextMenu | null;
  onAddCompany: () => void;
  onAddMaterial: (companyId: string) => void;
}

export const ContextMenus: React.FC<ContextMenusProps> = ({
  contextMenu,
  onAddCompany,
}) => {
  return (
    <>
      {contextMenu && (
        <div
          className={styles.contextMenu}
          style={{
            top: contextMenu.y,
            left: contextMenu.x,
            position: 'absolute',
          }}
        >
          <button className={styles.contextMenuItem} onClick={onAddCompany}>
            ➕ Add Company
          </button>
        </div>
      )}
    </>
  );
};
