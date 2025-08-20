import PanelDesigner from '@/components/3dmodel/panelDesign/designer';
import { Provider } from 'react-redux';
import { store } from '../store';

const CustomDesignRootComponent = () => {
  const state = store.getState();
  return (
    <Provider store={store}>
      <PanelDesigner state={state} />
    </Provider>
  );
};

export default CustomDesignRootComponent;
