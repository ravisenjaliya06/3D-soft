# Python imports
import sys
from os.path import abspath, dirname

# Django imports
import django
from django.db.models import QuerySet

DJANGO_ROOT = dirname(dirname(abspath(__file__)))
sys.path.append(DJANGO_ROOT)
django.setup()

# App imports
from material.models import (
    Catalog,
    CatalogRuleParts,
    CatalogRules,
    Company,
    FinishesLibrary,
    Material,
    Properties,
)
from umaboy.models import Organization

FINISH = [
    {
        "type": "Finish",
        "name": "Alder",
        "description": "Alder base color",
        "color": "#C28F60",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "White",
        "description": "Basic white",
        "color": "#FFFFFF",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Silver",
        "description": "Light gray",
        "color": "#C0C0C0",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Gray",
        "description": "Mid gray",
        "color": "#808080",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Black",
        "description": "Pure black",
        "color": "#000000",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Red",
        "description": "Primary red",
        "color": "#FF0000",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Maroon",
        "description": "Dark red",
        "color": "#800000",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Yellow",
        "description": "Primary yellow",
        "color": "#FFFF00",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Olive",
        "description": "Olive yellow",
        "color": "#808000",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Lime",
        "description": "Bright green",
        "color": "#00FF00",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Green",
        "description": "Standard green",
        "color": "#008000",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Aqua",
        "description": "Cyan",
        "color": "#00FFFF",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Teal",
        "description": "Dark cyan",
        "color": "#008080",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Blue",
        "description": "Primary blue",
        "color": "#0000FF",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Navy",
        "description": "Dark blue",
        "color": "#000080",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Fuchsia",
        "description": "Magenta",
        "color": "#FF00FF",
        "organization": None,
    },
    {
        "type": "Finish",
        "name": "Purple",
        "description": "Dark magenta",
        "color": "#800080",
        "organization": None,
    },
]

TEXTURE = [
    {
        "type": "Texture",
        "name": "Art Glass",
        "description": "Art Glass",
        "texture_type": "Miscellaneous",
        "width": 685.8,
        "height": 685.8,
        "decal": False,
        "tile": True,
        "image": None,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Art Glass_Frost",
        "description": "Art_Glass_Frost",
        "texture_type": "Miscellaneous",
        "width": 1016,
        "height": 685.8,
        "decal": True,
        "tile": True,
        "image": None,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Art Glass_Grid",
        "description": "Art_Glass_Grid",
        "texture_type": "Miscellaneous",
        "width": 1016,
        "height": 736.6,
        "decal": True,
        "tile": True,
        "image": None,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Art Glass_Rain",
        "description": "Art_Glass_Rain",
        "texture_type": "Miscellaneous",
        "width": 685.8,
        "height": 685.8,
        "decal": True,
        "tile": True,
        "image": None,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Wire Mesh Glass",
        "description": "Wire Mesh Glass",
        "texture_type": "Miscellaneous",
        "width": 304.8,
        "height": 304.8,
        "decal": True,
        "tile": False,
        "image": None,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Alder",
        "description": "Alder",
        "texture_type": "Wood",
        "width": 457.2,
        "height": 457.2,
        "decal": False,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Oak",
        "description": "Oak",
        "texture_type": "Wood",
        "width": 457.2,
        "height": 457.2,
        "decal": False,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Maple",
        "description": "Maple",
        "texture_type": "Wood",
        "width": 457.2,
        "height": 457.2,
        "decal": False,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Cherry",
        "description": "Cherry",
        "texture_type": "Wood",
        "width": 457.2,
        "height": 457.2,
        "decal": False,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Birch",
        "description": "Birch",
        "texture_type": "Wood",
        "width": 609.6,
        "height": 609.6,
        "decal": False,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Ash",
        "description": "Ash",
        "texture_type": "Wood",
        "width": 457.2,
        "height": 457.2,
        "decal": False,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Walnut",
        "description": "Walnut",
        "texture_type": "Wood",
        "width": 457.2,
        "height": 457.2,
        "decal": False,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "Poplar",
        "description": "Poplar",
        "texture_type": "Wood",
        "width": 457.2,
        "height": 457.2,
        "decal": False,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "GlassTile_Black",
        "description": "Black Glass Tile",
        "texture_type": "Walls",
        "width": 177.8,
        "height": 177.8,
        "decal": True,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "GlassTile_Gray",
        "description": "Gray Glass Tile",
        "texture_type": "Walls",
        "width": 177.8,
        "height": 177.8,
        "decal": True,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "TravertineGold",
        "description": "TravertineGold",
        "texture_type": "Floors",
        "width": 1219.2,
        "height": 1219.2,
        "decal": True,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "TravertineWhite",
        "description": "TravertineWhite",
        "texture_type": "Floors",
        "width": 1219.2,
        "height": 1219.2,
        "decal": True,
        "tile": True,
        "organization": None,
    },
    {
        "type": "Texture",
        "name": "TravertinePink",
        "description": "TravertinePink",
        "texture_type": "Floors",
        "width": 1219.2,
        "height": 1216.6,
        "decal": True,
        "tile": True,
        "organization": None,
    },
]

FINISH_TYPE = [
    {
        "type": "Finish Type",
        "name": "Art Glass",
        "description": "Art Glass",
        "light": "White Light",
        "shader": "Glass",
        "ambient": 0,
        "diffuse": 0,
        "specular": 0,
        "shininess": 0,
        "transparency": 0,
        "brightness": 0,
        "organization": None,
    },
    {
        "type": "Finish Type",
        "name": "Bright White",
        "description": "Bright White",
        "light": "White Light",
        "shader": "Plastic",
        "ambient": 0.2,
        "diffuse": 0.8,
        "specular": 0.2,
        "shininess": 16,
        "transparency": 0,
        "brightness": 0.7,
        "organization": None,
    },
    {
        "type": "Finish Type",
        "name": "Floor - Gloss",
        "description": "Floor - Gloss",
        "light": "White Light",
        "shader": "Laminate",
        "ambient": 0.1,
        "diffuse": 0.9,
        "specular": 0.6,
        "shininess": 64,
        "transparency": 0,
        "brightness": 0.6,
        "organization": None,
    },
    {
        "type": "Finish Type",
        "name": "Floor - Matte",
        "description": "Floor - Matte",
        "light": "White Light",
        "shader": "Laminate",
        "ambient": 0.2,
        "diffuse": 0.8,
        "specular": 0.05,
        "shininess": 8,
        "transparency": 0,
        "brightness": 0.5,
        "organization": None,
    },
    {
        "type": "Finish Type",
        "name": "Glass",
        "description": "Glass",
        "light": "White Light",
        "shader": "Glass",
        "ambient": 0.05,
        "diffuse": 0.1,
        "specular": 0.9,
        "shininess": 96,
        "transparency": 0.7,
        "brightness": 0.5,
        "organization": None,
    },
    {
        "type": "Finish Type",
        "name": "Laminate - Gloss",
        "description": "Laminate - Gloss",
        "light": "White Light",
        "shader": "Laminate",
        "ambient": 0.1,
        "diffuse": 0.85,
        "specular": 0.5,
        "shininess": 48,
        "transparency": 0,
        "brightness": 0.6,
        "organization": None,
    },
]

COMPANY = [
    {"name": "Blum", "material_type": "Banding", "organization": None},
    {"name": "Blum", "material_type": "Board Stock", "organization": None},
    {"name": "Blum", "material_type": "Caster", "organization": None},
    {"name": "Blum", "material_type": "Connector", "organization": None},
    {"name": "Blum", "material_type": "Drawer Guide", "organization": None},
    {"name": "Blum", "material_type": "Hinge", "organization": None},
    {"name": "Blum", "material_type": "Hinge Plate", "organization": None},
    {"name": "Blum", "material_type": "Laminate", "organization": None},
    {"name": "Blum", "material_type": "Leg", "organization": None},
    {"name": "Blum", "material_type": "Leg Leveler", "organization": None},
    {"name": "Blum", "material_type": "Miscellaneous", "organization": None},
    {"name": "Blum", "material_type": "Molding", "organization": None},
    {"name": "Blum", "material_type": "Panel Stock", "organization": None},
    {"name": "Blum", "material_type": "Pull", "organization": None},
    {"name": "Blum", "material_type": "Rod", "organization": None},
    {"name": "Blum", "material_type": "Sliding Door Rail", "organization": None},
    {"name": "Blum", "material_type": "Sliding Door Roller", "organization": None},
    {"name": "Blum", "material_type": "Wire Basket", "organization": None},
]

MATERIAL = [
    {
        "name": "Alder Ven EB",
        "description": "Veneer Edgebanding",
        "type": "Banding",
        "company": "",
        "properties": {
            "unit_of_issue": "Each",
            "default_cost": 10.00,
            "sell_price": 0.00,
            "default_markup": 0.00,
            "sales_tax": False,
            "default_tax_rate": 0.00,
            "waste": 5.00,
            "eslimate": False,
            "length_trim": 25.4,
            "thickness": 0.8,
        },
    },
    {
        "name": "PVC Woodgrain",
        "description": "PVC Edgebanding",
        "type": "Banding",
        "company": "",
    },
    {
        "name": "PVC Solid",
        "description": "PVC Edgebanding",
        "type": "Banding",
        "company": "",
    },
    {
        "name": "Paint Grade EB",
        "description": "Paint Grade Edgebanding",
        "type": "Banding",
        "company": "",
    },
    {
        "name": "Oak Ven EB",
        "description": "Veneer Edgebanding",
        "type": "Banding",
        "company": "",
    },
    {
        "name": "PVC White",
        "description": "PVC Edgebanding",
        "type": "Banding",
        "company": "",
    },
    {
        "name": "Maple Ven EB",
        "description": "Veneer Edgebanding",
        "type": "Banding",
        "company": "",
    },
    {
        "name": "Cherry Ven EB",
        "description": "Veneer Edgebanding",
        "type": "Banding",
        "company": "",
    },
    {
        "name": "Birch Ven EB",
        "description": "Veneer Edgebanding",
        "type": "Banding",
        "company": "Blum",
    },
    {
        "name": "1/2 Solid Poplar",
        "description": "Poplar",
        "type": "Board Stock",
        "company": "",
    },
    {
        "name": "3/4 Solid Poplar",
        "description": "Poplar",
        "type": "Board Stock",
        "company": "",
    },
    {
        "name": "1/2 Solid Alder",
        "description": "Alder",
        "type": "Board Stock",
        "company": "",
    },
    {
        "name": "3/4 Solid Alder",
        "description": "Alder",
        "type": "Board Stock",
        "company": "",
    },
    {
        "name": "1/2 Paint Grade Wood",
        "description": "Paint Grade",
        "type": "Board Stock",
        "company": "",
    },
    {
        "name": "1/2 Solid Oak",
        "description": "Oak",
        "type": "Board Stock",
        "company": "Blum",
    },
    {
        "name": "1/2 Solid Maple",
        "description": "Maple",
        "type": "Board Stock",
        "company": "Blum",
    },
    {
        "name": "Caster",
        "description": "Caster",
        "type": "Caster",
        "company": "",
    },
    {
        "name": "Blum Caster",
        "description": "Blum Caster",
        "type": "Caster",
        "company": "Blum",
    },
    {
        "name": "Connector",
        "description": "Connector",
        "type": "Connector",
        "company": "",
    },
    {
        "name": "Blum Connector",
        "description": "Blum Connector",
        "type": "Connector",
        "company": "Blum",
    },
    {
        "name": "430E6500V",
        "description": "26in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "430E6000V",
        "description": "24in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "430E5500V",
        "description": "22in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "430E5000V",
        "description": "20in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "Blum",
    },
    {
        "name": "430E4500V",
        "description": "18in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "430E4000V",
        "description": "16in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "430E3500V",
        "description": "14in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "430E3000V",
        "description": "12in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "430E2500",
        "description": "10in Blum Full Extension Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "230M2500",
        "description": "10in Blum Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "230M6500",
        "description": "26in Blum Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "230M6000",
        "description": "24in Blum Guide",
        "type": "Drawer Guide",
        "company": "",
    },
    {
        "name": "Blum 230M5500",
        "description": "22in Blum Guide",
        "type": "Drawer Guide",
        "company": "Blum",
    },
    {
        "name": "Blum 230M5000",
        "description": "20in Blum Guide",
        "type": "Drawer Guide",
        "company": "Blum",
    },
    {
        "name": "Blum 230M4500",
        "description": "18in Blum Guide",
        "type": "Drawer Guide",
        "company": "Blum",
    },
    {
        "name": "Blum 230M4000",
        "description": "16in Blum Guide",
        "type": "Drawer Guide",
        "company": "Blum",
    },
    {
        "name": "Blum 230M3500",
        "description": "14in Blum Guide",
        "type": "Drawer Guide",
        "company": "Blum",
    },
    {
        "name": "Blum 230M3000",
        "description": "12in Blum Guide",
        "type": "Drawer Guide",
        "company": "Blum",
    },
    {
        "name": "120 Degree Euro",
        "description": "Concealed",
        "type": "Hinge",
        "company": "",
    },
    {
        "name": "Inset Double Door Hinge",
        "description": "Double Door",
        "type": "Hinge",
        "company": "",
    },
    {
        "name": "Double Door Hinge",
        "description": "Double Door",
        "type": "Hinge",
        "company": "",
    },
    {
        "name": "Inset Hinge",
        "description": "Concealed",
        "type": "Hinge",
        "company": "",
    },
    {
        "name": "5/8 Overlay FF",
        "description": "Exposed",
        "type": "Hinge",
        "company": "",
    },
    {
        "name": "Hinge Plate",
        "description": "Concealed",
        "type": "Hinge Plate",
        "company": "",
    },
    {
        "name": "Double DoorHinge Plate",
        "description": "Exposed",
        "type": "Hinge Plate",
        "company": "",
    },
    {
        "name": "SG Solid Lam_HG",
        "description": "Solid Color - Standard Grade",
        "type": "Laminate",
        "company": "",
    },
    {
        "name": "VT Solid Lam_HG",
        "description": "Solid Color - Vertical Grade",
        "type": "Laminate",
        "company": "",
    },
    {
        "name": "SG Solid Lam",
        "description": "Solid Color - Standard Grade",
        "type": "Laminate",
        "company": "",
    },
    {
        "name": "VT Woodgrain Lam",
        "description": "Woodgrain - Vertical Grade",
        "type": "Laminate",
        "company": "",
    },
    {
        "name": "VT Solid Lam",
        "description": "Solid Color - Vertical Grade",
        "type": "Laminate",
        "company": "Blum",
    },
    {
        "name": "System Color",
        "description": "System Material",
        "type": "Laminate",
        "company": "Blum",
    },
    {
        "name": "SG Woodgrain Lam",
        "description": "Woodgrain - Standard Grade",
        "type": "Laminate",
        "company": "Blum",
    },
    {
        "name": "Bun Foot",
        "description": "",
        "type": "Leg",
        "company": "",
    },
    {
        "name": "Pedestal Leg",
        "description": "",
        "type": "Leg",
        "company": "",
    },
    {
        "name": "Tapered Leg",
        "description": "",
        "type": "Leg",
        "company": "",
    },
    {
        "name": "Leg Leveler",
        "description": "",
        "type": "Leg Leveler",
        "company": "",
    },
    {
        "name": "Leg Leveler (No Ops)",
        "description": "",
        "type": "Leg Leveler",
        "company": "",
    },
    {
        "name": "1/8 Black Glass",
        "description": "Glass",
        "type": "Miscellaneous",
        "company": "",
    },
    {
        "name": "Art Glass_Wire",
        "description": "Glass",
        "type": "Miscellaneous",
        "company": "",
    },
    {
        "name": "Art Glass_Rain",
        "description": "Glass",
        "type": "Miscellaneous",
        "company": "",
    },
    {
        "name": "Art Glass_Frost",
        "description": "Glass",
        "type": "Miscellaneous",
        "company": "",
    },
    {
        "name": "Art Glass",
        "description": "Glass",
        "type": "Miscellaneous",
        "company": "",
    },
    {
        "name": "Art Glass_Grid",
        "description": "Glass",
        "type": "Miscellaneous",
        "company": "",
    },
    {
        "name": "Concrete",
        "description": "Stone",
        "type": "Miscellaneous",
        "company": "",
    },
    {
        "name": "Granite",
        "description": "Stone",
        "type": "Miscellaneous",
        "company": "",
    },
    {
        "name": "Wall_Gloss",
        "description": "System Material",
        "type": "Miscellaneous",
        "company": "Blum",
    },
    {
        "name": "Floor_Matte",
        "description": "System Material",
        "type": "Miscellaneous",
        "company": "Blum",
    },
    {
        "name": "Mirror",
        "description": "Mirror",
        "type": "Miscellaneous",
        "company": "Blum",
    },
    {
        "name": "Brass",
        "description": "System Color",
        "type": "Miscellaneous",
        "company": "Blum",
    },
    {
        "name": "Molding",
        "description": "Molding",
        "type": "Molding",
        "company": "",
    },
    {
        "name": "Blum Molding",
        "description": "Molding",
        "type": "Molding",
        "company": "Blum",
    },
    {
        "name": "3/4 1s Poplar Ply",
        "description": "Poplar",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "5/8 1s Poplar Ply",
        "description": "Poplar",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/2 1s Poplar Ply",
        "description": "Poplar",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/4 1s Poplar Ply",
        "description": "Poplar",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/8 1s Poplar Ply",
        "description": "Poplar",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/2 1s Oak Ply",
        "description": "Oak",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "3/4 1s Oak Ply",
        "description": "Oak",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "5/8 1s Oak Ply",
        "description": "Oak",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/4 1s Oak Ply",
        "description": "Oak",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/8 1s Oak Ply",
        "description": "Oak",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "3/4 1s Maple Ply",
        "description": "Maple",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "5/8 1s Maple Ply",
        "description": "Maple",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/2 1s Maple Ply",
        "description": "Maple",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/4 1s Maple Ply",
        "description": "Maple",
        "type": "Panel Stock",
        "company": "",
    },
    {
        "name": "1/8 1s Maple Ply",
        "description": "Maple",
        "type": "Panel Stock",
        "company": "Blum",
    },
    {
        "name": "3/4 1s Luan Ply",
        "description": "Luan",
        "type": "Panel Stock",
        "company": "Blum",
    },
    {
        "name": "5/8 1s Luan Ply",
        "description": "Luan",
        "type": "Panel Stock",
        "company": "Blum",
    },
    {
        "name": "1/2 1s Luan Ply",
        "description": "Luan",
        "type": "Panel Stock",
        "company": "Blum",
    },
    {
        "name": "1/4 1s Luan Ply",
        "description": "Luan",
        "type": "Panel Stock",
        "company": "Blum",
    },
    {
        "name": "1/8 1s Luan Ply",
        "description": "Luan",
        "type": "Panel Stock",
        "company": "Blum",
    },
    # --- Pull ---
    {
        "name": "4in Bar Pull",
        "description": "Bar Pull",
        "type": "Pull",
        "company": "",
    },
    {
        "name": "Wooden Knob",
        "description": "Knob",
        "type": "Pull",
        "company": "",
    },
    {
        "name": "No Pull",
        "description": "No Pull",
        "type": "Pull",
        "company": "",
    },
    {
        "name": "Chrome 4in C-Pull",
        "description": "C-Pull",
        "type": "Pull",
        "company": "",
    },
    {
        "name": "1-1/4in Brass Knob",
        "description": "Knob",
        "type": "Pull",
        "company": "",
    },
    {
        "name": "White 3in C-Pull",
        "description": "C-Pull",
        "type": "Pull",
        "company": "Blum",
    },
    {
        "name": "Oak 3in C-Pull",
        "description": "C-Pull",
        "type": "Pull",
        "company": "Blum",
    },
    {
        "name": "Brass 3in C-Pull",
        "description": "C-Pull",
        "type": "Pull",
        "company": "Blum",
    },
    {
        "name": "Blum Rod",
        "description": "Blum Rod",
        "type": "Rod",
        "company": "Blum",
    },
    {
        "name": "Rod",
        "description": "Rod",
        "type": "Rod",
        "company": "",
    },
    {
        "name": "Blum Sliding Door Rail",
        "description": "",
        "type": "Sliding Door Rail",
        "company": "Blum",
    },
    {
        "name": "Sliding Door Rail",
        "description": "",
        "type": "Sliding Door Rail",
        "company": "",
    },
    {
        "name": "Blum Sliding Door Roller",
        "description": "",
        "type": "Sliding Door Roller",
        "company": "Blum",
    },
    {
        "name": "Sliding Door Roller",
        "description": "",
        "type": "Sliding Door Roller",
        "company": "",
    },
    {
        "name": "BW-324-14",
        "description": "Wire Basket 3h x 24w x 14d",
        "type": "Wire Basket",
        "company": "Blum",
    },
    {
        "name": "BW-318-14",
        "description": "Wire Basket 3h x 18w x 14d",
        "type": "Wire Basket",
        "company": "Blum",
    },
    {
        "name": "BW-1724-14",
        "description": "Wire Basket 17h x 24w x 14d",
        "type": "Wire Basket",
        "company": "Blum",
    },
    {
        "name": "BW-1718-14",
        "description": "Wire Basket 17h x 18w x 14d",
        "type": "Wire Basket",
        "company": "",
    },
    {
        "name": "BW-1324-14",
        "description": "Wire Basket 13h x 24w x 14d",
        "type": "Wire Basket",
        "company": "",
    },
    {
        "name": "BW-1318-14",
        "description": "Wire Basket 13h x 18w x 14d",
        "type": "Wire Basket",
        "company": "",
    },
    {
        "name": "BW-618-14",
        "description": "Wire Basket 6h x 18w x 14d",
        "type": "Wire Basket",
        "company": "",
    },
    {
        "name": "BW-624-14",
        "description": "Wire Basket 6h x 24w x 14d",
        "type": "Wire Basket",
        "company": "",
    },
]

CATALOG = [
    {
        "type": "Door",
        "name": "Default Door",
        "description": "Default Door",
        "catalog_rules": [
            {
                "name": "Molding",
                "rules_parts": [{"name": "Door Molding", "material": "Molding"}],
            },
            {
                "name": "Banding",
                "rules_parts": [{"name": "Door Banding", "material": "Alder Ven EB"}],
            },
            {
                "name": "Handles",
                "rules_parts": [{"name": "Door Handle", "material": "4in Bar Pull"}],
            },
            {
                "name": "Panel",
                "rules_parts": [
                    {"name": "Door Panel", "material": "3/4 1s Poplar Ply"}
                ],
            },
            {
                "name": "Connections",
                "rules_parts": [{"name": "Door and Handle Connections"}],
            },
        ],
    },
    {
        "type": "Drawer",
        "name": "Default Door",
        "description": "Default Door",
        "catalog_rules": [
            {
                "name": "Drawer Guide",
                "rules_parts": [
                    {"name": "Left Drawer Guide", "material": "430E6500V"},
                    {"name": "Right Drawer Guide", "material": "430E6500V"},
                ],
            },
            {
                "name": "Panel",
                "rules_parts": [
                    {"name": "Left Drawer Panel", "material": "3/4 1s Poplar Ply"},
                    {"name": "Right Drawer Panel", "material": "5/8 1s Poplar Ply"},
                    {"name": "Front Drawer Panel", "material": "1/2 1s Poplar Ply"},
                    {"name": "Back Drawer Panel", "material": "1/4 1s Poplar Ply"},
                    {"name": "Bottom Drawer Panel", "material": "1/8 1s Poplar Ply"},
                ],
            },
            {
                "name": "Handles",
                "rules_parts": [{"name": "Drawer Handle", "material": "Wooden Knob"}],
            },
            {
                "name": "Connections",
                "rules_parts": [
                    {"name": "Front and Left Panel Connections"},
                    {"name": "Front and Right Panel Connections"},
                    {"name": "Back and Right Panel Connections"},
                    {"name": "Back and Left Panel Connections"},
                    {"name": "Bottom and Front Panel Connections"},
                    {"name": "Bottom and Back Panel Connections"},
                    {"name": "Bottom and Left Panel Connections"},
                    {"name": "Bottom and Right Panel Connections"},
                    {"name": "Front Panel and Handle Connections"},
                    {"name": "Right Panel and Right Drawer Guide Connections"},
                    {"name": "Left Panel and Left Drawer Guide Connections"},
                ],
            },
        ],
    },
    {
        "type": "Sliding Door",
        "name": "Default Sliding Door",
        "description": "Default Sliding Door",
        "catalog_rules": [
            {
                "name": "Door Rail",
                "rules_parts": [
                    {"name": "Top Rail", "material": "Sliding Door Rail"},
                    {"name": "Bottom Rail", "material": "Sliding Door Rail"},
                ],
            },
            {
                "name": "Panel",
                "rules_parts": [
                    {"name": "Left Door Panel", "material": "3/4 1s Poplar Ply"},
                    {"name": "Right Door Panel", "material": "5/8 1s Poplar Ply"},
                ],
            },
            {
                "name": "Handles",
                "rules_parts": [
                    {"name": "Right Door Handle", "material": "Wooden Knob"},
                    {"name": "Left Door Handle", "material": "Wooden Knob"},
                ],
            },
            {
                "name": "Connections",
                "rules_parts": [
                    {"name": "Right Door and Right Door Handle Connections"},
                    {"name": "Left Door and Left Door Handle Connections"},
                ],
            },
        ],
    },
]


def get_registred_organization() -> QuerySet[Organization]:
    return Organization.objects.all()


def create_finish() -> None:
    """
    Creates finish records.
    Returns a dictionary mapping finish names to finish objects.
    """
    finish_objects = {}
    for finish_data in FINISH:
        finish, created = FinishesLibrary.objects.update_or_create(
            type=finish_data["type"],
            name=finish_data["name"],
            organization=finish_data["organization"],
            defaults={
                "description": finish_data["description"],
                "color": finish_data["color"],
            },
        )

        if created:
            organization = get_registred_organization()
            for org in organization:
                FinishesLibrary.objects.create(
                    type=finish_data["type"],
                    name=finish_data["name"],
                    description=finish_data["description"],
                    color=finish_data["color"],
                    organization=org,
                )
        finish_objects[finish_data["name"]] = finish
    return finish_objects


def create_finish_type() -> None:
    """
    Creates finish_type records.
    Returns a dictionary mapping finish_type names to finish_type objects.
    """
    finish_type_objects = {}
    for finish_type_data in FINISH_TYPE:
        defaults = {
            k: v
            for k, v in finish_type_data.items()
            if k not in ["type", "name", "organization"]
        }

        finish_type, created = FinishesLibrary.objects.update_or_create(
            type=finish_type_data["type"],
            name=finish_type_data["name"],
            organization=finish_type_data["organization"],
            defaults=defaults,
        )

        if created:
            organization = get_registred_organization()
            for org in organization:
                FinishesLibrary.objects.create(
                    type=finish_type_data["type"],
                    name=finish_type_data["name"],
                    organization=org,
                    **defaults,
                )
        finish_type_objects[finish_type_data["name"]] = finish_type

    return finish_type_objects


def create_textures() -> None:
    """
    Creates texture records.
    Returns a dictionary mapping texture names to texture objects.
    """
    texture_objects = {}
    for texture_data in TEXTURE:
        defaults = {
            k: v
            for k, v in texture_data.items()
            if k not in ["type", "name", "organization"]
        }

        texture, created = FinishesLibrary.objects.update_or_create(
            type=texture_data["type"],
            name=texture_data["name"],
            organization=texture_data["organization"],
            defaults=defaults,
        )
        if created:
            organization = get_registred_organization()
            for org in organization:
                FinishesLibrary.objects.create(
                    type=texture_data["type"],
                    name=texture_data["name"],
                    organization=org,
                    **defaults,
                )
        texture_objects[texture_data["name"]] = texture
    return texture_objects


def create_company() -> dict[tuple[str, str, str | None], Company]:
    """
    Creates company records for all registered organizations **and** a global company with organization=None.
    Returns a dictionary mapping (name, material_type, org_name_or_None) -> company object
    """
    company_objects = {}
    organizations = get_registred_organization()

    for company_data in COMPANY:
        defaults = {
            k: v
            for k, v in company_data.items()
            if k not in ["name", "material_type", "organization"]
        }

        global_company, created = Company.objects.update_or_create(
            name=company_data["name"],
            material_type=company_data["material_type"],
            organization=None,
            defaults=defaults,
        )
        company_objects[
            (
                company_data["name"],
                company_data["material_type"],
                company_data.get("organization", None),
            )
        ] = global_company

        for org in organizations:
            org_company, created = Company.objects.update_or_create(
                name=company_data["name"],
                material_type=company_data["material_type"],
                organization=org,
                defaults=defaults,
            )
            company_objects[
                (company_data["name"], company_data["material_type"], org.name)
            ] = org_company

    return company_objects


def create_materials(
    company_objects: dict[tuple[str, str, str | None], Company],
) -> None:
    """
    Creates materials for global scope (organization=None) and duplicates them
    for each registered organization. Properties are applied if present.
    If company is missing/blank, material will be stored with company=None.
    """
    organizations = get_registred_organization()

    for material_data in MATERIAL:
        company_name = material_data.get("company") or None
        material_type = material_data["type"]
        properties = material_data.get("properties", {})

        if company_name is None:
            company = None
        else:
            company = company_objects.get((company_name, material_type, None))
            if not company:
                company = None

        material, created = Material.objects.update_or_create(
            name=material_data["name"],
            type=material_type,
            company=company,
            organization=None,
            defaults={"description": material_data.get("description", "")},
        )

        Properties.objects.update_or_create(
            material=material,
            defaults=properties,
        )

        for org in organizations:
            if company_name is None:
                org_company = None
            else:
                org_company = company_objects.get(
                    (company_name, material_type, org.name)
                )
                if not org_company:
                    org_company = None

            org_material, created = Material.objects.update_or_create(
                name=material_data["name"],
                type=material_type,
                company=org_company,
                organization=org,
                defaults={"description": material_data.get("description", "")},
            )

            Properties.objects.update_or_create(
                material=org_material,
                defaults=properties,
            )


def create_catalog_data() -> None:
    organizations = list(Organization.objects.all()) + [None]

    for org in organizations:
        for catalog_data in CATALOG:
            catalog, _ = Catalog.objects.update_or_create(
                organization=org,
                type=catalog_data["type"],
                name=catalog_data["name"],
                defaults={"description": catalog_data.get("description", "")},
            )

            for rule_data in catalog_data.get("catalog_rules", []):
                catalog_rule, _ = CatalogRules.objects.update_or_create(
                    catalog=catalog, name=rule_data["name"], defaults={}
                )

                for part_data in rule_data.get("rules_parts", []):
                    material_obj = None
                    if "material" in part_data and part_data["material"]:
                        material_obj = Material.objects.filter(
                            name=part_data["material"], organization=org
                        ).first()

                    CatalogRuleParts.objects.update_or_create(
                        catalog_rule=catalog_rule,
                        name=part_data["name"],
                        defaults={"material": material_obj},
                    )


if __name__ == "__main__":
    create_finish()
    create_finish_type()
    create_textures()
    company_objects = create_company()
    create_materials(company_objects)
    create_catalog_data()
