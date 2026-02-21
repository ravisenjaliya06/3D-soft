import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import commonService from '@/services/CommonService';
import { API_ENDPOINT } from '@/services/ApiEndPoints';
import styles from './rendering.module.css';
import { assets } from '@/svgPaths';

interface RenderImage {
  id: string;
  image: string;
}

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
      const designRes = await commonService.get(API_ENDPOINT.GET_DESIGN_SETTINGS(id).replace('/settings/', '/'));
      const designData = designRes.data || designRes;
      let projectId = designData.rendering_project_id;

      if (!projectId) {
        setLoadingText('Creating remote project...');
        
        // Fetch 1st image as file
        const firstImageRes = await fetch(fetchedImages[0].image);
        const firstImageBlob = await firstImageRes.blob();

        const projectFormData = new FormData();
        projectFormData.append('name', `Design ${id}`);
        projectFormData.append('file', firstImageBlob, '1.png');

        const projectRes = await fetch('http://65.0.103.173/api/v1/projects/', {
          method: 'POST',
          body: projectFormData
        });
        if (!projectRes.ok) throw new Error('Failed to create remote project');
        const projectData = await projectRes.json();
        projectId = projectData.id;

        // Save new project ID to backend
        await commonService.put(API_ENDPOINT.GET_DESIGN_SETTINGS(id).replace('/settings/', '/'), { rendering_project_id: projectId });

        if (fetchedImages.length > 1) {
          setLoadingText(`Uploading ${fetchedImages.length - 1} remaining images...`);
          const remainingFormData = new FormData();
          for (let i = 1; i < fetchedImages.length; i++) {
            const imgRes = await fetch(fetchedImages[i].image);
            const imgBlob = await imgRes.blob();
            remainingFormData.append('files', imgBlob, `${i + 1}.png`);
          }
          const uploadRes = await fetch(`http://65.0.103.173/api/v1/projects/${projectId}/images`, {
            method: 'POST',
            body: remainingFormData
          });
          if (!uploadRes.ok) throw new Error('Failed to upload remaining images');
        }

        setLoadingText('Starting processing...');
        const processRes = await fetch(`http://65.0.103.173/api/v1/projects/${projectId}/process`, {
          method: 'POST'
        });
        if (!processRes.ok) throw new Error('Failed to start processing');
      }

      setLoadingText('Rendering...');
      // Polling
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`http://65.0.103.173/api/v1/projects/${projectId}/status`);
          const statusData = await statusRes.json();

          if (statusData.error_message) {
            clearInterval(pollInterval);
            setErrorMsg(statusData.error_message);
            return;
          }

          if (statusData.project_status === 'completed' || (statusData.cloudinary_url_enhanced || statusData.cloudinary_url_video)) {
            if (statusData.cloudinary_url_enhanced) setFinalImage(statusData.cloudinary_url_enhanced);
            if (statusData.cloudinary_url_video) setFinalVideo(statusData.cloudinary_url_video);
            
            // Should we clear interval if both arrived? The API processes image then video.
            // But if status is completed, we definitively stop.
            if (statusData.project_status === 'completed' || (statusData.cloudinary_url_enhanced && statusData.cloudinary_url_video)) {
              clearInterval(pollInterval);
              setLoadingText('');
            }
          }
        } catch (e) {
          console.error("Polling error", e);
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
            <img key={img.id} src={img.image} alt={`Angle ${i+1}`} className={styles.thumbnail} />
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
