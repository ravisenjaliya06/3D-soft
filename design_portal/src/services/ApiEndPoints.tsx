export const API_ENDPOINT = {
  //GET
  GET_DESIGNS: 'design/',
  GET_MATERIAL: 'material/',
  GET_USER_DETAILS: 'user/',
  GET_ORGANIZATION_USERS: 'user/organization/users/',
  GET_ORGANIZATION_DETAILS: 'user/organization/details/',
  GET_DESIGN_SETTING: 'design/setting/',
  GET_DEFAULT_CATALOG: 'design/catalog/default/',
  GET_CATALOG_ITEMS: 'material/catalog/',
  GET_NON_CUSTOM_DESIGNS: 'design/?is_custom=false',
  GET_MATERIAL_COMPANIES: 'material/company/',
  GET_DESIGN_NESTING: (designID: string) => `design/${designID}/nesting/`,
  GET_DESIGN_SETTINGS: (designID: string) => `design/${designID}/settings/`,
  GET_DESIGN_NESTING_SHEET: (designID: string, sheetID: string) =>
    `design/${designID}/catalog/item/${sheetID}/`,
  GET_DESIGN_OBJECTS: (designID: string) => `material/catalog/?design_id=${designID}`,
  GET_MATERIAL_USING_TYPE: (type: string) => `material/?type=${type}`,
  GET_COMPANY_MATERIALS: (companyID: string) => `material/company/${companyID}/material/`,
  GET_CATALOG_USING_TYPE: (type: string) => `material/catalog/?type=${type}`,
  GET_CATALOG_RULES_PARTS: (ruleID: string) => `material/catalog_rules/${ruleID}/parts/`,

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
  CREATE_COMPANY_MATERIAL: (companyID: string) => `material/company/${companyID}/material/`,
  CREATE_DESIGN_OBJECT: (designID: string) => `design/${designID}/object/`,
  CREATE_CATALOG_ITEM: (designID: string, catalogID: string) =>
    `design/${designID}/catalog/${catalogID}/item/`,
  CREATE_MATERIAL_DESIGN_CATALOG: (catalogID: string) => `material/catalog/${catalogID}/design/`,

  //PUT
  UPDATE_USER_DETAILS: 'user/',
  UPDATE_ORGANIZATION_DETAILS: 'user/organization/update/',
  UPDATE_DESIGN_SETTING: 'design/setting/',
  EDIT_ORGANIZATION_USER: (userID: string) => `user/organization/edit_user/${userID}/`,
  UPDATE_DESIGN_DETAILS: (designID: string) => `design/${designID}/`,
  UPDATE_OBJECT_DATA: (designID: string) => `design/${designID}/object/`,
  UPDATE_OBJECT_ITEMS_DATA: (designID: string, itemID: string) =>
    `design/${designID}/object/${itemID}/`,
  UPDATE_DESIGN_SETTINGS: (designID: string) => `design/${designID}/settings/`,
  UPDATE_PART_MATERIAL: (partID: string) => `material/catalog/part/${partID}/`,
  DOWNLOAD_NESTING_PDF: (designID: string) => `design/${designID}/nesting/download/`,

  //DELETE
  REMOVE_USER_FROM_ORGANIZATION: (userID: string) => `user/organization/remove_user/${userID}/`,
  DELETE_ALL_OBJECTS: (designID: string) => `material/catalog/design/${designID}/`,
  DELETE_OBJECT: (designID: string) => `design/${designID}/object/`,
};
