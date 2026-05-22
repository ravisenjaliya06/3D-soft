import { FLOOR_PLAN_TYPES, MeshObjectData } from '@/components/3dmodel/sceneCreator/interface';
import { store } from '@/components/3dmodel/store';
import { ArchitecturalSceneData, DEFAULT_ROOM } from '@/components/rendering/interface';
import { toMm, toNumber, toText } from '@/components/rendering/utils';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import commonService from '@/services/CommonService';
import { assets } from '@/svgPaths';
import { useRouter } from 'next/router';
import { useEffect, useState } from 'react';
import styles from './rendering.module.css';

interface RenderImage {
  id: string;
  image: string;
}

const inferHex = (material: any): string => {
  return (
    material?.hex ||
    material?.color ||
    material?.value ||
    material?.properties?.hex ||
    material?.properties?.color ||
    '#FFFFFF'
  );
};

const getRoomData = (designData: any): ArchitecturalSceneData['room'] => {
  const rawScene = designData?.scene_data_json;
  let parsedScene: any = null;

  if (typeof rawScene === 'string') {
    try {
      parsedScene = JSON.parse(rawScene);
    } catch {
      parsedScene = null;
    }
  } else if (rawScene && typeof rawScene === 'object') {
    parsedScene = rawScene;
  }

  const roomType =
    parsedScene?.room?.type || designData?.room_type || designData?.roomType || DEFAULT_ROOM.type;
  const floorMaterial =
    parsedScene?.room?.floor?.material ||
    designData?.floor_material ||
    designData?.floorMaterial ||
    DEFAULT_ROOM.floor.material;
  const floorHex =
    parsedScene?.room?.floor?.hex ||
    designData?.floor_hex ||
    designData?.floorHex ||
    DEFAULT_ROOM.floor.hex;

  return {
    type: toText(roomType, DEFAULT_ROOM.type),
    floor: {
      material: toText(floorMaterial, DEFAULT_ROOM.floor.material),
      hex: toText(floorHex, DEFAULT_ROOM.floor.hex),
    },
  };
};

const buildSceneDataPayload = (
  objects: MeshObjectData[],
  designData: any,
  unitType: 'mm' | 'cm' | 'in'
) => {
  const walls = objects
    .filter((obj) => obj.type === FLOOR_PLAN_TYPES.WALL)
    .map((wall, index) => ({
      id: toText(wall.id, `wall_${index + 1}`),
      type: toText(wall.type, String(FLOOR_PLAN_TYPES.WALL)),
      length: toMm(toNumber((wall as any).length ?? wall.dimensions?.width), unitType),
      height: toMm(toNumber(wall.dimensions?.height), unitType),
      position: {
        x: toNumber(wall.position?.x),
        y: toNumber(wall.position?.y),
        z: toNumber(wall.position?.z),
      },
    }));

  const catalogs = objects
    .filter((obj) => obj.type !== FLOOR_PLAN_TYPES.WALL)
    .map((obj, index) => ({
      name: toText(obj.name || obj.type || obj.id, `catalog_${index + 1}`),
      type: toText(obj.type, 'catalog'),
      dimensions: {
        width: toMm(toNumber(obj.dimensions?.width), unitType),
        height: toMm(toNumber(obj.dimensions?.height), unitType),
        depth: toMm(toNumber(obj.dimensions?.depth), unitType),
      },
      position: {
        x: toNumber(obj.position?.x),
        y: toNumber(obj.position?.y),
        z: toNumber(obj.position?.z),
      },
      rotation: {
        y: toNumber(obj.rotation?.y),
      },
      material: (obj.material || []).map((mat) => ({
        name: toText(mat.name, 'Material'),
        type: toText(mat.type, 'material'),
        hex: toText(inferHex(mat), '#FFFFFF'),
      })),
    }));

  const payload: ArchitecturalSceneData = {
    room: getRoomData(designData),
    walls,
    catalogs,
  };

  return payload;
};

export default function RenderingPage() {
  const router = useRouter();
  const { designId } = router.query;
  const [images, setImages] = useState<RenderImage[]>([]);
  const [loadingText, setLoadingText] = useState('Fetching rendered images...');

  const [finalImage, setFinalImage] = useState<string | null>(null);
  const [finalVideo, setFinalVideo] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'image' | 'video'>('image');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (designId) {
      startRenderingProcess(designId as string);
    }
  }, [designId]);

  const startRenderingProcess = async (id: string) => {
    try {
      // 1. Fetch images from our backend
      const res = await commonService.get(API_ENDPOINT.UPLOAD_RENDER_IMAGE(id));
      const fetchedImages: RenderImage[] = res.data || [];
      setImages(fetchedImages);

      if (fetchedImages.length === 0) {
        setErrorMsg('No images found for this design.');
        return;
      }

      // Check if design already has a rendering_project_id
      const designRes = await commonService.get(
        API_ENDPOINT.GET_DESIGN_SETTINGS(id).replace('/settings/', '/')
      );
      const designData = designRes.data || designRes;
      let projectId = designData.rendering_project_id;

      if (!projectId) {
        setLoadingText('Creating remote project...');

        // Fetch 1st image as file
        const firstImageRes = await fetch(fetchedImages[0].image);
        const firstImageBlob = await firstImageRes.blob();
        const state = store.getState();
        const scene_data = {
          catalogs: state.data.objects,
        }

        const projectFormData = new FormData();
        projectFormData.append('name', `Design ${id}`);
        projectFormData.append('files', firstImageBlob, '1.png');
        projectFormData.append('scene_data_json', JSON.stringify(scene_data));

        const projectRes = await fetch(`${process.env.NEXT_PUBLIC_RENDER_URL}/api/v1/projects/`, {
          method: 'POST',
          body: projectFormData,
        });
        if (!projectRes.ok) throw new Error('Failed to create remote project');
        const projectData = await projectRes.json();
        projectId = projectData.id;

        // Save new project ID to backend
        await commonService.put(API_ENDPOINT.GET_DESIGN_SETTINGS(id).replace('/settings/', '/'), {
          rendering_project_id: projectId,
        });

        if (fetchedImages.length > 1) {
          setLoadingText(`Uploading ${fetchedImages.length - 1} remaining images...`);
          const remainingFormData = new FormData();
          for (let i = 1; i < fetchedImages.length; i++) {
            const imgRes = await fetch(fetchedImages[i].image);
            const imgBlob = await imgRes.blob();
            remainingFormData.append('files', imgBlob, `${i + 1}.png`);
          }
          const uploadRes = await fetch(
            `${process.env.NEXT_PUBLIC_RENDER_URL}/api/v1/projects/${projectId}/images`,
            {
              method: 'POST',
              body: remainingFormData,
            }
          );
          if (!uploadRes.ok) throw new Error('Failed to upload remaining images');
        }

        setLoadingText('Starting processing...');
        const processRes = await fetch(
          `${process.env.NEXT_PUBLIC_RENDER_URL}/api/v1/projects/${projectId}/process`,
          {
            method: 'POST',
          }
        );
        if (!processRes.ok) throw new Error('Failed to start processing');
      }

      setLoadingText('Rendering...');
      // Polling
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(
            `${process.env.NEXT_PUBLIC_RENDER_URL}/api/v1/projects/${projectId}/status`
          );
          const statusData = await statusRes.json();

          if (statusData.error_message) {
            clearInterval(pollInterval);
            setErrorMsg(statusData.error_message);
            return;
          }

          if (
            statusData.project_status === 'completed' ||
            statusData.url_enhanced ||
            statusData.url_video
          ) {
            if (statusData.url_enhanced) setFinalImage(statusData.url_enhanced);
            if (statusData.url_video) setFinalVideo(statusData.url_video);

            // Should we clear interval if both arrived? The API processes image then video.
            // But if status is completed, we definitively stop.
            if (
              statusData.project_status === 'completed' ||
              (statusData.url_enhanced && statusData.url_video)
            ) {
              clearInterval(pollInterval);
              setLoadingText('');
            }
          }
        } catch (e) {
          console.error('Polling error', e);
        }
      }, 3000);
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || 'Error occurred during rendering');
    }
  };

  const [isZoomed, setIsZoomed] = useState(false);

  return (
    <div className={styles.container}>
      {isZoomed && finalImage && (
        <div className={styles.zoomOverlay} onClick={() => setIsZoomed(false)}>
          <img src={finalImage} alt="Zoomed Enhanced" className={styles.zoomedImage} />
        </div>
      )}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <img src={assets.logo} alt="Logo" className={styles.logo} />
        </div>
        <button className={styles.backBtn} onClick={() => router.push(`/design/${designId}`)}>
          ← Back to Design
        </button>
        <h3>Captured Angles ({images.length})</h3>
        <div className={styles.imageList}>
          {images.map((img, i) => (
            <img key={img.id} src={img.image} alt={`Angle ${i + 1}`} className={styles.thumbnail} />
          ))}
        </div>
      </div>

      <div className={styles.main}>
        {errorMsg ? (
          <div className={styles.error}>{errorMsg}</div>
        ) : !finalImage && !finalVideo ? (
          <div className={styles.loaderArea}>
            <div className={styles.spinner}></div>
            <p>{loadingText}</p>
          </div>
        ) : (
          <div className={styles.resultArea}>
            <div className={styles.buttonGroup}>
              <button
                className={`${styles.iconBtn} ${viewMode === 'image' ? styles.active : ''}`}
                onClick={() => setViewMode('image')}
                title="View Enhanced Image"
              >
                📸 Image
              </button>
              <button
                className={`${styles.iconBtn} ${viewMode === 'video' ? styles.active : ''}`}
                onClick={() => setViewMode('video')}
                title="View Video"
                disabled={!finalVideo}
              >
                🎥 Video {finalVideo ? '' : '(Processing)'}
              </button>
            </div>

            <div className={styles.mediaContainer}>
              {viewMode === 'image' && finalImage && (
                <img
                  src={finalImage}
                  alt="Enhanced"
                  className={styles.fullMedia}
                  style={{ cursor: 'zoom-in' }}
                  onClick={() => setIsZoomed(true)}
                />
              )}
              {viewMode === 'video' && finalVideo && (
                <video src={finalVideo} controls autoPlay loop className={styles.fullMedia} />
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
