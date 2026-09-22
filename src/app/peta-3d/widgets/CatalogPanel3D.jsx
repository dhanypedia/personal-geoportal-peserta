"use client";

import { useEffect, useState } from "react";
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
import { ViewInAr, Search as SearchIcon } from "@mui/icons-material";
import { styled } from "@mui/material/styles";

const CATALOG_3D = "/portal/api/katalog-data-3d/list-public-glb";

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
  "& .MuiSwitch-thumb": { boxSizing: "border-box", width: 22, height: 22 },
  "& .MuiSwitch-track": {
    borderRadius: 13,
    backgroundColor: "#E4DFCF",
    opacity: 1,
    border: "1px solid rgba(15,42,36,.2)",
  },
}));

export default function CatalogPanel3D({ open, viewer, addedModelsRef }) {
  const [models, setModels] = useState([]);
  const [search, setSearch] = useState("");
  const [activeIds, setActiveIds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(false);
        const res = await fetch(CATALOG_3D);
        if (!res.ok) throw new Error("Gagal mengambil data katalog 3D");
        const json = await res.json();
        setModels(json.data || []);
      } catch (err) {
        console.error("Gagal mengambil katalog 3D publik:", err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);


  useEffect(() => {
    return () => {
      const v = viewer;
      if (!v || v.isDestroyed()) return;
      Object.values(addedModelsRef.current).forEach((entity) => {
        v.entities.remove(entity);
      });
      addedModelsRef.current = {};
    };
  }, []);

  const toggleModel = (item) => {
    const Cesium = window.Cesium;
    if (!Cesium || !viewer || viewer.isDestroyed()) return;

    const id = item.data_3d_id;
    const isActive = activeIds.includes(id);

    if (isActive) {
      const existing = addedModelsRef.current[id];
      if (existing) {
        viewer.entities.remove(existing);
        delete addedModelsRef.current[id];
      }
      setActiveIds((prev) => prev.filter((x) => x !== id));
      return;
    }

    const lat = Number(item.latitude);
    const lon = Number(item.longitude);
    if (Number.isNaN(lat) || Number.isNaN(lon)) {
      console.error("Koordinat model tidak valid:", item);
      return;
    }

    const position = Cesium.Cartesian3.fromDegrees(lon, lat, 0);
    const hpr = new Cesium.HeadingPitchRoll(
      Cesium.Math.toRadians(Number(item.heading) || 0),
      Cesium.Math.toRadians(Number(item.pitch) || 0),
      Cesium.Math.toRadians(Number(item.roll) || 0)
    );
    const orientation = Cesium.Transforms.headingPitchRollQuaternion(
      position,
      hpr
    );

    const entity = viewer.entities.add({
      name: item.model_name,
      position,
      orientation,
      model: {
        // Alamat dibangun dari id, bukan dari url yang tersimpan. Alamat yang
        // tersimpan dibuat saat berkas diunggah, sehingga masih menunjuk ke
        // alamat aplikasi yang lama setelah peserta pindah dari alamat IP ke
        // subdomain, dan modelnya gagal dimuat.
        uri: `/portal/api/katalog-data-3d/models/${item.data_3d_id}`,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        shadows: Cesium.ShadowMode.ENABLED,
      },
    });

    addedModelsRef.current[id] = entity;
    setActiveIds((prev) => [...prev, id]);

    viewer.flyTo(entity, {
      duration: 1.5,
      offset: new Cesium.HeadingPitchRange(
        Cesium.Math.toRadians(Number(item.heading) || 0),
        Cesium.Math.toRadians(-30),
        150
      ),
    });
  };

  const filteredModels = models.filter((item) =>
    (item.model_name || "").toLowerCase().includes(search.toLowerCase())
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
      id="isi-katalog-layer-3d-public"
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
              endIcon={<ViewInAr />}
            >
              Katalog Model 3D
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
                "::-webkit-scrollbar-thumb:hover": { background: "#16332B" },
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
              ) : filteredModels.length === 0 ? (
                <Typography
                  sx={{ textAlign: "center", py: 3, fontSize: 13, color: "#0F2A24" }}
                >
                  Tidak ada model ditemukan
                </Typography>
              ) : (
                filteredModels.map((item) => (
                  <ListItem
                    key={item.data_3d_id}
                    secondaryAction={
                      <EarthSwitch
                        checked={activeIds.includes(item.data_3d_id)}
                        onChange={() => toggleModel(item)}
                      />
                    }
                    sx={{ borderBottom: "1px solid #E4DFCF" }}
                  >
                    <ListItemText
                      primary={item.model_name}
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