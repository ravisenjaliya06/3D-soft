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

export interface RulePart {
  id: string;
  name?: string;
  material?: RulePartMaterial;
  length?: number | null;
  width?: number | null;
  height?: number | null;
  depth?: number | null;
  position?: unknown;
  handle_position?: unknown;
}

export interface CatalogRule {
  id: string;
  name: string;
  rule_parts: RulePart[];
}

export interface MaterialChangePopupProps {
  onClose: () => void;
  onSave: (selectedMaterials: string[]) => void;
  rules?: CatalogRule[];
}
