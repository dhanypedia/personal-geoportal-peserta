"use client";

import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";

const CESIUM_VERSION = "1.120";
const CESIUM_BASE_URL = `https://cesium.com/downloads/cesiumjs/releases/${CESIUM_VERSION}/Build/Cesium/`;
const CESIUM_SCRIPT_URL = `${CESIUM_BASE_URL}Cesium.js`;
const CESIUM_STYLE_URL = `${CESIUM_BASE_URL}Widgets/widgets.css`;

function loadCesiumCDN(onSuccess, onError) {
    if (window.Cesium) {
        onSuccess();
        return;
    }

    if (!document.querySelector(`link[href="${CESIUM_STYLE_URL}"]`)) {
        const cssTag = document.createElement("link");
        cssTag.rel = "stylesheet";
        cssTag.href = CESIUM_STYLE_URL;
        document.head.appendChild(cssTag);
    }

    if (!document.querySelector(`script[src="${CESIUM_SCRIPT_URL}"]`)) {
        const scriptTag = document.createElement("script");
        scriptTag.src = CESIUM_SCRIPT_URL;
        scriptTag.async = true;
        scriptTag.onload = onSuccess;
        scriptTag.onerror = () => onError("Gagal memuat CesiumJS dari CDN.");
        document.body.appendChild(scriptTag);
    } else {
        const existingScript = document.querySelector(`script[src="${CESIUM_SCRIPT_URL}"]`);
        existingScript.addEventListener("load", onSuccess);
        existingScript.addEventListener("error", () => onError("Gagal memuat CesiumJS dari CDN."));
    }
}

export default function PreviewCesiumModal({ openPreview, item, handleClosePreview, accessToken }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [status, setStatus] = useState("idle");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!openPreview) return;

        setStatus("memuat");
        loadCesiumCDN(
            () => setStatus("siap"),
            (errMsg) => {
                setErrorMessage(errMsg);
                setStatus("error");
            }
        );
    }, [openPreview]);

    useEffect(() => {
        if (!openPreview || status !== "siap" || !containerRef.current || viewerRef.current || !item) return;

        const Cesium = window.Cesium;
        Cesium.buildModuleUrl.setBaseUrl(CESIUM_BASE_URL);

        // 1. Matikan Cesium Ion secara eksplisit agar tidak melempar HTTP 401
        Cesium.Ion.defaultAccessToken = "";

        const lat = Number(item.latitude);
        const lon = Number(item.longitude);

        // Fallback ke 0 kalau heading/pitch/roll tidak ada / bukan angka valid
        const headingDeg = Number.isFinite(Number(item.heading)) ? Number(item.heading) : 0;
        const pitchDeg = Number.isFinite(Number(item.pitch)) ? Number(item.pitch) : 0;
        const rollDeg = Number.isFinite(Number(item.roll)) ? Number(item.roll) : 0;

        if (!item.data_3d_id || !Number.isFinite(lat) || !Number.isFinite(lon)) {
            setErrorMessage("URL file GLB atau koordinat tidak valid.");
            setStatus("error");
            return;
        }

        try {
            // 2. Inisialisasi Viewer tanpa menggunakan layer bawaan Cesium Ion
            const viewer = new Cesium.Viewer(containerRef.current, {
                baseLayer: false, // Matikan Bing Maps / Cesium Ion default layer
                terrainProvider: new Cesium.EllipsoidTerrainProvider(), // Pakai Ellipsoid sederhana tanpa Cesium Ion Terrain
                timeline: false,
                animation: false,
                baseLayerPicker: false,
                geocoder: false,
                homeButton: true,
                navigationHelpButton: false,
                sceneModePicker: false,
                infoBox: false,
                selectionIndicator: false,
            });

            viewerRef.current = viewer;

            // 3. Tambahkan Basemap OpenStreetMap lokal/eksternal yang tidak butuh token
            viewer.imageryLayers.addImageryProvider(
                new Cesium.UrlTemplateImageryProvider({
                    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
                    subdomains: ["a", "b", "c"],
                    credit: "© OpenStreetMap contributors",
                    maximumLevel: 19, // OSM tile server tidak menyediakan tile di atas level 19
                })
            );

            // 4. Hitung posisi dan orientasi (heading/pitch/roll) model
            const position = Cesium.Cartesian3.fromDegrees(lon, lat, 0);

            const heading = Cesium.Math.toRadians(headingDeg);
            const pitch = Cesium.Math.toRadians(pitchDeg);
            const roll = Cesium.Math.toRadians(rollDeg);
            const hpr = new Cesium.HeadingPitchRoll(heading, pitch, roll);

            // orientation harus berupa CallbackProperty/Quaternion agar konsisten
            // dengan posisi yang bisa clamp ke tanah (ellipsoid sistem lokal)
            const orientation = new Cesium.CallbackProperty(() => {
                return Cesium.Transforms.headingPitchRollQuaternion(position, hpr);
            }, false);

            // 5. Tambahkan Model 3D dengan orientasi
            const modelEntity = viewer.entities.add({
                position,
                orientation,
                model: {
                    uri: `/portal/api/katalog-data-3d/models/${item.data_3d_id}?access_token=${accessToken}`,
                    scale: item.scale,
                    heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
                },
            });

            viewer.zoomTo(modelEntity).catch((err) => {
                console.error("Gagal Zoom:", err?.message || err);
            });

        } catch (err) {
            console.error("Cesium Viewer Error:", err);
            setErrorMessage("Gagal menginisialisasi peta 3D.");
            setStatus("error");
        }

        return () => {
            if (viewerRef.current) {
                viewerRef.current.destroy();
                viewerRef.current = null;
            }
        };
    }, [openPreview, status, item]);

    if (!openPreview) return null;

    return (
        <Box
            sx={{
                display: "flex",
                flexDirection: "column",
                position: "absolute",
                top: "50%",
                left: "50%",
                transform: "translate(-50%, -50%)",
                width: { xs: "90%", sm: 600, md: 700 },
                bgcolor: "#fff",
                color: "#1E1E2D",
                borderRadius: 3,
                boxShadow: 24,
                p: 3,
                outline: "none",
            }}>
            <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "space-between", marginBottom: 3 }}>
                <Typography id="modal-tambah-data-3d" variant="h6" sx={{ fontWeight: 700, color: "#1E1E2D" }}>
                    {item?.model_name}
                </Typography>
                <IconButton onClick={handleClosePreview} size="small" sx={{ color: "#6B7280" }}>
                    <Close />
                </IconButton>
            </Box>
            <Box
                sx={{
                    width: "100%",
                    height: "500px",
                    bgcolor: "#1E1E2D",
                    borderRadius: 2,
                    overflow: "hidden",
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                }}
            >
                {status === "memuat" && <Typography sx={{ color: "#fff" }}>Memuat Peta 3D...</Typography>}

                {status === "error" && (
                    <Typography sx={{ color: "#ef4444", p: 2, textAlign: "center" }}>
                        {errorMessage || "Terjadi kesalahan saat memuat 3D."}
                    </Typography>
                )}

                <Box
                    ref={containerRef}
                    sx={{
                        width: "100%",
                        height: "100%",
                        visibility: status === "siap" ? "visible" : "hidden",
                    }}
                />
            </Box>
        </Box>
    );
}