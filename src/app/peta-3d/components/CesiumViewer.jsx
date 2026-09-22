'use client';

import { useEffect, useRef, useState } from 'react';
import { Box } from '@mui/material';
import Home from '../widgets/Home';
import Basemap from '../widgets/Basemap';
import Locate from '../widgets/Locate';
import FullScreen from '../widgets/FullScreen';

import Search from '../widgets/Search';
import Bahasa from '../widgets/Bahasa';
import Katalog3D from '../widgets/Katalog3D';
import Zoom from '../widgets/Zoom';
import CameraNav from '../widgets/CameraNav';


const CESIUM_VERSION = '1.120';
const CESIUM_BASE_URL = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium/`;
const CESIUM_SCRIPT_URL = `${CESIUM_BASE_URL}Cesium.js`;
const CESIUM_STYLE_URL = `${CESIUM_BASE_URL}Widgets/widgets.css`;

const LOKASI_AWAL = {
  latitude: -6.2432495,
  longitude: 106.7979208,
  ketinggian: 2000,
  heading: 20,
  pitch: -35,
};

const VIEWER_OPTIONS = {
  timeline: false,
  animation: false,
  baseLayerPicker: false,
  geocoder: false,
  homeButton: false,        
  navigationHelpButton: false,
  sceneModePicker: false,
  infoBox: false,
  selectionIndicator: false,
  shadows: true,
  fullscreenButton: false,  
                             
};

function LoadCesium(onBerhasil, onGagal) {
  if (window.Cesium) {
    onBerhasil();
    return;
  }

  const cssTag = document.createElement('link');
  cssTag.rel = 'stylesheet';
  cssTag.href = CESIUM_STYLE_URL;
  document.head.appendChild(cssTag);

  const scriptTag = document.createElement('script');
  scriptTag.src = CESIUM_SCRIPT_URL;
  scriptTag.async = true;
  scriptTag.onload = onBerhasil;
  scriptTag.onerror = () =>
    onGagal('Gagal memuat CesiumJS dari CDN. Cek koneksi internet.');
  document.body.appendChild(scriptTag);
}

function createViewerCesium(container) {
  const Cesium = window.Cesium;
  Cesium.buildModuleUrl.setBaseUrl(CESIUM_BASE_URL);

  Cesium.Ion.defaultAccessToken = process.env.NEXT_PUBLIC_CESIUM_ION_TOKEN;

  const viewer = new Cesium.Viewer(container, {
    ...VIEWER_OPTIONS,
    terrainProvider: new Cesium.EllipsoidTerrainProvider(),
    imageryProvider: false,
  });

  viewer.scene.globe.depthTestAgainstTerrain = true;
  viewer.scene.globe.enableLighting = true;
  viewer.scene.light = new Cesium.SunLight();

  viewer.camera.setView({
    destination: Cesium.Cartesian3.fromDegrees(
      LOKASI_AWAL.longitude,
      LOKASI_AWAL.latitude,
      LOKASI_AWAL.ketinggian
    ),
    orientation: {
      heading: Cesium.Math.toRadians(LOKASI_AWAL.heading),
      pitch: Cesium.Math.toRadians(LOKASI_AWAL.pitch),
      roll: 0,
    },
  });

  return viewer;
}

export default function CesiumViewer() {
  const containerRef = useRef(null);
  const viewerRef = useRef(null);
  const [viewer, setViewer] = useState(null);
  const markerRef = useRef(null);
  const userMarkerRef = useRef(null);
  const [bahasa, setBahasa] = useState('id');
  const [activeBasemap, setActiveBasemap] = useState('jalan');
  const addedModelsRef = useRef({});
  const [status, setStatus] = useState('memuat');
  const [pesanError, setPesanError] = useState('');

  useEffect(() => {
    LoadCesium(
      () => setStatus('siap'),
      (pesan) => {
        setPesanError(pesan);
        setStatus('error');
      }
    );
  }, []);

  useEffect(() => {
    if (status !== 'siap' || viewerRef.current) return;

    try {
      viewerRef.current = createViewerCesium(containerRef.current);
      setViewer(viewerRef.current);
    } catch (err) {
      console.error('Cesium init error:', err);
      setPesanError('Gagal membuat peta. Cek console untuk detail.');
      setStatus('error');
    }

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
      setViewer(null);
    };
  }, [status]);

  return (
    <Box sx={{ position: 'relative', width: '100%', height: '100vh' }}>
      <div ref={containerRef} style={{ width: '100%', height: '100%' }} />

      {viewer && (
        <>
          <Box
            sx={{
              position: 'absolute',
              top: { xs: 88, md: 100 },
              left: { xs: 12, md: 32 },
              zIndex: 1000,
            }}
          >
            <Katalog3D viewer={viewer} addedModelsRef={addedModelsRef} buttonSize={40} />
          </Box>

          <Box
            sx={{
              position: 'absolute',
              top: { xs: 84, md: 96 },
              right: 16,
              zIndex: 1000,
              display: 'inline-flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 0.75,
            }}
          >
            <Box sx={{ display: 'flex', gap: 5, padding: 1 }}>
              <Home viewer={viewer} lokasiAwal={LOKASI_AWAL} markerRef={markerRef} />
              <Locate viewer={viewer} userMarkerRef={userMarkerRef} buttonSize={40} tooltip="left" />
              <FullScreen buttonSize={40} tooltip="bottom" />
              <Bahasa buttonSize={40} tooltip="bottom" bahasa={bahasa} setBahasa={setBahasa} />
            </Box>

            <Box sx={{ width: '100%' }}>
              <Search viewer={viewer} markerRef={markerRef} />
            </Box>
          </Box>

          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: 24, md: 20 },
              right: { xs: 24, md: 20 },
              zIndex: 1000,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
              alignItems: 'flex-end',
            }}
          >
            <Basemap
              viewer={viewer}
              activeBasemap={activeBasemap}
              onChangeBasemap={setActiveBasemap}
            />
            <Zoom viewer={viewer} buttonSize={40} />
          </Box>

          <Box
            sx={{
              position: 'absolute',
              bottom: { xs: 24, md: 32 },
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 1000,
            }}
          >
            <CameraNav viewer={viewer} lokasiAwal={LOKASI_AWAL} buttonSize={40} />
          </Box>
        </>
      )}
      {status === 'error' && <p>{pesanError}</p>}
    </Box>
  );
}