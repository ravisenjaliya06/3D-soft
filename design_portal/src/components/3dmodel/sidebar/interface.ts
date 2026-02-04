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

export type Field = 'width' | 'height' | 'depth';

export type Axis = 'x' | 'y' | 'z';

export const MATERIAL_TYPES = {
  COLOR: 'COLOR',
  TEXTURE: 'TEXTURE',
} as const;

// Create a type from the constant values
export type MaterialType = keyof typeof MATERIAL_TYPES;

export interface MaterialForUpdate {
  type: MaterialType;
  value: string;
}

export type Direction = 'left' | 'right' | 'top' | 'bottom';

export interface DistanceInputProps {
  label: string;
  direction: string;
  rotate: string;
  width: string;
  value: number | null;
  disabled: boolean;
  onChange: (direction: string, value: number) => void;
}
