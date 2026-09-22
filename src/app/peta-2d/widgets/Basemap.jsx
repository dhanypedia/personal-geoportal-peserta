"use client";

import { useCallback, useState } from "react";
import { Box, Paper, IconButton, Tooltip, Fade } from "@mui/material";
import LayersIcon from "@mui/icons-material/Layers";
import { Z_BASEMAP } from "../components/MapComponent";

export default function Basemap({
  L,
  map,
  tileLayerRef,
  basemaps,
  activeBasemap,
  onChangeBasemap,
  buttonSize = 40,
}) {
  const [basemapOpen, setBasemapOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const handleChangeBasemap = useCallback(
    (key) => {
      if (!L || !map || key === activeBasemap) {
        setBasemapOpen(false);
        return;
      }

      const bm = basemaps[key];
      if (!bm) return;

      if (tileLayerRef.current) {
        map.removeLayer(tileLayerRef.current);
      }

      tileLayerRef.current = L.tileLayer(bm.url, {
        attribution: bm.attribution,
        maxZoom: 19,
        // Nilainya tetap, bukan mengikuti urutan pemasangan, supaya basemap
        // yang baru tidak menimpa layer 2D yang sedang aktif. Lihat
        // Z_BASEMAP pada MapComponent.
        zIndex: Z_BASEMAP,
      }).addTo(map);

      onChangeBasemap(key);
      setBasemapOpen(false);
    },
    [L, map, basemaps, activeBasemap, onChangeBasemap, tileLayerRef]
  );

  return (
    <Box sx={{ position: "relative" }}>
      {/* Tooltip dimatikan selama daftarnya terbuka. Letaknya persis di kiri
          tombol, yaitu di atas daftar pilihannya sendiri, sehingga klik pada
          salah satu opsi akan disambut tooltip itu dan tidak sampai ke
          opsinya. */}
      <Tooltip
        title="Pilih Basemap"
        placement="left"
        open={tooltipOpen && !basemapOpen}
        onOpen={() => setTooltipOpen(true)}
        onClose={() => setTooltipOpen(false)}
        arrow
      >
        <Paper
          elevation={3}
          component={IconButton}
          onClick={() => {
            setBasemapOpen((o) => !o);
            setTooltipOpen(false);
          }}
          sx={{
            width: buttonSize,
            height: buttonSize,
            borderRadius: 1.5,
            bgcolor: basemapOpen ? "#D98E3B" : "#0F2A24",
            color: basemapOpen ? "#0F2A24" : "#F4EFE2",
            "&:hover": { bgcolor: basemapOpen ? "#C97F2E" : "#16332B" },
          }}
        >
          <LayersIcon fontSize="small" />
        </Paper>
      </Tooltip>

      <Fade in={basemapOpen}>
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: 0,
            right: buttonSize + 8,
            width: 190,
            borderRadius: 2,
            bgcolor: "#F7F3E7",
            overflow: "hidden",
            display: basemapOpen ? "block" : "none",
          }}
        >
          {Object.entries(basemaps).map(([key, bm]) => (
            <Box
              key={key}
              onClick={() => handleChangeBasemap(key)}
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