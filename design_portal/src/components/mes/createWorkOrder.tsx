import createicon from '@/assets/createicon.svg';
import close from '@/assets/design/close.svg';
import InputField from '@/components/inputfields/InputField';
import styles from '@/components/mes/mes.module.css';
import CommonService from '@/services/CommonService';
import { ChangeEvent, useEffect, useState } from 'react';
import { Design } from './interface';

type Props = {
  setCreateWorkOrderPopup: (value: boolean) => void;
  refreshWorkOrders: () => void;
};

const CreateWorkOrder: React.FC<Props> = ({
  setCreateWorkOrderPopup,
  refreshWorkOrders,
}) => {
  const [designs, setDesigns] = useState<Design[]>([]);
  const [error, setError] = useState('');
  const [selectedDesign, setSelectedDesign] = useState('');
  const [name, setName] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');

  const fetchDesigns = async () => {
    try {
      const response: {
        status: number;
        data: Design[];
      } = await CommonService.getWithQueryParam(
        'design',
        '',
        'is_custom',
        'false',
      );
      if (response.status === 200) {
        setDesigns(response.data);
      } else {
        setError('Something went wrong');
      }
    } catch (e) {
      console.error('Error fetching designs:', e);
      setError('Unathorized Access');
    }
  };

  useEffect(() => {
    fetchDesigns();
  }, []);

  const options = designs.map((design) => ({
    value: design.id,
    label: design.design_name,
  }));

  const handleCreateWorkOrder = async () => {
    const formData = new FormData();
    formData.append('design', selectedDesign);
    formData.append('name', name);
    formData.append('client_name', clientName);
    formData.append('description', description);
    formData.append('delivery_date', date);

    const response: { status: number } = await CommonService.post(
      'mes_portal',
      'work_order',
      formData,
    );
    if (response.status === 201) {
      refreshWorkOrders();
      setCreateWorkOrderPopup(false);
    } else {
      setError('Something went wrong');
    }
  };

  const fields = [
    {
      label: 'Design',
      type: 'select',
      placeholder: 'Select Design',
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        const selectedLabel = e.target.value;
        const selected = designs.find((d) => d.design_name === selectedLabel);
        setSelectedDesign(selected ? selected.id : '');
      },
      error: '',
      options: options,
    },
    {
      label: 'Name*',
      type: 'name',
      placeholder: 'Enter Name',
      onChange: (e: ChangeEvent<HTMLInputElement>) => setName(e.target.value),
      error: '',
    },
    {
      label: 'Client Name',
      type: 'client name',
      placeholder: 'Enter Client Name',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setClientName(e.target.value),
      error: '',
    },
    {
      label: 'Description',
      type: 'description',
      placeholder: 'Enter Description',
      onChange: (e: ChangeEvent<HTMLInputElement>) =>
        setDescription(e.target.value),
      error: '',
    },
    {
      label: '',
      type: 'date',
      placeholder: '',
      onChange: (e: ChangeEvent<HTMLInputElement>) => {
        setDate(e.target.value);
      },
      error: '',
    },
  ];

  return (
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
          onClick={() => setCreateWorkOrderPopup(false)}
        />
        <div className={styles.create_right_side}>
          <h2>Create work order</h2>
          <p>Please fill all the details to create your work order.</p>

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
            onClick={() => setCreateWorkOrderPopup(false)}
          >
            Cancel
          </button>
          <button
            className={styles.createcontinueButton}
            onClick={handleCreateWorkOrder}
          >
            Create
          </button>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
    </div>
  );
};

export default CreateWorkOrder;
