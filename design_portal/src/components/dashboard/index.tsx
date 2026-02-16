import styles from '@/components/dashboard/dashboard.module.css';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { useEffect, useState } from 'react';
import { Design } from './interface';

const ProjectDashboard = () => {
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

  // Stats Data for cleaner mapping
  const statsData = [
    { label: 'Projects', value: 0, icon: assets.projects, color: 'blue' },
    { label: 'Designs', value: designsCount, icon: assets.dashboarddesign, color: 'purple' },
    { label: 'Users', value: 0, icon: assets.users, color: 'green' },
    { label: 'Sales', value: 0, icon: assets.sells, color: 'orange' },
  ];

  // Features Data
  const featuresData = [
    { label: 'MES', icon: assets.Mes, route: '/mes' },
    { label: 'Material', icon: assets.Material, route: '/material' },
    { label: 'Catalog Manager', icon: assets.Catalogmanager, route: '/catalog' },
    { label: 'Design', icon: assets.Designs, route: '/design' },
  ];

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header dashboardName="Dashboard" isBorderRadius={true} />

        <div className={styles.mainContent}>
          {/* Top Row: Stats Cards */}
          <div className={styles.statsGrid}>
            {statsData.map((stat, index) => (
              <div key={index} className={styles.statCard}>
                <div className={styles.iconContainer}>
                  <img src={stat.icon} alt={stat.label} />
                </div>
                <div className={styles.statInfo}>
                  <p className={styles.statLabel}>{stat.label}</p>
                  <h3 className={styles.statValue}>{stat.value}</h3>
                </div>
              </div>
            ))}
          </div>

          {/* Bottom Row: Quick Navigation */}
          <div>
            <h3 className={styles.sectionTitle}>Quick Access</h3>
            <div className={styles.featuresGrid}>
              {featuresData.map((feature, index) => (
                <div key={index} className={styles.featureCard}>
                  <div className={styles.featureIconWrapper}>
                    <img src={feature.icon} alt={feature.label} />
                  </div>
                  <p className={styles.featureTitle}>{feature.label}</p>
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
