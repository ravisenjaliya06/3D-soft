export interface Material {
  id: string;
  name: string;
  description?: string;
  type?: string;
}

export interface RulePart {
  id: string;
  name: string;
  material: Material | null;
  height?: number | null;
  width?: number | null;
  length?: number | null;
  depth?: number | null;
  thickness?: number | null;
  position?: string | null;
  handle_position?: string | null;
  additional_data?: unknown;
}

export interface CatalogRule {
  id: string;
  name: string;
  rule_parts: RulePart[];
}

export interface Catalog {
  id: string;
  type: string;
  name: string;
  description: string;
  catalog_rule: CatalogRule[];
}
