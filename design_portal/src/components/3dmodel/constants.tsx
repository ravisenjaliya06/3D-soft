const MAIN_TEXTURE_URL = process.env.NEXT_PUBLIC_MEDIA_URL + '/textures'

export const TEXTURES_URLS = {
    HDR: MAIN_TEXTURE_URL + '/hdr/rosendal_plains_2_2k.hdr',
    WALL: {
        color: MAIN_TEXTURE_URL + '/wall/Bricks092_2K-JPG_Color.jpg',
        normal: MAIN_TEXTURE_URL + '/wall/Bricks092_2K-JPG_NormalGL.jpg',
        roughness: MAIN_TEXTURE_URL + '/wall/Bricks092_2K-JPG_Roughness.jpg',
        ao: MAIN_TEXTURE_URL + '/wall/Bricks092_2K-JPG_AmbientOcclusion.jpg',
    },
    FLOOR: {
        color: MAIN_TEXTURE_URL + '/floor/gravel_concrete_04_diff_2k.jpg',
        normal: MAIN_TEXTURE_URL + '/floor/gravel_concrete_04_disp_2k.png',
        roughness: MAIN_TEXTURE_URL + '/floor/gravel_concrete_04_arm_2k.jpg',
        ao: MAIN_TEXTURE_URL + '/floor/gravel_concrete_04_ao_2k.jpg',
    },
    PLATFORM: {
        color: MAIN_TEXTURE_URL + '/platform/Marble012_2K-JPG_Color.jpg',
        normal: MAIN_TEXTURE_URL + '/platform/Marble012_2K-JPG_NormalDX.jpg',
        roughness: MAIN_TEXTURE_URL + '/platform/Marble012_2K-JPG_Roughness.jpg',
        ao: MAIN_TEXTURE_URL + '/platform/Marble012_2K-JPG_NormalDX.jpg',
    }
}
