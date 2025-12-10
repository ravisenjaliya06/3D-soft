import { RootState } from '@/components/3dmodel/store';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import styles from '../mes/nesting.module.css';

const Nesting = () => {
  const design_id = window.location.pathname.split('/')[2];

  const [visibleDesigns, setVisibleDesigns] = useState(7);
  const [selectedOption, setSelectedOption] = useState('pdf');
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

  const data = objects?.length ? objects : localData;

  const handleLoadMore = () => {
    setVisibleDesigns((prev) => prev + 5);
  };

  // ✅ Direct Download URLs
  const fileUrls: Record<string, string> = {
    pdf: `${process.env.NEXT_PUBLIC_PUBLIC_API}/media/output/${design_id}/nesting.pdf`,
    xlsx: `${process.env.NEXT_PUBLIC_PUBLIC_API}/media/output/${design_id}/nesting.xlsx`,
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
              <h2>Design Data</h2>

              <div className={styles.toolbarmenu}>
                <div className={styles.toolbaricon}></div>

                {/* ✅ Radio Group */}
                <div className={styles.rediogroup}>
                  <label className={styles.label}>
                    <input
                      type="radio"
                      name="option"
                      value="pdf"
                      checked={selectedOption === 'pdf'}
                      className={styles.option}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />
                    PDF
                  </label>

                  <label className={styles.label}>
                    <input
                      type="radio"
                      name="option"
                      value="xlsx"
                      checked={selectedOption === 'xlsx'}
                      className={styles.option}
                      onChange={(e) => setSelectedOption(e.target.value)}
                    />
                    XLSX
                  </label>
                </div>

                {/* ✅ Download Button */}
                <img
                  alt="download"
                  className={styles.download}
                  onClick={handleDownload}
                  style={{ cursor: 'pointer' }}
                />
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
                        <td>{Math.round(item?.dimensions?.width * 1000)}</td>
                        <td>{Math.round(item?.dimensions?.height * 1000)}</td>
                        <td>{Math.round(item?.dimensions?.depth * 1000)}</td>
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
