import search from '@/assets/design/search.svg';
import blank from '@/assets/template/blank.svg';
import createtemplatehome from '@/assets/template/createtemplatehome.svg';
import Header from '@/components/header/header';
import Loading_style from '@/components/loading.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import styles from '@/components/template/template.module.css';
import { useRouter } from 'next/router';
import React, { useState } from 'react';

const Template = () => {
  const [loading, setLoading] = useState(false);

  const TemplateDesings = [
    { option: 'Modern Minimalist Dining Room with Green Accents', icon: blank },
  ];

  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const { designid } = router.query || {};
  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCreateDesign = async () => {
    setLoading(true);
    router.push({
      pathname: `/design/${designid}`,
    });
  };

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Create Design" />
        <div className={styles.maincontent}>
          <div className={styles.createdesigns}>
            <div className={styles.createdesignscontent}>
              <p className={styles.createdesignstext}>Get Start with a template </p>
              <p className={styles.createdesignssubtext}>
                Follow the guide to create your first design project
              </p>
            </div>
            <div className={styles.createdesignButton}>
              {loading && (
                <div className={Loading_style.loadingOverlay}>
                  <div className={Loading_style.loadingSpinner}></div>
                  <p>Loading...</p>
                </div>
              )}
              <div className={styles.createdesignButtoncontent}>
                <div className={styles.createdesing}>
                  <div className={styles.createdesingtext}>
                    <h4>Create your custom design </h4>
                    <p>All-in-one Template for modeling, visualizing, and drawing</p>
                  </div>
                </div>
                <div className={styles.createbuttonimage}>
                  <img src={createtemplatehome.src} alt="create design icon" />
                </div>
              </div>
            </div>
          </div>
          <div className={styles.designs}>
            {/* Design View Part */}
            <div className={styles.designfirstpart}>
              <div className={styles.designMenu}>
                {' '}
                <ul></ul>
              </div>
              <div className={styles.searchWrapper}>
                <img src={search.src} alt="Search Icon" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search Design"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={styles.searchInput}
                />
              </div>
            </div>
            <div className={styles.templateBox}>
              {TemplateDesings.map((item, index) => (
                <div
                  className={styles.templateBoxContent}
                  key={index}
                  onClick={() => handleCreateDesign()}
                >
                  <img src={item.icon.src} alt="template" />
                  <button className={styles.templateBoxButton}>Use This Template</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Template;
