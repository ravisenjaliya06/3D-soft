import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { useCallback, useState } from 'react';
import { STATIC_MATERIAL_TYPES } from '../constants';
import type { MaterialItem, MaterialResponse, TableRow } from '../types';
import { mapMaterial } from '../utils/materialMapper';

export const useMaterialData = () => {
  const [companyMaterials, setCompanyMaterials] = useState<TableRow[]>([]);
  const [materialCategories, setMaterialCategories] =
    useState<MaterialItem[]>(STATIC_MATERIAL_TYPES);
  const [error, setError] = useState<string | null>(null);

  /** Get all material companies from the API and update the category list */
  const fetchCompanies = useCallback(async () => {
    try {
      const response: MaterialResponse = await commonService.get(
        API_ENDPOINT.GET_MATERIAL_COMPANIES
      );
      if (response.status === 200) {
        const companies: TableRow[] = response.data;
        const updatedCategories = STATIC_MATERIAL_TYPES.map((category) => {
          const matchingCompanies = companies.filter((c) => c.material_type === category.name);
          return {
            ...category,
            subItems: matchingCompanies.map((c) => ({
              id: c.id,
              name: c.name,
            })),
          };
        });
        setMaterialCategories(updatedCategories);
      }
    } catch (error) {
      console.error('Error fetching companies:', error);
      setError('Failed to fetch companies.');
    }
  }, []);

  /** Get materials based on the selected material type */
  const fetchMaterialsByType = useCallback(async (type: string) => {
    try {
      const response: MaterialResponse = await commonService.get(
        API_ENDPOINT.GET_MATERIAL_USING_TYPE(type)
      );

      if (response.status === 200) {
        const materials: TableRow[] = response.data.map((m) => mapMaterial(m, type));
        setCompanyMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching materials by type:', error);
      setError('Failed to fetch materials by type.');
    }
  }, []);

  /** Get all materials that belong to a specific company */
  const fetchCompanyMaterials = useCallback(async (companyId: string) => {
    try {
      const response: MaterialResponse = await commonService.get(
        API_ENDPOINT.GET_COMPANY_MATERIALS(companyId)
      );

      if (response.status === 200) {
        const materials: TableRow[] = response.data.map((m) => mapMaterial(m));
        setCompanyMaterials(materials);
      }
    } catch (error) {
      console.error('Error fetching company materials:', error);
      setError('Failed to fetch company materials.');
    }
  }, []);

  /** Create a new material company and refresh the company list */
  const createCompany = useCallback(
    async (companyName: string, selectedType: string | null) => {
      if (!companyName.trim()) {
        setError('Company name is required');
        return false;
      }

      try {
        const payload = {
          name: companyName,
          material_type: selectedType || '',
        };
        const response = await commonService.post(API_ENDPOINT.CREATE_COMPANY, payload);
        if (response.status === 201 || response.status === 200) {
          setError(null);
          await fetchCompanies();
          return true;
        } else {
          setError('Failed to create company. Try again.');
          return false;
        }
      } catch (err) {
        console.error('Error creating company:', err);
        setError('Something went wrong.');
        return false;
      }
    },
    [fetchCompanies]
  );
 
  /** Delete a material and refresh the list */
  const deleteMaterial = useCallback(
    async (materialId: string, companyId?: string, type?: string) => {
      try {
        const endpoint = companyId
          ? API_ENDPOINT.DELETE_COMPANY_MATERIAL_DETAIL(companyId, materialId)
          : API_ENDPOINT.DELETE_MATERIAL(materialId);
        const response = await commonService.delete(endpoint);
        if (response.status === 204 || response.status === 200) {
          if (companyId) {
            await fetchCompanyMaterials(companyId);
          } else if (type) {
            await fetchMaterialsByType(type);
          }
          return true;
        }
        setError('Failed to delete material.');
        return false;
      } catch (err) {
        console.error('Error deleting material:', err);
        setError('Something went wrong during deletion.');
        return false;
      }
    },
    [fetchCompanyMaterials, fetchMaterialsByType]
  );
 
  return {
    companyMaterials,
    materialCategories,
    error,
    setError,
    fetchCompanies,
    fetchMaterialsByType,
    fetchCompanyMaterials,
    createCompany,
    deleteMaterial,
  };
};
