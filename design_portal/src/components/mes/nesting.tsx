import { RootState } from '@/components/3dmodel/store';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import styles from '../mes/nesting.module.css';

const Nesting = () => {
  const router = useRouter();
  const design_id = (router.query.designid as string) || window.location.pathname.split('/')[2];

  const [visibleDesigns, setVisibleDesigns] = useState(50);
  const [selectedOption, setSelectedOption] = useState('xlsx');
  const [localData, setLocalData] = useState<any[]>([]);

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

  const fileUrls: Record<string, string> = {
    xlsx: `${process.env.NEXT_PUBLIC_PUBLIC_API}/media/output/${design_id}/nesting.xlsx`,
    gcode: `${process.env.NEXT_PUBLIC_PUBLIC_API}/media/output/${design_id}/nesting_gcodes.zip`,
  };

  const handleDownload = () => {
    const fileUrl = fileUrls[selectedOption];

    if (!fileUrl) return;

    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = fileUrl.split('/').pop() || 'file';
    document.body.appendChild(a);
    a.click();
    a.remove();
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
                  {/* ✅ View Details Button */}
                  <button
                    onClick={() => router.push(`/design/${design_id}/nesting-details`)}
                    className={styles.viewDetailsButton}
                  >
                    View Details
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
                    style={{ marginLeft: '1rem' }}
                  >
                    XMLs
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
