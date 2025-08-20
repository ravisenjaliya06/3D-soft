import { CatalogItem, ChildCatalog, ComponentData } from '../interface';
import { Material, Object3D } from '../store/interface';

const createComponentData = (
  child: Object3D,
  defaultMaterial: Material,
  position?: { x: number; y: number; z: number },
): ComponentData => ({
  id: child?.id,
  name: child?.name || '',
  width: child?.width || 0,
  height: child?.height || 0,
  depth: child?.depth || 0,
  layer: child?.layer || 0,
  altitude: child?.altitude || 0,
  plankSize: child?.plankSize || 0,
  position: position || child?.position || { x: 0, y: 0, z: 0 },
  rotateX: child?.rotationX || 0,
  rotateY: child?.rotationY || 0,
  rotateZ: child?.rotationZ || 0,
  material: child?.material || defaultMaterial,
  parent: child?.parent || '',
  child: child?.child || [],
  minifixHoles: child?.minifixHoles || [],
  minifixConnections: child?.minifixConnections || [],
  grooves: child?.grooves || [],
});

export const convertObjectData = (
  object: Object3D,
  childObjects?: Object3D[],
) => {
  const defaultMaterial: Material = {
    type: 'TEXTURE',
    value: 'wood_3',
  };

  const convertObject = {
    id: object?.id,
    name: object.name || '',
    data: {
      width: object.width,
      height: object.height,
      depth: object.depth,
      position: object.position || { x: 0, y: 0, z: 0 },
      rotateX: object.rotationX || 0,
      rotateY: object.rotationY || 0,
      rotateZ: object.rotationZ || 0,
    },
  };

  const items: CatalogItem[] = [];
  const childCatalogs: ChildCatalog[] = [];

  const drawerGroups: { [key: string]: Object3D[] } = {};
  const doorGroups: { [key: string]: Object3D[] } = {};
  let currentDrawer: string;
  let currentDoor: string;

  childObjects?.forEach((child) => {
    if (
      child.name.includes('DRAWER') &&
      !child.name.includes('PLANK') &&
      !child.name.includes('HANDLE')
    ) {
      currentDrawer = child.name;
      drawerGroups[currentDrawer] = [child];
      const currentDrawerChild = child.child;
      currentDrawerChild.forEach((drawerChild) => {
        const child = childObjects.find((obj) => obj.id === drawerChild);
        if (child) {
          drawerGroups[currentDrawer].push(child);
        }
      });
    } else if (
      child.name.includes('DOOR') &&
      !child.name.includes('LEFT') &&
      !child.name.includes('RIGHT') &&
      !child.name.includes('HANDLE')
    ) {
      currentDoor = child.name;
      doorGroups[currentDoor] = [child];
      const currentDoorChild = child.child;
      currentDoorChild.forEach((doorChild) => {
        const child = childObjects.find((obj) => obj.id === doorChild);
        if (child) {
          doorGroups[currentDoor].push(child);
        }
      });
    } else {
      items.push({
        id: child?.id,
        name: `CUPBOARD_${child.name}`,
        data: createComponentData(child, defaultMaterial),
      });
    }
  });
  Object.entries(drawerGroups).forEach(([drawerName, drawerItems]) => {
    const drawerObject = drawerItems.find((item) => item.name === drawerName);
    const drawerComponents = drawerItems.filter(
      (item) => item.name !== drawerName,
    );

    const drawerPosition = drawerObject?.position || { x: 0, y: 0, z: 0 };

    const catalogItems = drawerComponents.map((child) => ({
      id: child?.id,
      name: child.name.includes('FRONT') ? 'DRAWER_FRONT' : child.name,
      data: createComponentData(child, defaultMaterial),
    }));
    childCatalogs.push({
      catalog: {
        id: drawerObject?.id || '',
        name: drawerName,
        data: createComponentData(
          drawerObject!,
          defaultMaterial,
          drawerPosition,
        ),
      },
      items: catalogItems,
    });
  });

  Object.entries(doorGroups).forEach(([doorName, doorItems]) => {
    const doorObject = doorItems.find((item) => item.name === doorName);
    const doorComponents = doorItems.filter((item) => item.name !== doorName);

    const doorPosition = doorObject?.position || { x: 0, y: 0, z: 0 };

    const catalogItems = doorComponents.map((child) => ({
      id: child?.id,
      name: child.name,
      data: createComponentData(child, defaultMaterial),
    }));

    childCatalogs.push({
      catalog: {
        id: doorObject?.id || '',
        name: doorName,
        data: createComponentData(doorObject!, defaultMaterial, doorPosition),
      },
      items: catalogItems,
    });
  });

  return {
    object: convertObject,
    items: items,
    child_catalogs: childCatalogs,
  };
};
