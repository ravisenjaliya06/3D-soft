import down_arrow from '@/assets/3dmodel/sidebar/down-arrow.svg';
import height_down_svg from '@/assets/3dmodel/sidebar/height_down.svg';
import height_up_svg from '@/assets/3dmodel/sidebar/height_up.svg';
import up_arrow from '@/assets/3dmodel/sidebar/up-arrow.svg';
import width_left_svg from '@/assets/3dmodel/sidebar/width_left.svg';
import width_right_svg from '@/assets/3dmodel/sidebar/width_right.svg';
import navigationdetail from '@/assets/sidebar/navigationdetail.svg';
import { useEffect, useState } from 'react';
import objectHandler from '../design/handler';
import { DesignProps } from '../interface';
import style from './sidebar.module.css';

const Sidebar: React.FC<{ DesignProps: DesignProps }> = ({ DesignProps }) => {
  const { selectedObject, setSelectedObject, cupBoardData } = DesignProps;
  const [isSidebarOpen, setisSidebarOpen] = useState(true);
  const [isBasicOpen, setIsBasicOpen] = useState(true);
  const [issettingopen, setsettingopen] = useState(false);
  const [isnavopen, setnavopen] = useState(true);
  const [activeWidthButton, setActiveWidthButton] = useState<string | null>(
    null,
  );
  const [activeHeightButton, setActiveHeightButton] = useState<string | null>(
    null,
  );
  const [activeDepthButton, setActiveDepthButton] = useState<string | null>(
    null,
  );

  useEffect(() => {
    if (selectedObject) {
      setisSidebarOpen(true);
    }
  }, [selectedObject]);

  useEffect(() => {
    if (isSidebarOpen) {
      setIsBasicOpen(true);
    }
  }, [isSidebarOpen]);

  const toggleSidebar = () => {
    setisSidebarOpen(!isSidebarOpen);
  };

  const toggleBasic = () => {
    setIsBasicOpen(!isBasicOpen);
  };

  const handleWidthButtonClick = (buttonType: string) => {
    setActiveWidthButton(buttonType);
  };
  const handleHeightButtonClick = (buttonType: string) => {
    setActiveHeightButton(buttonType);
  };

  const handleDepthButtonClick = (buttonType: string) => {
    setActiveDepthButton(buttonType);
  };

  const handleWidthChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!selectedObject) return;

    const newWidth = parseFloat(event.target.value);
    const findedPlank = cupBoardData
      ?.flatMap((data) => data.data)
      .find((item) => item.uuid === selectedObject.uuid);

    if (DesignProps.scene && DesignProps.setScene) {
      if (findedPlank) {
        const leftRightSpace = findedPlank.left_right_space;
        if (leftRightSpace) {
          const totalSpace = leftRightSpace.left + leftRightSpace.right;
          if (newWidth <= totalSpace) {
            const editData = {
              action: 'EDIT_OBJECT',
              item: findedPlank.name,
              type: 'PART',
              width: newWidth,
            };

            const updatedScene = await objectHandler(
              // @ts-expect-error no error, need to hanlde it properly
              editData,
              DesignProps,
              DesignProps.scene,
              selectedObject,
            );
            DesignProps.setScene(updatedScene);
            // @ts-ignore
            setSelectedObject({ ...selectedObject });
          } else {
            alert('New width exceeds available left-right space.');
          }
        }
      }
    }
  };

  const handleHeightChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    if (!selectedObject) return;

    const newHeight = parseFloat(event.target.value);
    const findedPlank = cupBoardData
      ?.flatMap((data) => data.data)
      .find((item) => item.uuid === selectedObject.uuid);
    if (DesignProps.scene && DesignProps.setScene) {
      if (findedPlank) {
        const upDownSpace = findedPlank?.up_down_space;
        if (upDownSpace) {
          const totalSpace = upDownSpace.up + upDownSpace.down;
          if (newHeight <= totalSpace) {
            const editData = {
              action: 'EDIT_OBJECT',
              item: findedPlank?.name || 'Unnamed',
              type: 'PART',
              height: newHeight,
            };

            const updatedScene = await objectHandler(
              // @ts-expect-error no error, need to hanlde it properly
              editData,
              DesignProps,
              DesignProps.scene,
              selectedObject,
            );
            DesignProps.setScene(updatedScene);
            // @ts-ignore
            setSelectedObject({ ...selectedObject });
          } else {
            alert('New height exceeds available up-down space.');
          }
        }
      }
    }
  };

  const handelsetting = () => {
    setsettingopen(true);
    setnavopen(false);
  };
  const handelnavigation = () => {
    setsettingopen(false);
    setnavopen(true);
  };

  const [cupBoardtexture, sercupBoardtexture] = useState('');
  const [planktexture, setplanktexture] = useState('');
  return (
    <div className={isSidebarOpen ? style.sidebar : style.sidebar_open}>
      <div
        className={
          isSidebarOpen ? style.sidebar_title : style.sidebar_close_title
        }
        onClick={toggleSidebar}
      >
        <p>Viewport Navigation</p>

        <img
          src={isSidebarOpen ? down_arrow.src : up_arrow.src}
          alt="toggle_arrow"
          onClick={toggleSidebar}
          style={{ cursor: 'pointer' }}
        />
      </div>
      {isSidebarOpen && (
        <>
          <div className={style.switch_div}>
            <button
              onClick={handelsetting}
              className={issettingopen ? style.btnactive : style.btn}
            >
              Setting
            </button>
            <button
              onClick={handelnavigation}
              className={isnavopen ? style.btnactive : style.btn}
            >
              Navigation
            </button>
          </div>
          {isnavopen && (
            <div>
              <div className={style.nav_div}>
                <img
                  src={navigationdetail.src}
                  alt=""
                  className={style.zoomoption_img}
                />
              </div>
            </div>
          )}
          {isSidebarOpen && (
            <div className={style.field_main_div}>
              <div className={style.field_group_title_div}>
                <img
                  src={isBasicOpen ? down_arrow.src : up_arrow.src}
                  alt="toggle_arrow"
                  onClick={toggleBasic}
                  style={{ cursor: 'pointer' }}
                />
                <p className={style.field_group_title}>Basic</p>
              </div>
              {isBasicOpen && (
                <div className={style.field_group_div}>
                  <div className={style.field_group}>
                    <p>Width</p>
                    <div className={style.icon_buttons}>
                      <button
                        className={
                          activeWidthButton === 'width-left'
                            ? style.svg_icon_active
                            : style.svg_icon
                        }
                        onClick={() => handleWidthButtonClick('width-left')}
                      >
                        <img src={width_left_svg.src} alt="Increase Width" />
                      </button>
                      <button
                        className={
                          activeWidthButton === 'width-right'
                            ? style.svg_icon_active
                            : style.svg_icon
                        }
                        onClick={() => handleWidthButtonClick('width-right')}
                      >
                        <img src={width_right_svg.src} alt="Decrease Width" />
                      </button>
                    </div>
                    <input
                      type="number"
                      // @ts-ignore
                      onChange={handleWidthChange}
                      min={5}
                    />
                  </div>
                  <div className={style.field_group}>
                    <p>Height</p>
                    <div className={style.icon_buttons}>
                      <button
                        className={
                          activeHeightButton === 'height-down'
                            ? style.svg_icon_active
                            : style.svg_icon
                        }
                        onClick={() => handleHeightButtonClick('height-down')}
                      >
                        <img src={height_down_svg.src} alt="Decrease Height" />
                      </button>
                      <button
                        className={
                          activeHeightButton === 'height-up'
                            ? style.svg_icon_active
                            : style.svg_icon
                        }
                        onClick={() => handleHeightButtonClick('height-up')}
                      >
                        <img src={height_up_svg.src} alt="Increase Height" />
                      </button>
                    </div>
                    <input
                      type="number"
                      // @ts-ignore
                      onChange={handleHeightChange}
                      min={5}
                    />
                  </div>
                  <div className={style.field_group}>
                    <p>Depth</p>
                    <div className={style.icon_buttons}>
                      <button
                        className={
                          activeDepthButton === 'depth-up'
                            ? style.svg_icon_active
                            : style.svg_icon
                        }
                        onClick={() => handleDepthButtonClick('depth-up')}
                      >
                        <img src={height_up_svg.src} alt="Increase Depth" />
                      </button>
                      <button
                        className={
                          activeDepthButton === 'depth-down'
                            ? style.svg_icon_active
                            : style.svg_icon
                        }
                        onClick={() => handleDepthButtonClick('depth-down')}
                      >
                        <img src={height_down_svg.src} alt="Decrease Depth" />
                      </button>
                    </div>
                    <input type="number" min={5} />
                  </div>
                  <div className={style.field_group1}>
                    <p>Distance from floor</p>
                    <input type="number" min={5} />
                  </div>
                  <div className={style.field_group1}>
                    <p>Rotate X:</p>
                    <input
                      type="number"
                      id="rotate-x"
                      min="0"
                      max="360"
                      defaultValue="0"
                    />
                  </div>
                  <div className={style.field_group1}>
                    <p>Rotate Y:</p>
                    <input
                      type="number"
                      id="rotate-y"
                      min="0"
                      max="360"
                      defaultValue="0"
                    />
                  </div>
                  <div className={style.field_group1}>
                    <p>Rotate Z:</p>
                    <input
                      type="number"
                      id="rotate-z"
                      min="0"
                      max="360"
                      defaultValue="0"
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default Sidebar;
