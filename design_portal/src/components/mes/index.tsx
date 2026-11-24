import { useMinimumVisible } from '@/components/common/useMinimumVisible';
import PhinxLoader from '@/components/common/PhinxLoader';
import { hideFullScreenLoader, showFullScreenLoader } from '@/components/3dmodel/handler/items';
import Header from '@/components/header/header';
import styles from '@/components/mes/mes.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import type { IconType } from 'react-icons';
import {
  LuArrowRight,
  LuBadgeCheck,
  LuChevronRight,
  LuCircleCheck,
  LuCircleDot,
  LuFactory,
  LuLayers,
  LuLayoutGrid,
  LuPackageOpen,
  LuPenLine,
  LuScissors,
  LuSofa,
  LuTrash2,
  LuTriangleAlert,
} from 'react-icons/lu';
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
  const showLoading = useMinimumVisible(loading);
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
      showFullScreenLoader('Loading design details...');

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

      // Redirect to latest version nesting page:
      // If we go to /design/<designId>/nesting it matches /design/[designid]/[versionid]
      // with versionid="nesting" and opens the 3D design page instead.
      let latestVersionId: string | undefined;
      const response: { status: number; data: any[] } = await commonService.get(
        API_ENDPOINT.GET_DESIGNS
      );
      if (response.status === 200) {
        const fullDesign = response.data.find((d: any) => d.id === design.id);
        latestVersionId = fullDesign?.versions?.[0]?.id;
      }

      if (latestVersionId) {
        await router.push(`/design/${design.id}/${latestVersionId}/nesting`);
      } else {
        await router.push(`/design/${design.id}`);
      }
    } catch (err) {
      setError('No any designs for nesting.');
      console.error('Error fetching sheets:', err);
    } finally {
      hideFullScreenLoader();
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

  const STATUS_CLASS: Record<string, string> = {
    Draft: styles.statusDraft,
    Ready: styles.statusReady,
    Nesting: styles.statusNesting,
    Completed: styles.statusCompleted,
    Deleted: styles.statusDelete,
  };
  const STATUS_ICON: Record<string, IconType> = {
    Draft: LuPenLine,
    Ready: LuCircleCheck,
    Nesting: LuLayoutGrid,
    Completed: LuBadgeCheck,
    Deleted: LuTrash2,
  };
  const countByStatus = (status: string) => designs.filter((d) => d.status === status).length;
  const stats = [
    { label: 'Designs', value: designs.length, hint: 'In your workspace', icon: LuLayers },
    {
      label: 'Ready to cut',
      value: countByStatus('Ready'),
      hint: 'Approved for production',
      icon: LuCircleCheck,
    },
    {
      label: 'In nesting',
      value: countByStatus('Nesting'),
      hint: 'Sheets being optimised',
      icon: LuLayoutGrid,
    },
    {
      label: 'Completed',
      value: countByStatus('Completed'),
      hint: 'Sent to the shop floor',
      icon: LuFactory,
    },
  ];

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Production" />

        <div className={styles.maincontent}>
          {/* Floor rail: intro, pipeline counts, how it works */}
          <aside className={styles.floorRail}>
            <div className={styles.heroText}>
              <span className={styles.eyebrow}>
                <LuFactory aria-hidden="true" />
                Production floor
              </span>
              <h1>
                Turn designs into <span>cut-ready sheets</span>
              </h1>
              <p>
                Pick a design to nest its panels on boards, then export cut lists, BOM, quotations
                and CNC files for the workshop.
              </p>
            </div>

            <ol className={styles.stats} aria-label="Production pipeline">
              {stats.map((stat) => {
                const StatIcon = stat.icon;
                return (
                  <li key={stat.label} className={styles.statCard}>
                    <span className={styles.statIcon}>
                      <StatIcon aria-hidden="true" />
                    </span>
                    <div className={styles.statText}>
                      <span className={styles.statLabel}>{stat.label}</span>
                      <span className={styles.statHint}>{stat.hint}</span>
                    </div>
                    <strong>{showLoading ? '–' : stat.value}</strong>
                  </li>
                );
              })}
            </ol>

            <div className={styles.howTo}>
              <span className={styles.howToLabel}>How it works</span>
              <ol className={styles.heroSteps}>
                <li>
                  <span>1</span>Choose a design
                </li>
                <li>
                  <span>2</span>Nest panels on sheets
                </li>
                <li>
                  <span>3</span>Export to the workshop
                </li>
              </ol>
            </div>
          </aside>

          <div className={styles.designs}>
            <div className={styles.mesdesigncontent}>
              <div className={styles.cardHead}>
                <div>
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
                        <LuChevronRight className={styles.breadcrumbSeparator} aria-hidden="true" />
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
                        <LuChevronRight className={styles.breadcrumbSeparator} aria-hidden="true" />
                        <span className={styles.breadcrumbItem}>Files</span>
                      </>
                    ) : null}
                  </div>

                  {/* Title */}
                  <h2>
                    {viewMode === 'designs' && 'Designs for production'}
                    {viewMode === 'sheets' && `Sheets - ${selectedDesign?.design_name || ''}`}
                    {viewMode === 'files' && `Files - Sheet ${selectedSheet?.sheet_number || ''}`}
                  </h2>
                </div>
                {!showLoading && (
                  <span className={styles.countPill}>
                    {designs.length} {designs.length === 1 ? 'design' : 'designs'}
                  </span>
                )}
              </div>

              {error && (
                <div className={styles.errorMessage}>
                  <LuTriangleAlert aria-hidden="true" />
                  {error}
                </div>
              )}

              {showLoading ? (
                <div className={styles.loadingMessage}>
                  <PhinxLoader scene="cabinet" label="Loading designs…" />
                </div>
              ) : (
                <>
                  {/* Designs View */}
                  {viewMode === 'designs' && (
                    <div className={styles.tablecontainer}>
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>Design</th>
                            <th>Status</th>
                            <th>Created</th>
                            <th>Last updated</th>
                            <th aria-label="Action" />
                          </tr>
                        </thead>
                        <tbody>
                          {designs.length === 0 ? (
                            <tr>
                              <td colSpan={6} className={styles.noData}>
                                <span className={styles.emptyIcon}>
                                  <LuPackageOpen aria-hidden="true" />
                                </span>
                                <strong>No designs yet</strong>
                                <span>
                                  Create a kitchen, wardrobe or room in Designs and it will show up
                                  here for nesting.
                                </span>
                              </td>
                            </tr>
                          ) : (
                            designs.map((design, index) => {
                              const StatusIcon = STATUS_ICON[design.status] ?? LuCircleDot;
                              return (
                                <tr key={design.id}>
                                  <td className={styles.indexCell}>{index + 1}</td>
                                  <td>
                                    <div className={styles.designCell}>
                                      <span className={styles.designIcon}>
                                        <LuSofa aria-hidden="true" />
                                      </span>
                                      <span className={styles.designName}>
                                        {design.design_name}
                                      </span>
                                    </div>
                                  </td>
                                  <td>
                                    <span
                                      className={`${styles.status} ${STATUS_CLASS[design.status] ?? ''}`}
                                    >
                                      <StatusIcon aria-hidden="true" />
                                      {design.status}
                                    </span>
                                  </td>
                                  <td className={styles.dateCell}>
                                    {formatDate(design.created_at)}
                                  </td>
                                  <td className={styles.dateCell}>
                                    {formatDate(design.updated_at)}
                                  </td>
                                  <td className={styles.actionCell}>
                                    <button
                                      className={styles.viewButton}
                                      onClick={() => handleDesignClick(design)}
                                    >
                                      <LuScissors aria-hidden="true" />
                                      Open cut list
                                      <LuArrowRight
                                        className={styles.viewArrow}
                                        aria-hidden="true"
                                      />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
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
