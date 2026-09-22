"use client";

import { useEffect, useRef, useState } from "react";
import { Box, Paper, IconButton, Tooltip, Fade } from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";

const BASEMAPS = {
  jalan: {
    label: "Peta Jalan (OSM)",
    create: (Cesium) =>
      new Cesium.UrlTemplateImageryProvider({
        url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
        subdomains: ["a", "b", "c"],
        credit: "© OpenStreetMap contributors",
      }),
  },
  satelit: {
    label: "Citra Satelit",
    create: (Cesium) =>
      new Cesium.UrlTemplateImageryProvider({
        url: "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        credit: "© Esri",
      }),
  },
};

export default function Basemap({ viewer, activeBasemap, onChangeBasemap }) {
  const [open, setOpen] = useState(false);
  const layerRef = useRef(null);

  useEffect(() => {
    if (!viewer || viewer.isDestroyed()) return;

    const Cesium = window.Cesium;
    const provider = BASEMAPS[activeBasemap].create(Cesium);

    if (layerRef.current) {
      viewer.imageryLayers.remove(layerRef.current, true);
    }
    layerRef.current = viewer.imageryLayers.addImageryProvider(provider);
    viewer.imageryLayers.lowerToBottom(layerRef.current);

    return () => {
      if (!viewer.isDestroyed() && layerRef.current) {
        viewer.imageryLayers.remove(layerRef.current, true);
      }
      layerRef.current = null;
    };
  }, [viewer, activeBasemap]);

  return (
    <Box sx={{ position: "relative" }}>
      <Tooltip title="Pilih Basemap" placement="left">
        <Paper
          elevation={3}
          component={IconButton}
          onClick={() => setOpen((o) => !o)}
          sx={{
            top: 48,
            right: 0,
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: open ? "#D98E3B" : "#0F2A24",
            color: open ? "#0F2A24" : "#F4EFE2",
            "&:hover": { bgcolor: open ? "#C97F2E" : "#16332B" },
          }}
        >
          <LayersIcon fontSize="small" />
        </Paper>
      </Tooltip>

      <Fade in={open}>
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: 0,
            right: 48,
            width: 190,
            borderRadius: 2,
            bgcolor: "#F7F3E7",
            overflow: "hidden",
          }}
        >
          {Object.entries(BASEMAPS).map(([key, bm]) => (
            <Box
              key={key}
              onClick={() => {
                onChangeBasemap(key);
                setOpen(false);
              }}
              sx={{
                px: 2,
                py: 1.2,
                fontSize: 12.5,
                cursor: "pointer",
                color: key === activeBasemap ? "#D98E3B" : "#16241F",
                fontWeight: key === activeBasemap ? 600 : 400,
                bgcolor: key === activeBasemap ? "rgba(217,142,59,0.1)" : "transparent",
                "&:hover": { bgcolor: "rgba(42,157,143,0.08)" },
              }}
            >
              {bm.label}
            </Box>
          ))}
        </Paper>
      </Fade>
    </Box>
  );
}