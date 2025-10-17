const MAIN_TEXTURE_URL = process.env.NEXT_PUBLIC_MEDIA_URL + '/textures';

export const TEXTURES_URLS = {
  HDR: '/texture/hdr/rosendal_plains_2_2k.hdr',
  WALL: {
    color: '/texture/wall/Bricks092_2K-JPG_Color.jpg',
    normal: '/texture/wall/Bricks092_2K-JPG_NormalGL.jpg',
    roughness: '/texture/wall/Bricks092_2K-JPG_Roughness.jpg',
    ao: '/texture/wall/Bricks092_2K-JPG_AmbientOcclusion.jpg',
  },
  FLOOR: {
    color: '/texture/floor/gravel_concrete_04_diff_2k.jpg',
    normal: '/texture/floor/gravel_concrete_04_disp_2k.png',
    roughness: '/texture/floor/gravel_concrete_04_arm_2k.jpg',
    ao: '/texture/floor/gravel_concrete_04_ao_2k.jpg',
  },
  PLATFORM: {
    color: '/texture/platform/Marble012_2K-JPG_Color.jpg',
    normal: '/texture/platform/Marble012_2K-JPG_NormalDX.jpg',
    roughness: '/texture/platform/Marble012_2K-JPG_Roughness.jpg',
    ao: '/texture/platform/Marble012_2K-JPG_NormalDX.jpg',
  },
};
