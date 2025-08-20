import styles from '@/components/admin/admin.module.css';
import Sidebar from '@/components/sidebar/sidebar';

const Admin = () => {
  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <p>Coming Soon...</p>
      </div>
    </div>
  );
};

export default Admin;
