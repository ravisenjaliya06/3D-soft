import { RootState } from '@/components/3dmodel/store';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import * as XLSX from 'xlsx-js-style';
import styles from '../mes/nesting.module.css';

const Nesting = () => {
  const router = useRouter();
  const design_id = (router.query.designid as string) || window.location.pathname.split('/')[2];

  const [visibleDesigns, setVisibleDesigns] = useState(50);
  const [localData, setLocalData] = useState<any[]>([]);
  const [isGeneratingBOM, setIsGeneratingBOM] = useState(false);
  const [isGeneratingQuote, setIsGeneratingQuote] = useState(false);
  const [isDownloadingXML, setIsDownloadingXML] = useState(false);

  const { objects } = useSelector((state: RootState) => state.data);

  useEffect(() => {
    if (!design_id || !objects || objects.length === 0) return;

    const key = `nesting_data_${design_id}`;
    localStorage.setItem(key, JSON.stringify(objects));
  }, [objects, design_id]);

  useEffect(() => {
    if (!design_id) return;

    const key = `nesting_data_${design_id}`;
    const cached = localStorage.getItem(key);

    if (cached) {
      setLocalData(JSON.parse(cached));
    }
  }, [design_id]);

  const data = (objects?.length ? objects : localData).filter((item) => item.type !== 'model');

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

  const handleGenerateBOM = async () => {
    if (isGeneratingBOM) return;
    setIsGeneratingBOM(true);
    try {
      // 1. Fetch Design Details
      const designResponse: any = await CommonService.get(API_ENDPOINT.GET_DESIGN_DETAILS(design_id));
      const design = designResponse.data;

      // 2. Fetch Nesting Data (Layout with holes/grooves/edgebands)
      let layoutData: any[] = [];
      try {
        const layoutResponse: any = await CommonService.put(
          API_ENDPOINT.DOWNLOAD_NESTING_PDF(design_id),
          { format: 'json' }
        );
        if (layoutResponse?.data && !layoutResponse.data.error) {
          layoutData = layoutResponse.data;
        }
      } catch (e) {
        console.warn('Nesting layout data not available', e);
      }

      // 3. Fetch Materials for Costing
      let allMaterials: any[] = [];
      try {
        const materialResponse: any = await CommonService.get(API_ENDPOINT.GET_MATERIAL);
        if (materialResponse?.data?.results) {
          allMaterials = materialResponse.data.results;
        } else if (Array.isArray(materialResponse?.data)) {
          allMaterials = materialResponse.data;
        }
      } catch (e) {
        console.warn('Material catalog data not available', e);
      }

      const materialPriceMap: Record<string, number> = {};
      allMaterials.forEach((m) => {
        materialPriceMap[m.id] = parseFloat(m.properties?.sell_price || m.sell_price || 0);
      });

      // Merge data and layoutData to ensure edgebands are caught if they exist in Redux
      const partsList = (layoutData.length > 0 ? layoutData : data).map((p: any) => {
        // The API might return "Unique ID" or "Unique_ID" or "ID" depending on the table.
        const layoutUniqueId = p['Unique ID'] || p.unique_id || p.ID;

        const reduxPart = data.find(
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
            if (rEdge.front) eBands.push('LEFT'); // front = left face
            if (rEdge.back) eBands.push('RIGHT'); // back = right face
            eBands = [...new Set(eBands)]; // deduplicate
          }
        }
        return {
          ...p,
          unique_id: reduxPart?.unique_id || layoutUniqueId,
          edgebands: eBands,
        };
      });

      console.log('Final partsList structure:', partsList);

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
      // Build a map of id -> name for parent cabinet lookup
      const parentNameMap: Record<string, string> = {};
      data.forEach((obj: any) => {
        parentNameMap[obj.id] = obj.name || obj.type || obj.id;
      });

      const cuttingHeader = [
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
      const cuttingRows = partsList.map((part: any) => {
        const h = parseFloat(part.height || part?.dimensions?.height || 0);
        const w = parseFloat(part.width || part?.dimensions?.width || 0);
        const d = part.sheet_thickness || part.depth || part?.dimensions?.depth || 18;
        const area = ((h * w) / 1000000).toFixed(3);

        // Use parent_name from nesting JSON (set by backend parent lookup)
        console.log('part', part);
        const cabinetName = part.parent_name || part.material_name || '-';

        let edgeL1 = 'None',
          edgeL2 = 'None',
          edgeW1 = 'None',
          edgeW2 = 'None';
        if (part.edgebands && part.edgebands.length > 0) {
          part.edgebands.forEach((e: any) => {
            // Handle both object and string formats
            let eStr =
              typeof e === 'object' && e?.face
                ? String(e.face).toUpperCase()
                : String(e).toUpperCase();
            if (eStr === 'LEFT' || eStr === 'L' || eStr === '5' || eStr === 'FRONT')
              edgeL1 = 'PVC 1mm';
            else if (eStr === 'RIGHT' || eStr === 'R' || eStr === '3' || eStr === 'BACK')
              edgeL2 = 'PVC 1mm';
            else if (eStr === 'TOP' || eStr === 'T' || eStr === '4' || eStr === '1')
              edgeW1 = 'PVC 1mm';
            else if (eStr === 'BOTTOM' || eStr === 'B' || eStr === '2' || eStr === '6')
              edgeW2 = 'PVC 1mm';
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
        cuttingHeader.map((h) => ({ v: h, s: headerStyle })),
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
      const panelHeader = [
        'Material Type',
        'Thickness',
        'Sheet Size',
        'Sheets Required',
        'Sheet Cost',
        'Wastage %',
        'Total Material Cost',
        'Total Labor Cost',
      ];
      let totalMaterialCost = 0;
      const panelRows = Object.keys(thicknessMap).map((t) => {
        const sheetsReq = Math.ceil(thicknessMap[t].area / (2.44 * 1.22));
        const sheetCost = thicknessMap[t].costPerSheet || 1500; // default 1500 if 0
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
          Math.round(totalCost * 0.2),
        ]; // 20% labor guess
      });
      const panelSheetData = [
        [{ v: 'PANEL DETAILS & SHEET OPTIMIZATION', t: 's', s: titleStyle }, ...Array(7).fill('')],
        [],
        panelHeader.map((h) => ({ v: h, s: headerStyle })),
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
      const edgeHeader = [
        'Part ID',
        'Part Name',
        'Edge Type',
        'Thickness',
        'Total Length (m)',
        'Rate/m',
        'Total Cost',
        'Remarks',
      ];
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
          const edgeCost = len * 25; // assumed 25 per meter
          totalEdgeCost += edgeCost;
          edgeRows.push([
            row[0],
            row[1],
            'PVC 1mm',
            1,
            len.toFixed(2),
            '25',
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
        edgeHeader.map((h) => ({ v: h, s: headerStyle })),
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
      let minifixCamCount = 0;
      let minifixDowelCount = 0;
      let hingeCount = 0;

      partsList.forEach((part: any) => {
        if (part.minifix_holes && part.minifix_holes.length > 0) {
          part.minifix_holes.forEach((h: any) => {
            const type = (h.type || '').toUpperCase();
            if (type === 'CAM') minifixCamCount++;
            if (type === 'DOWEL' || type === 'MINIFIX DOWEL') minifixDowelCount++;
            if (type === 'HINGE') hingeCount++;
          });
        }
      });
      const hardwareHeader = [
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
        hardwareHeader.map((h) => ({ v: h, s: headerStyle })),
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
      const totalLaborCost = Math.round(totalMaterialCost * 0.2); // 20% labor guess
      const estCost = totalMaterialCost + totalEdgeCost + totalLaborCost;
      const finalPrice = Math.round(estCost * 1.5); // 50% margin guess

      const summaryData: any[] = [
        [{ v: 'BRAVENTO - Bill of Materials', t: 's', s: titleStyle }, '', '', '', '', '', '', ''],
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

      XLSX.writeFile(wb, `BOM_${design.design_name || 'Design'}.xlsx`);
    } catch (err) {
      console.error(err);
      alert('Failed to generate BOM Data.');
    } finally {
      setIsGeneratingBOM(false);
    }
  };

  const handleGenerateQuotation = async () => {
    if (isGeneratingQuote) return;
    setIsGeneratingQuote(true);
    try {
      // 0. Fetch User Details for Company/Banking Info
      let userDetails: any = null;
      try {
        const userResp: any = await CommonService.get(API_ENDPOINT.GET_USER_DETAILS);
        if (userResp.status === 200) userDetails = userResp.data;
      } catch (e) {
        console.warn('Failed to fetch user details for quotation styling', e);
      }

      // 1. Fetch Design Details
      const designResponse: any = await CommonService.get(API_ENDPOINT.GET_DESIGN_DETAILS(design_id));
      const design = designResponse.data;

      // 2. Fetch Nesting Data
      let layoutData: any[] = [];
      try {
        const layoutResponse: any = await CommonService.put(
          API_ENDPOINT.DOWNLOAD_NESTING_PDF(design_id),
          { format: 'json' }
        );
        if (layoutResponse?.data && !layoutResponse.data.error) {
          layoutData = layoutResponse.data;
        }
      } catch (e) {
        console.warn('Nesting layout data not available', e);
      }

      // 3. Fetch Materials
      let allMaterials: any[] = [];
      try {
        const materialResponse: any = await CommonService.get(API_ENDPOINT.GET_MATERIAL);
        if (materialResponse?.data?.results) {
          allMaterials = materialResponse.data.results;
        } else if (Array.isArray(materialResponse?.data)) {
          allMaterials = materialResponse.data;
        }
      } catch (e) {
        console.warn('Material catalog data not available', e);
      }

      const materialPriceMap: Record<string, number> = {};
      allMaterials.forEach((m) => {
        materialPriceMap[m.id] = parseFloat(m.properties?.sell_price || m.sell_price || 0);
      });

      // 4. Merge Data (from BOM logic)
      const partsList = (layoutData.length > 0 ? layoutData : data).map((p: any) => {
        const layoutUniqueId = p['Unique ID'] || p.unique_id || p.ID;
        const reduxPart = data.find(
          (d: any) => d.id === p.id || d.id === p.ID || (d.unique_id && d.unique_id === layoutUniqueId)
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

      // 5. Group Parts by Assembly (Unit)
      const unitsMap: Record<string, any> = {};

      partsList.forEach((part: any, index: number) => {
        const h = parseFloat(part.height || part?.dimensions?.height || 0);
        const w = parseFloat(part.width || part?.dimensions?.width || 0);
        const d = part.sheet_thickness || part.depth || part?.dimensions?.depth || 18;

        let assemblyName = part.parent_name || 'Individual Components';
        if (!assemblyName || assemblyName === '-') {
          // Find parent using redux parent tree
          const rPart = data.find(
            (d: any) => d.id === part.id || d.id === part.ID || (d.unique_id && d.unique_id === part.unique_id)
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
            dowelCount: 0
          };
        }

        const unit = unitsMap[assemblyName];
        unit.maxLength = Math.max(unit.maxLength, h, w);
        unit.maxWidth = Math.max(unit.maxWidth, h, w); // simplified
        unit.maxHeight = Math.max(unit.maxHeight, d);

        const matName = part.material_name || 'Plywood';
        unit.materialNames.add(`${d}mm ${matName}`);

        // Material Cost
        const rPart = data.find(
          (d: any) => d.id === part.id || d.id === part.ID || (d.unique_id && d.unique_id === part.unique_id)
        ) || part;

        const mat = rPart.material && Array.isArray(rPart.material) ? rPart.material[0] : rPart.material;
        const matId = mat?.id || mat;
        const sheetCost = materialPriceMap[matId] || 1500;

        const areaReq = ((h * w) / 1000000);
        // approx cost per sqm = sheetCost / (2.44*1.22)
        const costPerSqm = sheetCost / 2.9768;
        unit.totalMaterialCost += (areaReq * costPerSqm * (part.quantity || 1));

        // Edgebanding cost
        let len = 0;
        const eH = h / 1000;
        const eW = w / 1000;
        if (part.edgebands && part.edgebands.length > 0) {
          part.edgebands.forEach((e: any) => {
            let eStr = typeof e === 'object' && e?.face ? String(e.face).toUpperCase() : String(e).toUpperCase();
            if (['LEFT', 'L', '5', 'FRONT'].includes(eStr)) len += eH;
            if (['RIGHT', 'R', '3', 'BACK'].includes(eStr)) len += eH;
            if (['TOP', 'T', '4', '1'].includes(eStr)) len += eW;
            if (['BOTTOM', 'B', '2', '6'].includes(eStr)) len += eW;
          });
        }
        unit.totalEdgeCost += (len * 25); // 25 rs per meter

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

      const formatCurrency = (num: number) => {
        return '₹' + num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
      };

      Object.values(unitsMap).forEach((u) => {
        // Add hardware cost
        const hwCost = (u.hingeCount * 150) + (u.camCount * 20) + (u.dowelCount * 10);
        const rawCost = u.totalMaterialCost + u.totalEdgeCost + hwCost;
        const laborCost = rawCost * 0.2; // 20% labor
        const estCost = rawCost + laborCost;

        let ratePerUnit = Math.round(estCost * 1.5); // 50% markup
        if (ratePerUnit < 1000) ratePerUnit = 1500; // minimum boundary

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
          u.qty,            // Qty
          formatCurrency(ratePerUnit),      // Rate/Unit
          formatCurrency(amount),           // Amount
          "9403",           // HSN
          18                // GST%
        ]);
      });

      // Add standard items like installation
      const installationCost = Math.round(subTotal * 0.05); // 5% installation
      quoteRows.push([
        srNo++,
        "Installation & Fitting Charges\n(On-site assembly, alignment, testing)",
        "Complete Job",
        "Labor",
        1,
        formatCurrency(installationCost),
        formatCurrency(installationCost),
        "9954",
        18
      ]);
      subTotal += installationCost;

      const cgst = subTotal * 0.09;
      const sgst = subTotal * 0.09;
      const grandTotal = Math.round(subTotal + cgst + sgst);

      const numberToWords = (num: number) => {
        const a = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
        const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

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

        return "Rupees " + inWords(num) + " Only";
      };

      const wb = XLSX.utils.book_new();

      // Excel Styles matching sample
      const sH1 = { font: { name: 'Calibri', sz: 14, bold: true }, alignment: { wrapText: true } };
      const sH2 = { font: { name: 'Calibri', sz: 10, italic: true }, alignment: { wrapText: true } };
      const sP = { font: { name: 'Calibri', sz: 10 }, alignment: { wrapText: true } };
      const sTitle = { font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '392579' } }, alignment: { horizontal: 'center', vertical: 'center' } };

      const sKey = { font: { name: 'Calibri', sz: 10, bold: true } };
      const sVal = { font: { name: 'Calibri', sz: 10 } };
      const sProj = { font: { name: 'Calibri', sz: 11, bold: true }, fill: { fgColor: { rgb: 'F2F2F2' } } };

      const sTh = { font: { name: 'Calibri', sz: 10, bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: '000000' } }, alignment: { vertical: 'center', horizontal: 'center' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
      const sTdNum = { font: { name: 'Calibri', sz: 10 }, alignment: { vertical: 'top', horizontal: 'center', wrapText: true }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
      const sTdText = { font: { name: 'Calibri', sz: 10 }, alignment: { vertical: 'top', horizontal: 'left', wrapText: true }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };

      const sSubKey = { font: { name: 'Calibri', sz: 10, bold: true }, alignment: { horizontal: 'right' }, border: { left: { style: 'thin' }, right: { style: 'thin' } } };
      const sSubVal = { font: { name: 'Calibri', sz: 10 }, alignment: { horizontal: 'right' }, border: { right: { style: 'thin' } } };
      const sGTKey = { font: { name: 'Calibri', sz: 11, bold: true }, fill: { fgColor: { rgb: 'E0E0E0' } }, alignment: { horizontal: 'right' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } } };
      const sGTVal = { font: { name: 'Calibri', sz: 11, bold: true }, fill: { fgColor: { rgb: 'E0E0E0' } }, alignment: { horizontal: 'right' }, border: { top: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } } };

      const sTermH = { font: { name: 'Calibri', sz: 10, bold: true, underline: true } };
      const sTermC = { font: { name: 'Calibri', sz: 9 }, alignment: { wrapText: true } };

      const padArr = <T,>(arr: T[], len: number, fill: T): T[] => {
        while (arr.length < len) arr.push(fill);
        return arr;
      };

      const qData: any[] = [];
      const pushR = (arr: any[]) => qData.push(padArr(arr, 9, ''));

      // 1. Headers
      const sH1C = { font: { name: 'Calibri', sz: 14, bold: true, color: { rgb: '003366' } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
      const sH2C = { font: { name: 'Calibri', sz: 10, italic: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
      const sPC = { font: { name: 'Calibri', sz: 10 }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
      const sPBoldC = { font: { name: 'Calibri', sz: 10, bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };

      const companyName = userDetails?.company_name || "BRAVENTO FURNITURE SOLUTIONS";
      const companyAddress = userDetails?.company_address || "Address: 123, Furniture Complex, S.G. Highway, Ahmedabad - 380015, Gujarat, India";

      let contactLine = '';
      if (userDetails?.company_phone) contactLine += `Phone: ${userDetails.company_phone} | `;
      else contactLine += `Phone: +91 79 1234 5678 | `;

      if (userDetails?.company_email) contactLine += `Email: ${userDetails.company_email} | `;
      else contactLine += `Email: sales@bravento.com | `;

      if (userDetails?.company_website) contactLine += `Website: ${userDetails.company_website}`;
      else contactLine += `Website: www.bravento.com`;

      let taxLine = '';
      if (userDetails?.company_gstin) taxLine += `GSTIN: ${userDetails.company_gstin} | `;
      else taxLine += `GSTIN: 24XXXXX1234X1Z5 | `;

      if (userDetails?.company_pan) taxLine += `PAN: ${userDetails.company_pan}`;
      else taxLine += `PAN: XXXXX1234X`;

      pushR([{ v: companyName, s: sH1C }]);
      pushR([{ v: "Custom Furniture Design & Manufacturing", s: sH2C }]);
      pushR([{ v: companyAddress, s: sPC }]);
      pushR([{ v: contactLine, s: sPC }]);
      pushR([{ v: taxLine, s: sPBoldC }]);
      pushR([]);
      pushR([{ v: "QUOTATION", s: sTitle }]);
      pushR([]);

      // 2. Info Block
      const quoteNo = `QT/${new Date().getFullYear()}/${design_id.substring(0, 4).toUpperCase()}`;
      const quoteDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');
      const validDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).replace(/ /g, '-');

      pushR([{ v: "Quotation No:", s: sKey }, { v: quoteNo, s: sVal }, '', '', { v: "Customer Name:", s: sKey }, { v: design.customer_name || 'Customer', s: sVal }]);
      pushR([{ v: "Date:", s: sKey }, { v: quoteDate, s: sVal }, '', '', { v: "Company:", s: sKey }, { v: design.customer_company || '-', s: sVal }]);
      pushR([{ v: "Valid Till:", s: sKey }, { v: validDate, s: sVal }, '', '', { v: "Address:", s: sKey }, { v: design.customer_address || '-', s: sVal }]);
      pushR([{ v: "Project ID:", s: sKey }, { v: design.project_code || design.id, s: sVal }, '', '', { v: "GSTIN:", s: sKey }, { v: design.customer_gstin || '-', s: sVal }]);
      pushR(['', '', '', '', { v: "Contact:", s: sKey }, { v: design.customer_contact || '-', s: sVal }]);
      pushR(['', '', '', '', { v: "Email:", s: sKey }, { v: design.customer_email || '-', s: sVal }]);
      pushR([]);

      pushR([{ v: `PROJECT: ${design.project_type || 'Custom Furniture'} - ${design.design_name}`, s: sProj }]);
      pushR([]);

      // 3. Table Headers
      pushR([
        { v: "Sr.", s: sTh }, { v: "Unit/Component Description", s: sTh }, { v: "Dimensions (L×W×H)", s: sTh },
        { v: "Material", s: sTh }, { v: "Qty", s: sTh }, { v: "Rate/Unit", s: sTh },
        { v: "Amount", s: sTh }, { v: "HSN", s: sTh }, { v: "GST%", s: sTh }
      ]);

      // 4. Table Rows
      const tblStart = qData.length; // Row index is 16 (0-indexed)
      quoteRows.forEach(row => {
        const formattedRow = [
          { v: row[0], s: sTdNum }, { v: row[1], s: sTdText }, { v: row[2], s: sTdText },
          { v: row[3], s: sTdText }, { v: row[4], s: sTdNum }, { v: row[5], s: sTdNum },
          { v: row[6], s: sTdNum }, { v: row[7], s: sTdNum }, { v: row[8], s: sTdNum }
        ];
        pushR(formattedRow);
      });

      // 5. Totals
      const tblEnd = qData.length;
      pushR([{ v: "SUBTOTAL (Before GST)", s: sSubKey }, '', '', '', '', '', { v: formatCurrency(subTotal), s: sSubVal }, '', '']);
      pushR([{ v: "Add: CGST @ 9%", s: sSubKey }, '', '', '', '', '', { v: formatCurrency(cgst), s: sSubVal }, '', '']);
      pushR([{ v: "Add: SGST @ 9%", s: sSubKey }, '', '', '', '', '', { v: formatCurrency(sgst), s: sSubVal }, '', '']);
      pushR([{ v: "Round Off", s: sSubKey }, '', '', '', '', '', { v: formatCurrency(0), s: sSubVal }, '', '']);
      pushR([{ v: "GRAND TOTAL (Inclusive of all taxes)", s: sGTKey }, '', '', '', '', '', { v: formatCurrency(grandTotal), s: sGTVal }, '', '']);
      pushR([]);
      pushR([{ v: "Amount in Words:", s: sKey }, { v: numberToWords(grandTotal), s: sH1C }]); // actually bold left-aligned, but reusing font
      pushR([]);

      // 6. Terms and Conditions block matching sample
      const tcLines = [
        [{ v: "TERMS AND CONDITIONS:", s: sTermH }],
        [{ v: "1. PAYMENT TERMS:", s: sKey }],
        [{ v: "   • 40% advance payment with purchase order confirmation", s: sTermC }],
        [{ v: "   • 30% payment upon material delivery and start of manufacturing", s: sTermC }],
        [{ v: "   • 20% payment upon installation completion", s: sTermC }],
        [{ v: "   • 10% final payment after client sign-off and handover", s: sTermC }],
        [],
        [{ v: "2. DELIVERY & INSTALLATION:", s: sKey }],
        [{ v: "   • Manufacturing time: 15-20 working days from order confirmation and advance payment", s: sTermC }],
        [{ v: "   • Installation time: 3-4 working days (subject to site readiness)", s: sTermC }],
        [{ v: "   • Site should be ready with completed flooring, painting, electrical points, and civil work", s: sTermC }],
        [{ v: "   • Customer to provide necessary permissions for material delivery and installation access", s: sTermC }],
        [],
        [{ v: "3. WARRANTY:", s: sKey }],
        [{ v: "   • 1 year comprehensive warranty on manufacturing defects and workmanship", s: sTermC }],
        [{ v: "   • 5 years warranty on branded hardware (Blum/Hettich/Hafele/Ebco) as per manufacturer terms", s: sTermC }],
        [{ v: "   • Warranty does not cover misuse, mishandling, accidents, or natural wear and tear", s: sTermC }],
        [{ v: "   • Annual maintenance contract available separately after warranty period", s: sTermC }],
        [],
        [{ v: "4. INCLUSIONS:", s: sKey }],
        [{ v: "   • All materials as per detailed specifications mentioned above", s: sTermC }],
        [{ v: "   • Complete manufacturing with CNC cutting, drilling, edge banding, and finishing", s: sTermC }],
        [{ v: "   • Transportation to site within Ahmedabad city limits (25 km radius)", s: sTermC }],
        [{ v: "   • Complete on-site installation, assembly, fitting, and alignment", s: sTermC }],
        [{ v: "   • Final cleaning and handover with care & maintenance instructions", s: sTermC }],
        [],
        [{ v: "5. EXCLUSIONS:", s: sKey }],
        [{ v: "   • Any civil work, masonry work, electrical work, plumbing, or painting work", s: sTermC }],
        [{ v: "   • Structural modifications or wall preparation work", s: sTermC }],
        [{ v: "   • Loading/unloading charges at site (if elevator not available above 2nd floor)", s: sTermC }],
        [{ v: "   • Transportation beyond 25 km from our factory (extra charges applicable)", s: sTermC }],
        [{ v: "   • Any items not specifically mentioned in this quotation", s: sTermC }],
        [],
        [{ v: "6. DESIGN & CHANGES:", s: sKey }],
        [{ v: "   • Design approval to be taken before manufacturing starts", s: sTermC }],
        [{ v: "   • Any design changes after approval will attract additional charges (minimum 15% of changed items)", s: sTermC }],
        [{ v: "   • Material/hardware changes subject to availability and price revision", s: sTermC }],
        [{ v: "   • Final measurements to be taken at site before manufacturing", s: sTermC }],
        [],
        [{ v: "7. GENERAL TERMS:", s: sKey }],
        [{ v: "   • This quotation is valid for 30 days from date of issue", s: sTermC }],
        [{ v: "   • Prices are subject to change without notice after validity period", s: sTermC }],
        [{ v: "   • All disputes subject to Ahmedabad jurisdiction only", s: sTermC }],
        [{ v: "   • GST will be charged as per prevailing government rates at the time of billing", s: sTermC }],
        [{ v: "   • Material specifications are subject to availability; equivalent quality alternatives may be provided with customer consent", s: sTermC }],
        [{ v: "   • Payment should be made via cheque/NEFT/RTGS in favor of 'Bravento Furniture Solutions'", s: sTermC }],
        [{ v: "   • Any additional work or items requested during installation will be charged separately", s: sTermC }],
        [],
        [{ v: "BANKING DETAILS FOR PAYMENT:", s: sTermH }],
        [{ v: `Bank Name: ${userDetails?.bank_name || 'HDFC Bank Ltd.'}`, s: sP }],
        [{ v: `Account Name: ${userDetails?.account_name || 'Bravento Furniture Solutions'}`, s: sP }],
        [{ v: `Account Number: ${userDetails?.account_number || '50200012345678'}`, s: sP }],
        [{ v: `Account Type: ${userDetails?.account_type || 'Current Account'}`, s: sP }],
        [{ v: `IFSC Code: ${userDetails?.ifsc_code || 'HDFC0001234'}`, s: sP }],
        [{ v: `Branch: ${userDetails?.branch_name || 'S.G. Highway, Ahmedabad - 380015'}`, s: sP }],
        [{ v: `UPI ID: ${userDetails?.upi_id || 'bravento@hdfcbank'} (for advance payments)`, s: sP }],
        [],
        [{ v: "NOTE:", s: sKey }, { v: "Please share your purchase order to confirm this quotation. Our team will contact you for final measurements and design approval.", s: sVal }],
        [], [],
        ['', '', '', '', '', '', { v: `For ${companyName}`, s: sKey }],
        [], [], [],
        ['', '', '', '', '', '', { v: "____________________", s: sP }],
        ['', '', '', '', '', '', { v: "Authorized Signatory", s: sP }],
        ['', '', '', '', '', '', { v: `Date: ${quoteDate}`, s: sP }],
        [],
        [{ v: "Thank you for considering Bravento Furniture Solutions. We look forward to transforming your space!", s: sH2C }]
      ];

      const tcStartRow = qData.length;
      tcLines.forEach(l => pushR(l));

      const ws = XLSX.utils.aoa_to_sheet(qData);

      // Merges based strictly on python extracted sample layout
      if (!ws['!merges']) ws['!merges'] = [];
      ws['!merges'].push({ s: { r: 0, c: 0 }, e: { r: 0, c: 8 } }); // BRAVENTO FURNITURE SOLUTIONS
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
        if (tcLines[i].length > 0 && cell && cell.v !== "NOTE:" && cell.v !== "") {
          if (cell.v.startsWith("Bank Name") || cell.v.startsWith("Account ") || cell.v.startsWith("IFSC") || cell.v.startsWith("Branch:") || cell.v.startsWith("UPI")) {
            ws['!merges'].push({ s: { r: tcStartRow + i, c: 0 }, e: { r: tcStartRow + i, c: 3 } });
          } else {
            ws['!merges'].push({ s: { r: tcStartRow + i, c: 0 }, e: { r: tcStartRow + i, c: 8 } });
          }
        } else if (cell && cell.v === "NOTE:") {
          ws['!merges'].push({ s: { r: tcStartRow + i, c: 1 }, e: { r: tcStartRow + i, c: 8 } });
        } else if (tcLines[i].length > 6 && tcLines[i][6]) {
          // Signature area block merges (G:I)
          ws['!merges'].push({ s: { r: tcStartRow + i, c: 6 }, e: { r: tcStartRow + i, c: 8 } });
        }
      }

      ws['!cols'] = [
        { wch: 5.0 }, { wch: 32.0 }, { wch: 18.0 }, { wch: 14.0 }, { wch: 6.0 }, { wch: 12.0 }, { wch: 14.0 }, { wch: 8.0 }, { wch: 8.0 }
      ];

      // Row heights (optional, to make it look matching)
      if (!ws['!rows']) ws['!rows'] = [];
      ws['!rows'][6] = { hpx: 30 }; // QUOTATION
      for (let i = 0; i < quoteRows.length; i++) ws['!rows'][tblStart + i] = { hpx: 45 }; // multi-line cells

      XLSX.utils.book_append_sheet(wb, ws, "Quotation");
      XLSX.writeFile(wb, `Quotation_${design.design_name || 'Design'}.xlsx`);

    } catch (err) {
      console.error(err);
      alert('Failed to generate Quotation Data.');
    } finally {
      setIsGeneratingQuote(false);
    }
  };

  return (
    <div className={styles.container}>
      <Sidebar />

      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="MES" />

        <div className={styles.maincontent}>
          <div className={styles.designs}>
            <div className={styles.mesdesigncontent}>
              <div className={styles.headerRow}>
                <h2>Design Data</h2>

                <div className={styles.toolbarmenu}>
                  {/* ✅ Quotation Button */}
                  <button
                    onClick={handleGenerateQuotation}
                    disabled={isGeneratingQuote}
                    className={styles.viewDetailsButton}
                    style={{ marginRight: '1rem', backgroundColor: '#392579', color: 'white' }}
                  >
                    {isGeneratingQuote ? 'Generating...' : 'Quotation'}
                  </button>
                  {/* ✅ BOM Data Button */}
                  <button
                    onClick={handleGenerateBOM}
                    disabled={isGeneratingBOM}
                    className={styles.viewDetailsButton}
                    style={{ marginRight: '1rem', backgroundColor: '#392579', color: 'white' }}
                  >
                    {isGeneratingBOM ? 'Generating...' : 'BOM Data'}
                  </button>
                  <button
                    onClick={async () => {
                      if (isDownloadingXML) return;
                      setIsDownloadingXML(true);
                      try {
                        const response: any = await CommonService.put(
                          API_ENDPOINT.DOWNLOAD_NESTING_PDF(design_id),
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
                        setIsDownloadingXML(false);
                      }
                    }}
                    disabled={isDownloadingXML}
                    className={styles.viewDetailsButton}
                    style={{ marginRight: '1rem', backgroundColor: '#392579', color: 'white' }}
                  >
                    {isDownloadingXML ? 'Gathering XMLs...' : 'XMLs'}
                  </button>
                  {/* ✅ View Details Button */}
                  <button
                    onClick={() => router.push(`/design/${design_id}/nesting-details`)}
                    className={styles.viewDetailsButton}
                  >
                    View Details
                  </button>
                </div>
              </div>

              {/* ✅ Table */}
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
                    {data.slice(0, visibleDesigns).map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>{item.name}</td>
                        <td>{formatDimension(item?.dimensions?.width, item?.type)}</td>
                        <td>{formatDimension(item?.dimensions?.height, item?.type)}</td>
                        <td>{formatDimension(item?.dimensions?.depth, item?.type)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {/* ✅ Load More */}
                {visibleDesigns < data.length && (
                  <div className={styles.designsLoadMore}>
                    <div className={styles.loadmore} onClick={handleLoadMore}>
                      <p>Load More</p>
                    </div>
                  </div>
                )}
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
