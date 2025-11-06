import styles from '@/components/dashboard/dashboard.module.css';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import CommonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { useEffect, useState } from 'react';
import { Design } from './interface';

const ProjectDashboard = () => {
  const [designsCount, setDesignsCount] = useState(0);

  useEffect(() => {
    const fetchDesigns = async () => {
      try {
        const response: { status: number; data: Design[] } = await CommonService.get('design', '');
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

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header dashboardName="Dashboard" />

        <div className={styles.mainContent}>
          <div className={styles.showdetails}>
            <div className={styles.showprojectdetails}>
              <img className={styles.showprojectimage} src={assets.dashboarddesign} alt="Design" />
              <div className={styles.projectDetails}>
                <p className={styles.showname}>Designs</p>
                <p className={styles.showValues}>{designsCount}</p>
              </div>
            </div>
            <img className={styles.Lines} src={assets.tab_line} alt="Line" />
            <div className={styles.showprojectdetails}>
              <img className={styles.showprojectimage} src={assets.projects} alt="Project" />
              <div className={styles.projectDetails}>
                <p className={styles.showname}>Projects</p>
                <p className={styles.showValues}>0</p>
              </div>
            </div>
            <img className={styles.Lines} src={assets.tab_line} alt="Line" />
            <div className={styles.showprojectdetails}>
              <img className={styles.showprojectimage} src={assets.users} alt="Users" />
              <div className={styles.projectDetails}>
                <p className={styles.showname}>Users</p>
                <p className={styles.showValues}>0</p>
              </div>
            </div>
            <img className={styles.Lines} src={assets.tab_line} alt="Line" />
            <div className={styles.showprojectdetails}>
              <img className={styles.showprojectimage} src={assets.sells} alt="Sells" />
              <div className={styles.projectDetails}>
                <p className={styles.showname}>Sells</p>
                <p className={styles.showValues}>0</p>
              </div>
            </div>
          </div>
          <div className={styles.CardSectionlist}>
            <div className={styles.CardSection}>
              <img src={assets.floorplan} alt="Floorplan" />
              <p>Floor plan</p>
            </div>
            <div className={styles.CardSection}>
              <img src={assets.public_library} alt="Public_library" />
              <p>Public library</p>
            </div>
            <div className={styles.CardSection}>
              <img src={assets.final_design} alt="Final_design" />
              <p>Final Design</p>
            </div>
            <div className={styles.CardSection}>
              <img src={assets.nesting} alt="Nesting" />
              <p>Nesting</p>
            </div>
          </div>
          <div className={styles.Analytics}>
            <p>Analytics Coming Soon...</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProjectDashboard;
