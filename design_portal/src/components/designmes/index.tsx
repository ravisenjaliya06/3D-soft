// @ts-nocheck
import CommonService from '@/services/CommonService';
import { useEffect, useState } from 'react';

const Template = () => {
  const [visibleDesigns, setVisibleDesigns] = useState(9);
  const [designName, setDesignName] = useState('');
  const [mesData, setMesData] = useState<any[]>([]);
  const [selectedFormat, setSelectedFormat] = useState<string>('pdf'); // Default format is PDF

  const designId = window.location.pathname.split('/')[2];

  useEffect(() => {
    fetchUserDetails();
    fetchMesdata();
  }, []);

  const fetchUserDetails = async () => {
    try {
      // @ts-expect-error No time to update it at this moment
      const response = await CommonService.get('design', designId);
      // @ts-expect-error No time to update it at this moment
      if (response.status === 200) {
        // @ts-expect-error No time to update it at this moment
        setDesignName(response.data.design_name);
      } else {
        // @ts-expect-error No time to update it at this moment
        console.error('Failed to fetch user details:', response.status);
      }
    } catch (error) {
      console.error('Error fetching user details:', error);
    }
  };

  const fetchMesdata = async () => {
    try {
      // @ts-expect-error No time to update it at this moment
      const response = await CommonService.get('design', `${designId}/mes`);
      // @ts-expect-error No time to update it at this moment
      if (response.status === 200) {
        // @ts-expect-error No time to update it at this moment
        const dataArray = Object.keys(response.data).map((key) => ({
          id: key,
          // @ts-expect-error No time to update it at this moment
          ...response.data[key],
        }));
        setMesData(dataArray);
      } else {
        // @ts-expect-error No time to update it at this moment
        console.error('Failed to fetch MES data:', response.status);
      }
    } catch (error) {
      console.error('Error fetching MES data:', error);
    }
  };

  return <div>Coming Soon...</div>;
};

export default Template;
