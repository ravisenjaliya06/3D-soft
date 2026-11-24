import { useMinimumVisible } from '@/components/common/useMinimumVisible';
import PhinxLoader from '@/components/common/PhinxLoader';
import { hideFullScreenLoader, showFullScreenLoader } from '@/components/3dmodel/handler/items';
import { RootState } from '@/components/3dmodel/store';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useRouter } from 'next/router';
import { useEffect, useRef, useState } from 'react';
import {
  LuArrowLeft,
  LuArrowRight,
  LuChevronDown,
  LuChevronsDown,
  LuClipboardList,
  LuDownload,
  LuFileCode2,
  LuFileSpreadsheet,
  LuFileText,
  LuLayers,
  LuLayoutGrid,
  LuPackageOpen,
  LuReceiptText,
} from 'react-icons/lu';
import { useSelector } from 'react-redux';
import * as XLSX from 'xlsx-js-style';
import styles from '../mes/nesting.module.css';
import {
  BOM_CUTTING_HEADERS,
  BOM_EDGE_HEADERS,
  BOM_HARDWARE_HEADERS,
  BOM_PANEL_HEADERS,
  EDGE_FACE_BOTTOM,
  EDGE_FACE_LEFT,
  EDGE_FACE_RIGHT,
  EDGE_FACE_TOP,
  getQuoteTerms,
  PDF_THEME,
  PRICING,
  QUOTATION_HEADERS,
  QUOTE_VALIDITY_DAYS,
} from './constants';

type ExportFormat = 'excel' | 'pdf';

const Nesting = () => {
  const router = useRouter();
  const design_id = (router.query.designid as string) || window.location.pathname.split('/')[2];
  const version_id = (router.query.versionid as string) || window.location.pathname.split('/')[3];

  const [visibleDesigns, setVisibleDesigns] = useState(50);
  const [localData, setLocalData] = useState<any[]>([]);
  const [tableData, setTableData] = useState<any[]>([]);
  const [isLoadingTable, setIsLoadingTable] = useState(false);
  const showTableLoading = useMinimumVisible(isLoadingTable);
  const [isGeneratingBOM, setIsGeneratingBOM] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isDownloadingXML, setIsDownloadingXML] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<'quotation' | 'bom' | null>(null);
  /** Synchronous guard — state updates are async, so rapid clicks could otherwise stack requests before re-render. */
  const xmlDownloadInFlightRef = useRef(false);

  const { objects } = useSelector((state: RootState) => state.data);

  useEffect(() => {
    const fetchBackupData = async () => {
      if (!design_id || (objects && objects.length > 0)) return;

      try {
        const response: any = await CommonService.get(
          API_ENDPOINT.GET_DESIGN_CATALOG_ITEMS(design_id, version_id)
        );
        if (response?.data?.catalogs) {
          const catalogsObj = response.data.catalogs;
          const flattenedCatalogs: any[] = [];
          Object.values(catalogsObj).forEach((catList: any) => {
            if (Array.isArray(catList)) {
              flattenedCatalogs.push(...catList);
            }
          });
          setLocalData(flattenedCatalogs);
        }
      } catch (e) {
        console.error('Failed to fetch backup design data', e);
      }
    };
    fetchBackupData();
  }, [design_id, version_id, objects]);

  useEffect(() => {
    const fetchTableData = async () => {
      if (!design_id) return;
      setIsLoadingTable(true);
      try {
        const response: any = await CommonService.put(
          API_ENDPOINT.DOWNLOAD_NESTING_PDF(design_id) + `?version_id=${version_id}`,
          { format: 'json', minimal: true }
        );
        if (response?.data && !response.data.error) {
          setTableData(response.data);
        }
      } catch (e) {
        console.error('Failed to fetch table data from backend', e);
      } finally {
        setIsLoadingTable(false);
      }
    };
    fetchTableData();
  }, [design_id]);

  const data = (objects?.length ? objects : localData).filter((item) => item.type !== 'model');
  const displayData = tableData;

  const handleLoadMore = () => {
    setVisibleDesigns((prev) => prev + 50);
  };

  const formatDimension = (value: number, type: string) => {
    if (value === undefined || value === null) return '-';
    if (type === 'wall' || type === 'floor') {
      return `${(value / 304.8).toFixed(2)} ft`;
    }
    return `${Math.round(value)} mm`;
  };

  const buildMaterialPriceMap = (materials: any[]) => {
    const priceMap: Record<string, number> = {};
    materials.forEach((material) => {
      priceMap[material.id] = parseFloat(
        material.properties?.sell_price || material.sell_price || 0
      );
    });
    return priceMap;
  };

  const formatCurrency = (num: number) =>
    `Rs ${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchDesignDetails = async () => {
    const response: any = await CommonService.get(API_ENDPOINT.GET_DESIGN_DETAILS(design_id));
    return response.data;
  };

  const fetchNestingLayoutData = async () => {
    try {
      const response: any = await CommonService.put(
        API_ENDPOINT.DOWNLOAD_NESTING_PDF(design_id) + `?version_id=${version_id}`,
        { format: 'json' }
      );
      if (response?.data && !response.data.error) {
        return response.data;
      }
    } catch (error) {
      console.warn('Nesting layout data not available', error);
    }
    return [];
  };

  const fetchMaterialCatalog = async () => {
    try {
      const response: any = await CommonService.get(API_ENDPOINT.GET_MATERIAL);
      if (response?.data?.results) {
        return response.data.results;
      }
      if (Array.isArray(response?.data)) {
        return response.data;
      }
    } catch (error) {
      console.warn('Material catalog data not available', error);
    }
    return [];
  };

  const fetchOrganizationDetails = async () => {
    try {
      const response: any = await CommonService.get(API_ENDPOINT.GET_ORGANIZATION_DETAILS);
      if (response.status === 200) {
        return response.data;
      }
    } catch (error) {
      console.warn('Failed to fetch organization details for quotation styling', error);
    }
    return null;
  };

  const normalizeEdgeFace = (edge: any) =>
    typeof edge === 'object' && edge?.face
      ? String(edge.face).toUpperCase()
      : String(edge).toUpperCase();

  const getQuoteMeta = () => {
    const quoteNo = `QT/${new Date().getFullYear()}/${design_id.substring(0, 4).toUpperCase()}`;
    const quoteDate = new Date()
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/ /g, '-');
    const validDate = new Date(Date.now() + QUOTE_VALIDITY_DAYS * 24 * 60 * 60 * 1000)
      .toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      .replace(/ /g, '-');
    return { quoteNo, quoteDate, validDate };
  };

  const getOrganizationDisplayData = (organizationDetails: any) => {
    // No placeholder company data: anything the organisation hasn't filled in stays blank.
    const joinFilled = (parts: [string, string | undefined][]) =>
      parts
        .filter(([, value]) => Boolean(value && String(value).trim()))
        .map(([label, value]) => `${label}: ${value}`)
        .join(' | ');
    const companyName = organizationDetails?.company_name || '';
    const companyAddress = organizationDetails?.company_address || '';
    const contactLine = joinFilled([
      ['Phone', organizationDetails?.company_phone],
      ['Email', organizationDetails?.company_email],
      ['Website', organizationDetails?.company_website],
    ]);
    const taxLine = joinFilled([
      ['GSTIN', organizationDetails?.company_gstin],
      ['PAN', organizationDetails?.company_pan],
    ]);
    return { companyName, companyAddress, contactLine, taxLine };
  };

  /** Banking lines for quotations, without placeholder values; empty fields are left out. */
  const getBankingLines = (organizationDetails: any): string[] =>
    (
      [
        ['Bank Name', organizationDetails?.bank_name],
        ['Account Name', organizationDetails?.account_name],
        ['Account Number', organizationDetails?.account_number],
        ['Account Type', organizationDetails?.account_type],
        ['IFSC Code', organizationDetails?.ifsc_code],
        ['Branch', organizationDetails?.branch_name],
        ['UPI ID', organizationDetails?.upi_id],
      ] as [string, string | undefined][]
    )
      .filter(([, value]) => Boolean(value && String(value).trim()))
      .map(([label, value]) => `${label}: ${value}`);

  const countHardware = (partsList: any[]) => {
    let minifixCamCount = 0;
    let minifixDowelCount = 0;
    let hingeCount = 0;

    partsList.forEach((part: any) => {
      if (!part.minifix_holes || part.minifix_holes.length === 0) return;
      part.minifix_holes.forEach((hole: any) => {
        const holeType = (hole.type || '').toUpperCase();
        if (holeType === 'CAM') minifixCamCount++;
        if (holeType === 'DOWEL' || holeType === 'MINIFIX DOWEL') minifixDowelCount++;
        if (holeType === 'HINGE') hingeCount++;
      });
    });

    return { minifixCamCount, minifixDowelCount, hingeCount };
  };

  const buildMergedPartsList = (layoutData: any[], sourceData: any[]) =>
    (layoutData.length > 0 ? layoutData : sourceData).map((p: any) => {
      const layoutUniqueId = p['Unique ID'] || p.unique_id || p.ID;
      const reduxPart = sourceData.find(
        (d: any) =>
          d.id === p.id || d.id === p.ID || (d.unique_id && d.unique_id === layoutUniqueId)
      );

      let eBands = p.edgebands || [];
      if (eBands.length === 0) {
        const rEdge = reduxPart?.edgeBanding || reduxPart?.edgeband;
        if (rEdge) {
          eBands = [];
          if (rEdge.left) eBands.push('LEFT');
          if (rEdge.right) eBands.push('RIGHT');
          if (rEdge.top) eBands.push('TOP');
          if (rEdge.bottom) eBands.push('BOTTOM');
          if (rEdge.front) eBands.push('LEFT');
          if (rEdge.back) eBands.push('RIGHT');
          eBands = [...new Set(eBands)];
        }
      }
      return {
        ...p,
        unique_id: reduxPart?.unique_id || layoutUniqueId,
        edgebands: eBands,
      };
    });

  const downloadBOMPdf = (
    design: any,
    cuttingRows: any[],
    panelRows: any[],
    edgeRows: any[],
    hardwareRows: any[],
    totalMaterialCost: number,
    totalEdgeCost: number
  ) => {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
    const totalLaborCost = Math.round(totalMaterialCost * PRICING.laborRate);
    const estimatedCost = totalMaterialCost + totalEdgeCost + totalLaborCost;
    const finalPrice = Math.round(estimatedCost * PRICING.markupMultiplier);
    const leftMargin = 40;
    const pageWidth = doc.internal.pageSize.getWidth();
    const printableWidth = pageWidth - leftMargin * 2;
    const firstPageTop = 34;
    const tableLineColor: [number, number, number] = [210, 210, 210];

    doc.setFillColor(...PDF_THEME.titleColor);
    doc.rect(leftMargin, firstPageTop, printableWidth * 0.68, 18, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(15);
    doc.text('PHINX - Bill of Materials', leftMargin + printableWidth * 0.34, firstPageTop + 13, {
      align: 'center',
    });
    doc.setTextColor(0, 0, 0);

    const metaStartY = firstPageTop + 24;
    const metaRows = [
      [
        'Project ID:',
        design.project_code || design.id || '-',
        '',
        'Project Name:',
        design.design_name || '-',
        '',
        'Customer:',
        design.customer_name || '-',
      ],
      [
        'Date:',
        new Date(design.created_at || Date.now()).toLocaleDateString('en-GB'),
        '',
        'Designer:',
        design.created_by?.username || '-',
        '',
        'Revision:',
        '1',
      ],
      [
        'Product Type:',
        design.project_type || '-',
        '',
        'Finish:',
        '-',
        '',
        'Status:',
        design.status || '-',
      ],
      ['Project Description:', design?.description || 'Bespoke Cabinetry', '', '', '', '', '', ''],
      ['Created Date:', new Date().toLocaleDateString('en-GB'), '', '', '', '', '', ''],
    ];

    autoTable(doc, {
      startY: metaStartY,
      body: metaRows,
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9,
        lineColor: tableLineColor,
        lineWidth: 0.5,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      },
      bodyStyles: { halign: 'left', valign: 'middle' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 78 },
        1: { cellWidth: 95 },
        2: { cellWidth: 12 },
        3: { fontStyle: 'bold', cellWidth: 78 },
        4: { cellWidth: 95 },
        5: { cellWidth: 12 },
        6: { fontStyle: 'bold', cellWidth: 78 },
        7: { cellWidth: 95 },
      },
      margin: { left: leftMargin },
    });

    const costHeaderY = ((doc as any).lastAutoTable?.finalY || metaStartY + 90) + 10;
    doc.setFillColor(...PDF_THEME.titleColor);
    doc.rect(leftMargin, costHeaderY, printableWidth * 0.68, 18, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Cost Summary', leftMargin + printableWidth * 0.34, costHeaderY + 13, {
      align: 'center',
    });
    doc.setTextColor(0, 0, 0);

    autoTable(doc, {
      startY: costHeaderY + 18,
      body: [
        [
          'Total Material Cost:',
          `${Math.round(totalMaterialCost)} Rs`,
          'Total Edge Band Cost:',
          `${totalEdgeCost.toFixed(2)} Rs`,
          'Total Labor Cost:',
          `${totalLaborCost} Rs`,
        ],
        ['Total Hardware Cost:', '-', 'Total Hardware Margin:', '-', 'Total Glass Cost:', '-'],
        [
          'Estimated Cost:',
          `${estimatedCost.toFixed(3)} Rs`,
          'Markup/Margin:',
          '50%',
          'Final Selling Price:',
          `${finalPrice} Rs`,
        ],
      ],
      theme: 'grid',
      styles: {
        font: 'helvetica',
        fontSize: 9.5,
        lineColor: tableLineColor,
        lineWidth: 0.5,
        cellPadding: { top: 3, right: 4, bottom: 3, left: 4 },
      },
      bodyStyles: { halign: 'left' },
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 90 },
        1: { cellWidth: 95 },
        2: { fontStyle: 'bold', cellWidth: 98 },
        3: { cellWidth: 95 },
        4: { fontStyle: 'bold', cellWidth: 92 },
        5: { cellWidth: 95 },
      },
      margin: { left: leftMargin },
    });

    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Cutting List', 40, 32);
    autoTable(doc, {
      startY: 48,
      head: [BOM_CUTTING_HEADERS],
      body: cuttingRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, lineColor: PDF_THEME.border },
      headStyles: {
        fillColor: PDF_THEME.tableHeaderBg,
        textColor: PDF_THEME.tableHeaderText,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: PDF_THEME.lightGray },
      columnStyles: { 1: { cellWidth: 105 }, 2: { cellWidth: 92 }, 3: { cellWidth: 65 } },
    });

    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Panel Details', 40, 32);
    autoTable(doc, {
      startY: 48,
      head: [BOM_PANEL_HEADERS],
      body: panelRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, lineColor: PDF_THEME.border },
      headStyles: {
        fillColor: PDF_THEME.tableHeaderBg,
        textColor: PDF_THEME.tableHeaderText,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: PDF_THEME.lightGray },
    });

    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Edge Banding', 40, 32);
    autoTable(doc, {
      startY: 48,
      head: [BOM_EDGE_HEADERS],
      body: edgeRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, lineColor: PDF_THEME.border },
      headStyles: {
        fillColor: PDF_THEME.tableHeaderBg,
        textColor: PDF_THEME.tableHeaderText,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: PDF_THEME.lightGray },
    });

    doc.addPage();
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text('Hardware List', 40, 32);
    autoTable(doc, {
      startY: 48,
      head: [BOM_HARDWARE_HEADERS],
      body: hardwareRows,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8, lineColor: PDF_THEME.border },
      headStyles: {
        fillColor: PDF_THEME.tableHeaderBg,
        textColor: PDF_THEME.tableHeaderText,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: PDF_THEME.lightGray },
    });

    doc.save(`BOM_${design.design_name || 'Design'}.pdf`);
  };

  const handleGenerateBOM = async (format: ExportFormat = 'excel') => {
    if (isGeneratingBOM) return;
    setIsGeneratingBOM(true);
    showFullScreenLoader('Generating BOM data...');
    try {
      const design = await fetchDesignDetails();
      const layoutData = await fetchNestingLayoutData();
      const allMaterials = await fetchMaterialCatalog();

      const materialPriceMap = buildMaterialPriceMap(allMaterials);

      // Merge data and layoutData to ensure edgebands are caught if they exist in Redux
      const partsList = buildMergedPartsList(layoutData, data);

      const wb = XLSX.utils.book_new();

      // Common Styles
      const titleStyle = {
        font: { bold: true, sz: 16, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '392579' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };
      const headerStyle = {
        font: { bold: true, sz: 12 },
        fill: { fgColor: { rgb: 'E0E0E0' } },
        alignment: { horizontal: 'center', vertical: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
      const boldStyle = { font: { bold: true } };

      // (Summary sheet will be generated at the end to include total costs)      // --- Sheet 2: Cutting List ---

      const cuttingRows = partsList.map((part: any) => {
        const h = parseFloat(part.height || part?.dimensions?.height || 0);
        const w = parseFloat(part.width || part?.dimensions?.width || 0);
        const d = part.sheet_thickness || part.depth || part?.dimensions?.depth || 18;
        const area = ((h * w) / 1000000).toFixed(3);

        // Use parent_name from nesting JSON (set by backend parent lookup)
        const cabinetName = part.parent_name || part.material_name || '-';

        let edgeL1 = 'None',
          edgeL2 = 'None',
          edgeW1 = 'None',
          edgeW2 = 'None';
        if (part.edgebands && part.edgebands.length > 0) {
          part.edgebands.forEach((e: any) => {
            // Handle both object and string formats
            const edgeFace = normalizeEdgeFace(e);
            if (EDGE_FACE_LEFT.includes(edgeFace)) edgeL1 = 'PVC 1mm';
            else if (EDGE_FACE_RIGHT.includes(edgeFace)) edgeL2 = 'PVC 1mm';
            else if (EDGE_FACE_TOP.includes(edgeFace)) edgeW1 = 'PVC 1mm';
            else if (EDGE_FACE_BOTTOM.includes(edgeFace)) edgeW2 = 'PVC 1mm';
          });
        }
        return [
          part.unique_id || part.ID || part.id || '-',
          part.name || part.material_name || part.Name || 'Unknown',
          cabinetName,
          'Plywood',
          d,
          h,
          w,
          part.quantity || 1,
          area,
          'L',
          edgeL1,
          edgeL2,
          edgeW1,
          edgeW2,
        ];
      });
      const cuttingSheetData = [
        [{ v: 'CUTTING LIST FOR BEAM SAW', t: 's', s: titleStyle }, ...Array(13).fill('')],
        [],
        BOM_CUTTING_HEADERS.map((h) => ({ v: h, s: headerStyle })),
        ...cuttingRows,
      ];
      const wsCutting = XLSX.utils.aoa_to_sheet(cuttingSheetData);
      if (!wsCutting['!merges']) wsCutting['!merges'] = [];
      wsCutting['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 13 } });
      wsCutting['!cols'] = [
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 15 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 5 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
        { wch: 10 },
      ];
      XLSX.utils.book_append_sheet(wb, wsCutting, 'Cutting List');

      // --- Sheet 3: Panel Details ---
      const thicknessMap: Record<string, { area: number; count: number; costPerSheet: number }> =
        {};
      cuttingRows.forEach((row: any, index: number) => {
        const t = String(row[4]);
        const area = parseFloat(row[8] as string);

        const partData = partsList[index];
        const rPart =
          data.find(
            (d: any) =>
              d.id === partData.id ||
              d.id === partData.ID ||
              (d.unique_id && d.unique_id === partData.unique_id)
          ) || partData;

        const mat =
          rPart.material && Array.isArray(rPart.material) ? rPart.material[0] : rPart.material;
        const matId = mat?.id || mat;
        const cost = materialPriceMap[matId] || 0;

        if (!thicknessMap[t]) thicknessMap[t] = { area: 0, count: 0, costPerSheet: cost };
        thicknessMap[t].area += area;
        thicknessMap[t].count += 1;
        if (cost > thicknessMap[t].costPerSheet) thicknessMap[t].costPerSheet = cost;
      });
      let totalMaterialCost = 0;
      const panelRows = Object.keys(thicknessMap).map((t) => {
        const sheetsReq = Math.ceil(thicknessMap[t].area / PRICING.sheetAreaSqm);
        const sheetCost = thicknessMap[t].costPerSheet || PRICING.defaultSheetCost; // default if 0
        const totalCost = sheetsReq * sheetCost;
        totalMaterialCost += totalCost;
        return [
          'Plywood',
          t,
          '2440x1220',
          sheetsReq,
          sheetCost,
          '10%',
          totalCost,
          Math.round(totalCost * PRICING.laborRate),
        ]; // 20% labor guess
      });
      const panelSheetData = [
        [{ v: 'PANEL DETAILS & SHEET OPTIMIZATION', t: 's', s: titleStyle }, ...Array(7).fill('')],
        [],
        BOM_PANEL_HEADERS.map((h) => ({ v: h, s: headerStyle })),
        ...panelRows,
      ];
      const wsPanel = XLSX.utils.aoa_to_sheet(panelSheetData);
      if (!wsPanel['!merges']) wsPanel['!merges'] = [];
      wsPanel['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
      wsPanel['!cols'] = [
        { wch: 20 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
      ];
      XLSX.utils.book_append_sheet(wb, wsPanel, 'Panel Details');

      // --- Sheet 4: Edge Banding ---
      const edgeRows: any[] = [];
      let totalEdgeCost = 0;
      cuttingRows.forEach((row: any) => {
        let len = 0;
        const h = parseFloat(row[5] as string) / 1000;
        const w = parseFloat(row[6] as string) / 1000;
        if (row[10] !== 'None') len += h;
        if (row[11] !== 'None') len += h;
        if (row[12] !== 'None') len += w;
        if (row[13] !== 'None') len += w;

        if (len > 0) {
          const edgeCost = len * PRICING.edgeRatePerMeter;
          totalEdgeCost += edgeCost;
          edgeRows.push([
            row[0],
            row[1],
            'PVC 1mm',
            1,
            len.toFixed(2),
            String(PRICING.edgeRatePerMeter),
            edgeCost.toFixed(2),
            '-',
          ]);
        }
      });
      if (edgeRows.length === 0) {
        edgeRows.push(['No Edge Banding', '-', '-', '-', '-', '-', '-', '-']);
      }
      const edgeSheetData = [
        [{ v: 'EDGE BANDING DETAILS', t: 's', s: titleStyle }, ...Array(7).fill('')],
        [],
        BOM_EDGE_HEADERS.map((h) => ({ v: h, s: headerStyle })),
        ...edgeRows,
      ];
      const wsEdge = XLSX.utils.aoa_to_sheet(edgeSheetData);
      if (!wsEdge['!merges']) wsEdge['!merges'] = [];
      wsEdge['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
      wsEdge['!cols'] = [
        { wch: 15 },
        { wch: 20 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, wsEdge, 'Edge Banding');

      // --- Sheet 5: Hardware List ---
      const { minifixCamCount, minifixDowelCount, hingeCount } = countHardware(partsList);
      const hardwareRows = [
        [
          'HW-001',
          'Door Hinges',
          'Soft Close',
          'Generic',
          hingeCount || 2,
          '-',
          'Manual',
          '-',
          '-',
        ],
        [
          'HW-002',
          'Minifix Cam',
          '15mm',
          'Generic',
          minifixCamCount || 10,
          '-',
          'Machine',
          '-',
          '-',
        ],
        [
          'HW-003',
          'Minifix Dowel',
          '-',
          'Generic',
          minifixDowelCount || 10,
          '-',
          'Machine',
          '-',
          '-',
        ],
      ];
      const hardwareSheetData = [
        [{ v: 'HARDWARE & FITTINGS', t: 's', s: titleStyle }, ...Array(8).fill('')],
        [],
        BOM_HARDWARE_HEADERS.map((h) => ({ v: h, s: headerStyle })),
        ...hardwareRows,
      ];
      const wsHardware = XLSX.utils.aoa_to_sheet(hardwareSheetData);
      if (!wsHardware['!merges']) wsHardware['!merges'] = [];
      wsHardware['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } });
      wsHardware['!cols'] = [
        { wch: 15 },
        { wch: 20 },
        { wch: 20 },
        { wch: 15 },
        { wch: 5 },
        { wch: 10 },
        { wch: 15 },
        { wch: 15 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, wsHardware, 'Hardware List');

      // --- Sheet 1: Project Summary (Generated last to use totals) ---
      const totalLaborCost = Math.round(totalMaterialCost * PRICING.laborRate); // 20% labor guess
      const estCost = totalMaterialCost + totalEdgeCost + totalLaborCost;
      const finalPrice = Math.round(estCost * PRICING.markupMultiplier); // 50% margin guess

      const summaryData: any[] = [
        [{ v: 'PHINX - Bill of Materials', t: 's', s: titleStyle }, '', '', '', '', '', '', ''],
        [],
        [
          { v: 'Project ID:', s: boldStyle },
          design.project_code || design.id,
          '',
          { v: 'Project Name:', s: boldStyle },
          design.design_name,
          '',
          { v: 'Customer:', s: boldStyle },
          design.customer_name || '',
        ],
        [
          { v: 'Date:', s: boldStyle },
          new Date(design.created_at).toLocaleDateString(),
          '',
          { v: 'Designer:', s: boldStyle },
          design.created_by?.username || '',
          '',
          { v: 'Revision:', s: boldStyle },
          '1',
        ],
        [
          { v: 'Product Type:', s: boldStyle },
          design.project_type || '',
          '',
          { v: 'Finish:', s: boldStyle },
          '-',
          '',
          { v: 'Status:', s: boldStyle },
          design.status,
        ],
        [
          'Project Description:',
          { v: design?.description || 'Bespoke Cabinetry', s: boldStyle },
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        [
          'Created Date:',
          { v: new Date().toLocaleDateString(), s: boldStyle },
          '',
          '',
          '',
          '',
          '',
          '',
        ],
        [],
        [{ v: 'Cost Summary', s: titleStyle }, '', '', '', '', '', '', ''],
        [
          { v: 'Total Material Cost:', s: boldStyle },
          `${totalMaterialCost} Rs`,
          '',
          { v: 'Total Edge Band Cost:', s: boldStyle },
          `${totalEdgeCost.toFixed(2)} Rs`,
          '',
          { v: 'Total Labor Cost:', s: boldStyle },
          `${totalLaborCost} Rs`,
        ],
        [
          { v: 'Total Hardware Cost:', s: boldStyle },
          '-',
          '',
          { v: 'Total Hardware Margin:', s: boldStyle },
          '-',
          '',
          { v: 'Total Glass Cost:', s: boldStyle },
          '-',
        ],
        [
          { v: 'Estimated Cost:', s: boldStyle },
          `${estCost} Rs`,
          '',
          { v: 'Markup/Margin:', s: boldStyle },
          '50%',
          '',
          { v: 'Final Selling Price:', s: boldStyle },
          `${finalPrice} Rs`,
        ],
      ];

      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      if (!wsSummary['!merges']) wsSummary['!merges'] = [];
      wsSummary['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 7 } });
      wsSummary['!merges'].push({ s: { r: 8, c: 0 }, e: { r: 8, c: 7 } });
      wsSummary['!cols'] = [
        { wch: 20 },
        { wch: 20 },
        { wch: 5 },
        { wch: 20 },
        { wch: 20 },
        { wch: 5 },
        { wch: 20 },
        { wch: 20 },
      ];

      const safeDesignName = 'Project Summary'.substring(0, 31);
      XLSX.utils.book_append_sheet(wb, wsSummary, safeDesignName);

      // Move Summary sheet to the first position
      const sheetName = wb.SheetNames.pop()!;
      wb.SheetNames.unshift(sheetName);

      if (format === 'excel') {
        XLSX.writeFile(wb, `BOM_${design.design_name || 'Design'}.xlsx`);
      } else {
        downloadBOMPdf(
          design,
          cuttingRows,
          panelRows,
          edgeRows,
          hardwareRows,
          totalMaterialCost,
          totalEdgeCost
        );
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate BOM Data.');
    } finally {
      hideFullScreenLoader();
      setIsGeneratingBOM(false);
    }
  };

  const downloadQuotationPdf = (
    design: any,
    organizationDetails: any,
    quoteRows: any[],
    subTotal: number,
    cgst: number,
    sgst: number,
    grandTotal: number,
    numberToWords: (num: number) => string
  ) => {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageHeight = doc.internal.pageSize.getHeight();
    const leftMargin = 40;
    const rightMargin = 40;
    const contentWidth = doc.internal.pageSize.getWidth() - leftMargin - rightMargin;
    const bottomMargin = 36;
    let cursorY = 36;

    const ensureSpace = (neededHeight: number, nextPageY = 40) => {
      if (cursorY + neededHeight > pageHeight - bottomMargin) {
        doc.addPage();
        cursorY = nextPageY;
      }
    };

    const { companyName, companyAddress, contactLine, taxLine } =
      getOrganizationDisplayData(organizationDetails);
    const { quoteNo, quoteDate, validDate } = getQuoteMeta();

    // Header block
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...PDF_THEME.titleColor);
    doc.setFontSize(14);
    doc.text(companyName, 297, cursorY, { align: 'center' });
    cursorY += 16;
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10);
    doc.text('Custom Furniture Design & Manufacturing', 297, cursorY, { align: 'center' });
    cursorY += 14;
    doc.setFont('helvetica', 'normal');
    doc.text(companyAddress, 297, cursorY, { align: 'center' });
    cursorY += 14;
    doc.text(contactLine, 297, cursorY, { align: 'center' });
    cursorY += 14;
    doc.setFont('helvetica', 'bold');
    doc.text(taxLine, 297, cursorY, { align: 'center' });
    cursorY += 10;

    doc.setFillColor(...PDF_THEME.titleColor);
    doc.rect(leftMargin, cursorY, contentWidth, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.text('QUOTATION', 297, cursorY + 14, { align: 'center' });
    doc.setTextColor(0, 0, 0);
    cursorY += 30;

    // Info block
    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, lineColor: PDF_THEME.border },
      body: [
        ['Quotation No:', quoteNo, '', '', 'Customer Name:', design.customer_name || 'Customer'],
        ['Date:', quoteDate, '', '', 'Company:', design.customer_company || '-'],
        ['Valid Till:', validDate, '', '', 'Address:', design.customer_address || '-'],
        [
          'Project ID:',
          design.project_code || design.id,
          '',
          '',
          'GSTIN:',
          design.customer_gstin || '-',
        ],
        ['', '', '', '', 'Contact:', design.customer_contact || '-'],
        ['', '', '', '', 'Email:', design.customer_email || '-'],
      ],
      columnStyles: { 0: { fontStyle: 'bold' }, 4: { fontStyle: 'bold' } },
      margin: { left: leftMargin, right: rightMargin },
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 8;

    autoTable(doc, {
      startY: cursorY,
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, lineColor: PDF_THEME.border, fontStyle: 'bold' },
      body: [[`PROJECT: ${design.project_type || 'Custom Furniture'} - ${design.design_name}`]],
      margin: { left: leftMargin, right: rightMargin },
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 10;

    // Item table
    autoTable(doc, {
      startY: cursorY,
      head: [QUOTATION_HEADERS],
      body: quoteRows.map((row) => row.slice(0, 9)),
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 8.8, cellPadding: 3, lineColor: PDF_THEME.border },
      headStyles: {
        fillColor: PDF_THEME.tableHeaderBg,
        textColor: PDF_THEME.tableHeaderText,
        halign: 'center',
      },
      alternateRowStyles: { fillColor: PDF_THEME.lightGray },
      columnStyles: {
        0: { cellWidth: 32, halign: 'center' },
        1: { cellWidth: 145, halign: 'left' },
        2: { cellWidth: 70, halign: 'center' },
        3: { cellWidth: 60, halign: 'left' },
        4: { cellWidth: 34, halign: 'center' },
        5: { cellWidth: 55, halign: 'right' },
        6: { cellWidth: 62, halign: 'right' },
        7: { cellWidth: 34, halign: 'center' },
        8: { cellWidth: 30, halign: 'center' },
      },
      margin: { left: leftMargin, right: rightMargin },
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 10;

    // Totals
    const roundedTotal = subTotal + cgst + sgst;
    const roundOff = Math.round(roundedTotal) - roundedTotal;
    autoTable(doc, {
      startY: cursorY,
      head: [['Summary', 'Value']],
      body: [
        ['SUBTOTAL (Before GST)', formatCurrency(subTotal)],
        ['Add: CGST @ 9%', formatCurrency(cgst)],
        ['Add: SGST @ 9%', formatCurrency(sgst)],
        ['Round Off', formatCurrency(roundOff)],
        ['GRAND TOTAL (Inclusive of all taxes)', formatCurrency(grandTotal)],
      ],
      theme: 'grid',
      styles: { font: 'helvetica', fontSize: 9, lineColor: PDF_THEME.border },
      headStyles: { fillColor: PDF_THEME.titleColor, textColor: PDF_THEME.tableHeaderText },
      bodyStyles: { halign: 'right' },
      columnStyles: { 0: { halign: 'left', fontStyle: 'bold' } },
      margin: { left: leftMargin, right: rightMargin },
    });
    cursorY = ((doc as any).lastAutoTable?.finalY || cursorY) + 16;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    ensureSpace(20, 40);
    doc.text(`Amount in Words: ${numberToWords(grandTotal)}`, leftMargin, cursorY);
    cursorY += 22;

    // Terms section
    ensureSpace(70, 40);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.text('TERMS AND CONDITIONS', leftMargin, cursorY);
    cursorY += 18;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const terms = getQuoteTerms();
    terms.forEach((line) => {
      const text = line === '' ? '' : line;
      if (text === '') {
        cursorY += 6;
        return;
      }
      const wrapped = doc.splitTextToSize(text, contentWidth);
      ensureSpace(wrapped.length * 12 + 2, 40);
      const isHeading = /^[0-9]+\./.test(line);
      if (isHeading) {
        doc.setFont('helvetica', 'bold');
      } else {
        doc.setFont('helvetica', 'normal');
      }
      doc.text(wrapped, leftMargin, cursorY);
      cursorY += wrapped.length * 12 + 2;
    });

    // Banking section (only when the organisation has filled in banking details)
    const bankingLines = getBankingLines(organizationDetails);
    if (bankingLines.length > 0) {
      cursorY += 8;
      ensureSpace(130, 40);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.text('Banking Details', leftMargin, cursorY);
      cursorY += 16;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      bankingLines.forEach((line) => {
        ensureSpace(14, 40);
        doc.text(line, leftMargin, cursorY);
        cursorY += 14;
      });
      cursorY += 10;
    }

    // Mandatory terminal footer block: NOTE + signature + thank-you
    const signatureX = doc.internal.pageSize.getWidth() - 215;
    const footerCompany = `For ${companyName}`;
    const footerDate = `Date: ${quoteDate}`;
    const thankYou = 'Thank you for choosing us. We look forward to transforming your space!';
    const noteLine =
      'NOTE: Please share your purchase order to confirm this quotation. Our team will contact you for final measurements and design approval.';
    ensureSpace(110, 40);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(noteLine, leftMargin, cursorY);
    cursorY += 24;
    doc.setFont('helvetica', 'bold');
    doc.text(footerCompany, signatureX, cursorY);
    cursorY += 34;
    doc.setFont('helvetica', 'normal');
    doc.text('____________________', signatureX, cursorY);
    cursorY += 16;
    doc.text('Authorized Signatory', signatureX, cursorY);
    cursorY += 14;
    doc.text(footerDate, signatureX, cursorY);
    cursorY += 18;
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(10.5);
    doc.text(thankYou, 297, cursorY, { align: 'center' });

    doc.save(`Quotation_${design.design_name || 'Design'}.pdf`);
  };

  const handleGenerateQuotation = async (format: ExportFormat = 'excel') => {
    if (isGeneratingQuote) return;
    setIsGeneratingQuote(true);
    showFullScreenLoader('Generating quotation...');
    try {
      const organizationDetails = await fetchOrganizationDetails();
      const design = await fetchDesignDetails();
      const layoutData = await fetchNestingLayoutData();
      const allMaterials = await fetchMaterialCatalog();

      const materialPriceMap = buildMaterialPriceMap(allMaterials);

      // 4. Merge Data (from BOM logic)
      const partsList = buildMergedPartsList(layoutData, data);

      // 5. Group Parts by Assembly (Unit)
      const unitsMap: Record<string, any> = {};

      partsList.forEach((part: any) => {
        const h = parseFloat(part.height || part?.dimensions?.height || 0);
        const w = parseFloat(part.width || part?.dimensions?.width || 0);
        const d = part.sheet_thickness || part.depth || part?.dimensions?.depth || 18;

        let assemblyName = part.parent_name || 'Individual Components';
        if (!assemblyName || assemblyName === '-') {
          // Find parent using redux parent tree
          const rPart =
            data.find(
              (d: any) =>
                d.id === part.id ||
                d.id === part.ID ||
                (d.unique_id && d.unique_id === part.unique_id)
            ) || part;

          if (rPart.parent_id) {
            const parent = data.find((d: any) => d.id === rPart.parent_id);
            if (parent) assemblyName = parent.name || parent.type || 'Assembly';
          }
        }

        if (!unitsMap[assemblyName]) {
          unitsMap[assemblyName] = {
            name: assemblyName,
            maxLength: 0,
            maxWidth: 0,
            maxHeight: 0,
            materialNames: new Set<string>(),
            qty: 1,
            totalMaterialCost: 0,
            totalEdgeCost: 0,
            panels: [],
            hingeCount: 0,
            camCount: 0,
            dowelCount: 0,
          };
        }

        const unit = unitsMap[assemblyName];
        unit.maxLength = Math.max(unit.maxLength, h, w);
        unit.maxWidth = Math.max(unit.maxWidth, h, w); // simplified
        unit.maxHeight = Math.max(unit.maxHeight, d);

        const matName = part.material_name || 'Plywood';
        unit.materialNames.add(`${d}mm ${matName}`);

        // Material Cost
        const rPart =
          data.find(
            (d: any) =>
              d.id === part.id ||
              d.id === part.ID ||
              (d.unique_id && d.unique_id === part.unique_id)
          ) || part;

        const mat =
          rPart.material && Array.isArray(rPart.material) ? rPart.material[0] : rPart.material;
        const matId = mat?.id || mat;
        const sheetCost = materialPriceMap[matId] || PRICING.defaultSheetCost;

        const areaReq = (h * w) / 1000000;
        // approx cost per sqm = sheetCost / (2.44*1.22)
        const costPerSqm = sheetCost / PRICING.sheetAreaSqm;
        unit.totalMaterialCost += areaReq * costPerSqm * (part.quantity || 1);

        // Edgebanding cost
        let len = 0;
        const eH = h / 1000;
        const eW = w / 1000;
        if (part.edgebands && part.edgebands.length > 0) {
          part.edgebands.forEach((e: any) => {
            const edgeFace = normalizeEdgeFace(e);
            if (EDGE_FACE_LEFT.includes(edgeFace)) len += eH;
            if (EDGE_FACE_RIGHT.includes(edgeFace)) len += eH;
            if (EDGE_FACE_TOP.includes(edgeFace)) len += eW;
            if (EDGE_FACE_BOTTOM.includes(edgeFace)) len += eW;
          });
        }
        unit.totalEdgeCost += len * PRICING.edgeRatePerMeter;

        // Hardware
        if (part.minifix_holes && part.minifix_holes.length > 0) {
          part.minifix_holes.forEach((h: any) => {
            const type = (h.type || '').toUpperCase();
            if (type === 'CAM') unit.camCount++;
            if (type === 'DOWEL' || type === 'MINIFIX DOWEL') unit.dowelCount++;
            if (type === 'HINGE') unit.hingeCount++;
          });
        }

        unit.panels.push(part.name || 'Panel');
      });

      // 6. Calculate Final Cost per Unit
      const quoteRows: any[] = [];
      let srNo = 1;
      let subTotal = 0;

      Object.values(unitsMap).forEach((u) => {
        // Add hardware cost
        const hwCost = u.hingeCount * 150 + u.camCount * 20 + u.dowelCount * 10;
        const rawCost = u.totalMaterialCost + u.totalEdgeCost + hwCost;
        const laborCost = rawCost * PRICING.laborRate;
        const estCost = rawCost + laborCost;

        let ratePerUnit = Math.round(estCost * PRICING.markupMultiplier);
        if (ratePerUnit < PRICING.minRateThreshold) ratePerUnit = PRICING.minRateValue;

        const amount = ratePerUnit * u.qty;
        subTotal += amount;

        // Determine description
        let desc = u.name;
        if (u.name.toLowerCase().includes('drawer')) {
          desc += `\n(Front, Back, 2 Sides, Bottom)\n  - Includes hardware and channels`;
        } else if (u.name.toLowerCase().includes('door')) {
          desc += `\n(Panel with soft-close hinges)\n  - Edge banded on sides`;
        } else {
          desc += `\n(Constructed Box Assembly)\n  - Complete with necessary hardware`;
        }

        const dimStr = `${Math.round(u.maxLength)}×${Math.round(u.maxWidth)}×${Math.round(u.maxHeight)} mm`;
        const matStr = Array.from(u.materialNames).join(' / ');

        quoteRows.push([
          srNo++,
          desc,
          dimStr,
          matStr.substring(0, 30),
          u.qty, // Qty
          formatCurrency(ratePerUnit), // Rate/Unit
          formatCurrency(amount), // Amount
          '9403', // HSN
          18, // GST%
        ]);
      });

      // Add standard items like installation
      const installationCost = Math.round(subTotal * PRICING.installationRate);
      quoteRows.push([
        srNo++,
        'Installation & Fitting Charges\n(On-site assembly, alignment, testing)',
        'Complete Job',
        'Labor',
        1,
        formatCurrency(installationCost),
        formatCurrency(installationCost),
        '9954',
        18,
      ]);
      subTotal += installationCost;

      const cgst = subTotal * PRICING.gstRate;
      const sgst = subTotal * PRICING.gstRate;
      const grandTotal = Math.round(subTotal + cgst + sgst);

      const numberToWords = (num: number) => {
        const a = [
          '',
          'One',
          'Two',
          'Three',
          'Four',
          'Five',
          'Six',
          'Seven',
          'Eight',
          'Nine',
          'Ten',
          'Eleven',
          'Twelve',
          'Thirteen',
          'Fourteen',
          'Fifteen',
          'Sixteen',
          'Seventeen',
          'Eighteen',
          'Nineteen',
        ];
        const b = [
          '',
          '',
          'Twenty',
          'Thirty',
          'Forty',
          'Fifty',
          'Sixty',
          'Seventy',
          'Eighty',
          'Ninety',
        ];

        const inWords = (n: number): string => {
          if (n === 0) return 'Zero';
          let str = '';
          if (n > 9999999) {
            str += inWords(Math.floor(n / 10000000)) + ' Crore ';
            n %= 10000000;
          }
          if (n > 99999) {
            str += inWords(Math.floor(n / 100000)) + ' Lakh ';
            n %= 100000;
          }
          if (n > 999) {
            str += inWords(Math.floor(n / 1000)) + ' Thousand ';
            n %= 1000;
          }
          if (n > 99) {
            str += inWords(Math.floor(n / 100)) + ' Hundred ';
            n %= 100;
          }
          if (n > 0) {
            if (n < 20) str += a[n] + ' ';
            else {
              str += b[Math.floor(n / 10)] + ' ';
              if (n % 10 > 0) str += a[n % 10] + ' ';
            }
          }
          return str.trim();
        };

        return 'Rupees ' + inWords(num) + ' Only';
      };

      const wb = XLSX.utils.book_new();
      const sP = { font: { name: 'Calibri', sz: 10 }, alignment: { wrapText: true } };
      const sTitle = {
        font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '392579' } },
        alignment: { horizontal: 'center', vertical: 'center' },
      };

      const sKey = { font: { name: 'Calibri', sz: 10, bold: true } };
      const sVal = { font: { name: 'Calibri', sz: 10 } };
      const sProj = {
        font: { name: 'Calibri', sz: 11, bold: true },
        fill: { fgColor: { rgb: 'F2F2F2' } },
      };

      const sTh = {
        font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } },
        fill: { fgColor: { rgb: '000000' } },
        alignment: { vertical: 'center', horizontal: 'center' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
      const sTdNum = {
        font: { name: 'Calibri', sz: 10 },
        alignment: { vertical: 'top', horizontal: 'center', wrapText: true },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
      const sTdText = {
        font: { name: 'Calibri', sz: 10 },
        alignment: { vertical: 'top', horizontal: 'left', wrapText: true },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };

      const sSubKey = {
        font: { name: 'Calibri', sz: 10, bold: true },
        alignment: { horizontal: 'right' },
        border: { left: { style: 'thin' }, right: { style: 'thin' } },
      };
      const sSubVal = {
        font: { name: 'Calibri', sz: 10 },
        alignment: { horizontal: 'right' },
        border: { right: { style: 'thin' } },
      };
      const sGTKey = {
        font: { name: 'Calibri', sz: 11, bold: true },
        fill: { fgColor: { rgb: 'E0E0E0' } },
        alignment: { horizontal: 'right' },
        border: {
          top: { style: 'thin' },
          bottom: { style: 'thin' },
          left: { style: 'thin' },
          right: { style: 'thin' },
        },
      };
      const sGTVal = {
        font: { name: 'Calibri', sz: 11, bold: true },
        fill: { fgColor: { rgb: 'E0E0E0' } },
        alignment: { horizontal: 'right' },
        border: { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } },
      };

      const sTermH = { font: { name: 'Calibri', sz: 10, bold: true, underline: true } };
      const sTermC = { font: { name: 'Calibri', sz: 9 }, alignment: { wrapText: true } };

      const padArr = <T,>(arr: T[], len: number, fill: T): T[] => {
        while (arr.length < len) arr.push(fill);
        return arr;
      };

      const qData: any[] = [];
      const pushR = (arr: any[]) => qData.push(padArr(arr, 9, ''));

      // 1. Headers
      const sH1C = {
        font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '003366' } },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
      const sH2C = {
        font: { name: 'Calibri', sz: 10, italic: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
      const sPC = {
        font: { name: 'Calibri', sz: 10 },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };
      const sPBoldC = {
        font: { name: 'Calibri', sz: 10, bold: true },
        alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
      };

      const { companyName, companyAddress, contactLine, taxLine } =
        getOrganizationDisplayData(organizationDetails);

      pushR([{ v: companyName, s: sH1C }]);
      pushR([{ v: 'Custom Furniture Design & Manufacturing', s: sH2C }]);
      pushR([{ v: companyAddress, s: sPC }]);
      pushR([{ v: contactLine, s: sPC }]);
      pushR([{ v: taxLine, s: sPBoldC }]);
      pushR([]);
      pushR([{ v: 'QUOTATION', s: sTitle }]);
      pushR([]);

      // 2. Info Block
      const { quoteNo, quoteDate, validDate } = getQuoteMeta();

      pushR([
        { v: 'Quotation No:', s: sKey },
        { v: quoteNo, s: sVal },
        '',
        '',
        { v: 'Customer Name:', s: sKey },
        { v: design.customer_name || 'Customer', s: sVal },
      ]);
      pushR([
        { v: 'Date:', s: sKey },
        { v: quoteDate, s: sVal },
        '',
        '',
        { v: 'Company:', s: sKey },
        { v: design.customer_company || '-', s: sVal },
      ]);
      pushR([
        { v: 'Valid Till:', s: sKey },
        { v: validDate, s: sVal },
        '',
        '',
        { v: 'Address:', s: sKey },
        { v: design.customer_address || '-', s: sVal },
      ]);
      pushR([
        { v: 'Project ID:', s: sKey },
        { v: design.project_code || design.id, s: sVal },
        '',
        '',
        { v: 'GSTIN:', s: sKey },
        { v: design.customer_gstin || '-', s: sVal },
      ]);
      pushR([
        '',
        '',
        '',
        '',
        { v: 'Contact:', s: sKey },
        { v: design.customer_contact || '-', s: sVal },
      ]);
      pushR([
        '',
        '',
        '',
        '',
        { v: 'Email:', s: sKey },
        { v: design.customer_email || '-', s: sVal },
      ]);
      pushR([]);

      pushR([
        {
          v: `PROJECT: ${design.project_type || 'Custom Furniture'} - ${design.design_name}`,
          s: sProj,
        },
      ]);
      pushR([]);

      // 3. Table Headers
      pushR(QUOTATION_HEADERS.map((header) => ({ v: header, s: sTh })));

      // 4. Table Rows
      const tblStart = qData.length; // Row index is 16 (0-indexed)
      quoteRows.forEach((row) => {
        const formattedRow = [
          { v: row[0], s: sTdNum },
          { v: row[1], s: sTdText },
          { v: row[2], s: sTdText },
          { v: row[3], s: sTdText },
          { v: row[4], s: sTdNum },
          { v: row[5], s: sTdNum },
          { v: row[6], s: sTdNum },
          { v: row[7], s: sTdNum },
          { v: row[8], s: sTdNum },
        ];
        pushR(formattedRow);
      });

      // 5. Totals
      const tblEnd = qData.length;
      pushR([
        { v: 'SUBTOTAL (Before GST)', s: sSubKey },
        '',
        '',
        '',
        '',
        '',
        { v: formatCurrency(subTotal), s: sSubVal },
        '',
        '',
      ]);
      pushR([
        { v: 'Add: CGST @ 9%', s: sSubKey },
        '',
        '',
        '',
        '',
        '',
        { v: formatCurrency(cgst), s: sSubVal },
        '',
        '',
      ]);
      pushR([
        { v: 'Add: SGST @ 9%', s: sSubKey },
        '',
        '',
        '',
        '',
        '',
        { v: formatCurrency(sgst), s: sSubVal },
        '',
        '',
      ]);
      pushR([
        { v: 'Round Off', s: sSubKey },
        '',
        '',
        '',
        '',
        '',
        { v: formatCurrency(0), s: sSubVal },
        '',
        '',
      ]);
      pushR([
        { v: 'GRAND TOTAL (Inclusive of all taxes)', s: sGTKey },
        '',
        '',
        '',
        '',
        '',
        { v: formatCurrency(grandTotal), s: sGTVal },
        '',
        '',
      ]);
      pushR([]);
      pushR([
        { v: 'Amount in Words:', s: sKey },
        { v: numberToWords(grandTotal), s: sH1C },
      ]); // actually bold left-aligned, but reusing font
      pushR([]);

      // 6. Terms and Conditions block matching sample
      const tcLines = [
        [{ v: 'TERMS AND CONDITIONS:', s: sTermH }],
        [{ v: '1. PAYMENT TERMS:', s: sKey }],
        [{ v: '   • 40% advance payment with purchase order confirmation', s: sTermC }],
        [{ v: '   • 30% payment upon material delivery and start of manufacturing', s: sTermC }],
        [{ v: '   • 20% payment upon installation completion', s: sTermC }],
        [{ v: '   • 10% final payment after client sign-off and handover', s: sTermC }],
        [],
        [{ v: '2. DELIVERY & INSTALLATION:', s: sKey }],
        [
          {
            v: '   • Manufacturing time: 15-20 working days from order confirmation and advance payment',
            s: sTermC,
          },
        ],
        [{ v: '   • Installation time: 3-4 working days (subject to site readiness)', s: sTermC }],
        [
          {
            v: '   • Site should be ready with completed flooring, painting, electrical points, and civil work',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Customer to provide necessary permissions for material delivery and installation access',
            s: sTermC,
          },
        ],
        [],
        [{ v: '3. WARRANTY:', s: sKey }],
        [
          {
            v: '   • 1 year comprehensive warranty on manufacturing defects and workmanship',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • 5 years warranty on branded hardware (Blum/Hettich/Hafele/Ebco) as per manufacturer terms',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Warranty does not cover misuse, mishandling, accidents, or natural wear and tear',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Annual maintenance contract available separately after warranty period',
            s: sTermC,
          },
        ],
        [],
        [{ v: '4. INCLUSIONS:', s: sKey }],
        [{ v: '   • All materials as per detailed specifications mentioned above', s: sTermC }],
        [
          {
            v: '   • Complete manufacturing with CNC cutting, drilling, edge banding, and finishing',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Transportation to site within Ahmedabad city limits (25 km radius)',
            s: sTermC,
          },
        ],
        [{ v: '   • Complete on-site installation, assembly, fitting, and alignment', s: sTermC }],
        [{ v: '   • Final cleaning and handover with care & maintenance instructions', s: sTermC }],
        [],
        [{ v: '5. EXCLUSIONS:', s: sKey }],
        [
          {
            v: '   • Any civil work, masonry work, electrical work, plumbing, or painting work',
            s: sTermC,
          },
        ],
        [{ v: '   • Structural modifications or wall preparation work', s: sTermC }],
        [
          {
            v: '   • Loading/unloading charges at site (if elevator not available above 2nd floor)',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Transportation beyond 25 km from our factory (extra charges applicable)',
            s: sTermC,
          },
        ],
        [{ v: '   • Any items not specifically mentioned in this quotation', s: sTermC }],
        [],
        [{ v: '6. DESIGN & CHANGES:', s: sKey }],
        [{ v: '   • Design approval to be taken before manufacturing starts', s: sTermC }],
        [
          {
            v: '   • Any design changes after approval will attract additional charges (minimum 15% of changed items)',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Material/hardware changes subject to availability and price revision',
            s: sTermC,
          },
        ],
        [{ v: '   • Final measurements to be taken at site before manufacturing', s: sTermC }],
        [],
        [{ v: '7. GENERAL TERMS:', s: sKey }],
        [{ v: '   • This quotation is valid for 30 days from date of issue', s: sTermC }],
        [
          {
            v: '   • Prices are subject to change without notice after validity period',
            s: sTermC,
          },
        ],
        [{ v: '   • All disputes subject to Ahmedabad jurisdiction only', s: sTermC }],
        [
          {
            v: '   • GST will be charged as per prevailing government rates at the time of billing',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Material specifications are subject to availability; equivalent quality alternatives may be provided with customer consent',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Payment should be made via cheque/NEFT/RTGS in favour of the company named on this quotation',
            s: sTermC,
          },
        ],
        [
          {
            v: '   • Any additional work or items requested during installation will be charged separately',
            s: sTermC,
          },
        ],
        [],
        ...(getBankingLines(organizationDetails).length > 0
          ? [
              [{ v: 'BANKING DETAILS FOR PAYMENT:', s: sTermH }],
              ...getBankingLines(organizationDetails).map((line) => [
                {
                  v: line.startsWith('UPI ID:') ? `${line} (for advance payments)` : line,
                  s: sP,
                },
              ]),
            ]
          : []),
        [],
        [
          { v: 'NOTE:', s: sKey },
          {
            v: 'Please share your purchase order to confirm this quotation. Our team will contact you for final measurements and design approval.',
            s: sVal,
          },
        ],
        [],
        [],
        ['', '', '', '', '', '', { v: `For ${companyName}`, s: sKey }],
        [],
        [],
        [],
        ['', '', '', '', '', '', { v: '____________________', s: sP }],
        ['', '', '', '', '', '', { v: 'Authorized Signatory', s: sP }],
        ['', '', '', '', '', '', { v: `Date: ${quoteDate}`, s: sP }],
        [],
        [
          {
            v: 'Thank you for choosing us. We look forward to transforming your space!',
            s: sH2C,
          },
        ],
      ];

      const tcStartRow = qData.length;
      tcLines.forEach((l) => pushR(l));

      const ws = XLSX.utils.aoa_to_sheet(qData);

      // Merges based strictly on python extracted sample layout
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }); // company name row
      ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: 8 } }); // Custom Furniture...
      ws['!merges'].push({ s: { r: 2, c: 0 }, e: { r: 2, c: 8 } }); // Address...
      ws['!merges'].push({ s: { r: 3, c: 0 }, e: { r: 3, c: 8 } }); // Phone...
      ws['!merges'].push({ s: { r: 4, c: 0 }, e: { r: 4, c: 8 } }); // GSTIN...
      ws['!merges'].push({ s: { r: 6, c: 0 }, e: { r: 6, c: 8 } }); // QUOTATION

      // Info block merges F9:I9 etc
      ws['!merges'].push({ s: { r: 8, c: 5 }, e: { r: 8, c: 8 } });
      ws['!merges'].push({ s: { r: 9, c: 5 }, e: { r: 9, c: 8 } });
      ws['!merges'].push({ s: { r: 10, c: 5 }, e: { r: 10, c: 8 } });
      ws['!merges'].push({ s: { r: 13, c: 5 }, e: { r: 13, c: 8 } });
      ws['!merges'].push({ s: { r: 15, c: 0 }, e: { r: 15, c: 8 } }); // PROJECT

      // Totals
      ws['!merges'].push({ s: { r: tblEnd, c: 0 }, e: { r: tblEnd, c: 5 } }); // SUBTOTAL
      ws['!merges'].push({ s: { r: tblEnd + 1, c: 0 }, e: { r: tblEnd + 1, c: 5 } });
      ws['!merges'].push({ s: { r: tblEnd + 2, c: 0 }, e: { r: tblEnd + 2, c: 5 } });
      ws['!merges'].push({ s: { r: tblEnd + 3, c: 0 }, e: { r: tblEnd + 3, c: 5 } });
      ws['!merges'].push({ s: { r: tblEnd + 4, c: 0 }, e: { r: tblEnd + 4, c: 5 } }); // GRAND TOTAL

      ws['!merges'].push({ s: { r: tblEnd + 6, c: 1 }, e: { r: tblEnd + 6, c: 8 } }); // Amount in Words (B:I)

      // Merge all rows for T&C up to the signature
      for (let i = 0; i < tcLines.length; i++) {
        const cell: any = tcLines[i][0];
        if (tcLines[i].length > 0 && cell && cell.v !== 'NOTE:' && cell.v !== '') {
          if (
            cell.v.startsWith('Bank Name') ||
            cell.v.startsWith('Account ') ||
            cell.v.startsWith('IFSC') ||
            cell.v.startsWith('Branch:') ||
            cell.v.startsWith('UPI')
          ) {
            ws['!merges'].push({ s: { r: tcStartRow + i, c: 0 }, e: { r: tcStartRow + i, c: 3 } });
          } else {
            ws['!merges'].push({ s: { r: tcStartRow + i, c: 0 }, e: { r: tcStartRow + i, c: 8 } });
          }
        } else if (cell && cell.v === 'NOTE:') {
          ws['!merges'].push({ s: { r: tcStartRow + i, c: 1 }, e: { r: tcStartRow + i, c: 8 } });
        } else if (tcLines[i].length > 6 && tcLines[i][6]) {
          // Signature area block merges (G:I)
          ws['!merges'].push({ s: { r: tcStartRow + i, c: 6 }, e: { r: tcStartRow + i, c: 8 } });
        }
      }

      ws['!cols'] = [
        { wch: 5.0 },
        { wch: 32.0 },
        { wch: 18.0 },
        { wch: 14.0 },
        { wch: 6.0 },
        { wch: 12.0 },
        { wch: 14.0 },
        { wch: 8.0 },
        { wch: 8.0 },
      ];

      // Row heights (optional, to make it look matching)
      if (!ws['!rows']) ws['!rows'] = [];
      ws['!rows'][6] = { hpx: 30 }; // QUOTATION
      for (let i = 0; i < quoteRows.length; i++) ws['!rows'][tblStart + i] = { hpx: 45 }; // multi-line cells

      XLSX.utils.book_append_sheet(wb, ws, 'Quotation');
      if (format === 'excel') {
        XLSX.writeFile(wb, `Quotation_${design.design_name || 'Design'}.xlsx`);
      } else {
        downloadQuotationPdf(
          design,
          organizationDetails,
          quoteRows,
          subTotal,
          cgst,
          sgst,
          grandTotal,
          numberToWords
        );
      }
    } catch (err) {
      console.error(err);
      alert('Failed to generate Quotation Data.');
    } finally {
      hideFullScreenLoader();
      setIsGeneratingQuote(false);
    }
  };

  return (
    <div className={styles.container}>
      <Sidebar />

      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Production" />

        <div className={styles.maincontent}>
          <div className={styles.designs}>
            <div className={styles.mesdesigncontent}>
              {/* Hero + exports */}
              <div className={styles.headerRow}>
                <div className={styles.headerText}>
                  <button
                    type="button"
                    className={styles.backLink}
                    onClick={() => router.push(REDIRECT.MES)}
                  >
                    <LuArrowLeft aria-hidden="true" />
                    Production floor
                  </button>
                  <h2>
                    Cut list <span>&amp; exports</span>
                  </h2>
                  <p>
                    Every panel in this design, ready for the saw. Export a quotation, bill of
                    materials or CNC files, or open the sheet layout.
                  </p>
                  <div className={styles.headerChips}>
                    <span className={styles.headerChip}>
                      <LuLayers aria-hidden="true" />
                      {showTableLoading ? '–' : displayData.length}{' '}
                      {displayData.length === 1 ? 'part' : 'parts'}
                    </span>
                  </div>
                </div>

                <div className={styles.toolbarmenu}>
                  <div className={styles.exportDropdown}>
                    <button
                      onClick={() =>
                        setOpenDropdown((prev) => (prev === 'quotation' ? null : 'quotation'))
                      }
                      disabled={isGeneratingQuote || displayData.length === 0}
                      className={styles.exportButton}
                    >
                      <span className={styles.exportIcon}>
                        <LuReceiptText aria-hidden="true" />
                      </span>
                      <span className={styles.exportText}>
                        <strong>Quotation</strong>
                        <small>Price for the client</small>
                      </span>
                      <LuChevronDown
                        className={`${styles.exportChevron} ${openDropdown === 'quotation' ? styles.exportChevronOpen : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    {openDropdown === 'quotation' && (
                      <div className={styles.dropdownMenu}>
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            setOpenDropdown(null);
                            handleGenerateQuotation('excel');
                          }}
                        >
                          <LuFileSpreadsheet aria-hidden="true" />
                          Excel
                        </button>
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            setOpenDropdown(null);
                            handleGenerateQuotation('pdf');
                          }}
                        >
                          <LuFileText aria-hidden="true" />
                          PDF
                        </button>
                      </div>
                    )}
                  </div>
                  <div className={styles.exportDropdown}>
                    <button
                      onClick={() => setOpenDropdown((prev) => (prev === 'bom' ? null : 'bom'))}
                      disabled={isGeneratingBOM || displayData.length === 0}
                      className={styles.exportButton}
                    >
                      <span className={styles.exportIcon}>
                        <LuClipboardList aria-hidden="true" />
                      </span>
                      <span className={styles.exportText}>
                        <strong>BOM data</strong>
                        <small>Panels, edging, hardware</small>
                      </span>
                      <LuChevronDown
                        className={`${styles.exportChevron} ${openDropdown === 'bom' ? styles.exportChevronOpen : ''}`}
                        aria-hidden="true"
                      />
                    </button>
                    {openDropdown === 'bom' && (
                      <div className={styles.dropdownMenu}>
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            setOpenDropdown(null);
                            handleGenerateBOM('excel');
                          }}
                        >
                          <LuFileSpreadsheet aria-hidden="true" />
                          Excel
                        </button>
                        <button
                          className={styles.dropdownItem}
                          onClick={() => {
                            setOpenDropdown(null);
                            handleGenerateBOM('pdf');
                          }}
                        >
                          <LuFileText aria-hidden="true" />
                          PDF
                        </button>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={async () => {
                      if (xmlDownloadInFlightRef.current) return;
                      xmlDownloadInFlightRef.current = true;
                      setIsDownloadingXML(true);
                      showFullScreenLoader('Preparing XMLs...');
                      try {
                        const response: any = await CommonService.put(
                          API_ENDPOINT.DOWNLOAD_NESTING_PDF(design_id) +
                            `?version_id=${version_id}`,
                          { format: 'xml_zip' }
                        );
                        if (response?.data?.file) {
                          const fileUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}/${response.data.file.replace('umaboy/', '')}`;
                          const fileName = response.data.file.split('/').pop() || 'xml_files.zip';
                          const a = document.createElement('a');
                          a.href = fileUrl;
                          a.download = fileName;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                        }
                      } catch (e) {
                        console.error(e);
                        alert('Failed to download XMLs');
                      } finally {
                        xmlDownloadInFlightRef.current = false;
                        hideFullScreenLoader();
                        setIsDownloadingXML(false);
                      }
                    }}
                    disabled={isDownloadingXML || displayData.length === 0}
                    className={styles.exportButton}
                  >
                    <span className={styles.exportIcon}>
                      <LuFileCode2 aria-hidden="true" />
                    </span>
                    <span className={styles.exportText}>
                      <strong>CNC XMLs</strong>
                      <small>Zip for the machine</small>
                    </span>
                    <LuDownload className={styles.exportChevron} aria-hidden="true" />
                  </button>
                  {/* ✅ View Details Button */}
                  <button
                    onClick={async () => {
                      showFullScreenLoader('Loading view details...');
                      try {
                        if (design_id && version_id) {
                          await router.push(`/design/${design_id}/${version_id}/nesting-details`);
                        } else {
                          await router.push(`/design/${design_id}`);
                        }
                      } finally {
                        hideFullScreenLoader();
                      }
                    }}
                    className={styles.viewDetailsButton}
                    disabled={displayData.length === 0}
                  >
                    <LuLayoutGrid aria-hidden="true" />
                    View sheet layout
                    <LuArrowRight aria-hidden="true" />
                  </button>
                </div>
              </div>

              {/* ✅ Table */}
              <div className={styles.tableCard}>
                <div className={styles.tableCardHead}>
                  <h3>Panels</h3>
                  {!showTableLoading && displayData.length > 0 && (
                    <span className={styles.countPill}>
                      Showing {Math.min(visibleDesigns, displayData.length)} of {displayData.length}
                    </span>
                  )}
                </div>
                <div className={styles.tablecontainer}>
                  <table>
                    <thead>
                      <tr>
                        <th>ID</th>
                        <th>Name</th>
                        <th>Width</th>
                        <th>Height</th>
                        <th>Depth</th>
                      </tr>
                    </thead>

                    <tbody>
                      {showTableLoading ? (
                        <tr>
                          <td colSpan={5} className={styles.stateCell}>
                            <PhinxLoader scene="cabinet" size="sm" label="Loading cabinet parts…" />
                          </td>
                        </tr>
                      ) : displayData.length === 0 ? (
                        <tr>
                          <td colSpan={5} className={styles.stateCell}>
                            <span className={styles.emptyIcon}>
                              <LuPackageOpen aria-hidden="true" />
                            </span>
                            <strong>No panels to nest yet</strong>
                            <span className={styles.stateHint}>
                              Add cabinets to this design first, then come back here.
                            </span>
                          </td>
                        </tr>
                      ) : (
                        displayData.slice(0, visibleDesigns).map((item: any, index: number) => (
                          <tr key={item.id || index}>
                            <td className={styles.idCell}>
                              {item['Unique ID'] ||
                                item.unique_id ||
                                item.ID ||
                                item.id ||
                                index + 1}
                            </td>
                            <td className={styles.nameCell}>
                              {item.name || item.Name || 'Unknown'}
                            </td>
                            <td className={styles.dimCell}>
                              {formatDimension(item?.dimensions?.width ?? item?.width, item?.type)}
                            </td>
                            <td className={styles.dimCell}>
                              {formatDimension(
                                item?.dimensions?.height ?? item?.height,
                                item?.type
                              )}
                            </td>
                            <td className={styles.dimCell}>
                              {formatDimension(item?.dimensions?.depth ?? item?.depth, item?.type)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>

                  {/* ✅ Load More */}
                  {!showTableLoading && visibleDesigns < displayData.length && (
                    <div className={styles.designsLoadMore}>
                      <div className={styles.loadmore} onClick={handleLoadMore}>
                        <LuChevronsDown aria-hidden="true" />
                        <p>Load more</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
              {/* ✅ End Table */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nesting;
