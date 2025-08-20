import { useRouter } from 'next/router';
import React from 'react';
import { Provider } from 'react-redux';
import App from '../3dmodel/App';
import { store } from './store';

const RootComponent: React.FC = () => {
  const router = useRouter();

  // No need for manual root rendering in Next.js
  return (
    <Provider store={store}>
      <App router={router} />
    </Provider>
  );
};

export default RootComponent;
