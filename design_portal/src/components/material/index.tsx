// import styles from '../material/material.module.css';
// import Sidebar from '@/components/sidebar/sidebar';
// import Header from '@/components/header/header';
// import banding from '@/assets/material/banding.svg';

// const Material = () => {

//   const MaterialThings = [
//     {
//       name: "Banding",
//       image: banding,
//     },
//     {
//       name: "Board Stock",
//       image: banding,
//     },
//     {
//       name: "Caster",
//       image: banding,
//     },
//     {
//       name: "Connector",
//       image: banding,
//     },
//     {
//       name: "Drawer Guide",
//       image: banding,
//     },
//     {
//       name: "Hinge",
//       image: banding,
//     },
//     {
//       name: "Hinge Palte",
//       image: banding,
//     },
//     {
//       name: "Lag leveler",
//       image: banding,
//     },
//   ]



//   return (

//     <div className={styles.container}>
//       <Sidebar />
//       <div className={styles.rightside}>
//         <Header isBorderRadius={true} dashboardName="Material" />

//         <div className={styles.maincontainer}>
//           <div className={styles.materialleftside}>

//           </div>


//           <div className={styles.materialrightside}>

//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default Material;


"use client"

import { useState } from "react"
import styles from "./material.module.css"
import Sidebar from "@/components/sidebar/sidebar"
import Header from "@/components/header/header"


interface MaterialItem {
  id: string
  name: string
  icon: string
  subItems?: MaterialItem[]
}

const Material = () => {
  const [expandedCategories, setExpandedCategories] = useState<string[]>(["hinge"])
  const [selectedItem, setSelectedItem] = useState<string>("hettich-soft-close")

  const MaterialThings: MaterialItem[] = [
    {
      id: "banding",
      name: "Banding",
      icon: "🏷️",
      subItems: [
        {
          id: "3m-banding",
          name: "3M",
          icon: "📦",
          subItems: [
            {
              id: "3m-wood-grain",
              name: "Wood Grain",
              icon: "🌳",
              subItems: [
                { id: "3m-oak", name: "Oak", icon: "🟤" },
                { id: "3m-maple", name: "Maple", icon: "🟡" },
                { id: "3m-walnut", name: "Walnut", icon: "🤎" },
              ],
            },
            {
              id: "3m-solid-colors",
              name: "Solid Colors",
              icon: "🎨",
              subItems: [
                { id: "3m-white", name: "White", icon: "⚪" },
                { id: "3m-black", name: "Black", icon: "⚫" },
                { id: "3m-gray", name: "Gray", icon: "🔘" },
              ],
            },
          ],
        },
        {
          id: "rehau-banding",
          name: "Rehau",
          icon: "📦",
          subItems: [
            { id: "rehau-premium", name: "Premium Series", icon: "⭐" },
            { id: "rehau-standard", name: "Standard Series", icon: "📋" },
          ],
        },
        {
          id: "egger-banding",
          name: "Egger",
          icon: "📦",
          subItems: [
            { id: "egger-abs", name: "ABS Edge", icon: "🔲" },
            { id: "egger-pvc", name: "PVC Edge", icon: "🔳" },
          ],
        },
      ],
    },
    {
      id: "board-stock",
      name: "Board Stock",
      icon: "📋",
      subItems: [
        {
          id: "mdf-boards",
          name: "MDF",
          icon: "📄",
          subItems: [
            { id: "mdf-standard", name: "Standard MDF", icon: "📃" },
            { id: "mdf-moisture", name: "Moisture Resistant", icon: "💧" },
            { id: "mdf-fire", name: "Fire Retardant", icon: "🔥" },
          ],
        },
        {
          id: "plywood-boards",
          name: "Plywood",
          icon: "📄",
          subItems: [
            { id: "plywood-birch", name: "Birch Plywood", icon: "🌿" },
            { id: "plywood-marine", name: "Marine Grade", icon: "🌊" },
          ],
        },
      ],
    },
    {
      id: "caster",
      name: "Caster",
      icon: "⚙️",
      subItems: [
        {
          id: "fixed-casters",
          name: "Fixed",
          icon: "🔒",
          subItems: [
            { id: "fixed-light", name: "Light Duty", icon: "🪶" },
            { id: "fixed-heavy", name: "Heavy Duty", icon: "💪" },
          ],
        },
        {
          id: "swivel-casters",
          name: "Swivel",
          icon: "🔄",
          subItems: [
            { id: "swivel-brake", name: "With Brake", icon: "🛑" },
            { id: "swivel-no-brake", name: "Without Brake", icon: "▶️" },
          ],
        },
      ],
    },
    {
      id: "connector",
      name: "Connector",
      icon: "🔗",
      subItems: [
        {
          id: "cam-lock",
          name: "Cam Lock",
          icon: "🔐",
          subItems: [
            { id: "cam-15mm", name: "15mm", icon: "📏" },
            { id: "cam-25mm", name: "25mm", icon: "📏" },
          ],
        },
        {
          id: "dowel-pins",
          name: "Dowel",
          icon: "📌",
          subItems: [
            { id: "dowel-6mm", name: "6mm", icon: "📏" },
            { id: "dowel-8mm", name: "8mm", icon: "📏" },
            { id: "dowel-10mm", name: "10mm", icon: "📏" },
          ],
        },
      ],
    },
    {
      id: "hinge",
      name: "Hinge",
      icon: "🚪",
      subItems: [
        {
          id: "blum-hinges",
          name: "Blum",
          icon: "🔧",
          subItems: [
            {
              id: "blum-clip-top",
              name: "Clip Top",
              icon: "📎",
              subItems: [
                { id: "blum-soft-close", name: "Soft Close", icon: "🤫" },
                { id: "blum-standard", name: "Standard", icon: "📋" },
              ],
            },
            { id: "blum-compact", name: "Compact", icon: "📦" },
          ],
        },
        {
          id: "hettich-hinges",
          name: "Hettich",
          icon: "🔧",
          subItems: [
            {
              id: "hettich-sensys",
              name: "Sensys",
              icon: "🎯",
              subItems: [
                { id: "hettich-soft-close", name: "Soft Close", icon: "🤫" },
                { id: "hettich-push-open", name: "Push to Open", icon: "👆" },
              ],
            },
            { id: "hettich-intermat", name: "Intermat", icon: "⚡" },
          ],
        },
        {
          id: "godrej-hinges",
          name: "Godrej",
          icon: "🔧",
          subItems: [
            { id: "godrej-premium", name: "Premium", icon: "⭐" },
            { id: "godrej-standard", name: "Standard", icon: "📋" },
          ],
        },
        {
          id: "ebco-hinges",
          name: "Ebco",
          icon: "🔧",
          subItems: [
            { id: "ebco-hydraulic", name: "Hydraulic", icon: "💧" },
            { id: "ebco-spring", name: "Spring", icon: "🌀" },
          ],
        },
      ],
    },
  ]

  const toggleCategory = (categoryId: string) => {
    setExpandedCategories((prev) =>
      prev.includes(categoryId) ? prev.filter((id) => id !== categoryId) : [...prev, categoryId],
    )
  }

  const handleItemClick = (itemId: string, hasSubItems: boolean) => {
    if (hasSubItems) {
      toggleCategory(itemId)
    } else {
      setSelectedItem(itemId)
    }
  }

  const renderMenuItem = (item: MaterialItem, level = 0): JSX.Element => {
    const isExpanded = expandedCategories.includes(item.id)
    const hasSubItems = item.subItems && item.subItems.length > 0
    const isSelected = selectedItem === item.id && !hasSubItems

    return (
      <div key={item.id} className={styles.categoryContainer}>
        <div
          className={`${styles.categoryItem} ${isExpanded ? styles.expanded : ""} ${isSelected ? styles.selected : ""}`}
          style={{ paddingLeft: `${1 + level * 1.5}rem` }}
          onClick={() => handleItemClick(item.id, hasSubItems)}
        >
          <div className={styles.categoryContent}>
            <span className={styles.categoryIcon}>{item.icon}</span>
            <span className={styles.categoryName}>{item.name}</span>
          </div>
          {hasSubItems && <span className={`${styles.dropdownArrow} ${isExpanded ? styles.rotated : ""}`}>▼</span>}
        </div>

        {hasSubItems && isExpanded && (
          <div className={styles.subItemsContainer}>
            {item.subItems!.map((subItem) => renderMenuItem(subItem, level + 1))}
          </div>
        )}
      </div>
    )
  }

  const getSelectedItemName = () => {
    const findItemById = (items: MaterialItem[], id: string): MaterialItem | null => {
      for (const item of items) {
        if (item.id === id) return item
        if (item.subItems) {
          const found = findItemById(item.subItems, id)
          if (found) return found
        }
      }
      return null
    }

    const selectedItemData = findItemById(MaterialThings, selectedItem)
    return selectedItemData?.name || selectedItem
  }

  return (
    <div className={styles.container}>
      <Sidebar />
      <div className={styles.rightside}>
        <Header isBorderRadius={true} dashboardName="Material" />

        <div className={styles.maincontainer}>
          <div className={styles.materialleftside}>
            <div className={styles.menuContainer}>{MaterialThings.map((category) => renderMenuItem(category))}</div>
          </div>

          <div className={styles.materialrightside}>
            <div className={styles.contentArea}>
              {selectedItem && (
                <div className={styles.selectedContent}>
                  <h2>Selected: {getSelectedItemName()}</h2>
                  <p>Content for {getSelectedItemName()} will be displayed here.</p>
                  <div className={styles.itemDetails}>
                    <p>
                      <strong>Item ID:</strong> {selectedItem}
                    </p>
                    <p>
                      <strong>Category:</strong> Material Component
                    </p>
                    <p>
                      <strong>Status:</strong> Available
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Material
