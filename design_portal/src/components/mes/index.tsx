import styles from '@/components/mes/mes.module.css';
import Sidebar from '@/components/sidebar/sidebar';
const Mes = () => {
  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <div>Coming Soon...</div>
      </div>
    </div>
  );
};

export default Mes;
