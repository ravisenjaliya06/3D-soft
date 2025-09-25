import close from '@/assets/design/close.svg';
import InputField from '@/components/inputfields/InputField';
import commonService from '@/services/CommonService';
import type React from 'react';
import { useState } from 'react';
import styles from './materialWizard.module.css';

type Props = {
  setCreateWorkOrderPopup: (value: boolean) => void;
  companyState: any;
  handleGetCompanyMaterials: (companyId: string) => void;
};

interface FormData {
  [key: string]: string | number | boolean | string[] | undefined;
}

interface PopupStep {
  title: string;
  fields: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'select' | 'toggle';
    placeholder?: string;
    options?: string[];
    disabled?: boolean;
  }>;
}

interface Field {
  key: string;
  type: string;
  options?: string[];
  disabled?: boolean;
  placeholder?: string;
  label: string;
}

const AddMaterialPopup: React.FC<Props> = ({
  setCreateWorkOrderPopup,
  companyState,
  handleGetCompanyMaterials,
}) => {
  console.log(companyState);
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<FormData>({});
  const [selectedMaterialType, setSelectedMaterialType] = useState<string>('');

  // Material type options
  const materialTypes = [
    'Banding',
    'Board Stock',
    'Caster',
    'Connector',
    'Drawer Guide',
    'Hinge',
    'Hinge Plate',
    'Laminate',
    'Leg',
    'Leg Leveler',
    'Miscellaneous',
    'Molding',
    'Panel Stock',
    'Pull',
    'Rod',
    'Sliding Door Rail',
    'Sliding Door Roller',
    'Wire Basket',
  ];

  // Define popup sequences for each material type
  const getPopupSequence = (materialType: string): PopupStep[] => {
    const sequences: { [key: string]: PopupStep[] } = {
      Banding: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Banding Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'thickness',
              label: 'Thickness',
              type: 'number',
              placeholder: 'Enter thickness',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'finish',
              label: 'Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'finishType',
              label: 'Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'texture',
              label: 'Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      'Board Stock': [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Board Stock Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'thickness',
              label: 'Thickness',
              type: 'number',
              placeholder: 'Enter thickness (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'faceFinish',
              label: 'Face Finish',
              type: 'select',
              options: ['Laminated', 'Veneer', 'Raw'],
            },
            {
              key: 'backFinish',
              label: 'Back Finish',
              type: 'select',
              options: ['Laminated', 'Veneer', 'Raw'],
            },
            {
              key: 'edgeFinish',
              label: 'Edge Finish',
              type: 'select',
              options: ['Banded', 'Raw', 'Sealed'],
            },
            {
              key: 'endFinish',
              label: 'End Finish',
              type: 'select',
              options: ['Banded', 'Raw', 'Sealed'],
            },
          ],
        },
      ],
      Caster: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Caster Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'height',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'axleFinish',
              label: 'Axle Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'axleFinishType',
              label: 'Axle Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'axleTexture',
              label: 'Axle Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
            {
              key: 'pivotFinish',
              label: 'Pivot Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'pivotFinishType',
              label: 'Pivot Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'pivotTexture',
              label: 'Pivot Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
            {
              key: 'plateFinish',
              label: 'Plate Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'plateFinishType',
              label: 'Plate Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'plateTexture',
              label: 'Plate Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
            {
              key: 'wheelFinish',
              label: 'Wheel Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'wheelFinishType',
              label: 'Wheel Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'wheelTexture',
              label: 'Wheel Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      Connector: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Connector Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'connectorType',
              label: 'Type',
              type: 'select',
              options: ['Rafix', 'Other'],
            },
            {
              key: 'slotType',
              label: 'Slot Type',
              type: 'text',
              placeholder: 'Enter slot type',
              disabled: true,
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'connectorFinish',
              label: 'Connector Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'connectorFinishType',
              label: 'Connector Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'connectorTexture',
              label: 'Connector Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      'Drawer Guide': [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Drawer Guide Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'drawerType',
              label: 'Type',
              type: 'select',
              options: [
                'Full Extension',
                'Partial Extension',
                'Over Extension',
              ],
            },
            {
              key: 'length',
              label: 'Length',
              type: 'number',
              placeholder: 'Enter length (mm)',
            },
            {
              key: 'height',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            {
              key: 'clearances',
              label: 'Clearances',
              type: 'number',
              placeholder: 'Enter clearances (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Mount Holes',
          fields: [
            {
              key: 'holeDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'holeDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'topRef',
              label: 'Top Ref',
              type: 'number',
              placeholder: 'Enter top reference (mm)',
            },
            {
              key: 'screwCenter',
              label: 'Screw Center',
              type: 'number',
              placeholder: 'Enter screw center (mm)',
            },
            {
              key: 'position1',
              label: 'Position 1',
              type: 'number',
              placeholder: 'Enter position 1 (mm)',
            },
            {
              key: 'position2',
              label: 'Position 2',
              type: 'number',
              placeholder: 'Enter position 2 (mm)',
            },
          ],
        },
        {
          title: 'Front Mount Holes',
          fields: [
            {
              key: 'frontOffsets',
              label: 'Offsets',
              type: 'number',
              placeholder: 'Enter offsets (mm)',
            },
            {
              key: 'frontDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'frontDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'frontSpacing',
              label: 'Spacing',
              type: 'number',
              placeholder: 'Enter spacing (mm)',
            },
            {
              key: 'frontQty',
              label: 'Quantity',
              type: 'number',
              placeholder: 'Enter quantity',
            },
          ],
        },
        {
          title: 'Back Mount Holes',
          fields: [
            {
              key: 'backOffsets',
              label: 'Offsets',
              type: 'number',
              placeholder: 'Enter offsets (mm)',
            },
            {
              key: 'backDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'backDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'backSpacing',
              label: 'Spacing',
              type: 'number',
              placeholder: 'Enter spacing (mm)',
            },
            {
              key: 'backQty',
              label: 'Quantity',
              type: 'number',
              placeholder: 'Enter quantity',
            },
          ],
        },
        {
          title: 'Back Mount Notches',
          fields: [
            {
              key: 'notchLength',
              label: 'Length',
              type: 'number',
              placeholder: 'Enter length (mm)',
            },
            {
              key: 'notchHeight',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            {
              key: 'horizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter offset (mm)',
            },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'drawerMemberFinish',
              label: 'Drawer Member Finish',
              type: 'select',
              options: ['Zinc Plated', 'Black', 'White'],
            },
            {
              key: 'assemblyMemberFinish',
              label: 'Assembly Member Finish',
              type: 'select',
              options: ['Zinc Plated', 'Black', 'White'],
            },
          ],
        },
      ],
      Hinge: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Hinge Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'hingeType',
              label: 'Type',
              type: 'select',
              options: ['Concealed', 'Double Door', 'Overlay', 'Inset'],
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Hinge Cup (Concealed/Double Door)',
          fields: [
            {
              key: 'cupDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'cupDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
          ],
        },
        {
          title: 'Anchor Holes (Concealed/Double Door)',
          fields: [
            {
              key: 'cupToAnchor',
              label: 'Cup to Anchor',
              type: 'number',
              placeholder: 'Enter distance (mm)',
            },
            {
              key: 'anchorDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'anchorDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'anchorSpacing',
              label: 'Spacing',
              type: 'number',
              placeholder: 'Enter spacing (mm)',
            },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'hingeFinish',
              label: 'Hinge Finish',
              type: 'select',
              options: ['Nickel Plated', 'Black', 'Brass', 'Stainless Steel'],
            },
            {
              key: 'finishType',
              label: 'Finish Type',
              type: 'select',
              options: ['Matte', 'Polished', 'Brushed'],
            },
            {
              key: 'texture',
              label: 'Texture',
              type: 'select',
              options: ['Smooth', 'Textured'],
            },
          ],
        },
      ],
      'Hinge Plate': [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Hinge Plate Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'hingePlateType',
              label: 'Type',
              type: 'select',
              options: ['Frame', 'Inline', 'Panel'],
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Mounting Holes',
          fields: [
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'spacing',
              label: 'Spacing',
              type: 'number',
              placeholder: 'Enter spacing (mm)',
            },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'hingePlateFinish',
              label: 'Hinge Plate Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'hingePlateFinishType',
              label: 'Hinge Plate Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'hingePlateTexture',
              label: 'Hinge Plate Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      Laminate: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Laminate Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'length',
              label: 'Length',
              type: 'number',
              placeholder: 'Enter length (mm)',
            },
            {
              key: 'width',
              label: 'Width',
              type: 'number',
              placeholder: 'Enter width (mm)',
            },
            {
              key: 'thickness',
              label: 'Thickness',
              type: 'number',
              placeholder: 'Enter thickness (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'faceFinish',
              label: 'Face Finish',
              type: 'select',
              options: ['Laminated', 'Veneer', 'Raw'],
            },
            {
              key: 'faceFinishType',
              label: 'Face Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'faceTexture',
              label: 'Face Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      Leg: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Leg Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'legType',
              label: 'Type',
              type: 'select',
              options: ['Bun Foot', 'Pedestal', 'Tapered'],
            },
            {
              key: 'height',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            {
              key: 'width',
              label: 'Width',
              type: 'number',
              placeholder: 'Enter width (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'faceFinish',
              label: 'Face Finish',
              type: 'select',
              options: ['Laminated', 'Veneer', 'Raw'],
            },
            {
              key: 'faceFinishType',
              label: 'Face Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'faceTexture',
              label: 'Face Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      'Leg Leveler': [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Leg Leveler Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'height',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'faceFinish',
              label: 'Face Finish',
              type: 'select',
              options: ['Laminated', 'Veneer', 'Raw'],
            },
            {
              key: 'faceFinishType',
              label: 'Face Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'faceTexture',
              label: 'Face Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      Miscellaneous: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
      ],
      Molding: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Molding Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'height',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'faceFinish',
              label: 'Face Finish',
              type: 'select',
              options: ['Laminated', 'Veneer', 'Raw'],
            },
            {
              key: 'faceFinishType',
              label: 'Face Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'faceTexture',
              label: 'Face Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      'Panel Stock': [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Panel Stock Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'length',
              label: 'Length',
              type: 'number',
              placeholder: 'Enter length (mm)',
            },
            {
              key: 'thickness',
              label: 'Thickness',
              type: 'number',
              placeholder: 'Enter thickness (mm)',
            },
            {
              key: 'width',
              label: 'Width',
              type: 'number',
              placeholder: 'Enter width (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'faceFinish',
              label: 'Face Finish',
              type: 'select',
              options: ['Laminated', 'Veneer', 'Raw', 'Painted'],
            },
            {
              key: 'finishType',
              label: 'Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'texture',
              label: 'Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      Pull: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Pull Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'pullType',
              label: 'Type',
              type: 'select',
              options: ['Knob #1', 'Other'],
            },
            {
              key: 'centerToCenter',
              label: 'Center To Center',
              type: 'number',
              placeholder: 'Enter center to center (mm)',
            },
            {
              key: 'width',
              label: 'Width',
              type: 'number',
              placeholder: 'Enter width (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'horizontalInset',
              label: 'Horizontal Inset',
              type: 'number',
              placeholder: 'Enter horizontal inset (mm)',
            },
            {
              key: 'verticalInset',
              label: 'Vertical Inset',
              type: 'number',
              placeholder: 'Enter vertical inset (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Mounting Holes',
          fields: [
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'pullFinish',
              label: 'Pull Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'pullFinishType',
              label: 'Pull Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'pullTexture',
              label: 'Pull Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      Rod: [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Rod Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'rodType',
              label: 'Type',
              type: 'select',
              options: ['Round', 'Oval'],
            },
            {
              key: 'length',
              label: 'Length',
              type: 'number',
              placeholder: 'Enter length (mm)',
            },
            {
              key: 'height',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            {
              key: 'width',
              label: 'Width',
              type: 'number',
              placeholder: 'Enter width (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Boring',
          fields: [
            {
              key: 'pattern',
              label: 'Pattern',
              type: 'select',
              options: [
                'One',
                'Two Vertical',
                'Two Horizontal',
                'Three Holes',
                'Four Holes',
                'Multiple Vertical',
              ],
            },
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'spacing',
              label: 'Spacing',
              type: 'number',
              placeholder: 'Enter spacing (mm)',
            },
            {
              key: 'quantity',
              label: 'Quantity',
              type: 'number',
              placeholder: 'Enter quantity',
            },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'pullFinish',
              label: 'Pull Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'pullFinishType',
              label: 'Pull Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'pullTexture',
              label: 'Pull Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      'Sliding Door Rail': [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Sliding Door Rail Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'railType',
              label: 'Type',
              type: 'select',
              options: ['Rail', 'Slot'],
            },
            {
              key: 'length',
              label: 'Length',
              type: 'number',
              placeholder: 'Enter length (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Boring',
          fields: [
            {
              key: 'firstPosition',
              label: '1st Position',
              type: 'number',
              placeholder: 'Enter 1st position (mm)',
            },
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'spacing',
              label: 'Spacing',
              type: 'number',
              placeholder: 'Enter spacing (mm)',
            },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'pullFinish',
              label: 'Pull Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'pullFinishType',
              label: 'Pull Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'pullTexture',
              label: 'Pull Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      'Sliding Door Roller': [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Sliding Door Roller Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'rollerType',
              label: 'Type',
              type: 'select',
              options: ['Roller', 'Slot'],
            },
            {
              key: 'mountOnBack',
              label: 'Mount On Back',
              type: 'toggle',
            },
            {
              key: 'horizontalInset',
              label: 'Horizontal Inset',
              type: 'number',
              placeholder: 'Enter horizontal inset (mm)',
            },
            {
              key: 'verticalInset',
              label: 'Vertical Inset',
              type: 'number',
              placeholder: 'Enter vertical inset (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Mount Plate Hole 1',
          fields: [
            {
              key: 'horizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'verticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
          ],
        },
        {
          title: 'Mount Plate Hole 2',
          fields: [
            {
              key: 'horizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'verticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
          ],
        },
        {
          title: 'Mount Plate Hole 3',
          fields: [
            {
              key: 'horizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'verticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
          ],
        },
        {
          title: 'Mount Plate Hole 4',
          fields: [
            {
              key: 'horizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'verticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
          ],
        },
        {
          title: 'Mount Plate Hole 5',
          fields: [
            {
              key: 'horizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'verticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'pullFinish',
              label: 'Pull Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'pullFinishType',
              label: 'Pull Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'pullTexture',
              label: 'Pull Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
      'Wire Basket': [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
        {
          title: 'Wire Basket Specifications',
          fields: [
            {
              key: 'unitOfIssue',
              label: 'Unit of Issue',
              type: 'select',
              options: [
                'BD Ft',
                'BD M',
                'Cubic Ft',
                'Cubic M',
                'Each',
                'pair',
                'Per Ft',
                'Per M',
                'SQ Ft',
                'SQ M',
                'sheet',
              ],
            },
            {
              key: 'basketType',
              label: 'Type',
              type: 'select',
              options: ['Bottom', 'No', 'Side', 'Top Mount'],
            },
            {
              key: 'height',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            {
              key: 'width',
              label: 'Width',
              type: 'number',
              placeholder: 'Enter width (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'Mount Holes',
          fields: [
            {
              key: 'diameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'depth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'screwCenterToReference',
              label: 'Screw Center to Reference',
              type: 'number',
              placeholder: 'Enter screw center to reference (mm)',
            },
            {
              key: 'position1To6',
              label: 'Position 1 → Position6',
              type: 'text',
              placeholder: 'Enter positions (comma separated)',
            },
          ],
        },
        {
          title: 'Finish Details',
          fields: [
            {
              key: 'wireBasketFinish',
              label: 'Wire Basket Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'wireBasketFinishType',
              label: 'Wire Basket Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'wireBasketTexture',
              label: 'Wire Basket Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
            {
              key: 'basketMemberFinish',
              label: 'Basket Member Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'basketMemberFinishType',
              label: 'Basket Member Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'basketMemberTexture',
              label: 'Basket Member Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
            {
              key: 'assemblyMemberFinish',
              label: 'Assembly Member Finish',
              type: 'select',
              options: ['Matte', 'Gloss', 'Semi-Gloss'],
            },
            {
              key: 'assemblyMemberFinishType',
              label: 'Assembly Member Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'assemblyMemberTexture',
              label: 'Assembly Member Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
          ],
        },
      ],
    };

    return (
      sequences[materialType] || [
        {
          title: 'New Material',
          fields: [
            {
              key: 'type',
              label: 'Material Type',
              type: 'select',
              options: materialTypes,
            },
            {
              key: 'name',
              label: 'Name*',
              type: 'text',
              placeholder: 'Enter Name',
            },
            {
              key: 'description',
              label: 'Description',
              type: 'text',
              placeholder: 'Enter Description',
            },
          ],
        },
      ]
    );
  };

  const currentSequence = selectedMaterialType
    ? getPopupSequence(selectedMaterialType)
    : getPopupSequence('');
  const currentPopup = currentSequence[currentStep];
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === currentSequence.length - 1;

  const handleInputChange = (key: string, value: string | number | boolean) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));

    // Set material type when selected in first step
    if (key === 'type' && currentStep === 0) {
      setSelectedMaterialType(value as string);
    }
  };

  const handleNext = () => {
    if (currentStep < currentSequence.length - 1) {
      setCurrentStep((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  const handleFinish = async () => {
    const finalData = {
      name: formData.name || '',
      type: formData.type || selectedMaterialType,
      description: formData.description || '',
      properties: {
        unit_of_issue: formData.unitOfIssue || '',
        default_cost: formData.defaultCost || 0,
        sell_price: formData.sellPrice || 0,
        thickness: formData.thickness || 0,
        length_trim: formData.lengthTrim || 0,
        eslimate: formData.eslimate || false,
        default_tax_rate: formData.defaultTaxRate || 0,
        default_markup: formData.defaultMarkup || 0,
        waste: formData.waste || 0,
        sales_tax: formData.salesTax || false,
        // cnc_minimize_back_chip: formData.cncMinimizeBackChip || false,
        // cnc_feed_rate_percent: formData.cncFeedRatePercent || 0,
        // cnc_optimize: formData.cncOptimize || false,
        // maximum_spacing: formData.maximumSpacing || 0,
        // opening_angle: formData.openingAngle || 0,
        // inset: formData.inset || 0,
        // hinge_type: formData.hingeType || '',
        // vertical_overlay: formData.verticalOverlay || 0,
        // door_edge_to_reference_point: formData.doorEdgeToReferencePoint || 0,
        // horizontal_overlay: formData.horizontalOverlay || 0,
        // door_end_to_hinge: formData.doorEndToHinge || 0,
        // anchor_holes_cup_to_anchor: formData.anchorHolesCupToAnchor || 0,
        // roll_out_clearance: formData.rollOutClearance || 0,
        // cup_depth: formData.cupDepth || 0,
        // anchor_holes_depth: formData.anchorHolesDepth || 0,
        // cup_diameter: formData.cupDiameter || 0,
        // anchor_holes_spacing: formData.anchorHolesSpacing || 0,




        ...(formData.height && { height: formData.height }),
        ...(formData.drawerType && { drawer_type: formData.drawerType }),
      },
      finishes: [],
      finish_types: [],
      textures: [],
    };
    console.log('Final Data to submit:', finalData);
    const response = await commonService.post(
      'material',
      `company/${companyState}/material`,
      finalData,
    );

    if (response.status === 201 || response.status === 200) {
      setCreateWorkOrderPopup(false);
      handleGetCompanyMaterials(companyState);
    } else {
      console.error('Something went wrong');
    }
  };

  const renderField = (field: Field) => {
    const value = formData[field.key] ?? '';

    switch (field.type) {
      case 'select':
        return (
          <InputField
            label={field.label}
            type="select"
            value={value}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) =>
              handleInputChange(field.key, e.target.value)
            }
            options={
              field.options?.map((opt) => ({ value: opt, label: opt })) || []
            }
            disabled={field.disabled}
            borderColor={undefined}
            error={undefined}
          />
        );

      // case 'toggle':
      //   return (
      //     <label className={styles.toggleContainer}>
      //       {field.label}
      //       <input
      //         type="checkbox"
      //         checked={value as boolean}
      //         onChange={(e) => handleInputChange(field.key, e.target.checked)}
      //         disabled={field.disabled}
      //       />
      //       <span className={styles.toggleSlider}></span>
      //     </label>
      //   );

      case 'number':
        return (
          <InputField
            label={field.label}
            type="number"
            value={value}
            placeholder={field.placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange(
                field.key,
                e.target.value ? parseFloat(e.target.value) : '',
              )
            }
            disabled={field.disabled}
            borderColor={undefined}
            error={undefined}
          />
        );

      default:
        return (
          <InputField
            label={field.label}
            type="text"
            value={value}
            placeholder={field.placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange(field.key, e.target.value)
            }
            disabled={field.disabled}
            borderColor={undefined}
            error={undefined}
          />
        );
    }
  };

  return (
    <div className={styles.popupOverlay}>
      <div className={styles.popup}>
        {/* <div className={styles.popupLeft}>
                      <img src={createicon.src || "/placeholder.svg"} className={styles.illustration} alt="Material Creation" />
                  </div> */}

        <div className={styles.popupRight}>
          <div className={styles.popupHeader}>
            <div>
              <h2>{currentPopup?.title || 'New Material'}</h2>
              <p>
                Step {currentStep + 1} of {currentSequence.length}
              </p>
            </div>
            <button
              className={styles.closeButton}
              onClick={() => setCreateWorkOrderPopup(false)}
            >
              <img src={close.src || '/placeholder.svg'} alt="Close" />
            </button>
          </div>

          <div className={styles.formContainer}>
            <div className={styles.formTable}>
              {currentPopup?.fields.map((field) => (
                <div key={field.key} className={styles.formRow}>
                  <div className={styles.formInput}>{renderField(field)}</div>
                </div>
              ))}
            </div>
          </div>

          <div className={styles.buttonGroup}>
            <button
              className={styles.cancelButton}
              onClick={() => setCreateWorkOrderPopup(false)}
            >
              Cancel
            </button>

            <button
              className={styles.backButton}
              onClick={handleBack}
              disabled={isFirstStep}
            >
              Back
            </button>

            {!isLastStep ? (
              <button
                className={styles.nextButton}
                onClick={handleNext}
                disabled={!formData.name && currentStep === 0}
              >
                Next
              </button>
            ) : (
              <button className={styles.finishButton} onClick={handleFinish}>
                Finish
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AddMaterialPopup;
