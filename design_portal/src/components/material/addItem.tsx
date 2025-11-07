import InputField from '@/components/inputfields/InputField';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import type React from 'react';
import { useState } from 'react';
import styles from './materialWizard.module.css';
import { MaterialProperties, MaterialPropertiesInput } from './types';

type Props = {
  setCreateWorkOrderPopup: (value: boolean) => void;
  companyId: string;
  handleGetCompanyMaterials: (companyId: string) => void;
};

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
  key: keyof MaterialPropertiesInput | string;
  type: string;
  options?: string[];
  disabled?: boolean;
  placeholder?: string;
  label: string;
}

const AddMaterialPopup: React.FC<Props> = ({
  setCreateWorkOrderPopup,
  companyId,
  handleGetCompanyMaterials,
}) => {
  if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
    console.log(companyId);
  }
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState<MaterialPropertiesInput>({});
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

  const pricingStep: PopupStep = {
    title: 'Pricing Details',
    fields: [
      {
        key: 'defaultCost',
        label: 'Default Cost*',
        type: 'number',
        placeholder: 'Enter default cost',
      },
      {
        key: 'sellPrice',
        label: 'Sell Price*',
        type: 'number',
        placeholder: 'Enter sell price',
      },
      {
        key: 'defaultMarkup',
        label: 'Default Markup*',
        type: 'number',
        placeholder: 'Enter default markup',
      },
      {
        key: 'defaultTaxRate',
        label: 'Default Tax Rate*',
        type: 'number',
        placeholder: 'Enter default tax rate',
      },
      {
        key: 'waste',
        label: 'Waste*',
        type: 'number',
        placeholder: 'Enter waste',
      },
      { key: 'salesTax', label: 'Sales Tax', type: 'toggle' },
      { key: 'estimate', label: 'Estimate', type: 'toggle' },
    ],
  };

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
            {
              key: 'lengthTrim',
              label: 'Length Trim',
              type: 'number',
              placeholder: 'Enter length trim',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        pricingStep,
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
            {
              key: 'roughThickness',
              label: 'Rough Thickness',
              type: 'number',
              placeholder: 'Enter rough thickness (mm)',
            },
            {
              key: 'cncOptimize',
              label: 'CNC Optimize',
              type: 'toggle',
            },
            {
              key: 'cncGrainDependent',
              label: 'CNC Grain Dependent',
              type: 'toggle',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'CNC Settings',
          fields: [
            {
              key: 'cncDropWidth',
              label: 'CNC Drop Width',
              type: 'number',
              placeholder: 'Enter CNC drop width (mm)',
            },
            {
              key: 'cncDropLength',
              label: 'CNC Drop Length',
              type: 'number',
              placeholder: 'Enter CNC drop length (mm)',
            },
            {
              key: 'cncFeedRatePercent',
              label: 'CNC Feed Rate Percent',
              type: 'number',
              placeholder: 'Enter feed rate percent',
            },
            {
              key: 'cncSpindleSpeedPercent',
              label: 'CNC Spindle Speed Percent',
              type: 'number',
              placeholder: 'Enter spindle speed percent',
            },
            {
              key: 'cncMinimizeFaceChip',
              label: 'CNC Minimize Face Chip',
              type: 'toggle',
            },
            {
              key: 'cncMinimizeBackChip',
              label: 'CNC Minimize Back Chip',
              type: 'toggle',
            },
            {
              key: 'cncClimbCut',
              label: 'CNC Climb Cut',
              type: 'toggle',
            },
            {
              key: 'cncMaximumDepthPerPass',
              label: 'CNC Maximum Depth Per Pass',
              type: 'number',
              placeholder: 'Enter maximum depth per pass (mm)',
            },
          ],
        },
        pricingStep,
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
        pricingStep,
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
              key: 'connectorSlotType',
              label: 'Slot Type',
              type: 'text',
              placeholder: 'Enter slot type',
              disabled: true,
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        pricingStep,
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
              key: 'guideType',
              label: 'Type',
              type: 'select',
              options: ['Full Extension', 'Partial Extension', 'Over Extension'],
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
              key: 'extension',
              label: 'Extension',
              type: 'number',
              placeholder: 'Enter extension (mm)',
            },
            {
              key: 'sideClearance',
              label: 'Side Clearance',
              type: 'number',
              placeholder: 'Enter side clearance (mm)',
            },
            {
              key: 'topClearance',
              label: 'Top Clearance',
              type: 'number',
              placeholder: 'Enter top clearance (mm)',
            },
            {
              key: 'bottomClearance',
              label: 'Bottom Clearance',
              type: 'number',
              placeholder: 'Enter bottom clearance (mm)',
            },
            {
              key: 'minimumBelowBox',
              label: 'Minimum Below Box',
              type: 'number',
              placeholder: 'Enter minimum below box (mm)',
            },
            {
              key: 'minimumAboveBox',
              label: 'Minimum Above Box',
              type: 'number',
              placeholder: 'Enter minimum above box (mm)',
            },
            {
              key: 'screwCenterReferenceToTop',
              label: 'Screw Center Reference To Top',
              type: 'number',
              placeholder: 'Enter screw center reference to top (mm)',
            },
            {
              key: 'screwCenterToBoxReference',
              label: 'Screw Center To Box Reference',
              type: 'number',
              placeholder: 'Enter screw center to box reference (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        pricingStep,
        {
          title: 'Mount Holes',
          fields: [
            {
              key: 'mountHolesDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'mountHolesDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'mountHolesTopReference',
              label: 'Top Reference',
              type: 'number',
              placeholder: 'Enter top reference (mm)',
            },
            {
              key: 'mountHolesScrewCenterToReference',
              label: 'Screw Center To Reference',
              type: 'number',
              placeholder: 'Enter screw center to reference (mm)',
            },
            {
              key: 'mountHolesPosition1',
              label: 'Position 1',
              type: 'number',
              placeholder: 'Enter position 1 (mm)',
            },
            {
              key: 'mountHolesPosition2',
              label: 'Position 2',
              type: 'number',
              placeholder: 'Enter position 2 (mm)',
            },
            {
              key: 'mountHolesPosition3',
              label: 'Position 3',
              type: 'number',
              placeholder: 'Enter position 3 (mm)',
            },
            {
              key: 'mountHolesPosition4',
              label: 'Position 4',
              type: 'number',
              placeholder: 'Enter position 4 (mm)',
            },
            {
              key: 'mountHolesPosition5',
              label: 'Position 5',
              type: 'number',
              placeholder: 'Enter position 5 (mm)',
            },
            {
              key: 'mountHolesPosition6',
              label: 'Position 6',
              type: 'number',
              placeholder: 'Enter position 6 (mm)',
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
          title: 'Bottom Mount Holes',
          fields: [
            {
              key: 'bottomOffsets',
              label: 'Offsets',
              type: 'number',
              placeholder: 'Enter offsets (mm)',
            },
            {
              key: 'bottomDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'bottomDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'bottomSpacing',
              label: 'Spacing',
              type: 'number',
              placeholder: 'Enter spacing (mm)',
            },
            {
              key: 'bottomQty',
              label: 'Quantity',
              type: 'number',
              placeholder: 'Enter quantity',
            },
            {
              key: 'bottomMountHolesFirstPosition',
              label: 'First Position',
              type: 'number',
              placeholder: 'Enter first position (mm)',
            },
          ],
        },
        {
          title: 'Bottom Mount Grooves',
          fields: [
            {
              key: 'bottomMountGroovesHorizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'bottomMountGroovesWidth',
              label: 'Width',
              type: 'number',
              placeholder: 'Enter width (mm)',
            },
            {
              key: 'bottomMountGroovesDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
          ],
        },
        {
          title: 'Back Notch',
          fields: [
            {
              key: 'backNotchLength',
              label: 'Length',
              type: 'number',
              placeholder: 'Enter length (mm)',
            },
            {
              key: 'backNotchHeight',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            {
              key: 'backNotchOffset',
              label: 'Offset',
              type: 'number',
              placeholder: 'Enter offset (mm)',
            },
          ],
        },
        {
          title: 'Back Mount Notches',
          fields: [
            {
              key: 'backMountNotchesLength',
              label: 'Length',
              type: 'number',
              placeholder: 'Enter length (mm)',
            },
            {
              key: 'backMountNotchesHeight',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
            },
            {
              key: 'backMountNotchesHorizontalOffset',
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
              key: 'drawerMemberFinishType',
              label: 'Drawer Member Finish Type',
              type: 'select',
              options: ['Wood Grain', 'Solid Color', 'Textured'],
            },
            {
              key: 'drawerMemberTexture',
              label: 'Drawer Member Texture',
              type: 'select',
              options: ['Smooth', 'Embossed', 'Brushed'],
            },
            {
              key: 'assemblyMemberFinish',
              label: 'Assembly Member Finish',
              type: 'select',
              options: ['Zinc Plated', 'Black', 'White'],
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
        pricingStep,
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
              key: 'anchorHolesCupToAnchor',
              label: 'Cup to Anchor',
              type: 'number',
              placeholder: 'Enter distance (mm)',
            },
            {
              key: 'anchorHolesDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'anchorHolesDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'anchorHolesSpacing',
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
        pricingStep,
        {
          title: 'Mounting Holes',
          fields: [
            {
              key: 'hingeDiameter',
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
              key: 'holeOffset',
              label: 'Hole Offset',
              type: 'number',
              placeholder: 'Enter hole offset (mm)',
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
            {
              key: 'oversize',
              label: 'Oversize',
              type: 'number',
              placeholder: 'Enter oversize',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        {
          title: 'CNC Settings',
          fields: [
            {
              key: 'cncOptimize',
              label: 'CNC Optimize',
              type: 'toggle',
            },
            {
              key: 'cncGrainDependent',
              label: 'CNC Grain Dependent',
              type: 'toggle',
            },
            {
              key: 'cncDropWidth',
              label: 'CNC Drop Width',
              type: 'number',
              placeholder: 'Enter CNC drop width (mm)',
            },
            {
              key: 'cncDropLength',
              label: 'CNC Drop Length',
              type: 'number',
              placeholder: 'Enter CNC drop length (mm)',
            },
            {
              key: 'cncFeedRatePercent',
              label: 'CNC Feed Rate Percent',
              type: 'number',
              placeholder: 'Enter feed rate percent',
            },
            {
              key: 'cncSpindleSpeedPercent',
              label: 'CNC Spindle Speed Percent',
              type: 'number',
              placeholder: 'Enter spindle speed percent',
            },
            {
              key: 'cncMinimizeFaceChip',
              label: 'CNC Minimize Face Chip',
              type: 'toggle',
            },
            {
              key: 'cncMinimizeBackChip',
              label: 'CNC Minimize Back Chip',
              type: 'toggle',
            },
            {
              key: 'cncClimbCut',
              label: 'CNC Climb Cut',
              type: 'toggle',
            },
            {
              key: 'cncMaximumDepthPerPass',
              label: 'CNC Maximum Depth Per Pass',
              type: 'number',
              placeholder: 'Enter maximum depth per pass (mm)',
            },
          ],
        },
        pricingStep,
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
        pricingStep,
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
        pricingStep,
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
            {
              key: 'model',
              label: 'Model',
              type: 'text',
              placeholder: 'Enter model',
            },
          ],
        },
        pricingStep,
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
              key: 'moldingType',
              label: 'Molding Type',
              type: 'text',
              placeholder: 'Enter molding type',
            },
            {
              key: 'height',
              label: 'Height',
              type: 'number',
              placeholder: 'Enter height (mm)',
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
        pricingStep,
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
          title: 'CNC Settings',
          fields: [
            {
              key: 'cncOptimize',
              label: 'CNC Optimize',
              type: 'toggle',
            },
            {
              key: 'cncGrainDependent',
              label: 'CNC Grain Dependent',
              type: 'toggle',
            },
            {
              key: 'cncDropWidth',
              label: 'CNC Drop Width',
              type: 'number',
              placeholder: 'Enter CNC drop width (mm)',
            },
            {
              key: 'cncDropLength',
              label: 'CNC Drop Length',
              type: 'number',
              placeholder: 'Enter CNC drop length (mm)',
            },
            {
              key: 'cncFeedRatePercent',
              label: 'CNC Feed Rate Percent',
              type: 'number',
              placeholder: 'Enter feed rate percent',
            },
            {
              key: 'cncSpindleSpeedPercent',
              label: 'CNC Spindle Speed Percent',
              type: 'number',
              placeholder: 'Enter spindle speed percent',
            },
            {
              key: 'cncMinimizeFaceChip',
              label: 'CNC Minimize Face Chip',
              type: 'toggle',
            },
            {
              key: 'cncMinimizeBackChip',
              label: 'CNC Minimize Back Chip',
              type: 'toggle',
            },
            {
              key: 'cncClimbCut',
              label: 'CNC Climb Cut',
              type: 'toggle',
            },
            {
              key: 'cncMaximumDepthPerPass',
              label: 'CNC Maximum Depth Per Pass',
              type: 'number',
              placeholder: 'Enter maximum depth per pass (mm)',
            },
          ],
        },
        pricingStep,
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
        pricingStep,
        {
          title: 'Mounting Holes',
          fields: [
            {
              key: 'mountingHolesHolesDiameter',
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
        pricingStep,
        {
          title: 'Boring',
          fields: [
            {
              key: 'boringPattern',
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
              key: 'boringDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'boringDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'boringSpacing',
              label: 'Spacing',
              type: 'number',
              placeholder: 'Enter spacing (mm)',
            },
            {
              key: 'boringQuantity',
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
              key: 'slidingDoorRailType',
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
        pricingStep,
        {
          title: 'Boring',
          fields: [
            {
              key: 'boringFirstPosition',
              label: '1st Position',
              type: 'number',
              placeholder: 'Enter 1st position (mm)',
            },
            {
              key: 'railBoringDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'boringDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'boringSpacing',
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
              key: 'slidingDoorRollerType',
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
              key: 'doorEdgeInset',
              label: 'Door Edge Inset',
              type: 'number',
              placeholder: 'Enter door edge inset (mm)',
            },
            {
              key: 'doorEndInset',
              label: 'Door End Inset',
              type: 'number',
              placeholder: 'Enter door end inset (mm)',
            },
            {
              key: 'dadoReference',
              label: 'Dado Reference',
              type: 'number',
              placeholder: 'Enter dado reference (mm)',
            },
            {
              key: 'dadoOffset',
              label: 'Dado Offset',
              type: 'number',
              placeholder: 'Enter dado offset (mm)',
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
        pricingStep,
        {
          title: 'Mount Plate Hole 1',
          fields: [
            {
              key: 'mountPlateHoleOneHorizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'mountPlateHoleOneVerticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'mountPlateHoleOneDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'mountPlateHoleOneDepth',
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
              key: 'mountPlateHoleTwoHorizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'mountPlateHoleTwoVerticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'mountPlateHoleTwoDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'mountPlateHoleTwoDepth',
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
              key: 'mountPlateHoleThirdHorizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'mountPlateHoleThirdVerticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'mountPlateHoleThirdDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'mountPlateHoleThirdDepth',
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
              key: 'mountPlateHoleForthHorizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'mountPlateHoleForthVerticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'mountPlateHoleForthDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'mountPlateHoleForthDepth',
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
              key: 'mountPlateHoleFifthHorizontalOffset',
              label: 'Horizontal Offset',
              type: 'number',
              placeholder: 'Enter horizontal offset (mm)',
            },
            {
              key: 'mountPlateHoleFifthVerticalOffset',
              label: 'Vertical Offset',
              type: 'number',
              placeholder: 'Enter vertical offset (mm)',
            },
            {
              key: 'mountPlateHoleFifthDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'mountPlateHoleFifthDepth',
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
              key: 'wireBasketType',
              label: 'Type',
              type: 'select',
              options: ['Top Mount', 'Bottom Mount', 'Side Mount', 'No Mount'],
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
            {
              key: 'basketDiameter',
              label: 'Basket Diameter',
              type: 'number',
              placeholder: 'Enter basket diameter (mm)',
            },
            { key: 'unitToggle', label: 'Unit Toggle', type: 'toggle' },
          ],
        },
        pricingStep,
        {
          title: 'Mount Holes',
          fields: [
            {
              key: 'mountHolesDiameter',
              label: 'Diameter',
              type: 'number',
              placeholder: 'Enter diameter (mm)',
            },
            {
              key: 'mountHolesDepth',
              label: 'Depth',
              type: 'number',
              placeholder: 'Enter depth (mm)',
            },
            {
              key: 'mountHolesScrewCenterToReference',
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

    const sequence = sequences[materialType] || [
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
      pricingStep,
    ];

    return sequence;
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
    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log(formData, 'formdata');
    }
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
    // Base properties that are common to all material types
    const baseProperties = {
      unit_of_issue: formData.unitOfIssue || '',
      default_cost: formData.defaultCost || 0,
      sell_price: formData.sellPrice || 0,
      default_markup: formData.defaultMarkup || 0,
      sales_tax: formData.salesTax || false,
      default_tax_rate: formData.defaultTaxRate || 0,
      waste: formData.waste || 0,
      estimate: formData.estimate || false,
    };

    // Material type specific properties
    const materialSpecificProperties: MaterialProperties = {};

    // Banding specific properties
    if (selectedMaterialType === 'Banding') {
      materialSpecificProperties.thickness = formData.thickness || 0;
      materialSpecificProperties.length_trim = formData.lengthTrim || 0;
    }

    // Board Stock specific properties
    if (selectedMaterialType === 'Board Stock') {
      materialSpecificProperties.thickness = formData.thickness || 0;
      materialSpecificProperties.rough_thickness = formData.roughThickness || 0;
      materialSpecificProperties.cnc_optimize = formData.cncOptimize || false;
      materialSpecificProperties.cnc_grain_dependent = formData.cncGrainDependent || false;
      materialSpecificProperties.cnc_drop_width = formData.cncDropWidth || 0;
      materialSpecificProperties.cnc_drop_length = formData.cncDropLength || 0;
      materialSpecificProperties.cnc_feed_rate_percent = formData.cncFeedRatePercent || 0;
      materialSpecificProperties.cnc_spindle_speed_percent = formData.cncSpindleSpeedPercent || 0;
      materialSpecificProperties.cnc_minimize_face_chip = formData.cncMinimizeFaceChip || false;
      materialSpecificProperties.cnc_minimize_back_chip = formData.cncMinimizeBackChip || false;
      materialSpecificProperties.cnc_climb_cut = formData.cncClimbCut || false;
      materialSpecificProperties.cnc_maximum_depth_per_pass = formData.cncMaximumDepthPerPass || 0;
    }

    // Caster specific properties
    if (selectedMaterialType === 'Caster') {
      materialSpecificProperties.height = formData.height || 0;
    }

    // Connector specific properties
    if (selectedMaterialType === 'Connector') {
      materialSpecificProperties.connector_type = formData.connectorType || '';
      materialSpecificProperties.connector_slot_type = formData.connectorSlotType || '';
    }

    // Drawer Guide specific properties
    if (selectedMaterialType === 'Drawer Guide') {
      materialSpecificProperties.side_clearance = formData.sideClearance || 0;
      materialSpecificProperties.top_clearance = formData.topClearance || 0;
      materialSpecificProperties.bottom_clearance = formData.bottomClearance || 0;
      materialSpecificProperties.minimum_below_box = formData.minimumBelowBox || 0;
      materialSpecificProperties.minimum_above_box = formData.minimumAboveBox || 0;
      materialSpecificProperties.guide_type = formData.guideType || '';
      materialSpecificProperties.height = formData.height || 0;
      materialSpecificProperties.length = formData.length || 0;
      materialSpecificProperties.extension = formData.extension || 0;
      materialSpecificProperties.screw_center_reference_to_top =
        formData.screwCenterReferenceToTop || 0;
      materialSpecificProperties.screw_center_to_box_reference =
        formData.screwCenterToBoxReference || 0;
      materialSpecificProperties.back_notch_length = formData.backNotchLength || 0;
      materialSpecificProperties.back_notch_height = formData.backNotchHeight || 0;
      materialSpecificProperties.back_notch_offset = formData.backNotchOffset || 0;
      materialSpecificProperties.mount_holes_diameter = formData.mountHolesDiameter || 0;
      materialSpecificProperties.mount_holes_depth = formData.mountHolesDepth || 0;
      materialSpecificProperties.mount_holes_top_reference = formData.mountHolesTopReference || 0;
      materialSpecificProperties.mount_holes_screw_center_to_reference =
        formData.mountHolesScrewCenterToReference || 0;
      materialSpecificProperties.mount_holes_position_1 = formData.mountHolesPosition1 || 0;
      materialSpecificProperties.mount_holes_position_2 = formData.mountHolesPosition2 || 0;
      materialSpecificProperties.mount_holes_position_3 = formData.mountHolesPosition3 || 0;
      materialSpecificProperties.mount_holes_position_4 = formData.mountHolesPosition4 || 0;
      materialSpecificProperties.mount_holes_position_5 = formData.mountHolesPosition5 || 0;
      materialSpecificProperties.mount_holes_position_6 = formData.mountHolesPosition6 || 0;
      materialSpecificProperties.front_mount_holes = [
        {
          offsets: formData.frontOffsets || 0,
          diameter: formData.frontDiameter || 0,
          depth: formData.frontDepth || 0,
          spacing: formData.frontSpacing || 0,
          quantity: formData.frontQty || 0,
        },
      ];
      materialSpecificProperties.back_mount_holes = [
        {
          offsets: formData.backOffsets || 0,
          diameter: formData.backDiameter || 0,
          depth: formData.backDepth || 0,
          spacing: formData.backSpacing || 0,
          quantity: formData.backQty || 0,
        },
      ];
      materialSpecificProperties.bottom_mount_holes = [
        {
          offsets: formData.bottomOffsets || 0,
          diameter: formData.bottomDiameter || 0,
          depth: formData.bottomDepth || 0,
          spacing: formData.bottomSpacing || 0,
          quantity: formData.bottomQty || 0,
        },
      ];
      materialSpecificProperties.back_mount_notches_length = formData.backMountNotchesLength || 0;
      materialSpecificProperties.back_mount_notches_height = formData.backMountNotchesHeight || 0;
      materialSpecificProperties.back_mount_notches_horizontal_offset =
        formData.backMountNotchesHorizontalOffset || 0;
      materialSpecificProperties.bottom_mount_holes_first_position =
        formData.bottomMountHolesFirstPosition || 0;
      materialSpecificProperties.bottom_mount_grooves_horizontal_offset =
        formData.bottomMountGroovesHorizontalOffset || 0;
      materialSpecificProperties.bottom_mount_grooves_width = formData.bottomMountGroovesWidth || 0;
      materialSpecificProperties.bottom_mount_grooves_depth = formData.bottomMountGroovesDepth || 0;
    }

    // Hinge specific properties
    if (selectedMaterialType === 'Hinge') {
      materialSpecificProperties.hinge_type = formData.hingeType || '';
      materialSpecificProperties.horizontal_overlay = formData.horizontalOverlay || 0;
      materialSpecificProperties.vertical_overlay = formData.verticalOverlay || 0;
      materialSpecificProperties.door_end_to_hinge = formData.doorEndToHinge || 0;
      materialSpecificProperties.inset = formData.inset || 0;
      materialSpecificProperties.maximum_spacing = formData.maximumSpacing || 0;
      materialSpecificProperties.opening_angle = formData.openingAngle || 0;
      materialSpecificProperties.door_edge_to_reference_point =
        formData.doorEdgeToReferencePoint || 0;
      materialSpecificProperties.roll_out_clearance = formData.rollOutClearance || 0;
      materialSpecificProperties.cup_diameter = formData.cupDiameter || 0;
      materialSpecificProperties.cup_depth = formData.cupDepth || 0;
      materialSpecificProperties.anchor_holes_cup_to_anchor = formData.anchorHolesCupToAnchor || 0;
      materialSpecificProperties.anchor_holes_diameter = formData.anchorHolesDiameter || 0;
      materialSpecificProperties.anchor_holes_depth = formData.anchorHolesDepth || 0;
      materialSpecificProperties.anchor_holes_spacing = formData.anchorHolesSpacing || 0;
    }

    // Hinge Plate specific properties
    if (selectedMaterialType === 'Hinge Plate') {
      materialSpecificProperties.hinge_plate_type = formData.hingePlateType || '';
      materialSpecificProperties.hole_offset = formData.holeOffset || 0;
      materialSpecificProperties.hinge_diameter = formData.hingeDiameter || 0;
      materialSpecificProperties.depth = formData.depth || 0;
      materialSpecificProperties.spacing = formData.spacing || 0;
    }

    // Laminate specific properties
    if (selectedMaterialType === 'Laminate') {
      materialSpecificProperties.oversize = formData.oversize || 0;
      materialSpecificProperties.cnc_optimize = formData.cncOptimize || false;
      materialSpecificProperties.cnc_grain_dependent = formData.cncGrainDependent || false;
      materialSpecificProperties.cnc_drop_width = formData.cncDropWidth || 0;
      materialSpecificProperties.cnc_drop_length = formData.cncDropLength || 0;
      materialSpecificProperties.cnc_feed_rate_percent = formData.cncFeedRatePercent || 0;
      materialSpecificProperties.cnc_spindle_speed_percent = formData.cncSpindleSpeedPercent || 0;
      materialSpecificProperties.cnc_minimize_face_chip = formData.cncMinimizeFaceChip || false;
      materialSpecificProperties.cnc_minimize_back_chip = formData.cncMinimizeBackChip || false;
      materialSpecificProperties.cnc_climb_cut = formData.cncClimbCut || false;
      materialSpecificProperties.cnc_maximum_depth_per_pass = formData.cncMaximumDepthPerPass || 0;
    }

    // Leg specific properties
    if (selectedMaterialType === 'Leg') {
      materialSpecificProperties.leg_type = formData.legType || '';
      materialSpecificProperties.height = formData.height || 0;
    }

    // Leg Leveler specific properties
    if (selectedMaterialType === 'Leg Leveler') {
      materialSpecificProperties.height = formData.height || 0;
    }

    // Miscellaneous specific properties
    if (selectedMaterialType === 'Miscellaneous') {
      materialSpecificProperties.model = formData.model || '';
    }

    // Molding specific properties
    if (selectedMaterialType === 'Molding') {
      materialSpecificProperties.molding_type = formData.moldingType || '';
      materialSpecificProperties.length = formData.length || 0;
    }

    // Panel Stock specific properties
    if (selectedMaterialType === 'Panel Stock') {
      materialSpecificProperties.width = formData.width || 0;
      materialSpecificProperties.length = formData.length || 0;
      materialSpecificProperties.thickness = formData.thickness || 0;
      materialSpecificProperties.cnc_optimize = formData.cncOptimize || false;
      materialSpecificProperties.cnc_grain_dependent = formData.cncGrainDependent || false;
      materialSpecificProperties.cnc_drop_width = formData.cncDropWidth || 0;
      materialSpecificProperties.cnc_drop_length = formData.cncDropLength || 0;
      materialSpecificProperties.cnc_feed_rate_percent = formData.cncFeedRatePercent || 0;
      materialSpecificProperties.cnc_spindle_speed_percent = formData.cncSpindleSpeedPercent || 0;
      materialSpecificProperties.cnc_minimize_face_chip = formData.cncMinimizeFaceChip || false;
      materialSpecificProperties.cnc_minimize_back_chip = formData.cncMinimizeBackChip || false;
      materialSpecificProperties.cnc_climb_cut = formData.cncClimbCut || false;
      materialSpecificProperties.cnc_maximum_depth_per_pass = formData.cncMaximumDepthPerPass || 0;
    }

    // Pull specific properties
    if (selectedMaterialType === 'Pull') {
      materialSpecificProperties.pull_type = formData.pullType || '';
      materialSpecificProperties.center_to_center = formData.centerToCenter || 0;
      materialSpecificProperties.width = formData.width || 0;
      materialSpecificProperties.depth = formData.depth || 0;
      materialSpecificProperties.horizontal_inset = formData.horizontalInset || 0;
      materialSpecificProperties.vertical_inset = formData.verticalInset || 0;
      materialSpecificProperties.mounting_holes_holes_diameter =
        formData.mountingHolesHolesDiameter || 0;
    }

    // Rod specific properties
    if (selectedMaterialType === 'Rod') {
      materialSpecificProperties.rod_type = formData.rodType || '';
      materialSpecificProperties.width = formData.width || 0;
      materialSpecificProperties.length = formData.length || 0;
      materialSpecificProperties.height = formData.height || 0;
      materialSpecificProperties.boring_pattern = formData.boringPattern || '';
      materialSpecificProperties.boring_diameter = formData.boringDiameter || 0;
      materialSpecificProperties.boring_spacing = formData.boringSpacing || 0;
      materialSpecificProperties.boring_quantity = formData.boringQuantity || 0;
      materialSpecificProperties.boring_depth = formData.boringDepth || 0;
    }

    // Sliding Door Rail specific properties
    if (selectedMaterialType === 'Sliding Door Rail') {
      materialSpecificProperties.sliding_door_rail_type = formData.slidingDoorRailType || '';
      materialSpecificProperties.length = formData.length || 0;
      materialSpecificProperties.boring_first_position = formData.boringFirstPosition || 0;
      materialSpecificProperties.rail_boring_diameter = formData.railBoringDiameter || 0;
      materialSpecificProperties.boring_depth = formData.boringDepth || 0;
      materialSpecificProperties.boring_spacing = formData.boringSpacing || 0;
    }

    // Sliding Door Roller specific properties
    if (selectedMaterialType === 'Sliding Door Roller') {
      materialSpecificProperties.sliding_door_roller_type = formData.slidingDoorRollerType || '';
      materialSpecificProperties.mount_on_back = formData.mountOnBack || false;
      materialSpecificProperties.horizontal_offset = formData.horizontalInset || 0;
      materialSpecificProperties.vertical_offset = formData.verticalInset || 0;
      materialSpecificProperties.door_edge_inset = formData.doorEdgeInset || 0;
      materialSpecificProperties.door_end_inset = formData.doorEndInset || 0;
      materialSpecificProperties.dado_reference = formData.dadoReference || 0;
      materialSpecificProperties.dado_offset = formData.dadoOffset || 0;
      materialSpecificProperties.mount_plate_hole_one = [
        {
          horizontal_offset: formData.mountPlateHoleOneHorizontalOffset || 0,
          vertical_offset: formData.mountPlateHoleOneVerticalOffset || 0,
          diameter: formData.mountPlateHoleOneDiameter || 0,
          depth: formData.mountPlateHoleOneDepth || 0,
        },
      ];
      materialSpecificProperties.mount_plate_hole_two = [
        {
          horizontal_offset: formData.mountPlateHoleTwoHorizontalOffset || 0,
          vertical_offset: formData.mountPlateHoleTwoVerticalOffset || 0,
          diameter: formData.mountPlateHoleTwoDiameter || 0,
          depth: formData.mountPlateHoleTwoDepth || 0,
        },
      ];
      materialSpecificProperties.mount_plate_hole_third = [
        {
          horizontal_offset: formData.mountPlateHoleThirdHorizontalOffset || 0,
          vertical_offset: formData.mountPlateHoleThirdVerticalOffset || 0,
          diameter: formData.mountPlateHoleThirdDiameter || 0,
          depth: formData.mountPlateHoleThirdDepth || 0,
        },
      ];
      materialSpecificProperties.mount_plate_hole_forth = [
        {
          horizontal_offset: formData.mountPlateHoleForthHorizontalOffset || 0,
          vertical_offset: formData.mountPlateHoleForthVerticalOffset || 0,
          diameter: formData.mountPlateHoleForthDiameter || 0,
          depth: formData.mountPlateHoleForthDepth || 0,
        },
      ];
      materialSpecificProperties.mount_plate_hole_fifth = [
        {
          horizontal_offset: formData.mountPlateHoleFifthHorizontalOffset || 0,
          vertical_offset: formData.mountPlateHoleFifthVerticalOffset || 0,
          diameter: formData.mountPlateHoleFifthDiameter || 0,
          depth: formData.mountPlateHoleFifthDepth || 0,
        },
      ];
    }

    // Wire Basket specific properties
    if (selectedMaterialType === 'Wire Basket') {
      materialSpecificProperties.wire_basket_type = formData.wireBasketType || '';
      materialSpecificProperties.basket_diameter = formData.basketDiameter || 0;
      materialSpecificProperties.screw_center_to_reference = formData.screwCenterToReference || 0;
      materialSpecificProperties.depth = formData.depth || 0;
      materialSpecificProperties.width = formData.width || 0;
      materialSpecificProperties.height = formData.height || 0;
      materialSpecificProperties.mount_holes_diameter = formData.mountHolesDiameter || 0;
      materialSpecificProperties.mount_holes_depth = formData.mountHolesDepth || 0;
      materialSpecificProperties.mount_holes_screw_center_to_reference =
        formData.mountHolesScrewCenterToReference || 0;
    }

    // Prepare finish data based on material type
    const prepareFinishes = () => {
      const finishes: [] = [];
      const finish_types: [] = [];
      const textures: [] = [];

      return { finishes, finish_types, textures };
    };

    const { finishes, finish_types, textures } = prepareFinishes();

    const finalData = {
      name: formData.name || '',
      type: formData.type || selectedMaterialType,
      description: formData.description || '',
      company: companyId,
      properties: {
        ...baseProperties,
        ...materialSpecificProperties,
      },
      finishes,
      finish_types,
      textures,
    };

    if (process.env.NEXT_PUBLIC_DEBUG === 'true') {
      console.log('Final Data to submit:', finalData);
    }

    try {
      const response = await commonService.post(
        'material',
        `company/${companyId}/material`,
        finalData
      );

      if (response.status === 201 || response.status === 200) {
        setCreateWorkOrderPopup(false);
        handleGetCompanyMaterials(companyId);
      } else {
        console.error('Something went wrong');
      }
    } catch (error) {
      console.error('Error creating material:', error);
    }
  };

  const renderField = (field: Field) => {
    const value = formData[field.key as keyof MaterialPropertiesInput] ?? '';

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
            options={field.options?.map((opt) => ({ value: opt, label: opt })) || []}
            disabled={field.disabled}
            borderColor={undefined}
            error={undefined}
          />
        );

      case 'toggle':
        return (
          <label className={styles.toggleContainer}>
            {field.label}
            <input
              type="checkbox"
              checked={value as boolean}
              onChange={(e) => handleInputChange(field.key, e.target.checked)}
              disabled={field.disabled}
            />
            <span className={styles.toggleSlider}></span>
          </label>
        );

      case 'number':
        return (
          <InputField
            label={field.label}
            type="number"
            value={value}
            placeholder={field.placeholder}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
              handleInputChange(field.key, e.target.value ? parseFloat(e.target.value) : '')
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
        <div className={styles.popupRight}>
          <div className={styles.popupHeader}>
            <div>
              <h2>{currentPopup?.title || 'New Material'}</h2>
              <p>
                Step {currentStep + 1} of {currentSequence.length}
              </p>
            </div>
            <button className={styles.closeButton} onClick={() => setCreateWorkOrderPopup(false)}>
              <img src={assets.close || '/placeholder.svg'} alt="Close" />
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
            <button className={styles.cancelButton} onClick={() => setCreateWorkOrderPopup(false)}>
              Cancel
            </button>

            <button className={styles.backButton} onClick={handleBack} disabled={isFirstStep}>
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
