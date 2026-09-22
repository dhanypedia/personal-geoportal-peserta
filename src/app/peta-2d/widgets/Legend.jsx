"use client";

import { useMemo, useState } from "react";
import { Box, Paper, IconButton, Tooltip, Fade, Typography } from "@mui/material";
import FormatListBulletedIcon from "@mui/icons-material/FormatListBulleted";


const GEOSERVER_HOST = "https://matiur-geoportal.com";

function buildLegendUrl(layer_name) {
  if (!layer_name || !GEOSERVER_HOST) return null;

  const colonIdx = layer_name.indexOf(":");
  const workspace = colonIdx > -1 ? layer_name.slice(0, colonIdx) : "geoportal";
  const wmsEndpoint = `${GEOSERVER_HOST}/geoserver/${workspace}/wms`;

  const params = new URLSearchParams({
    service: "WMS",
    version: "1.1.0",
    request: "GetLegendGraphic",
    format: "image/png",
    layer: layer_name,
    LEGEND_OPTIONS: "fontAntiAliasing:true;fontSize:11;forceLabels:on",
  });
  return `${wmsEndpoint}?${params.toString()}`;
}

export default function Legend({ activeLayers = [], dropdownSide = "right" }) {
  const [legendOpen, setLegendOpen] = useState(false);
  const [failedIds, setFailedIds] = useState({});

  const legendItems = useMemo(
    () =>
      activeLayers
        .map((item) => ({
          id: item.id,
          label: item.label,
          url: buildLegendUrl(item.layer_name),
        }))
        .filter((item) => item.url),
    [activeLayers]
  );

  const sideStyle =
    dropdownSide === "left" ? { right: 48 } : { left: 48 };

  return (
    <Box sx={{ position: "relative" }}>
      <Tooltip title="Legenda" placement={dropdownSide === "left" ? "left" : "right"}>
        <Paper
          elevation={3}
          component={IconButton}
          onClick={() => setLegendOpen((o) => !o)}
          sx={{
            width: 40,
            height: 40,
            borderRadius: 1.5,
            bgcolor: legendOpen ? "#D98E3B" : "#0F2A24",
            color: legendOpen ? "#0F2A24" : "#F4EFE2",
            "&:hover": { bgcolor: legendOpen ? "#C97F2E" : "#16332B" },
          }}
        >
          <FormatListBulletedIcon fontSize="small" />
        </Paper>
      </Tooltip>

      <Fade in={legendOpen}>
        <Paper
          elevation={4}
          sx={{
            position: "absolute",
            top: 0,
            ...sideStyle,
            width: 240,
            maxHeight: 320,
            borderRadius: 2,
            bgcolor: "#F7F3E7",
            overflow: "hidden",
            display: legendOpen ? "flex" : "none",
            flexDirection: "column",
          }}
        >
          <Box
            sx={{
              px: 2,
              py: 1,
              bgcolor: "#0F2A24",
              flexShrink: 0,
            }}
          >
            <Typography
              sx={{ color: "#F4EFE2", fontWeight: 700, fontSize: 13 }}
            >
              Legenda
            </Typography>
          </Box>

          <Box
            sx={{
              px: 1.5,
              py: 1.2,
              overflowY: "auto",
              "::-webkit-scrollbar": { width: "6px" },
              "::-webkit-scrollbar-thumb": {
                background: "#0F2A24",
                borderRadius: "4px",
              },
            }}
          >
            {legendItems.length === 0 ? (
              <Typography
                sx={{
                  fontSize: 12,
                  color: "#16241F",
                  opacity: 0.7,
                  fontStyle: "italic",
                  textAlign: "center",
                  py: 2,
                }}
              >
                Belum ada layer aktif.
                <br />
                Pilih layer dari Katalog terlebih dahulu.
              </Typography>
            ) : (
              legendItems.map((item) => (
                <Box key={item.id} sx={{ mb: 1.2 }}>
                  <Typography
                    sx={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "#16241F",
                      mb: 0.4,
                    }}
                  >
                    {item.label}
                  </Typography>

                  {failedIds[item.id] ? (
                    <Typography
                      sx={{
                        fontSize: 11,
                        color: "#B3261E",
                        fontStyle: "italic",
                      }}
                    >
                      Legenda gagal dimuat untuk layer ini.
                    </Typography>
                  ) : (
                    <Box
                      component="img"
                      src={item.url}
                      alt={item.label}
                      sx={{
                        maxWidth: "100%",
                        display: "block",
                        bgcolor: "white",
                        borderRadius: 1,
                        border: "1px solid #E4DFCF",
                      }}
                      onError={() => {
                        console.error("Legend: gagal memuat GetLegendGraphic:", item.url);
                        setFailedIds((prev) => ({ ...prev, [item.id]: true }));
                      }}
                    />
                  )}
                </Box>
              ))
            )}
          </Box>
        </Paper>
      </Fade>
    </Box>
  );
}