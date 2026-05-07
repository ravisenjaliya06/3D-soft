import PanelDesigner from '@/components/3dmodel/panelDesign/designer';
import { Provider } from 'react-redux';
import { store } from '../store';

/**
 * The entry point for the Panel Design module.
 * Wraps the PanelDesigner with a Redux Provider to ensure state accessibility.
 */
const CustomDesignRootComponent = () => {
  return (
    <Provider store={store}>
      <PanelDesigner />
    </Provider>
  );
};

export default CustomDesignRootComponent;
