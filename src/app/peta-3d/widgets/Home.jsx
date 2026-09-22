"use client";

import { useCallback } from "react";
import { Paper, IconButton, Tooltip } from "@mui/material";
import HomeIcon from "@mui/icons-material/Home";

export default function Home({ viewer, lokasiAwal,  markerRef }) {
  const handleHome = useCallback(() => {
    if (!viewer || viewer.isDestroyed()) return;
    const Cesium = window.Cesium;
    
    if (markerRef?.current) {
      viewer.entities.remove(markerRef.current);
      markerRef.current = null;
    }

    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(
        lokasiAwal.longitude,
        lokasiAwal.latitude,
        lokasiAwal.ketinggian
      ),
      orientation: {
        heading: Cesium.Math.toRadians(lokasiAwal.heading),
        pitch: Cesium.Math.toRadians(lokasiAwal.pitch),
        roll: 0,
      },
      duration: 1.5,
    });
  }, [viewer, lokasiAwal, markerRef]);

  return (
    <Tooltip title="Kembali ke Beranda Peta" placement="left">
      <Paper
        elevation={3}
        component={IconButton}
        onClick={handleHome}
        sx={{
          width: 40,
          height: 40,
          borderRadius: 1.5,
          bgcolor: "#0F2A24",
          color: "#F4EFE2",
          "&:hover": { bgcolor: "#16332B" },
        }}
      >
        <HomeIcon fontSize="small" />
      </Paper>
    </Tooltip>
  );
}