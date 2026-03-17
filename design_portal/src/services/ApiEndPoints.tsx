export const API_ENDPOINT = {
  //GET
  GET_DESIGNS: 'design/',
  GET_MATERIAL: 'material/',
  GET_USER_DETAILS: 'user/',
  GET_ORGANIZATION_USERS: 'user/organization/users/',
  GET_ORGANIZATION_DETAILS: 'user/organization/details/',
  GET_DESIGN_SETTING: 'design/setting/',
  GET_CATALOG_ITEMS: 'design/catalogs/',
  GET_NON_CUSTOM_DESIGNS: 'design/?is_custom=false',
  GET_MATERIAL_COMPANIES: 'material/company/',
  GET_TEXTURES: 'material/finishes/?type=Texture',
  GET_DESIGN_CATALOG_ITEMS: (design_id: string, version_id?: string) =>
    `design/catalogs/?design_id=${design_id}${version_id ? `&version_id=${version_id}` : ''}`,
  GET_DESIGN_SETTINGS: (designID: string) => `design/${designID}/settings/`,
  GET_DESIGN_NESTING_SHEET: (designID: string, sheetID: string) =>
    `design/${designID}/catalog/item/${sheetID}/`,
  GET_DESIGN_OBJECTS: (designID: string) => `material/catalog/?design_id=${designID}`,
  GET_MATERIAL_USING_TYPE: (type: string) => `material/?type=${type}`,
  GET_COMPANY_MATERIALS: (companyID: string) => `material/company/${companyID}/material/`,
  GET_CATALOG_USING_TYPE: (type: string) => `material/catalog/?type=${type}`,
  GET_CATALOG_RULES_PARTS: (ruleID: string) => `material/catalog_rules/${ruleID}/parts/`,
  GET_NESTING_SHEETS: (designID: string) => `design/sheets/?design_id=${designID}`,
  GET_NESTING_SHEET_DETAIL: (designID: string, sheetNumber: number) =>
    `design/${designID}/sheets/?sheet_number=${sheetNumber}`,
  GET_NESTING_FILES: (designID: string) => `design/files/?design_id=${designID}`,
  GET_NESTING_FILES_BY_SHEET: (designID: string, sheetNumber: number) =>
    `design/files/?design_id=${designID}&sheet_number=${sheetNumber}`,

  //POST
  LOGIN: 'user/login/',
  REGISTER: 'user/register/',
  FORGOT_PASSWORD: 'user/forgot_password/',
  SENT_OTP: 'user/otp/',
  VALIDATE_OTP: 'user/otp/validate/',
  ADD_ORGANIZATION_USER: 'user/organization/add_user/',
  CREATE_DESIGN: 'design/',
  CREATE_MATERIAL_CATALOG: 'material/catalog/',
  CREATE_COMPANY: 'material/company/',
  CREATE_WORKORDER: 'mes_portal/work_order/',
  CREATE_MATERIAL_WITHOUT_CATALOG: 'material/catalog/design/',
  CREATE_CATALOGS: 'design/catalogs/',
  CREATE_LIBRARY_CATALOGS: (is_library: boolean, is_catalog?: boolean) => {
    const params = new URLSearchParams({
      is_library: String(is_library),
    });

    if (is_catalog !== undefined) {
      params.append('is_catalog', String(is_catalog));
    }

    return `design/catalogs/?${params.toString()}`;
  },
  CREATE_COMPANY_MATERIAL: (companyID: string) => `material/company/${companyID}/material/`,
  CREATE_DESIGN_OBJECT: (designID: string) => `design/${designID}/object/`,
  CREATE_MATERIAL_DESIGN_CATALOG: (catalogID: string) => `material/catalog/${catalogID}/design/`,
  CREATE_DESIGN_NESTING: (designID: string) => `design/${designID}/nesting/`,
  CLEAR_RENDER_IMAGES: (designID: string) => `design/${designID}/render-images/clear/`,
  UPLOAD_RENDER_IMAGE: (designID: string) => `design/${designID}/render-images/`,

  //PUT
  UPDATE_USER_DETAILS: 'user/',
  UPDATE_ORGANIZATION_DETAILS: 'user/organization/update/',
  UPDATE_DESIGN_SETTING: 'design/setting/',
  EDIT_ORGANIZATION_USER: (userID: string) => `user/organization/edit_user/${userID}/`,
  GET_DESIGN_DETAILS: (designID: string) => `design/${designID}/`,
  UPDATE_DESIGN_DETAILS: (designID: string) => `design/${designID}/`,
  UPDATE_OBJECT_DATA: (designID: string) => `design/${designID}/object/`,
  UPDATE_DESIGN_SETTINGS: (designID: string) => `design/${designID}/settings/`,
  UPDATE_PART_MATERIAL: (partID: string) => `material/catalog/part/${partID}/`,
  UPDATE_MATERIAL: (materialID: string) => `material/${materialID}/`,
  UPDATE_COMPANY_MATERIAL_DETAIL: (companyID: string, materialID: string) =>
    `material/company/${companyID}/material/${materialID}/`,
  DOWNLOAD_NESTING_PDF: (designID: string) => `design/${designID}/nesting/download/`,

  //DELETE
  REMOVE_USER_FROM_ORGANIZATION: (userID: string) => `user/organization/remove_user/${userID}/`,
  DELETE_ALL_OBJECTS: (designID: string) => `material/catalog/design/${designID}/`,
  DELETE_OBJECT: (designID: string) => `design/${designID}/object/`,
  DELETE_MATERIAL: (materialID: string) => `material/${materialID}/`,
  DELETE_COMPANY_MATERIAL_DETAIL: (companyID: string, materialID: string) =>
    `material/company/${companyID}/material/${materialID}/`,
};
