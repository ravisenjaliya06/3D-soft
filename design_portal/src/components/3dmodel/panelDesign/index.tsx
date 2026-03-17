import PanelDesigner from '@/components/3dmodel/panelDesign/designer';
import { Provider } from 'react-redux';
import { store } from '../store';

/**
 * The entry point for the Panel Design module.
 * Wraps the PanelDesigner with a Redux Provider to ensure state accessibility.
 */
const CustomDesignRootComponent = () => {
  const state = store.getState();
  return (
    <Provider store={store}>
      <PanelDesigner state={state} />
    </Provider>
  );
};

export default CustomDesignRootComponent;
