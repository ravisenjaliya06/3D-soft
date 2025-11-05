import download from '@/assets/mes/download.svg';
import { CatalogItem } from '@/components/3dmodel/interface';
import { SettingConfigs, sheetData, sheetsData } from '@/components/settings/interface';
import CommonService from '@/services/CommonService';
import { QRCodeCanvas } from 'qrcode.react';
import { useEffect, useState } from 'react';
import { WorkOrderData } from '../interface';
import styles from './workorder.module.css';

const WorkOrder = (workOrderData: WorkOrderData) => {
  const [designSheets, setDesignSheets] = useState<sheetsData[]>([]);
  const [sheetDetails, setSheetDetails] = useState<Record<string, sheetData[]>>({});
  const [activeSheet, setActiveSheet] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<sheetData | null>(null);
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf');

  const getDesignSheet = async () => {
    const response: { status: number; data: SettingConfigs } = await CommonService.get(
      'design',
      `${workOrderData.design}/settings`
    );

    if (response.status === 200) {
      setDesignSheets(response.data.sheet_data || []);
    }
  };

  const fetchSheetDetails = async (sheetName: string, ids: string[]) => {
    if (sheetDetails[sheetName]) {
      setActiveSheet(sheetName);
      return;
    }

    const details = await Promise.all(
      ids.map(async (id) => {
        const res: { status: number; data: CatalogItem } = await CommonService.get(
          'design',
          `${workOrderData.design}/catalog/item/${id}`
        );
        return res.status === 200 ? res.data : { id, error: 'Not found' };
      })
    );

    setSheetDetails((prev) => ({
      ...prev,
      [sheetName]: details as sheetData[],
    }));
    setActiveSheet(sheetName);
  };

  useEffect(() => {
    getDesignSheet();
  }, []);

  const formatLabel = (label: string) => {
    return label
      .replace(/_/g, ' ') // replace _ with space
      .toLowerCase() // lowercase all
      .replace(/^\w/, (c) => c.toUpperCase()); // capitalize first letter
  };

  const handleDownload = async () => {
    try {
      const data = new FormData();
      data.append('format', selectedFormat);

      const response = await CommonService.put(
        'design',
        `${workOrderData.design}/nesting/download`,
        data,
        // @ts-expect-error No time to update it at this moment
        { responseType: 'blob' }
      );

      if (response.status === 200) {
        const fileUrl = `${process.env.NEXT_PUBLIC_PUBLIC_API}/${response.data.file}`;

        const link = document.createElement('a');
        link.href = fileUrl;
        link.setAttribute('download', `design.${selectedFormat}`);

        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('Download failed:', response.status);
      }
    } catch (error) {
      console.error('Error downloading file:', error);
    }
  };

  const DetailRow = ({ label, value }: { label: string; value: string | number | object }) => {
    const [open, setOpen] = useState(false);

    if (value === null || value === undefined) {
      return null;
    }

    const displayLabel = formatLabel(label);
    const displayValue = formatLabel(String(value));

    if (typeof value !== 'object' || value === null) {
      return (
        <div className={styles.simpleDetail}>
          <strong>{displayLabel}:</strong> <span>{String(displayValue)}</span>
        </div>
      );
    }

    return (
      <div className={styles.dropdownDetail}>
        <div className={styles.dropdownHeader} onClick={() => setOpen(!open)}>
          <strong>{displayLabel}:</strong>
          <button className={styles.dropdownButton}>
            {open ? 'click to hide ▲' : 'click to show ▼'}
          </button>
        </div>

        {open && (
          <div className={styles.dropdownContent}>
            {Array.isArray(value)
              ? value.map((item, idx) => (
                  <DetailRow key={idx} label={`${displayLabel} ${idx + 1}`} value={item} />
                ))
              : Object.entries(value).map(([subKey, subValue]) => (
                  <DetailRow key={subKey} label={subKey} value={subValue} />
                ))}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={styles.workOrderContainer}>
      {designSheets.length > 0 ? (
        <>
          <div className={styles.sheetButtonContainer}>
            {designSheets.map((sheetObj, index) => {
              const sheetName = Object.keys(sheetObj)[0];
              const ids = Array.isArray(sheetObj[sheetName])
                ? (sheetObj[sheetName] as string[])
                : [];
              return (
                <button
                  key={index}
                  className={styles.sheetButton}
                  onClick={() => fetchSheetDetails(sheetName, ids)}
                >
                  {sheetName
                    .replace(/_/g, ' ')
                    .toLowerCase()
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </button>
              );
            })}
            <div className={styles.toolbarmenu}>
              <div className={styles.rediogroup}>
                <label className={styles.label}>
                  <input
                    type="radio"
                    name="option"
                    value="pdf"
                    checked={selectedFormat === 'pdf'}
                    onChange={() => setSelectedFormat('pdf')}
                    className={styles.option}
                  />
                  PDF
                </label>
                <label className={styles.label}>
                  <input
                    type="radio"
                    name="option"
                    value="xlsx"
                    checked={selectedFormat === 'xlsx'}
                    onChange={() => setSelectedFormat('xlsx')}
                    className={styles.option}
                  />
                  XLSX
                </label>
              </div>
              <a>
                {' '}
                <img
                  onClick={handleDownload}
                  src={download.src}
                  alt="download"
                  className={styles.download}
                />
              </a>
            </div>
          </div>

          {/* 🔹 Details for selected sheet */}
          {activeSheet && (
            <div className={styles.sheetDetails}>
              <h3 className="font-bold">
                {activeSheet
                  .replace(/_/g, ' ')
                  .toLowerCase()
                  .replace(/\b\w/g, (c) => c.toUpperCase())}
              </h3>
              <div className={styles.detailList}>
                {sheetDetails[activeSheet] ? (
                  sheetDetails[activeSheet].map((detail, index) => (
                    <div
                      key={detail.id.toString()}
                      className={styles.detailKeyValue}
                      onClick={() => setSelectedDetail(detail)}
                    >
                      {index + 1}:{' '}
                      {detail.name
                        ? detail.name
                            .replace(/_/g, ' ')
                            .toLowerCase()
                            .replace(/\b\w/g, (c: string) => c.toUpperCase())
                        : detail.id}
                    </div>
                  ))
                ) : (
                  <li>Loading...</li>
                )}
              </div>
            </div>
          )}
        </>
      ) : (
        <p>No sheet data available</p>
      )}

      {/* 🔹 Popup */}
      {selectedDetail && (
        <div className={styles.createpopupOverlay}>
          <div className={styles.createpopup}>
            <button className={styles.closeButton} onClick={() => setSelectedDetail(null)}>
              ✕
            </button>
            <div className={styles.popupContent}>
              <h2 className={styles.popupTitle}>
                {selectedDetail.name
                  ? (selectedDetail.name as string)
                      .replace(/_/g, ' ')
                      .toLowerCase()
                      .replace(/\b\w/g, (c: string) => c.toUpperCase())
                  : selectedDetail.id}
              </h2>

              <div className={styles.detailContainer}>
                <div className="space-y-2">
                  {Object.entries(selectedDetail).map(([key, value]) => (
                    <DetailRow key={key} label={key} value={value as string | number | object} />
                  ))}
                </div>
                <div className={styles.qrCodeContainer}>
                  <div className={styles.qrCodeLabel}>
                    <span>QR Code:</span>
                    <QRCodeCanvas
                      value={`${selectedDetail.id}, ${selectedDetail.name}`}
                      size={100}
                      level="M"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default WorkOrder;
