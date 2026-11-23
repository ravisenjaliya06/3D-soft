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
      name: 'Blank workspace',
      description:
        'An empty 3D workspace for fully custom furniture: cabinets, wardrobes, kitchens or any interior piece.',
      Icon: LuSquareDashed,
      tag: 'Custom',
    },
  ];

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleCreateDesign = async () => {
    setLoading(true);

    // Reset store BEFORE rendering loading screen and pushing route
    dispatch(resetStoreForNewDesign() as any);

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
          <p className={styles.loadingText}>Preparing your design studio…</p>
        </div>
      )}

      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Studio Setup" />

        <div className={styles.maincontent}>
          {/* Top header */}
          <div className={styles.createdesigns}>
            <div className={styles.createdesignscontent}>
              <span className={styles.eyebrow}>
                <LuRuler aria-hidden="true" />
                New design · Choose a starting point
              </span>
              <h2 className={styles.createdesignstext}>
                How would you like to <span>start building?</span>
              </h2>
              <p className={styles.createdesignssubtext}>
                Open a blank workspace and build your cabinets, wardrobes and kitchens piece by
                piece.
              </p>
            </div>

            <button
              type="button"
              className={styles.createdesignButton}
              onClick={handleCreateDesign}
            >
              <span className={styles.createIcon}>
                <LuWandSparkles aria-hidden="true" />
              </span>
              <span className={styles.createdesingtext}>
                <strong>Smart template mode</strong>
                <small>Auto-generate a ready base to build on</small>
              </span>
              <LuArrowRight className={styles.createArrow} aria-hidden="true" />
            </button>
          </div>

          <div className={styles.designs}>
            <div className={styles.designfirstpart}>
              <div>
                <h3 className={styles.sectionTitle}>Templates</h3>
                <p className={styles.sectionSub}>
                  {filteredTemplates.length}{' '}
                  {filteredTemplates.length === 1 ? 'template' : 'templates'} available
                </p>
              </div>
              <div className={styles.searchWrapper}>
                <LuSearch className={styles.searchIcon} aria-hidden="true" />
                <input
                  type="text"
                  placeholder="Search templates…"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={styles.searchInput}
                />
              </div>
            </div>

            {/* Template selection */}
            <div className={styles.templateBox}>
              {filteredTemplates.map((item, index) => (
                <div className={styles.templateBoxContent} key={index} onClick={handleCreateDesign}>
                  <div className={styles.imgWrapper}>
                    <div className={styles.tag}>{item.tag}</div>
                    <item.Icon className={styles.templateIcon} aria-hidden="true" />
                    <span className={styles.dimTop}>W × H × D</span>
                  </div>
                  <div className={styles.templateInfo}>
                    <h5>{item.name}</h5>
                    <p>{item.description}</p>
                  </div>
                  <button className={styles.templateBoxButton}>
                    Open in studio
                    <LuArrowRight aria-hidden="true" />
                  </button>
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
