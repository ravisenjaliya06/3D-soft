import { API_ENDPOINT } from '@/services/ApiEndpoints';
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

  return {
    companyMaterials,
    materialCategories,
    error,
    setError,
    fetchCompanies,
    fetchMaterialsByType,
    fetchCompanyMaterials,
    createCompany,
  };
};
