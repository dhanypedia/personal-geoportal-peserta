"use client";

import { useEffect, useState, useRef } from "react";
import {
  Box,
  Button,
  Typography,
  InputBase,
  Switch,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import { Layers, Delete, Search as SearchIcon } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

const CATALOG_LAYER = "/portal/api/katalog-data-2d/list-public";

const EarthSwitch = styled((props) => (
  <Switch focusVisibleClassName=".Mui-focusVisible" disableRipple {...props} />
))(() => ({
  width: 42,
  height: 26,
  padding: 0,
  "& .MuiSwitch-switchBase": {
    padding: 0,
    margin: 2,
    transitionDuration: "300ms",
    "&.Mui-checked": {
      transform: "translateX(16px)",
      color: "#F4EFE2",
      "& + .MuiSwitch-track": {
        backgroundColor: "#0F2A24",
        opacity: 1,
        border: 0,
      },
    },
  },
  "& .MuiSwitch-thumb": {
    boxSizing: "border-box",
    width: 22,
    height: 22,
  },
  "& .MuiSwitch-track": {
    borderRadius: 13,
    backgroundColor: "#E4DFCF",
    opacity: 1,
    border: "1px solid rgba(15,42,36,.2)",
  },
}));

const formatLayerName = (name) => {
  if (!name) return "";
  const withoutWorkspace = name.includes(":") ? name.split(":")[1] : name;
  return withoutWorkspace
    .replace(/_[a-f0-9]{8}$/i, "")
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
};

export default function CatalogPanel({ open, map, addedLayersRef, onActiveLayersChange }) {
  const leafletRef = useRef(null);
  const [layers, setLayers] = useState([]);
  const [search, setSearch] = useState("");
  const [activeIds, setActiveIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    (async () => {
      leafletRef.current = (await import("leaflet")).default;
    })();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch(CATALOG_LAYER);
        if (!res.ok) throw new Error("Gagal mengambil data katalog");
        const json = await res.json();
        setLayers(json.data || []);
      } catch (err) {
        console.error("Gagal mengambil katalog layer publik:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

   useEffect(() => {
    if (!onActiveLayersChange) return;
    const active = layers
      .filter((item) => activeIds.includes(item.data_2d_id))
      .map((item) => ({
        id: item.data_2d_id,
        layer_name: item.layer_name,
        wms_url: item.wms_url,
        label: formatLayerName(item.layer_name),
      }));
    onActiveLayersChange(active);
  }, [activeIds, layers, onActiveLayersChange]);

  const toggleLayer = (item) => {
    const L = leafletRef.current;
    if (!L || !map) return;

    const isActive = activeIds.includes(item.data_2d_id);

    if (isActive) {
      const existing = addedLayersRef.current[item.data_2d_id];
      if (existing) {
        map.removeLayer(existing);
        delete addedLayersRef.current[item.data_2d_id];
      }
      setActiveIds((prev) => prev.filter((id) => id !== item.data_2d_id));
    } else {
      const wmsLayer = L.tileLayer.wms(item.wms_url, {
        layers: item.layer_name,
        format: "image/png",
        transparent: true,
        version: "1.1.0",
      });
      wmsLayer.addTo(map);
      addedLayersRef.current[item.data_2d_id] = wmsLayer;
      setActiveIds((prev) => [...prev, item.data_2d_id]);
    }
  };

  const filteredLayers = layers.filter((item) =>
  formatLayerName(item.layer_name)
    .toLowerCase()
    .includes(search.trim().toLowerCase())
);

  return (
    <Box
      sx={{
        width: open ? "300px" : "0px",
        height: open ? "600px" : "0px",
        minHeight: open ? "600px" : "0px",
        maxHeight: "600px",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#F4EFE2",
        borderRadius: 2,
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: open ? "13px" : "0px",
        paddingBottom: open ? "13px" : "0px",
        overflow: "hidden",
        transition: "all 0.3s ease",
        boxShadow: open ? "0 4px 20px rgba(0,0,0,0.2)" : "none",
      }}
      id="isi-katalog-layer-public"
    >
      {open && (
        <>
          {/* HEADER */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: "90%",
              height: "50px",
              flexShrink: 0,
            }}
          >
            <Button
              sx={{
                width: "90%",
                height: "40px",
                color: "#F4EFE2",
                backgroundColor: "#0F2A24",
                borderRadius: 1.5,
                fontWeight: "600",
                fontSize: "16px",
                textTransform: "capitalize",
                "&:hover": { backgroundColor: "#16332B" },
              }}
              endIcon={<Layers />}
            >
              Katalog Layer
            </Button>
          </Box>

          {/* SEARCH */}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              width: "90%",
              height: "36px",
              px: 1,
              mb: 1,
              flexShrink: 0,
              borderRadius: "40px",
              border: "1px solid #0F2A2455",
              backgroundColor: "white",
            }}
          >
            <SearchIcon
              sx={{ color: "#0F2A24", opacity: 0.6, mr: 1 }}
              fontSize="small"
            />
            <InputBase
              placeholder="Cari"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ fontSize: 14, flex: 1, color: "#0F2A24" }}
            />
          </Box>

          {/* LIST */}
          <Box
            sx={{
              display: "flex",
              width: "90%",
              flex: 1,
              minHeight: 0,
              overflow: "hidden",
            }}
          >
            <List
              sx={{
                width: "100%",
                overflowY: "auto",
                backgroundColor: "white",
                borderRadius: 1.5,
                "::-webkit-scrollbar": { width: "8px" },
                "::-webkit-scrollbar-track": {
                  borderRadius: "4px",
                  border: "1px solid #E4DFCF",
                  margin: "10px",
                },
                "::-webkit-scrollbar-thumb": {
                  background: "#0F2A24",
                  borderRadius: "5px",
                },
                "::-webkit-scrollbar-thumb:hover": {
                  background: "#16332B",
                },
              }}
            >
              {loading ? (
                <Typography
                  sx={{ textAlign: "center", py: 3, fontSize: 13, color: "#0F2A24" }}
                >
                  Memuat data...
                </Typography>
              ) : error ? (
                <Typography
                  sx={{ textAlign: "center", py: 3, fontSize: 13, color: "#B3261E" }}
                >
                  Gagal memuat data. Silakan coba lagi nanti.
                </Typography>
              ) : filteredLayers.length === 0 ? (
                <Typography
                  sx={{ textAlign: "center", py: 3, fontSize: 13, color: "#0F2A24" }}
                >
                  Tidak ada layer ditemukan
                </Typography>
              ) : (
                filteredLayers.map((item) => (
                  <ListItem
                    key={item.data_2d_id}
                    secondaryAction={
                      <EarthSwitch
                        checked={activeIds.includes(item.data_2d_id)}
                        onChange={() => toggleLayer(item)}
                      />
                    }
                    sx={{ borderBottom: "1px solid #E4DFCF" }}
                  >
                   
                <ListItemText
                    primary={formatLayerName(item.layer_name)}
                    slotProps={{
                        primary: {
                        sx: { fontSize: 13.5, fontWeight: 500, color: "#000000" },
                        },
                    }}
                    />
                  </ListItem>
                ))
              )}
            </List>
          </Box>
        </>
      )}
    </Box>
  );
}