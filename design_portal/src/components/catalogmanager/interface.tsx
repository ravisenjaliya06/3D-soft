import { CatalogRule } from '../3dmodel/handler/interface';

export interface Material {
  id: string;
  name: string;
  description?: string;
  type?: string;
}

export interface Catalog {
  id: string;
  type: string;
  name: string;
  description: string;
  catalog_rules: CatalogRule[];
}
