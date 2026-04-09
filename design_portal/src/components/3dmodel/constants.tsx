// const MAIN_TEXTURE_URL = process.env.NEXT_PUBLIC_MEDIA_URL + '/textures';

export const TEXTURES_URLS = {
  HDR: '/texture/hdr/rosendal_plains_2_2k.hdr',
  WALL: '/texture/wall/Bricks092_2K-JPG_Color.jpg',
  FLOOR: '/texture/floor/gravel_concrete_04_ao_2k.jpg',
  PLATFORM: {
    color: '/texture/platform/Marble012_2K-JPG_Color.jpg',
    normal: '/texture/platform/Marble012_2K-JPG_NormalDX.jpg',
    roughness: '/texture/platform/Marble012_2K-JPG_Roughness.jpg',
    ao: '/texture/platform/Marble012_2K-JPG_NormalDX.jpg',
  },
};

export const GLB_CACHE_NAME = 'bravento-glb-cache-v2';
export const TEXTURE_CACHE_NAME = 'bravento-texture-cache-v1';
