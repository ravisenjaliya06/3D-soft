import React, { useEffect, useState } from 'react';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import styles from './nestingDetails.module.css';

interface NestingDetailsProps {
  designId: string;
}

const NestingDetails: React.FC<NestingDetailsProps> = ({ designId }) => {
  const [data, setData] = useState<any[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeSheet, setActiveSheet] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // 1. Get the JSON file path from backend
        const token = localStorage.getItem('token');
        const apiUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}/${process.env.NEXT_PUBLIC_APP_VERSION}`;
        
        const response = await fetch(`${apiUrl}/design/${designId}/nesting/download/`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ format: 'json' })
        });

        if (!response.ok) {
          throw new Error('Failed to get layout data path. It might not be generated yet. Try to download nesting files from the previous page first.');
        }

        const layoutData = await response.json();
        
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

  const sheetsObj = data ? data.reduce((acc, curr) => {
    if (!acc[curr.sheet_num]) acc[curr.sheet_num] = [];
    acc[curr.sheet_num].push(curr);
    return acc;
  }, {} as Record<string, any[]>) : {};

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
                  <div 
                    key={sheetName}
                    className={`${styles.sheetItem} ${activeSheet === sheetName ? styles.activeSheet : ''}`}
                    onClick={() => setActiveSheet(sheetName)}
                  >
                    <div className={styles.sheetHeader}>
                      <strong>Sheet {sheetName}</strong>
                      <span className={styles.partCount}>{sheetsObj[sheetName].length} parts</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Right Side - Visualization Area */}
              <div className={styles.visualizationArea}>
                 {activeSheet && sheetsObj[activeSheet] && (
                   <div className={styles.canvasContainer}>
                     <div className={styles.canvasHeader}>
                       <h3>Layout: Sheet {activeSheet}</h3>
                     </div>
                     <div className={styles.svgWrapper}>
                        {/* Interactive SVG will go here */}
                        <svg viewBox="0 0 2540 1320" preserveAspectRatio="xMidYMid meet" className={styles.svgCanvas}>
                           <rect x="50" y="50" width="2440" height="1220" fill="none" stroke="black" strokeWidth="2" />
                           {sheetsObj[activeSheet].map((part: any, idx: number) => {
                              // SVG coordinates
                              const x = part.x + 50;
                              const y = part.y + 50;
                              const w = part.width;
                              const h = part.height;
                              const isRotated = part.is_rotated;
                              const holes = part.minifix_holes || [];
                              const grooves = part.grooves || [];
                              
                              return (
                                <g key={idx}>
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
                                     const pos = hObj.local_position2_d || {};
                                     const drillType = String(hObj.drill_type || '1');
                                     const dia = parseFloat(hObj.diameter || '15');
                                     const len = parseFloat(hObj.length || '10');

                                     let hx = parseFloat(pos.x || 0);
                                     let hy = parseFloat(pos.y || 0);

                                     if ((type === 'SCREW' || type === 'DOWEL') && (face === '1' || face === '6')) {
                                        hx = parseFloat(pos.y || 0);
                                        hy = parseFloat(pos.x || 0);
                                     }

                                     if (drillType === '1') {
                                        return <rect key={`h-${hIdx}`} x={x + hx} y={y + hy} width={len} height={dia} fill="none" stroke="green" strokeWidth="1" />;
                                     } else {
                                        let cx = hx;
                                        let cy = hy;
                                        if (isRotated && (part.name !== "HORIZONTAL_PLANK" || type === 'CAM')) {
                                           cx = hy;
                                           cy = hx;
                                        }
                                        return <circle key={`h-${hIdx}`} cx={x + cx} cy={y + cy} r={dia/2} fill="red" stroke="black" strokeWidth="0.5" />;
                                     }
                                  })}

                                  <rect 
                                    x={x + w/2 - 25} 
                                    y={y + h/2 - 12} 
                                    width="50" 
                                    height="24" 
                                    fill="white" 
                                    opacity="0.8" 
                                    rx="4" 
                                  />
                                  <text 
                                    x={x + w/2} 
                                    y={y + h/2} 
                                    textAnchor="middle" 
                                    dominantBaseline="central"
                                    fontSize="14"
                                    fontWeight="bold"
                                    fill="#333"
                                  >
                                    {part.unique_id}
                                  </text>
                                </g>
                              );
                           })}
                        </svg>
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
