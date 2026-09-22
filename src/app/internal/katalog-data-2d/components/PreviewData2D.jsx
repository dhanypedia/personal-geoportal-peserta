"use client";

import { useEffect, useRef, useState } from "react";
import {
    Dialog, DialogTitle, DialogContent, IconButton, Box, CircularProgress, Alert,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import "leaflet/dist/leaflet.css";

// Tambahkan/replace query param "token" pada sebuah URL (menjaga query param lain yang sudah ada)
function withTokenParam(url, token) {
    const separator = url.includes("?") ? "&" : "?";
    return `${url}${separator}token=${encodeURIComponent(token)}`;
}

export default function PreviewData2D({ open, onClose, row, accessToken }) {
    const mapContainerRef = useRef(null);
    const mapRef = useRef(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        if (!open || !row?.wms_url || !accessToken) return;

        let cancelled = false;

        const initMap = async () => {
            setLoading(true);
            setError(null);
            try {
                const L = (await import("leaflet")).default;

                // Bersihkan instance map sebelumnya jika ada (mis. saat ganti row)
                if (mapRef.current) {
                    mapRef.current.remove();
                    mapRef.current = null;
                }
                if (cancelled || !mapContainerRef.current) return;

                const map = L.map(mapContainerRef.current, {
                    center: [-6.2, 106.816666], // fallback: Jakarta
                    zoom: 12,
                });
                mapRef.current = map;

                L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
                    attribution: "&copy; OpenStreetMap contributors",
                    maxZoom: 19,
                }).addTo(map);

                // Tile WMS di-load Leaflet lewat <img src="...">, sehingga tidak bisa
                // menyertakan header Authorization -> token disisipkan sebagai query param.
                const wmsUrlWithToken = withTokenParam(row.wms_url, accessToken);

                const wmsLayer = L.tileLayer.wms(wmsUrlWithToken, {
                    layers: row.layer_name,
                    format: "image/png",
                    transparent: true,
                    version: "1.1.0",
                });

                wmsLayer.on("tileerror", () => {
                    if (!cancelled) {
                        setError("Gagal memuat tile WMS. Pastikan token valid dan Anda punya akses ke layer ini.");
                    }
                });

                wmsLayer.addTo(map);

                // Best-effort: fit bounds pakai geometri asli via WFS (proxy, dengan header Authorization)
                if (row.wfs_url) {
                    try {
                        const res = await fetch(row.wfs_url, {
                            headers: { Authorization: `Bearer ${accessToken}` },
                        });
                        if (res.ok) {
                            const geojson = await res.json();
                            if (geojson?.features?.length) {
                                const geoLayer = L.geoJSON(geojson);
                                const bounds = geoLayer.getBounds();
                                if (bounds.isValid() && !cancelled) {
                                    map.fitBounds(bounds, { padding: [20, 20] });
                                }
                            }
                        }
                    } catch {
                        // diamkan; tetap pakai center default
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