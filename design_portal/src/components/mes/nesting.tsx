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
      const designResponse: any = await CommonService.get(
        API_ENDPOINT.GET_DESIGN_DETAILS(design_id)
      );
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
                    onClick={() => {
                      const fileUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}/media/output/${design_id}/xml_files.zip`;
                      const a = document.createElement('a');
                      a.href = fileUrl;
                      a.download = 'xml_files.zip';
                      document.body.appendChild(a);
                      a.click();
                      a.remove();
                    }}
                    className={styles.viewDetailsButton}
                    style={{ marginRight: '1rem', backgroundColor: '#392579', color: 'white' }}
                  >
                    XMLs
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
