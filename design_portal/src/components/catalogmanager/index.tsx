import Sidebar from '../sidebar/sidebar';
import Header from '../header/header';
import styles from './catalogmanager.module.css';
import add from '../../assets/catalogmanager/add.svg';
import edit from '../../assets/catalogmanager/edit.svg';
import deleteIcon from '../../assets/catalogmanager/delete.svg';
import arrow from '../../assets/catalogmanager/arrow.svg';
import React from 'react';

const catalogManager = () => {
    return (
        <div className={styles.container}>
            <Sidebar />
            <div className={styles.rightside}>
                <Header isBorderRadius={true} dashboardName="Catalog Manager" />
                <div className={styles.maincontainer}>
                    {/* Top bar (already implemented) */}
                    <div className={styles.topToolbar}>
                        <div className={styles.toolbarLeft}>
                            <div className={styles.toolbarLeftContent}>
                                <span>Material Type</span>
                                <select className={styles.dropdown}>
                                    <option value="MDF">MDF</option>
                                    <option value="PLY">PLY</option>
                                    <option value="HDF">HDF</option>
                                </select>
                                <div className={styles.iconContainer}>
                                    <img src={add.src} alt="Add" className={styles.addIcon} />
                                    <img src={edit.src} alt="Edit" className={styles.editIcon} />
                                    <img src={deleteIcon.src} alt="Delete" className={styles.deleteIcon} />
                                </div>
                            </div>
                        </div>
                        <div className={styles.toolbarRight}>
                            <div className={styles.toolbarRightContent}>
                                <span>Schedule Type</span>
                                <select className={styles.dropdown}>
                                    <option value="Door">Door</option>
                                    <option value="Panel">Panel</option>
                                    <option value="Drawer">Drawer</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>
                <div className={styles.mainContent}>
                    <div className={styles.leftBox}>
                        <div className={styles.topBox}>
                            <div className={styles.topBoxContent}>
                                <h3>Rules</h3>
                                <button className={styles.addButtonRule}>Add Material</button>
                                <button className={styles.editButtonRule}>Edit Material</button>
                                <button className={styles.deleteButtonRule}>Delete</button>

                            </div>
                        </div>

                        <div className={styles.bottomBox}>
                            <h3 className={styles.boxTitle}>Door ID – 50</h3>
                            <div className={styles.infoTable}>
                                <div className={styles.row}>
                                    <div className={styles.key}>Name</div>
                                    <div className={styles.value}>
                                        <input type="text" defaultValue="data 1" />
                                    </div>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.key}>Description</div>
                                    <div className={styles.value}>
                                        <input type="text" defaultValue="1/2 milimine" />
                                    </div>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.key}>Up charge</div>
                                    <div className={styles.value}>
                                        <input type="text" defaultValue="10%" />
                                    </div>
                                </div>
                                <div className={styles.row}>
                                    <div className={styles.key}>By out</div>
                                    <div className={styles.value}>
                                        <select defaultValue="No">
                                            <option value="Yes">Yes</option>
                                            <option value="No">No</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            {/* </div> */}
                        </div>
                    </div>
                    <div className={styles.rightBox}>
                        <div className={styles.righttopbar}>
                            <select className={styles.rightBoxdropdown}>
                                <option value="MDF">MDF</option>
                                <option value="PLY">PLY</option>
                                <option value="HDF">HDF</option>
                            </select>
                            <div className={styles.searchContainer}>
                                <input
                                    type="text"
                                    placeholder=""
                                    className={styles.searchInput}
                                // value={searchQuery}
                                // onChange={(e) => setSearchQuery(e.target.value)}
                                />
                                <svg
                                    className={styles.searchIcon}
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                >
                                    <circle cx="11" cy="11" r="8" />
                                    <path d="m21 21-4.35-4.35" />
                                </svg>
                            </div>
                        </div>
                        <hr className={styles.divider} />

                        {/* <div className={styles.bottomBox}> */}
                        <table className={styles.doorTable} border={1} >
                            <thead>
                                <tr>
                                    <th>Material Name</th>
                                    <th>Description</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td>Elder ven EB</td>
                                    <td></td>
                                </tr>
                                <tr>
                                    <td>Elder ven EB</td>
                                    <td>1/2 minute</td>
                                </tr>
                                <tr>
                                    <td>Up Elder ven EB</td>
                                    <td>10%</td>
                                </tr>
                                <tr>
                                    <td>Elder ven EB</td>
                                    <td>No</td>
                                </tr>

                            </tbody>
                        </table>
                        <button className={styles.addButton}>
                            <img src={arrow.src} alt="" />
                            Add to material</button>
                    </div>
                </div>
            </div>
        </div>

    );
};

export default catalogManager;