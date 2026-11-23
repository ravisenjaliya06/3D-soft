import Header from '@/components/header/header';
import Loading_style from '@/components/loading.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import styles from '@/components/template/template.module.css';
import { useRouter } from 'next/router';
import React, { useState } from 'react';
import {
  LuArrowRight,
  LuRuler,
  LuSearch,
  LuSearchX,
  LuSquareDashed,
  LuWandSparkles,
} from 'react-icons/lu';
import { useDispatch } from 'react-redux';
import { resetStoreForNewDesign } from '../3dmodel/store';

const Template = () => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const dispatch = useDispatch();

  const [searchQuery, setSearchQuery] = useState('');
  const { designid } = router.query || {};

  // Focusing on high-fidelity, professional starting points
  const TemplateDesigns = [
    {
      name: 'Modern Minimalist Studio',
      description:
        'Clean architectural lines with natural green accents, curated for contemporary interior visualization.',
      icon: assets.blank,
      tag: 'Featured',
    },
    {
      name: 'Industrial Lofts Workspace',
      description:
        'Raw textures and open-plan layouts designed for high-end workspace and studio modeling.',
      icon: assets.blank,
      tag: 'Studio',
    },
    {
      name: 'Blank Artist Canvas',
      description:
        'A pure, infinite workspace for custom modeling. The ultimate starting point for original masterpieces.',
      icon: assets.blank,
      tag: 'Custom',
    },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCreateDesign = async () => {
    setLoading(true);
    // Simulate a premium transition feel
    setTimeout(() => {
      router.push({
        pathname: `/design/${designid}`,
      });
    }, 800);
  };

  const filteredTemplates = TemplateDesigns.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      {loading && (
        <div className={Loading_style.loadingOverlay}>
          <div className={Loading_style.loadingSpinner} />
          <p style={{ marginTop: '1rem', fontWeight: 600, color: '#392579' }}>
            Initializing Design Studio...
          </p>
        </div>
      )}

      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Studio Setup" />

        <div className={styles.maincontent}>
          {/* Top Notch Header */}
          <div className={styles.createdesigns}>
            <div className={styles.createdesignscontent}>
              <h2 className={styles.createdesignstext}>Select Your Workspace</h2>
              <p className={styles.createdesignssubtext}>
                Begin with a pre-configured masterpiece or unleash your creativity with a blank
                design environment.
              </p>
            </div>

            <div className={styles.createdesignButton} onClick={handleCreateDesign}>
              <div className={styles.createdesignButtoncontent}>
                <div className={styles.createdesingtext}>
                  <h4>Smart Template Mode</h4>
                  <p>Auto-generate architectural foundations</p>
                </div>
                <div className={styles.createbuttonimage}>
                  <img src={assets.createtemplatehome} alt="Bravento Studio" />
                </div>
              </div>
            </div>
          </div>

          <div className={styles.designs}>
            <div className={styles.designfirstpart}>
              <div className={styles.searchWrapper}>
                <img src={assets.search} alt="Search" className={styles.searchIcon} />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {/* High-Fidelity Template Selection */}
            <div className={styles.templateBox}>
              {filteredTemplates.map((item, index) => (
                <div className={styles.templateBoxContent} key={index} onClick={handleCreateDesign}>
                  <div className={styles.tag}>{item.tag}</div>
                  <div className={styles.imgWrapper}>
                    <img src={item.icon} alt={item.name} />
                  </div>
                  <button className={styles.templateBoxButton}>Open in Studio</button>
                  <div className={styles.templateInfo}>
                    <h5>{item.name}</h5>
                    <p>{item.description}</p>
                  </div>
                </div>
              ))}

              {filteredTemplates.length === 0 && (
                <div className={styles.emptyState}>
                  <span className={styles.emptyIcon}>
                    <LuSearchX aria-hidden="true" />
                  </span>
                  <strong>No templates match &ldquo;{searchQuery}&rdquo;</strong>
                  <p>Try another name, or start with the blank workspace.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Template;
