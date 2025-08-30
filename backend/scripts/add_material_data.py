# Python imports
import sys
from os.path import abspath, dirname

# Django imports
import django

DJANGO_ROOT = dirname(dirname(abspath(__file__)))
sys.path.append(DJANGO_ROOT)
django.setup()

# App imports
from material.models import FinishesLibrary

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
            defaults={
                "description": finish_data["description"],
                "color": finish_data["color"],
                "organization": finish_data["organization"],
            },
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
        defaults = {k: v for k, v in finish_type_data.items() if k not in ["type", "name"]}

        finish_type, created = FinishesLibrary.objects.update_or_create(
            type=finish_type_data["type"],
            name=finish_type_data["name"],
            defaults=defaults,
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
        defaults = {k: v for k, v in texture_data.items() if k not in ["type", "name"]}

        texture, created = FinishesLibrary.objects.update_or_create(
            type=texture_data["type"],
            name=texture_data["name"],
            defaults=defaults,
        )
        texture_objects[texture_data["name"]] = texture
    return texture_objects

if __name__ == "__main__":
    create_finish()
    create_finish_type()
    create_textures()
