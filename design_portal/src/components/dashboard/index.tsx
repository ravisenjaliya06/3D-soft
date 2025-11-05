import Line from '@/assets/dashboard/Line.svg';
import Designs from '@/assets/dashboard/design.svg';
import Final_design from '@/assets/dashboard/final_design.svg';
import FloorPlan from '@/assets/dashboard/floorplan.svg';
import Nesting from '@/assets/dashboard/nesting.svg';
import Projects from '@/assets/dashboard/projects.svg';
import Public_library from '@/assets/dashboard/public_library.svg';
import Sells from '@/assets/dashboard/sells.svg';
import Users from '@/assets/dashboard/users.svg';
import styles from '@/components/dashboard/dashboard.module.css';
import Header from '@/components/header/header';
import Sidebar from '@/components/sidebar/sidebar';
import CommonService from '@/services/CommonService';
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
              <img className={styles.showprojectimage} src={Designs.src} alt="Design" />
              <div className={styles.projectDetails}>
                <p className={styles.showname}>Designs</p>
                <p className={styles.showValues}>{designsCount}</p>
              </div>
            </div>
            <img className={styles.Lines} src={Line.src} alt="Line" />
            <div className={styles.showprojectdetails}>
              <img className={styles.showprojectimage} src={Projects.src} alt="Project" />
              <div className={styles.projectDetails}>
                <p className={styles.showname}>Projects</p>
                <p className={styles.showValues}>0</p>
              </div>
            </div>
            <img className={styles.Lines} src={Line.src} alt="Line" />
            <div className={styles.showprojectdetails}>
              <img className={styles.showprojectimage} src={Users.src} alt="Users" />
              <div className={styles.projectDetails}>
                <p className={styles.showname}>Users</p>
                <p className={styles.showValues}>0</p>
              </div>
            </div>
            <img className={styles.Lines} src={Line.src} alt="Line" />
            <div className={styles.showprojectdetails}>
              <img className={styles.showprojectimage} src={Sells.src} alt="Sells" />
              <div className={styles.projectDetails}>
                <p className={styles.showname}>Sells</p>
                <p className={styles.showValues}>0</p>
              </div>
            </div>
          </div>
          <div className={styles.CardSectionlist}>
            <div className={styles.CardSection}>
              <img src={FloorPlan.src} alt="Floorplan" />
              <p>Floor plan</p>
            </div>
            <div className={styles.CardSection}>
              <img src={Public_library.src} alt="Public_library" />
              <p>Public library</p>
            </div>
            <div className={styles.CardSection}>
              <img src={Final_design.src} alt="Final_design" />
              <p>Final Design</p>
            </div>
            <div className={styles.CardSection}>
              <img src={Nesting.src} alt="Nesting" />
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
