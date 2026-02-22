import Header from '@/components/header/header';
import styles from '@/components/mes/mes.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { useRouter } from 'next/router';
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
  const router = useRouter();
  const [designs, setDesigns] = useState<Design[]>([]);
  const [selectedDesign, setSelectedDesign] = useState<Design | null>(null);
  const [selectedSheet, setSelectedSheet] = useState<NestingSheet | null>(null);
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

      router.push(`/design/${design.id}/nesting`);
    } catch (err) {
      setError('No any designs for nesting.');
      console.error('Error fetching sheets:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDesigns = () => {
    setViewMode('designs');
    setSelectedDesign(null);
    setSelectedSheet(null);
  };

  const handleBackToSheets = () => {
    setViewMode('sheets');
    setSelectedSheet(null);
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
              <div
                style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <h2>
                  {viewMode === 'designs' && 'Designs'}
                  {viewMode === 'sheets' && `Sheets - ${selectedDesign?.design_name || ''}`}
                  {viewMode === 'files' && `Files - Sheet ${selectedSheet?.sheet_number || ''}`}
                </h2>
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
                                    View Details
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
