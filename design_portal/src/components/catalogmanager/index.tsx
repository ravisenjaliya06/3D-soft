import add from '../../assets/catalogmanager/add.svg';
import Header from '../header/header';
import Sidebar from '../sidebar/sidebar';
import styles from './catalogmanager.module.css';
// import edit from '../../assets/catalogmanager/edit.svg';
import createicon from '@/assets/createicon.svg';
import deletepopupicon from '@/assets/deletepopup.svg';
import close from '@/assets/design/close.svg';
import React, { useState } from 'react';
import arrow from '../../assets/catalogmanager/arrow.svg';
import deleteIcon from '../../assets/catalogmanager/delete.svg';
import matariel from '../../assets/catalogmanager/matireal.svg';
import InputField from '../inputfields/InputField';

const CatalogManager = () => {
  const [showPopup, setShowPopup] = useState(false);
  const [showDeletePopup, setshowDeletePopup] = useState(false);
  const [name, setName] = useState('Data 1');
  const [isEditingName, setIsEditingName] = useState(false);

  const [description, setDescription] = useState('1/2 milimine');
  const [isEditingDescription, setIsEditingDescription] = useState(false);

  // handlers
  const handleBlur =
    (setEditing: {
      (value: React.SetStateAction<boolean>): void;
      (value: React.SetStateAction<boolean>): void;
      (arg0: boolean): void;
    }) =>
    () =>
      setEditing(false);
  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    setEditing: {
      (value: React.SetStateAction<boolean>): void;
      (value: React.SetStateAction<boolean>): void;
      (arg0: boolean): void;
    },
  ) => {
    if (e.key === 'Enter') setEditing(false);
  };

  const fields = [
    {
      label: 'Name',
      type: 'name',
      placeholder: 'Enter design name',

      onChange: '',
      error: '',
    },
  ];

  const menuItems = [
    { id: 1, name: 'Material', icon: matariel.src },
    { id: 2, name: 'Banding', icon: matariel.src },
    { id: 3, name: 'MDF', icon: matariel.src },
    { id: 4, name: 'Wood', icon: matariel.src },
  ];
  const handleAddCatalog = () => {
    setShowPopup(true);
    console.log('Add Catalog');
  };
  const handleDeleteCatalog = () => {
    setshowDeletePopup(true);
    console.log('Delete Catalog');
  };

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
                <span>Catalog part</span>
                <select className={styles.dropdown}>
                  <option value="MDF">MDF</option>
                  <option value="PLY">PLY</option>
                  <option value="HDF">HDF</option>
                </select>
                <div className={styles.iconContainer}>
                  <img
                    src={add.src}
                    alt="Add"
                    className={styles.addIcon}
                    onClick={handleAddCatalog}
                  />
                  {/* <img src={edit.src} alt="Edit" className={styles.editIcon} /> */}
                  {/* <img src={deleteIcon.src} alt="Delete" className={styles.deleteIcon} /> */}
                </div>
              </div>
            </div>
            <div className={styles.toolbarRight}>
              <div className={styles.toolbarRightContent}>
                <span>Catalog Type</span>
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
                <div className={styles.buttonContainer}>
                  {/* <button className={styles.addButtonRule}>
                                        <img src={add.src} alt="" className={styles.addIconButton} />Add Material</button>
                                    <button className={styles.editButtonRule}>
                                        <img src={edit.src} alt="" className={styles.editIconButton} />Edit Material</button> */}
                  <button
                    className={styles.deleteButtonRule}
                    onClick={handleDeleteCatalog}
                  >
                    <img
                      src={deleteIcon.src}
                      alt=""
                      className={styles.deleteIconButton}
                    />
                    Delete
                  </button>
                </div>
              </div>
              <hr className={styles.divider} />
              <div className={styles.content}>
                <div className={styles.topBoxLeft}>
                  <div className={styles.matirealmanu}>
                    {menuItems.map((item) => (
                      <div key={item.id} className={`${styles.rulematireal} `}>
                        <img src={item.icon} alt={item.name} />
                        <span>{item.name}</span>
                      </div>
                    ))}
                  </div>
                  <div className={styles.manuiconContainer}>
                    {/* <img src={add.src} alt="Add" className={styles.manuaddIcon} />
                                        <img src={edit.src} alt="Edit" className={styles.manueditIcon} /> */}
                    {/* <img src={deleteIcon.src} alt="Delete" className={styles.manudeleteIcon} /> */}
                  </div>
                </div>
                <div className={styles.tableWrapper}>
                  <table className={styles.partsTable}>
                    <thead>
                      <tr>
                        <th>Parts</th>
                        <th>Material</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td>Door Edge Banding</td>
                        <td>
                          <input type="text" defaultValue="PVC Wood grain" />
                        </td>
                      </tr>
                      <tr>
                        <td>Door Edge Banding</td>
                        <td>
                          <input type="text" defaultValue="PVC Wood grain" />
                        </td>
                      </tr>
                      <tr>
                        <td>Door Edge Banding</td>
                        <td>
                          <input type="text" defaultValue="PVC Wood grain" />
                        </td>
                      </tr>
                      <tr>
                        <td>Door Edge Banding</td>
                        <td>
                          <input type="text" defaultValue="PVC Wood grain" />
                        </td>
                      </tr>
                      <tr>
                        <td>Door Edge Banding</td>
                        <td>
                          <input type="text" defaultValue="PVC Wood grain" />
                        </td>
                      </tr>
                      <tr>
                        <td>Door Edge Banding</td>
                        <td>
                          <input type="text" defaultValue="PVC Wood grain" />
                        </td>
                      </tr>
                      <tr>
                        <td>Door Edge Banding</td>
                        <td>
                          <input type="text" defaultValue="PVC Wood grain" />
                        </td>
                      </tr>

                      <tr>
                        <td>Door Edge Banding</td>
                        <td>
                          <input type="text" defaultValue="PVC Wood grain" />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className={styles.bottomBox}>
              <div className={styles.table_container}>
                <table className={styles.custom_table}>
                  <thead>
                    <tr>
                      <th className={styles.tablehead} colSpan={2}>
                        Details
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr className={styles.Tablerow}>
                      <td>Name</td>
                      <td>
                        {isEditingName ? (
                          <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            onBlur={handleBlur(setIsEditingName)}
                            onKeyDown={(e) =>
                              handleKeyDown(e, setIsEditingName)
                            }
                            className={styles.editable_input}
                          />
                        ) : (
                          <p
                            className="editable-input"
                            onClick={() => setIsEditingName(true)}
                          >
                            {name}
                          </p>
                        )}
                      </td>
                    </tr>

                    <tr className={styles.Tablerow}>
                      <td>Description</td>
                      <td>
                        {isEditingDescription ? (
                          <input
                            type="text"
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            onBlur={handleBlur(setIsEditingDescription)}
                            onKeyDown={(e) =>
                              handleKeyDown(e, setIsEditingDescription)
                            }
                            className={styles.editable_input}
                          />
                        ) : (
                          <p
                            className="editable-input"
                            onClick={() => setIsEditingDescription(true)}
                          >
                            {description}
                          </p>
                        )}
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>
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

            <div className={styles.bottomBox}>
              <div className={styles.doorTableWrapper}>
                <table className={styles.doorTable}>
                  <thead>
                    <tr>
                      <th>Material Name</th>
                      <th>Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Elder ven EB</td>
                      <td>Veneer Edgebanding</td>
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
                    <tr>
                      <td>Elder ven EB</td>
                      <td>Veneer Edgebanding</td>
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
                    <tr>
                      <td>Elder ven EB</td>
                      <td>Veneer Edgebanding</td>
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
              </div>
              <button className={styles.addButton}>
                <img src={arrow.src} alt="" />
                Add to material
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* add catalog popup  */}
      {showPopup && (
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <img
              src={createicon.src}
              className={styles.createicon}
              alt="createicon"
            />
            <img
              src={close.src}
              className={styles.createclose}
              alt="close"
              onClick={() => setShowPopup(false)}
            />
            <div className={styles.create_right_side}>
              <h2>Add Material</h2>
              <p>Please enter a name for this Material.</p>
              <form
                className={styles.form}
                onSubmit={(e) => {
                  e.preventDefault();
                  // handleCreateDesign();
                }}
              >
                <div className={styles.createinputGroup}>
                  {fields.map((field, index) => (
                    <InputField
                      className={styles.inputField}
                      key={index}
                      borderColor="var(--primary-color-grey-2)"
                      {...field}
                      error=""
                    />
                  ))}
                </div>
              </form>
            </div>
            <div className={styles.createButtonGrop}>
              <button
                className={styles.cancelcreateButton}
                onClick={() => setShowPopup(false)}
              >
                Cancel
              </button>
              <button
                className={styles.createcontinueButton}
                // onClick={handleCreateDesign}
              >
                continue
              </button>
            </div>
          </div>
        </div>
      )}
      {/* delete popup */}
      {showDeletePopup && (
        <div
          className={styles.deletepopupOverlay}
          onClick={(e) => {
            e.stopPropagation();
            if (e.target === e.currentTarget) {
              setshowDeletePopup(false);
            }
          }}
        >
          <div className={styles.deletepopup}>
            <img
              src={deletepopupicon.src}
              alt="deletepopupicon"
              className={styles.deletepopupicon}
            />

            <img
              src={close.src}
              alt="close"
              onClick={() => setshowDeletePopup(false)}
              className={styles.close}
            />

            <div className={styles.right_side}>
              <h2>Delete Design</h2>
              <p className={styles.deletemassage}>
                Are you sure you want to delete this design? This action cannot
                be undone.
              </p>
            </div>
            <div className={styles.deleteButtonGrop}>
              <button
                className={styles.cancelButton}
                onClick={() => setshowDeletePopup(false)}
              >
                Cancel
              </button>
              <button
                className={styles.deleteButton}
                // onClick={handleDeleteClick}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogManager;
