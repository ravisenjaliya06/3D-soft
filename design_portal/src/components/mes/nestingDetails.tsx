import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import React, { useEffect, useState } from 'react';
import styles from './nestingDetails.module.css';

interface NestingDetailsProps {
  designId: string;
}

const NestingDetails: React.FC<NestingDetailsProps> = ({ designId }) => {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [hoveredPart, setHoveredPart] = useState<any | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get the JSON file path from backend using CommonService
        const response: any = await CommonService.put(API_ENDPOINT.DOWNLOAD_NESTING_PDF(designId), {
          format: 'json',
        });

        if (response?.status !== 200 || !response?.data) {
          throw new Error(
            response?.data?.error ||
              'Failed to get layout data path. It might not be generated yet. Try to download nesting files from the previous page first.'
          );
        }

        const layoutData = response.data;

        if (layoutData.error) {
          throw new Error(layoutData.error);
        }

        setData(layoutData);

        // Set the first sheet as active
        if (layoutData.length > 0) {
          const sheets = Array.from(new Set(layoutData.map((d: any) => d.sheet_num)));
          if (sheets.length > 0) setActiveSheet(sheets[0] as string);
        }
      } catch (err: any) {
        console.error(err);
        setError(err.message || 'An error occurred fetching layout data');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [designId]);

  const sheetsObj = data
    ? data.reduce(
        (acc, curr) => {
          if (!acc[curr.sheet_num]) acc[curr.sheet_num] = [];
          acc[curr.sheet_num].push(curr);
          return acc;
        },
        {} as Record<string, any[]>
      )
    : {};

  const sheetNames = Object.keys(sheetsObj).sort();

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Nesting Details" />

        <div className={styles.maincontent}>
          {loading ? (
            <div className={styles.loader}>Loading layout data...</div>
          ) : error ? (
            <div className={styles.error}>{error}</div>
          ) : !data || data.length === 0 ? (
            <div className={styles.error}>No layout data available.</div>
          ) : (
            <div className={styles.layoutWrapper}>
              {/* Left Sidebar - Sheet Selection */}
              <div className={styles.sheetList}>
                <h3 className={styles.listTitle}>Sheets</h3>
                {sheetNames.map((sheetName) => (
                  <div key={sheetName}>
                    <div
                      className={`${styles.sheetItem} ${activeSheet === sheetName ? styles.activeSheet : ''}`}
                      onClick={() => setActiveSheet(sheetName)}
                    >
                      <div className={styles.sheetHeader}>
                        <strong>
                          {sheetName.startsWith('SHEET') ? sheetName : `Sheet ${sheetName}`}
                        </strong>
                        <span className={styles.partCount}>
                          {sheetsObj[sheetName].length} parts
                        </span>
                      </div>
                    </div>

                    {/* Details Table Under Active Sheet */}
                    {activeSheet === sheetName && (
                      <div className={styles.tableArea}>
                        <div className={styles.tableContainer}>
                          <table className={styles.detailsTable}>
                            <thead>
                              <tr>
                                <th>ID</th>
                                <th>Name</th>
                                <th>Size (W×H×D)</th>
                              </tr>
                            </thead>
                            <tbody>
                              {sheetsObj[sheetName].map((part: any, idx: number) => {
                                const w = parseFloat(part.width || 0).toFixed(2);
                                const h = parseFloat(part.height || 0).toFixed(2);
                                const d = parseFloat(part.depth || 18).toFixed(2);
                                const name =
                                  part.name || part.Name || part.material_name || 'Unknown';
                                const uniqueId = part.unique_id || part.ID || part.id || '-';

                                return (
                                  <tr key={idx}>
                                    <td>{uniqueId}</td>
                                    <td>{name}</td>
                                    <td style={{ whiteSpace: 'nowrap' }}>
                                      {w} × {h} × {d} mm
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Right Side - Visualization Area */}
              <div className={styles.visualizationArea}>
                {activeSheet && sheetsObj[activeSheet] && (
                  <div className={styles.canvasContainer} style={{ position: 'relative' }}>
                    <div className={styles.canvasHeader}>
                      <h3>
                        Layout: {activeSheet} (Thickness:{' '}
                        {sheetsObj[activeSheet][0]?.sheet_thickness || 18}mm)
                      </h3>
                      <div className={styles.legend}>
                        <span style={{ color: 'blue' }}>🟦 Plank Outline</span>
                        <span style={{ color: '#8B4513' }}>🟫 Edge Banding</span>
                        <span style={{ color: 'orange' }}>🟧 Grooves</span>
                        <span style={{ color: 'green' }}>🟩 Horizontal Holes</span>
                        <span style={{ color: 'red' }}>🔴 Vertical Holes</span>
                      </div>
                    </div>
                    <div className={styles.svgWrapper} style={{ position: 'relative' }}>
                      {/* Hover Overlay */}
                      {hoveredPart && (
                        <div className={styles.hoverTooltip}>
                          <strong>ID:</strong>{' '}
                          {hoveredPart.unique_id || hoveredPart.ID || hoveredPart.id || '-'}
                          <br />
                          <strong>Name:</strong>{' '}
                          {hoveredPart.name ||
                            hoveredPart.Name ||
                            hoveredPart.material_name ||
                            'Unknown'}
                          <br />
                          <strong>Size:</strong> {parseFloat(hoveredPart.width || 0).toFixed(1)} (W)
                          × {parseFloat(hoveredPart.height || 0).toFixed(1)} (H) ×{' '}
                          {parseFloat(hoveredPart.depth || 18).toFixed(1)} (D) mm
                        </div>
                      )}
                      {(() => {
                        const sheetW = sheetsObj[activeSheet][0]?.sheet_width || 2440;
                        const sheetH = sheetsObj[activeSheet][0]?.sheet_height || 1220;
                        const padding = 50;

                        const visualW = sheetW + padding * 2;
                        const visualH = sheetH + padding * 2;

                        return (
                          <svg
                            viewBox={`0 0 ${visualW} ${visualH}`}
                            preserveAspectRatio="xMidYMid meet"
                            className={styles.svgCanvas}
                          >
                            <defs>
                              <marker
                                id="arrow"
                                viewBox="0 0 10 10"
                                refX="5"
                                refY="5"
                                markerWidth="6"
                                markerHeight="6"
                                orient="auto-start-reverse"
                              >
                                <path d="M 0 0 L 10 5 L 0 10 z" fill="#666" />
                              </marker>
                            </defs>
                            {/* Using native coordinates without matrix transform since backend now provides horizontal nesting */}
                            <rect
                              x={padding}
                              y={padding}
                              width={sheetW}
                              height={sheetH}
                              fill="none"
                              stroke="black"
                              strokeWidth="2"
                            />

                            {/* Sheet Dimension Lines */}
                            <line
                              x1={padding}
                              y1={padding - 15}
                              x2={padding + sheetW}
                              y2={padding - 15}
                              stroke="#666"
                              strokeWidth="1"
                              markerEnd="url(#arrow)"
                              markerStart="url(#arrow)"
                            />
                            <text
                              x={padding + sheetW / 2}
                              y={padding - 20}
                              textAnchor="middle"
                              fontSize="14"
                              fill="#666"
                            >
                              {sheetW} mm (W)
                            </text>

                            <line
                              x1={padding - 15}
                              y1={padding}
                              x2={padding - 15}
                              y2={padding + sheetH}
                              stroke="#666"
                              strokeWidth="1"
                              markerEnd="url(#arrow)"
                              markerStart="url(#arrow)"
                            />
                            <text
                              x={padding - 20}
                              y={padding + sheetH / 2}
                              textAnchor="middle"
                              dominantBaseline="central"
                              transform={`rotate(-90, ${padding - 20}, ${padding + sheetH / 2})`}
                              fontSize="14"
                              fill="#666"
                            >
                              {sheetH} mm (H)
                            </text>

                            {sheetsObj[activeSheet].map((part: any, idx: number) => {
                              const x = part.x + padding;
                              const y = part.y + padding;
                              const w = part.width;
                              const h = part.height;
                              const isRotated = part.is_rotated;
                              const holes = part.minifix_holes || [];
                              const grooves = part.grooves || [];
                              const edgebands = part.edgebands || [];
                              const uniqueId = part.unique_id || part.ID || part.id || '-';

                              return (
                                <g
                                  key={idx}
                                  onMouseEnter={() => setHoveredPart(part)}
                                  onMouseLeave={() => setHoveredPart(null)}
                                  style={{ cursor: 'pointer' }}
                                >
                                  <rect
                                    x={x}
                                    y={y}
                                    width={w}
                                    height={h}
                                    fill="#e0e0e0"
                                    stroke="blue"
                                    strokeWidth="2"
                                    className={styles.plankOutline}
                                  />

                                  {/* Edge Banding */}
                                  {edgebands.map((edge: string, eIdx: number) => {
                                    // Edgebands represent edges where tape is applied
                                    // L=Left, R=Right, T=Top, B=Bottom
                                    // Or matching faces 1,2,3,4,5,6
                                    // Example mappings:
                                    if (!edge) return null;

                                    let ex = x,
                                      ey = y,
                                      ew = 0,
                                      eh = 0;
                                    const eStr = String(edge).toUpperCase();

                                    if (eStr === 'LEFT' || eStr === 'L' || eStr === '5') {
                                      ew = 4;
                                      eh = h;
                                    } else if (eStr === 'RIGHT' || eStr === 'R' || eStr === '3') {
                                      ex = x + w - 4;
                                      ew = 4;
                                      eh = h;
                                    } else if (
                                      eStr === 'TOP' ||
                                      eStr === 'T' ||
                                      eStr === '4' ||
                                      eStr === '1'
                                    ) {
                                      ew = w;
                                      eh = 4;
                                    } else if (
                                      eStr === 'BOTTOM' ||
                                      eStr === 'B' ||
                                      eStr === '2' ||
                                      eStr === '6'
                                    ) {
                                      ey = y + h - 4;
                                      ew = w;
                                      eh = 4;
                                    }

                                    if (ew > 0 || eh > 0) {
                                      return (
                                        <rect
                                          key={`e-${eIdx}`}
                                          x={ex}
                                          y={ey}
                                          width={ew}
                                          height={eh}
                                          fill="#8B4513"
                                          opacity="0.8"
                                        />
                                      );
                                    }
                                    return null;
                                  })}

                                  {/* Grooves */}
                                  {grooves.map((g: any, gIdx: number) => (
                                    <line
                                      key={`g-${gIdx}`}
                                      x1={x + (g.x || 0)}
                                      y1={y + (g.y || 0)}
                                      x2={x + (g.end_x || 0)}
                                      y2={y + (g.end_y || 0)}
                                      stroke="orange"
                                      strokeWidth={g.width || 8}
                                      opacity="0.6"
                                    />
                                  ))}

                                  {/* Holes */}
                                  {holes.map((hObj: any, hIdx: number) => {
                                    const type = (hObj.type || '').toUpperCase();
                                    const face = String(hObj.face || '0');
                                    const pos =
                                      hObj.local_position2_d || hObj.localPosition2D || {};
                                    const drillType = String(
                                      hObj.drill_type || hObj.drillType || '1'
                                    );
                                    const dia = parseFloat(hObj.diameter || '15');
                                    const len = parseFloat(hObj.length || '10');

                                    let hx = parseFloat(pos.x || 0);
                                    let hy = parseFloat(pos.y || 0);

                                    if (
                                      (type === 'SCREW' || type === 'DOWEL') &&
                                      (face === '1' || face === '6')
                                    ) {
                                      hx = parseFloat(pos.y || 0);
                                      hy = parseFloat(pos.x || 0);
                                    }

                                    if (drillType === '1') {
                                      return (
                                        <rect
                                          key={`h-${hIdx}`}
                                          x={x + hx}
                                          y={y + hy}
                                          width={len}
                                          height={dia}
                                          fill="none"
                                          stroke="green"
                                          strokeWidth="1"
                                        />
                                      );
                                    } else {
                                      let cx = hx;
                                      let cy = hy;
                                      if (
                                        isRotated &&
                                        (part.name !== 'HORIZONTAL_PLANK' || type === 'CAM')
                                      ) {
                                        cx = hy;
                                        cy = hx;
                                      }
                                      return (
                                        <circle
                                          key={`h-${hIdx}`}
                                          cx={x + cx}
                                          cy={y + cy}
                                          r={dia / 2}
                                          fill="red"
                                          stroke="black"
                                          strokeWidth="0.5"
                                        />
                                      );
                                    }
                                  })}

                                  <rect
                                    x={x + w / 2 - 25}
                                    y={y + h / 2 - 12}
                                    width="50"
                                    height="24"
                                    fill="white"
                                    opacity="0.8"
                                    rx="4"
                                  />
                                  <text
                                    x={x + w / 2}
                                    y={y + h / 2}
                                    textAnchor="middle"
                                    dominantBaseline="central"
                                    fontSize="14"
                                    fontWeight="bold"
                                    fill="#333"
                                  >
                                    {uniqueId}
                                  </text>
                                </g>
                              );
                            })}
                          </svg>
                        );
                      })()}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NestingDetails;
