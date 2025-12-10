import { RootState } from '@/components/3dmodel/store';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import { useState } from 'react';
import { useSelector } from 'react-redux';
import styles from '../mes/nesting.module.css';

const Nesting = () => {
  // const [loading, setLoading] = useState(false);
  const [visibleDesigns, setVisibleDesigns] = useState(7);

  // Access objects from Redux store
  const { objects } = useSelector((state: RootState) => state.data);

  // Use objects from store instead of static data
  const data = objects;
  console.log(data, 'data');

  const handleLoadMore = () => {
    console.log('Load More Clicked');
    setVisibleDesigns((prev) => prev + 5);
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
                <div className={styles.toolbaricon}>
                  {/* <img src={center.src} alt="center" /> */}
                </div>

                <div className={styles.rediogroup}>
                  <label className={styles.label}>
                    <input type="radio" name="option" value="1" className={styles.option} />
                    PDF
                  </label>
                  <label className={styles.label}>
                    <input type="radio" name="option" value="2" className={styles.option} />
                    Xls
                  </label>
                </div>
                <a href="" download>
                  {' '}
                  <img
                    // src={download.src}
                    // alt="download"
                    className={styles.download}
                  />
                </a>
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

                {visibleDesigns < data.length && (
                  <div className={styles.designsLoadMore}>
                    <div className={styles.loadmore} onClick={handleLoadMore}>
                      <p>Load More</p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Nesting;
