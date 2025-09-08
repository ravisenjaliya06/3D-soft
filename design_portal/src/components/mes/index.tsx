import erroricon from '@/assets/design/error.svg';
import search from '@/assets/design/search.svg';
import Header from '@/components/header/header';
import styles from '@/components/mes/mes.module.css';
import Sidebar from '@/components/sidebar/sidebar';
import CommonService from '@/services/CommonService';
import React, { useEffect, useState } from 'react';
import { WorkOrderData } from './interface';

import activepackaging from '@/assets/mes/activepackaging.svg';
import activeshipment from '@/assets/mes/activeshipment.svg';
import activetracking from '@/assets/mes/activetracking.svg';
import workordersvg from '@/assets/mes/activeworkorder.svg';
import createworkordersvg from '@/assets/mes/createworkordersvg.svg';
import packagingsvg from '@/assets/mes/Packaging.svg';
import shipmentsvg from '@/assets/mes/Shipment.svg';
import trackingsvg from '@/assets/mes/tracking.svg';
import activeworkorder from '@/assets/mes/workorder.svg';
import WorkOrder from '@/components/mes/workorders/index';
import CreateDesign from './createWorkOrder';

const Mes = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [apiErrorMessage, setApiErrorMessage] = useState('');
  const [errorPopup, setErrorPopup] = useState(false);

  const [activeTab, setActiveTab] = useState('workorders');
  const [filterToggle, setFilterToggle] = useState('active');
  const [createWorkOrderPopup, setCreateWorkOrderPopup] = useState(false);
  const [workorders, setWorkOrders] = useState<WorkOrderData[]>([]);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleChangeTab = (tab: string) => {
    setActiveTab(tab);
  };

  const getWorkOrdersList = async () => {
    const response: { status: number; data: WorkOrderData[] } = await CommonService.get('mes_portal', 'work_order');

    if (response?.status === 200 && Array.isArray(response.data)) {
      const sortedData = [...response.data].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
      setWorkOrders(sortedData);
    } else {
      setWorkOrders([]);
      setErrorPopup(true);
      setApiErrorMessage('Failed to fetch work orders');
    }
  };

  useEffect(() => {
    getWorkOrdersList();
  }, []);

  const displayedWorkOrders = workorders.filter((order) =>
    filterToggle === 'active' ? !order.is_archived : order.is_archived,
  );

  const tabs = [
    {
      name: 'Work Orders',
      key: 'workorders',
      image: workordersvg.src,
      activeimage: activeworkorder.src,
    },
    {
      name: 'Tracking',
      key: 'tracking',
      image: trackingsvg.src,
      activeimage: activetracking.src,
    },
    {
      name: 'Packaging',
      key: 'packaging',
      image: packagingsvg.src,
      activeimage: activepackaging.src,
    },
    {
      name: 'Shipment',
      key: 'shipment',
      image: shipmentsvg.src,
      activeimage: activeshipment.src,
    },
  ];

  return (
    <div className={styles.container}>
      {errorPopup === true && (
        <div className={styles.successPopup}>
          <img src={erroricon.src} alt="Error" />
          <p>{apiErrorMessage}</p>
        </div>
      )}

      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="MES" />
        <div className={styles.maincontent}>
          <div className={styles.tabs}>
            {tabs.map((tab) => (
              <div
                key={tab.key}
                className={`${styles.tab} ${tab.key === activeTab ? styles.activeTab : ''}`}
                onClick={() => handleChangeTab(tab.key)}
              >
                <img
                  src={tab.key === activeTab ? tab.activeimage : tab.image}
                  alt={tab.name}
                />
                <p>{tab.name}</p>
              </div>
            ))}
          </div>

          <div className={styles.designs}>
            {/* Design View Part */}
            <div className={styles.designfirstpart}>
              <div className={styles.searchWrapper}>
                <img
                  src={search.src}
                  alt="Search Icon"
                  className={styles.searchIcon}
                />
                <input
                  type="text"
                  placeholder="Search Work Orders"
                  value={searchQuery}
                  onChange={handleSearchChange}
                  className={styles.searchInput}
                />
                <div
                  className={styles.createWorkOrderButton}
                  onClick={() => setCreateWorkOrderPopup(true)}
                >
                  <img
                    src={createworkordersvg.src}
                    alt="Create Work Order Icon"
                  />
                  Create Work order
                </div>
              </div>
              <div className={styles.toggleButton}>
                <div
                  className={`${styles.activeButtonToggle} ${filterToggle === 'active' ? styles.activeToggle : ''}`}
                  onClick={() => setFilterToggle('active')}
                >
                  Active (
                  {Array.isArray(workorders) ? workorders.filter((o) => !o.is_archived).length : 0}
                  )
                </div>
                <div
                  className={`${styles.activeButtonToggle} ${filterToggle === 'archive' ? styles.activeToggle : ''}`}
                  onClick={() => setFilterToggle('archive')}
                >
                  Archive (
                  {Array.isArray(workorders) ? workorders.filter((o) => o.is_archived).length : 0}
                  )
                </div>
              </div>
            </div>
            <div>
              {activeTab === 'workorders' && (
                <WorkOrder
                  searchQuery={searchQuery}
                  workorders={displayedWorkOrders}
                  refreshWorkOrders={getWorkOrdersList}
                />
              )}
            </div>
            {createWorkOrderPopup === true && (
              <CreateDesign
                setCreateWorkOrderPopup={setCreateWorkOrderPopup}
                refreshWorkOrders={getWorkOrdersList}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mes;
