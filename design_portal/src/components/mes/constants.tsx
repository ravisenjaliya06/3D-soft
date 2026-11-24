export const BOM_CUTTING_HEADERS = [
  'Part ID',
  'Part Name',
  'Cabinet/Assembly',
  'Material',
  'Thickness',
  'Length',
  'Width',
  'Qty',
  'Area (sqm)',
  'Grain Dir',
  'Edge L1',
  'Edge L2',
  'Edge W1',
  'Edge W2',
];

export const BOM_PANEL_HEADERS = [
  'Material Type',
  'Thickness',
  'Sheet Size',
  'Sheets Required',
  'Sheet Cost',
  'Wastage %',
  'Total Material Cost',
  'Total Labor Cost',
];

export const BOM_EDGE_HEADERS = [
  'Part ID',
  'Part Name',
  'Edge Type',
  'Thickness',
  'Total Length (m)',
  'Rate/m',
  'Total Cost',
  'Remarks',
];

export const BOM_HARDWARE_HEADERS = [
  'Hardware ID',
  'Item Name',
  'Specification',
  'Brand',
  'Qty',
  'Unit Price',
  'Installation',
  'Total Cost',
  'Supplier',
];

export const QUOTATION_HEADERS = [
  'Sr.',
  'Unit/Component Description',
  'Dimensions (L×W×H)',
  'Material',
  'Qty',
  'Rate/Unit',
  'Amount',
  'HSN',
  'GST%',
];

export const PDF_THEME = {
  titleColor: [6, 93, 120] as [number, number, number],
  lightGray: [242, 242, 242] as [number, number, number],
  tableHeaderBg: [0, 0, 0] as [number, number, number],
  tableHeaderText: [255, 255, 255] as [number, number, number],
  border: [180, 180, 180] as [number, number, number],
};

export const getQuoteTerms = () => [
  '1. PAYMENT TERMS:',
  '   - 40% advance payment with purchase order confirmation',
  '   - 30% payment upon material delivery and start of manufacturing',
  '   - 20% payment upon installation completion',
  '   - 10% final payment after client sign-off and handover',
  '',
  '2. DELIVERY & INSTALLATION:',
  '   - Manufacturing time: 15-20 working days from order confirmation and advance payment',
  '   - Installation time: 3-4 working days (subject to site readiness)',
  '   - Site should be ready with completed flooring, painting, electrical points, and civil work',
  '   - Customer to provide permissions for material delivery and installation access',
  '',
  '3. WARRANTY:',
  '   - 1 year comprehensive warranty on manufacturing defects and workmanship',
  '   - 5 years warranty on branded hardware (Blum/Hettich/Hafele/Ebco) as per manufacturer terms',
  '   - Warranty does not cover misuse, mishandling, accidents, or natural wear and tear',
  '   - Annual maintenance contract available separately after warranty period',
  '',
  '4. INCLUSIONS:',
  '   - All materials as per detailed specifications mentioned above',
  '   - Complete manufacturing with CNC cutting, drilling, edge banding, and finishing',
  '   - Transportation to site within Ahmedabad city limits (25 km radius)',
  '   - Complete on-site installation, assembly, fitting, and alignment',
  '   - Final cleaning and handover with care & maintenance instructions',
  '',
  '5. EXCLUSIONS:',
  '   - Any civil work, masonry work, electrical work, plumbing, or painting work',
  '   - Structural modifications or wall preparation work',
  '   - Loading/unloading charges at site (if elevator not available above 2nd floor)',
  '   - Transportation beyond 25 km from our factory (extra charges applicable)',
  '   - Any items not specifically mentioned in this quotation',
  '',
  '6. DESIGN & CHANGES:',
  '   - Design approval to be taken before manufacturing starts',
  '   - Any design changes after approval will attract additional charges (minimum 15% of changed items)',
  '   - Material/hardware changes subject to availability and price revision',
  '   - Final measurements to be taken at site before manufacturing',
  '',
  '7. GENERAL TERMS:',
  '   - Quotation validity: 30 days from issue date',
  '   - GST charged as per prevailing rates at billing time',
  '   - All disputes subject to Ahmedabad jurisdiction only',
  '   - Material specifications are subject to availability; equivalent quality alternatives may be provided with customer consent',
  '   - Payment should be made via cheque/NEFT/RTGS in favour of the company named on this quotation',
  '   - Any additional work during installation is chargeable',
];

export const PRICING = {
  laborRate: 0.2,
  markupMultiplier: 1.5,
  defaultSheetCost: 1500,
  minRateThreshold: 1000,
  minRateValue: 1500,
  installationRate: 0.05,
  gstRate: 0.09,
  edgeRatePerMeter: 25,
  sheetAreaSqm: 2.44 * 1.22,
};

export const QUOTE_VALIDITY_DAYS = 30;
export const EDGE_FACE_LEFT = ['LEFT', 'L', '5', 'FRONT'];
export const EDGE_FACE_RIGHT = ['RIGHT', 'R', '3', 'BACK'];
export const EDGE_FACE_TOP = ['TOP', 'T', '4', '1'];
export const EDGE_FACE_BOTTOM = ['BOTTOM', 'B', '2', '6'];
