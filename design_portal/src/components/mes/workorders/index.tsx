import Process_upload from '@/assets/design/progress-upload.svg';
import three_dot_svg from '@/assets/design/three_dots.svg';
import styles from '@/components/mes/workorders/workorder.module.css';
import { useEffect, useRef, useState } from 'react';
import { Design, WorkOrderData } from '../interface';
import editiconsvg from '@/assets/mes/work-order/editicon.svg';
import deleteiconsvg from '@/assets/mes/work-order/deleteicon.svg';
import archiveiconsvg from '@/assets/mes/work-order/archiveicon.svg';
import compartmentlinesvg from '@/assets/mes/work-order/compartmentline.svg';
import WorkOrderDetails from './workorder';
import commonService from '@/services/CommonService';
import Loading_style from '@/components/loading.module.css';

interface WorkOrderProps {
    searchQuery: string;
    workorders: WorkOrderData[];
    refreshWorkOrders: () => void;
}

const WorkOrder = ({ searchQuery, workorders }: WorkOrderProps) => {
    const [visibleCount, setVisibleCount] = useState(6);
    const [showdropDown, setShowDropDown] = useState(false);
    const [activeDropdownId, setActiveDropdownId] = useState<string | null>(null);
    const [selectedWorkOrder, setSelectedWorkOrder] = useState<WorkOrderData | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const dropdownRef = useRef<HTMLDivElement | null>(null);
    const dropdownButtonRef = useRef<HTMLImageElement | null>(null);

    const filteredWorkOrders = workorders.filter((item) =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );

    const visibleWorkOrders = filteredWorkOrders.slice(0, visibleCount);

    useEffect(() => {
        const handleOutsideClick = (event: Event) => {
            if (
                dropdownButtonRef.current &&
                !dropdownButtonRef.current.contains(event.target as Node)
            ) {
                setShowDropDown(false);
                setActiveDropdownId(null);
            }
        };

        document.addEventListener('mousedown', handleOutsideClick);
        return () => {
            document.removeEventListener('mousedown', handleOutsideClick);
        };
    }, []);

    const handlathreedot = (
        event: React.MouseEvent<HTMLImageElement, MouseEvent>,
        workOrderId: string,
    ) => {
        event.stopPropagation();
        setShowDropDown(true);
        setActiveDropdownId((prevId) => (prevId === workOrderId ? null : workOrderId));
    };

    const handleWorkorderClick = async (workOrder: WorkOrderData) => {
        setIsLoading(true);
        const response: { status: number; } =
            await commonService.get('design', `${workOrder.design}/nesting`);
        if (response.status === 200) {
            setSelectedWorkOrder(workOrder);
            setIsLoading(false);
        } else {
            console.error('Failed to fetch create nesting');
        }
    };

    if (selectedWorkOrder) {
        return (
            <div className={styles.tablecontainer}>
                <WorkOrderDetails {...selectedWorkOrder} />
            </div>
        );
    }

    return (
        <div className={styles.tablecontainer} ref={dropdownButtonRef}>
            {isLoading && (
                <div className={Loading_style.loadingOverlay}>
                    <div className={Loading_style.loadingSpinner}></div>
                    <p>Loading...</p>
                </div>
            )}
            <div className={styles.tableTitle}>
                <div className={styles.data}>Work Order</div>
                <div className={styles.data}>Design</div>
                <div className={styles.data}>Client</div>
                <div className={styles.data}>Delivery Date</div>
                <div className={styles.data}>Panel Cutting</div>
                <div className={styles.data}>Edgebanding</div>
                <div className={styles.data}>CNC</div>
                <div className={styles.data}>Packaging</div>
                <div className={styles.data}>Shipment</div>
            </div>

            <div className={styles.tableDataContainer}>
                {filteredWorkOrders.length === 0 ? (
                    <div className={styles.noDataMessage}>No work orders created</div>
                ) : (
                    visibleWorkOrders.map((item) => (
                        <div key={item.id} className={styles.tableData} onClick={() => handleWorkorderClick(item)}>
                            <div className={styles.data}>
                                {item.name.length > 10
                                    ? `${item.name.slice(0, 10)}...`
                                    : item.name}
                            </div>
                            <div className={styles.data}>
                                {item.design_name.length > 10
                                    ? `${item.design_name.slice(0, 10)}...`
                                    : item.design_name}
                            </div>
                            <div className={styles.data}>
                                {item.client_name.length > 10
                                    ? `${item.client_name.slice(0, 10)}...`
                                    : item.client_name}
                            </div>
                            <div className={styles.data}>
                                {new Date(item.delivery_date).toLocaleDateString('en-GB')}
                            </div>
                            <div className={styles.data}>0/0</div>
                            <div className={styles.data}>0/0</div>
                            <div className={styles.data}>0/0</div>
                            <div className={styles.data}>0/0</div>
                            <div className={styles.data}>0/0</div>
                            <div className={styles.data}>
                                <img src={three_dot_svg.src} alt="process upload" onClick={(event) =>
                                    handlathreedot(event, item.id)
                                } />
                            </div>
                            {activeDropdownId === item.id && showdropDown && (
                                <div
                                    className={styles.gridthree_dots}
                                    ref={dropdownRef}
                                >
                                    <ul className={styles.gridthree_dots_dropdown}>
                                        <li
                                        // onClick={(event) =>
                                        //     handleEditClickPopUp(event, design.id)
                                        // }
                                        >
                                            <img
                                                src={editiconsvg.src}
                                                alt="edit icon"
                                            />
                                            Edit Work Order
                                        </li>

                                        <img
                                            src={compartmentlinesvg.src}
                                            alt="edit-delete-line"
                                            className={styles.grid_line}
                                        />

                                        <li
                                        // onClick={(event) =>
                                        //     handleDeleteClickPopUp(event, design.id)
                                        // }
                                        >
                                            <img
                                                src={deleteiconsvg.src}
                                                alt="delete icon"
                                            />
                                            Delete Work Order
                                        </li>

                                        <img
                                            src={compartmentlinesvg.src}
                                            alt="edit-delete-line"
                                            className={styles.grid_line}
                                        />

                                        <li
                                        // onClick={(event) =>
                                        //     handleDeleteClickPopUp(event, design.id)
                                        // }
                                        >
                                            <img
                                                src={archiveiconsvg.src}
                                                alt="delete icon"
                                            />
                                            Archive Work Order
                                        </li>
                                    </ul>
                                </div>
                            )}
                        </div>

                    ))
                )}
            </div>

            {visibleCount < filteredWorkOrders.length && (
                <div className={styles.designsLoadMore}>
                    <div
                        className={styles.loadmore}
                        onClick={() => setVisibleCount((prev) => prev + 6)}
                        style={{ cursor: 'pointer' }}
                    >
                        <p>Load More</p>
                        <img
                            src={Process_upload.src}
                            alt="process upload"
                            className={styles.process_upload}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default WorkOrder;
