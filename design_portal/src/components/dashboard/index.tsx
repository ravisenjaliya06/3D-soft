import FurnitureIllustration from '@/components/auth/FurnitureIllustration';
import styles from '@/components/dashboard/dashboard.module.css';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { REDIRECT } from '@/services/CommonStatus';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import {
  LuArrowUpRight,
  LuBox,
  LuFactory,
  LuFolderKanban,
  LuLayers,
  LuLibrary,
  LuPlus,
  LuSparkles,
  LuTrendingUp,
  LuUsers,
} from 'react-icons/lu';
import { Design } from './interface';

const ProjectDashboard = () => {
  const router = useRouter();
  const [designsCount, setDesignsCount] = useState(0);

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const response: { status: number; data: Design[] } = await CommonService.get(
          API_ENDPOINT.GET_DESIGNS
        );
        if (response.status === 200) {
          setDesignsCount(response.data.length);
        } else {
          console.error('Error fetching designs');
        }
      } catch (e) {
        console.error('Error fetching designs:', e);
      }
    };

    fetchDesigns();
  }, []);

  // Stats Data — each card now has a unique colour scheme
  const statsData = [
    {
      label: 'Projects',
      value: 0,
      Icon: LuFolderKanban,
      hint: 'Active client projects',
      colorClass: styles.statProjects,
    },
    {
      label: 'Designs',
      value: designsCount,
      Icon: LuBox,
      hint: 'Furniture designs saved',
      colorClass: styles.statDesigns,
    },
    {
      label: 'Users',
      value: 0,
      Icon: LuUsers,
      hint: 'Team members',
      colorClass: styles.statUsers,
    },
    {
      label: 'Sales',
      value: 0,
      Icon: LuTrendingUp,
      hint: 'Orders this period',
      colorClass: styles.statSales,
    },
  ];

  // Features Data (same routes as before)
  const featuresData = [
    {
      label: 'Design',
      Icon: LuBox,
      route: REDIRECT.DESIGNS,
      description: 'Model cabinets, wardrobes and kitchens in 3D.',
    },
    {
      label: 'Material',
      Icon: LuLayers,
      route: REDIRECT.MATERIAL,
      description: 'Boards, laminates, edge banding and hardware.',
    },
    {
      label: 'Catalog Manager',
      Icon: LuLibrary,
      route: REDIRECT.CATALOG_MANAGER,
      description: 'Reusable furniture modules and parts.',
    },
    {
      label: 'MES',
      Icon: LuFactory,
      route: REDIRECT.MES,
      description: 'Work orders, nesting and CNC output.',
    },
  ];

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header dashboardName="Overview" isBorderRadius={true} />

        <div className={styles.mainContent}>
          {/* ── Bento grid: hero tile + four stat tiles ── */}
          <div className={styles.bento}>
            <section className={styles.hero}>
              <div className={styles.heroText}>
                <span className={styles.heroEyebrow}>
                  <LuSparkles aria-hidden="true" />
                  Welcome to your workshop
                </span>
                <h2 className={styles.heroTitle}>
                  From 3D design to the <span>cutting floor.</span>
                </h2>
                <p className={styles.heroLead}>
                  Design furniture, manage materials and send optimised nesting to production — all
                  from one place.
                </p>
                <button
                  type="button"
                  className={styles.heroButton}
                  onClick={() => router.push(REDIRECT.DESIGNS)}
                >
                  <LuPlus aria-hidden="true" />
                  Go to designs
                </button>
              </div>
              <div className={styles.heroArt} aria-hidden="true">
                <FurnitureIllustration />
              </div>
            </section>

            {/* Stat cards with large background icon watermark */}
            {statsData.map((stat, index) => (
              <div key={index} className={`${styles.statCard} ${stat.colorClass}`}>
                {/* Giant watermark icon in the background */}
                <div className={styles.statBgIcon} aria-hidden="true">
                  <stat.Icon />
                </div>

                <div className={styles.statTop}>
                  <div className={styles.iconContainer}>
                    <stat.Icon aria-hidden="true" />
                  </div>
                  <span className={styles.statBadge}>
                    {stat.value > 0 ? 'Active' : '—'}
                  </span>
                </div>

                <div className={styles.statBottom}>
                  <h3 className={styles.statValue}>{stat.value}</h3>
                  <p className={styles.statLabel}>{stat.label}</p>
                  <span className={styles.statHint}>{stat.hint}</span>
                </div>
              </div>
            ))}
          </div>

          {/* ── Workflow pipeline ── */}
          <div className={styles.workflow}>
            <div className={styles.sectionHead}>
              <h3 className={styles.sectionTitle}>Your workflow</h3>
              <span className={styles.sectionSub}>
                Design, choose materials, build the catalog, then produce
              </span>
            </div>
            <div className={styles.featuresGrid}>
              {featuresData.map((feature, index) => (
                <div
                  key={index}
                  className={styles.featureCard}
                  onClick={() => router.push(feature.route)}
                  style={{ cursor: 'pointer' }}
                >
                  {/* Large watermark icon in background */}
                  <div className={styles.featureBgIcon} aria-hidden="true">
                    <feature.Icon />
                  </div>

                  <div className={styles.featureTop}>
                    <span className={styles.featureStep}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className={styles.featureIconWrapper}>
                      <feature.Icon aria-hidden="true" />
                    </div>
                    <LuArrowUpRight className={styles.featureArrow} aria-hidden="true" />
                  </div>
                  <p className={styles.featureTitle}>{feature.label}</p>
                  <p className={styles.featureDesc}>{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
