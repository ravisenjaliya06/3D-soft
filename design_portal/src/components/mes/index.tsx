import Header from '@/components/header/header';
import styles from '@/components/mes/mes.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { useEffect, useState } from 'react';
import { Design } from './interface';

interface NestingSheet {
  id: string;
  sheet_number: number;
  width: number;
  height: number;
  efficiency: number | null;
  file_ids: string[];
  files: NestingFile[];
  created_at: string;
  updated_at: string;
}

interface NestingFile {
  id: string;
  file_type: string;
  file_path: string;
  file_name: string;
  is_sheet_specific: boolean;
  created_at: string;
  updated_at: string;
}

type ViewMode = 'designs' | 'sheets' | 'files';

const Mes = () => {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [sheets, setSheets] = useState<NestingSheet[]>([]);
  const [selectedSheet, setSelectedSheet] = useState<NestingSheet | null>(null);
  const [files, setFiles] = useState<NestingFile[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('designs');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch designs on component mount
  useEffect(() => {
    fetchDesigns();
  }, []);

  const fetchDesigns = async () => {
    try {
      setLoading(true);
      setError(null);
      const response: { status: number; data: Design[] } = await commonService.get(
        API_ENDPOINT.GET_DESIGNS
      );
      if (response.status === 200) {
        setDesigns(response.data);
      }
    } catch (err) {
      setError('Failed to fetch designs');
      console.error('Error fetching designs:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDesignClick = async (design: Design) => {
    try {
      setLoading(true);
      setError(null);
      setSelectedDesign(design);

      // First, trigger nesting API call
      try {
        const nestingResponse: { status: number } = await commonService.post(
          API_ENDPOINT.CREATE_DESIGN_NESTING(design.id),
          {}
        );

        if (nestingResponse.status !== 200) {
          console.warn('Nesting API returned non-200 status:', nestingResponse.status);
        }
      } catch (nestingErr) {
        console.error('Error triggering nesting:', nestingErr);
      }

      // Then fetch the sheets
      const response: { status: number; data: NestingSheet[] } = await commonService.get(
        API_ENDPOINT.GET_NESTING_SHEETS(design.id)
      );

      if (response.status === 200) {
        setSheets(response.data);
        setViewMode('sheets');
      } else {
        setError('No sheets found for this design');
      }
    } catch (err) {
      setError('No any designs for nesting.');
      console.error('Error fetching sheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSheetClick = async (sheet: NestingSheet) => {
    if (!selectedDesign) {
      setError('No design selected');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSelectedSheet(sheet);

      const response: { status: number; data: NestingFile[] } = await commonService.get(
        API_ENDPOINT.GET_NESTING_FILES_BY_SHEET(selectedDesign.id, sheet.sheet_number)
      );

      if (response.status === 200) {
        setFiles(response.data);
        setViewMode('files');
      } else {
        setError('No files found for this sheet');
      }
    } catch (err) {
      setError('Failed to fetch files');
      console.error('Error fetching files:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDesigns = () => {
    setViewMode('designs');
    setSelectedDesign(null);
    setSheets([]);
    setSelectedSheet(null);
    setFiles([]);
  };

  const handleBackToSheets = () => {
    setViewMode('sheets');
    setSelectedSheet(null);
    setFiles([]);
  };

  const handleFileDownload = (file: NestingFile) => {
    const filePath = file.file_path.replace('umaboy', '');
    const fileUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}${filePath}`;
    const a = document.createElement('a');
    a.href = fileUrl;
    a.download = file.file_name;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleDownload = async (format: string) => {
    if (!selectedDesign) return;
    try {
      setLoading(true);
      setError(null);
      const response: { status: number; data: { file: string } } = await commonService.put(
        API_ENDPOINT.DOWNLOAD_NESTING_PDF(selectedDesign.id),
        { format }
      );

      if (response.status === 200 && response.data.file) {
        const filePath = response.data.file.replace('umaboy', '');
        const fileUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}${filePath}`;
        const a = document.createElement('a');
        a.href = fileUrl;
        a.download = response.data.file.split('/').pop() || 'download';
        document.body.appendChild(a);
        a.click();
        a.remove();
      } else {
        setError('Failed to download file');
      }
    } catch (err) {
      setError('Error downloading file');
      console.error('Download error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="MES" />

        <div className={styles.maincontent}>
          <div className={styles.designs}>
            <div className={styles.mesdesigncontent}>
              {/* Breadcrumb Navigation */}
              <div className={styles.breadcrumb}>
                <span
                  className={styles.breadcrumbItem}
                  onClick={handleBackToDesigns}
                  style={{ cursor: viewMode !== 'designs' ? 'pointer' : 'default' }}
                >
                  Designs
                </span>
                {viewMode === 'sheets' || viewMode === 'files' ? (
                  <>
                    <span className={styles.breadcrumbSeparator}> / </span>
                    <span
                      className={styles.breadcrumbItem}
                      onClick={viewMode === 'files' ? handleBackToSheets : undefined}
                      style={{ cursor: viewMode === 'files' ? 'pointer' : 'default' }}
                    >
                      Sheets
                    </span>
                  </>
                ) : null}
                {viewMode === 'files' ? (
                  <>
                    <span className={styles.breadcrumbSeparator}> / </span>
                    <span className={styles.breadcrumbItem}>Files</span>
                  </>
                ) : null}
              </div>

              {/* Title */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>
                  {viewMode === 'designs' && 'Designs'}
                  {viewMode === 'sheets' && `Sheets - ${selectedDesign?.design_name || ''}`}
                  {viewMode === 'files' && `Files - Sheet ${selectedSheet?.sheet_number || ''}`}
                </h2>
                {viewMode === 'sheets' && (
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <button className={styles.viewButton} onClick={() => handleDownload('xlsx')}>
                      Download XLSX
                    </button>
                    <button className={styles.viewButton} onClick={() => handleDownload('pdf')}>
                      Download PDF
                    </button>
                    <button className={styles.viewButton} onClick={() => handleDownload('xml_zip')}>
                      Download XML Zip
                    </button>
                  </div>
                )}
              </div>

              {error && <div className={styles.errorMessage}>{error}</div>}

              {loading ? (
                <div className={styles.loadingMessage}>Loading...</div>
              ) : (
                <>
                  {/* Designs View */}
                  {viewMode === 'designs' && (
                    <div className={styles.tablecontainer}>
                      <table>
                        <thead>
                          <tr>
                            <th>ID</th>
                            <th>Design Name</th>
                            <th>Status</th>
                            <th>Created At</th>
                            <th>Updated At</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {designs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className={styles.noData}>
                                No designs found
                              </td>
                            </tr>
                          ) : (
                            designs.map((design, index) => (
                              <tr key={design.id}>
                                <td>{index + 1}</td>
                                <td>{design.design_name}</td>
                                <td>
                                  <span className={styles.status}>{design.status}</span>
                                </td>
                                <td>{formatDate(design.created_at)}</td>
                                <td>{formatDate(design.updated_at)}</td>
                                <td>
                                  <button
                                    className={styles.viewButton}
                                    onClick={() => handleDesignClick(design)}
                                  >
                                    View Sheets
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Sheets View */}
                  {viewMode === 'sheets' && (
                    <div className={styles.tablecontainer}>
                      <table>
                        <thead>
                          <tr>
                            <th>Sheet #</th>
                            <th>Width (mm)</th>
                            <th>Height (mm)</th>
                            <th>Efficiency (%)</th>
                            <th>Parts Count</th>
                            <th>Created At</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {sheets.length === 0 ? (
                            <tr>
                              <td colSpan={7} className={styles.noData}>
                                No sheets found for this design
                              </td>
                            </tr>
                          ) : (
                            sheets.map((sheet) => (
                              <tr key={sheet.id}>
                                <td>{sheet.sheet_number}</td>
                                <td>{sheet.width}</td>
                                <td>{sheet.height}</td>
                                <td>
                                  {sheet.efficiency !== null
                                    ? `${sheet.efficiency.toFixed(2)}%`
                                    : 'N/A'}
                                </td>
                                <td>{sheet.file_ids?.length || 0}</td>
                                <td>{formatDate(sheet.created_at)}</td>
                                <td>
                                  <button
                                    className={styles.viewButton}
                                    onClick={() => handleSheetClick(sheet)}
                                  >
                                    View Files
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Files View */}
                  {viewMode === 'files' && (
                    <div className={styles.tablecontainer}>
                      <table>
                        <thead>
                          <tr>
                            <th>File Name</th>
                            <th>File Type</th>
                            <th>Sheet Specific</th>
                            <th>Created At</th>
                            <th>Action</th>
                          </tr>
                        </thead>
                        <tbody>
                          {files.length === 0 ? (
                            <tr>
                              <td colSpan={5} className={styles.noData}>
                                No files found for this sheet
                              </td>
                            </tr>
                          ) : (
                            files.map((file) => (
                              <tr key={file.id}>
                                <td>{file.file_name}</td>
                                <td>
                                  <span className={styles.fileType}>
                                    {file.file_type.toUpperCase()}
                                  </span>
                                </td>
                                <td>{file.is_sheet_specific ? 'Yes' : 'No'}</td>
                                <td>{formatDate(file.created_at)}</td>
                                <td>
                                  <button
                                    className={styles.downloadButton}
                                    onClick={() => handleFileDownload(file)}
                                  >
                                    Download
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mes;
