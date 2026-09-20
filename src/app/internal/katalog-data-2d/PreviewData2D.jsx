"use client";

import { useEffect, useRef, useState } from "react";
import {
  Alert, Box, CircularProgress, Dialog, DialogContent, DialogTitle, IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "leaflet/dist/leaflet.css";

const PROXY_URL = "/portal/api/katalog-data-2d/proxy";

// Tile WMS dimuat Leaflet lewat <img>, sehingga header Authorization tidak
// bisa disertakan. Token dikirim sebagai query string dan diperiksa proxy.
function withTokenParam(url, token) {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}token=${encodeURIComponent(token)}`;
}

// Pratinjau layer 2D di atas peta Leaflet. Permintaan selalu lewat proxy
// supaya layer private (yang alamat GeoServer-nya butuh Basic Auth) tetap
// dapat ditampilkan, sekaligus menyembunyikan alamat GeoServer asli.
export default function PreviewData2D({ open, onClose, row, accessToken }) {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open || !row?.layer_name || !accessToken) return;

    let cancelled = false;

    const initMap = async () => {
      setLoading(true);
      setError(null);
      try {
        const mod = await import("leaflet");
        const L = mod.default ?? mod;

        // Instance peta sebelumnya harus dibuang, kalau tidak kontainernya
        // ditolak Leaflet saat baris lain dibuka ("already initialized").
        if (mapRef.current) {
          mapRef.current.remove();
          mapRef.current = null;
        }
        if (cancelled || !mapContainerRef.current) return;

        const map = L.map(mapContainerRef.current, {
          center: [-6.2, 106.816666], // Jakarta, dipakai sebelum bounds diketahui
          zoom: 12,
        });
        mapRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
          attribution: "&copy; OpenStreetMap contributors",
          maxZoom: 19,
        }).addTo(map);

        const wmsUrl = row.data_2d_id
          ? `${PROXY_URL}?type=wms&data_2d_id=${row.data_2d_id}`
          : row.wms_url;

        const wmsLayer = L.tileLayer.wms(withTokenParam(wmsUrl, accessToken), {
          layers: row.layer_name,
          format: "image/png",
          transparent: true,
          version: "1.1.0",
        });

        wmsLayer.on("tileerror", () => {
          if (!cancelled) {
            setError("Gagal memuat tile WMS. Pastikan token masih berlaku dan Anda punya akses ke layer ini.");
          }
        });

        wmsLayer.addTo(map);

        // Bounds diambil dari geometri aslinya lewat WFS. Bila gagal, peta
        // tetap tampil dengan titik tengah bawaan.
        const wfsUrl = row.data_2d_id
          ? `${PROXY_URL}?type=wfs&data_2d_id=${row.data_2d_id}`
          : row.wfs_url;

        if (wfsUrl) {
          try {
            const res = await fetch(wfsUrl, {
              headers: { Authorization: `Bearer ${accessToken}` },
            });
            if (res.ok) {
              const geojson = await res.json();
              if (geojson?.features?.length) {
                const bounds = L.geoJSON(geojson).getBounds();
                if (bounds.isValid() && !cancelled) {
                  map.fitBounds(bounds, { padding: [20, 20] });
                }
              }
            }
          } catch {
            // Diamkan, bukan kegagalan yang perlu dilaporkan ke pengguna.
          }
        }
      } catch (err) {
        if (!cancelled) setError(err.message || "Gagal memuat peta");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    initMap();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [open, row, accessToken]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      slotProps={{ paper: { sx: { bgcolor: "#fff", color: "#1E1E2D", borderRadius: 3 } } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 700,
          color: "#1E1E2D",
        }}
      >
        Preview: {row?.layer_name || "-"}
        <IconButton onClick={onClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ p: 0 }}>
        {error && (
          <Alert severity="error" sx={{ m: 2 }}>
            {error}
          </Alert>
        )}
        <Box sx={{ position: "relative", height: 500, width: "100%" }}>
          {loading && (
            <Box
              sx={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                zIndex: 10,
                bgcolor: "rgba(255,255,255,0.6)",
              }}
            >
              <CircularProgress size={28} />
            </Box>
          )}
          <Box ref={mapContainerRef} sx={{ height: "100%", width: "100%" }} />
        </Box>
      </DialogContent>
    </Dialog>
  );
}
