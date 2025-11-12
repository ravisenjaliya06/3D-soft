import { CatalogRule } from '../handler/interface';

export interface MaterialResponse {
  id: string;
  name: string;
  type: string;
  description?: string | null;
  company?: string | null;
  is_deleted?: boolean;
  finish_types?: string[];
  finishes?: string[];
  textures?: string[];
  proparties?: {
    [key: string]: string | number | boolean;
  };
}

export interface RulePartMaterial {
  id?: string;
  name?: string;
}

export interface MaterialChangePopupProps {
  onClose: () => void;
  onSave: (selectedMaterials: string[]) => void;
  rules?: CatalogRule[];
}
