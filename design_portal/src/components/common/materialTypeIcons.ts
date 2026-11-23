import { IconType } from 'react-icons';
import {
  LuArrowDownToLine,
  LuArrowRightLeft,
  LuArrowUpDown,
  LuBox,
  LuCircle,
  LuCircleDot,
  LuDoorOpen,
  LuGrip,
  LuLayers,
  LuLayers2,
  LuLink,
  LuMinus,
  LuMoveHorizontal,
  LuPackage,
  LuPanelTop,
  LuPlug,
  LuRectangleHorizontal,
  LuShoppingBasket,
  LuSpline,
  LuSquare,
} from 'react-icons/lu';

/** One icon per material type — shared by Material and Catalog Manager (presentation only). */
export const MATERIAL_TYPE_ICONS: Record<string, IconType> = {
  Banding: LuRectangleHorizontal,
  'Board Stock': LuLayers,
  Caster: LuCircleDot,
  Connector: LuLink,
  'Drawer Guide': LuArrowRightLeft,
  Hinge: LuDoorOpen,
  'Hinge Plate': LuSquare,
  Laminate: LuLayers2,
  Leg: LuArrowDownToLine,
  'Leg Leveler': LuArrowUpDown,
  Miscellaneous: LuPackage,
  Molding: LuSpline,
  'Panel Stock': LuPanelTop,
  Pull: LuGrip,
  Rod: LuMinus,
  'Sliding Door Rail': LuMoveHorizontal,
  'Sliding Door Roller': LuCircle,
  'Wire Basket': LuShoppingBasket,
  Connection: LuPlug,
};

export const getMaterialTypeIcon = (type?: string | null): IconType =>
  (type && MATERIAL_TYPE_ICONS[type]) || LuBox;
