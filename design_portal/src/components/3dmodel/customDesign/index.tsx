import { useRouter } from 'next/router';
import { Provider } from 'react-redux';
import { store } from '../store';
import App from './App';

export const CustomDesignRootComponent = () => {
  const router = useRouter();
  return (
    <Provider store={store}>
      <App router={router} />
    </Provider>
  );
};
