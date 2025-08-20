import Process_upload from '@/assets/design/progress-upload.svg';
import download from '@/assets/mes/download.svg';
import styles from '@/components/designmes/mes.module.css';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import CommonService from '@/services/CommonService';
import { useEffect, useState } from 'react';

const Template = () => {
  const [visibleDesigns, setVisibleDesigns] = useState(9);
  const [designName, setDesignName] = useState('');
  const [mesData, setMesData] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf'); // Default format is PDF

  const designId = window.location.pathname.split('/')[2];

  useEffect(() => {
    fetchUserDetails();
    fetchMesdata();
  }, []);

  const fetchUserDetails = async () => {
    try {
      // @ts-expect-error No time to update it at this moment
      const response = await CommonService.get('design', designId);
      // @ts-expect-error No time to update it at this moment
      if (response.status === 200) {
        // @ts-expect-error No time to update it at this moment
        setDesignName(response.data.design_name);
      } else {
        // @ts-expect-error No time to update it at this moment
        console.error('Failed to fetch user details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const fetchMesdata = async () => {
    try {
      // @ts-expect-error No time to update it at this moment
      const response = await CommonService.get('design', `${designId}/mes`);
      // @ts-expect-error No time to update it at this moment
      if (response.status === 200) {
        // @ts-expect-error No time to update it at this moment
        const dataArray = Object.keys(response.data).map((key) => ({
          id: key,
          // @ts-expect-error No time to update it at this moment
          ...response.data[key],
        }));
        setMesData(dataArray);
      } else {
        // @ts-expect-error No time to update it at this moment
        console.error('Failed to fetch MES data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching MES data:', error);
    }
  };

  const handleLoadMore = () => {
    setVisibleDesigns((prev) => prev + 5);
  };

  const handleDownload = async () => {
    try {
      const data = new FormData();
      data.append('format', selectedFormat);

      const response = await CommonService.put(
        'design',
        `${designId}/nesting/download`,
        data,
        // @ts-expect-error No time to update it at this moment
        { responseType: 'blob' },
      );

      if (response.status === 200) {
        //@ts-ignore
        const fileUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}/${response.data.file}`;

        const link = document.createElement('a');
        link.href = fileUrl;
        link.setAttribute('download', `design.${selectedFormat}`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('Download failed:', response.status);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
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
              <h2>{designName}</h2>

              <div className={styles.toolbarmenu}>
                <div className={styles.toolbaricon}></div>

                <div className={styles.rediogroup}>
                  <label className={styles.label}>
                    <input
                      type="radio"
                      name="option"
                      value="pdf"
                      checked={selectedFormat === 'pdf'}
                      onChange={() => setSelectedFormat('pdf')}
                      className={styles.option}
                    />
                    PDF
                  </label>
                  <label className={styles.label}>
                    <input
                      type="radio"
                      name="option"
                      value="xlsx"
                      checked={selectedFormat === 'xlsx'}
                      onChange={() => setSelectedFormat('xlsx')}
                      className={styles.option}
                    />
                    XLSX
                  </label>
                </div>
                <a>
                  {' '}
                  <img
                    onClick={handleDownload}
                    src={download.src}
                    alt="download"
                    className={styles.download}
                  />
                </a>
              </div>

              <div className={styles.tablecontainer}>
                <table>
                  <thead>
                    <tr>
                      <th>ID</th>
                      <th>Width</th>
                      <th>Height</th>
                      <th>Thick</th>
                      <th>Part Of</th>
                      <th>Name</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mesData.slice(0, visibleDesigns).map((item, index) => (
                      <tr key={item.id}>
                        <td>{index + 1}</td>
                        <td>{item.width}</td>
                        <td>{item.height || '-'}</td>
                        <td>{item.depth || '-'}</td>
                        <td>{item.object}</td>
                        <td>
                          {item.name ? item.name.replace(/_/, ' ') : item.name}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            {visibleDesigns < mesData.length && (
              <div className={styles.designsLoadMore}>
                <div className={styles.loadmore} onClick={handleLoadMore}>
                  <p>Load More</p>
                  <img
                    src={Process_upload.src}
                    alt="process upload"
                    className={styles.process_upload}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Template;
