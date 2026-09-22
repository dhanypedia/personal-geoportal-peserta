"use client";

import { Box, Paper, IconButton, Tooltip } from "@mui/material";
import WestIcon from '@mui/icons-material/West';
import EastIcon from '@mui/icons-material/East';
import PhotoCameraIcon from '@mui/icons-material/PhotoCamera';

/**
 * CameraNav
 *
 * Adaptasi dari addCameraNav() (vanilla DOM) jadi komponen React biasa,
 * supaya konsisten dengan widget lain (Zoom, Basemap): Paper + IconButton,
 * tidak lagi manipulasi document.createElement.
 *
 * Logika kameranya (putar kiri/kanan, reset ke posisi awal) sama persis
 * dengan versi aslinya, cuma dipindah jadi handler React.
 *
 * Props:
 * - viewer: instance Cesium.Viewer
 * - lokasiAwal: { latitude, longitude, ketinggian, heading, pitch, roll } — dipakai untuk tombol Reset
 * - buttonSize: ukuran tiap tombol (default 40, mengikuti widget lain)
 */
export default function CameraNav({ viewer, lokasiAwal, buttonSize = 40 }) {
  const getCesium = () => window.Cesium;

  const terbangKe = (latitude, longitude, ketinggian, heading = 0, pitch = -30, roll = 0) => {
    const Cesium = getCesium();
    if (!viewer || !Cesium) return;
    viewer.camera.flyTo({
      destination: Cesium.Cartesian3.fromDegrees(longitude, latitude, ketinggian),
      orientation: {
        heading: Cesium.Math.toRadians(heading),
        pitch: Cesium.Math.toRadians(pitch),
        roll: Cesium.Math.toRadians(roll),
      },
    });
  };

  const putarKiri = () => {
    const Cesium = getCesium();
    if (!viewer || !Cesium) return;
    viewer.camera.setView({
      orientation: {
        heading: viewer.camera.heading - Cesium.Math.toRadians(15),
        pitch: viewer.camera.pitch,
        roll: viewer.camera.roll,
      },
    });
  };

  const putarKanan = () => {
    const Cesium = getCesium();
    if (!viewer || !Cesium) return;
    viewer.camera.setView({
      orientation: {
        heading: viewer.camera.heading + Cesium.Math.toRadians(15),
        pitch: viewer.camera.pitch,
        roll: viewer.camera.roll,
      },
    });
  };

  const resetKeAwal = () => {
    if (!lokasiAwal) return;
    terbangKe(
      lokasiAwal.latitude,
      lokasiAwal.longitude,
      lokasiAwal.ketinggian,
      lokasiAwal.heading ?? 0,
      lokasiAwal.pitch ?? -30,
      lokasiAwal.roll ?? 0
    );
  };

  const btnSx = {
    width: buttonSize,
    height: buttonSize,
    borderRadius: 0,
    bgcolor: "#0F2A24",
    color: "#F4EFE2",
    "&:hover": { bgcolor: "#16332B" },
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        borderRadius: 1.5,
        overflow: "hidden",
        boxShadow: 3,
      }}
    >
      <Tooltip title="Putar Kiri" placement="top">
        <Paper
          elevation={0}
          component={IconButton}
          onClick={putarKiri}
          sx={{ ...btnSx, borderTopLeftRadius: 6, borderBottomLeftRadius: 6 }}
        >
          <WestIcon fontSize="small" />
        </Paper>
      </Tooltip>

      <Box sx={{ width: "1px", bgcolor: "rgba(244,239,226,0.15)" }} />

      <Tooltip title="Reset Kamera" placement="top">
        <Paper elevation={0} component={IconButton} onClick={resetKeAwal} sx={btnSx}>
          <PhotoCameraIcon fontSize="small" />
        </Paper>
      </Tooltip>

      <Box sx={{ width: "1px", bgcolor: "rgba(244,239,226,0.15)" }} />

      <Tooltip title="Putar Kanan" placement="top">
        <Paper
          elevation={0}
          component={IconButton}
          onClick={putarKanan}
          sx={{ ...btnSx, borderTopRightRadius: 6, borderBottomRightRadius: 6 }}
        >
          <EastIcon fontSize="small" />
        </Paper>
      </Tooltip>
    </Box>
  );
}