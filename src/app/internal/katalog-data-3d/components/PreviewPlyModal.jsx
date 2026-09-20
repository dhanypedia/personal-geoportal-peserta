"use client";

import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";

// Pratinjau Gaussian Splat. Pustakanya diimpor saat modal dibuka, bukan di
// tingkat modul, supaya three.js yang berukuran besar tidak ikut ke bundel
// halaman katalog bagi peserta yang hanya memakai model .glb.
export default function PreviewPlyModal({ openPreview, item, handleClosePreview }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [status, setStatus] = useState("idle");
    const [errorMessage, setErrorMessage] = useState("");

    useEffect(() => {
        if (!openPreview || !item?.url || !containerRef.current) return;

        let cancelled = false;
        setStatus("memuat");
        setErrorMessage("");

        // Wadah ini dibuat di luar pohon React, karena pustaka penampil
        // menambah dan melepas elemennya sendiri. Bila React ikut melacaknya,
        // proses unmount bentrok dengan proses bersih-bersih pustaka.
        const wrapperEl = document.createElement("div");
        wrapperEl.style.width = "100%";
        wrapperEl.style.height = "100%";
        containerRef.current.appendChild(wrapperEl);

        Promise.all([import("@mkkellogg/gaussian-splats-3d"), import("three")])
            .then(([GaussianSplats3D, THREE]) => {
                if (cancelled) return;

                const viewer = new GaussianSplats3D.Viewer({
                    rootElement: wrapperEl,
                    selfDrivenMode: true,
                    useBuiltInControls: true,
                    sharedMemoryForWorkers: false,
                    ignoreDevicePixelRatio: false,
                    dynamicScene: false,
                    showLoadingUI: false,
                });
                viewerRef.current = viewer;

                const heading = Number(item.heading) || 0;
                const pitch = Number(item.pitch) || 0;
                const roll = Number(item.roll) || 0;

                const euler = new THREE.Euler(
                    THREE.MathUtils.degToRad(pitch),
                    THREE.MathUtils.degToRad(heading),
                    THREE.MathUtils.degToRad(roll),
                    "XYZ"
                );
                const quat = new THREE.Quaternion().setFromEuler(euler);
                const scaleValue = Number(item.scale) || 1;

                return viewer
                    .addSplatScene(item.url, {
                        format: GaussianSplats3D.SceneFormat.Ply,
                        rotation: [quat.x, quat.y, quat.z, quat.w],
                        scale: [scaleValue, scaleValue, scaleValue],
                        splatAlphaRemovalThreshold: 5,
                        showLoadingUI: false,
                    })
                    .then(() => {
                        if (cancelled) return;

                        if (viewer.controls) {
                            viewer.controls.minPolarAngle = 0;
                            viewer.controls.maxPolarAngle = Math.PI;
                            viewer.controls.enableDamping = true;
                        }

                        viewer.start();
                        setStatus("siap");
                    });
            })
            .catch((err) => {
                console.error("Gagal memuat Gaussian Splat:", err);
                if (!cancelled) {
                    setErrorMessage("Gagal memuat berkas Gaussian Splat (.ply).");
                    setStatus("error");
                }
            });

        return () => {
            cancelled = true;

            if (viewerRef.current) {
                try {
                    viewerRef.current.dispose();
                } catch (e) {
                    console.warn("Gagal menutup penampil:", e);
                }
                viewerRef.current = null;
            }

            try {
                if (wrapperEl.parentNode) {
                    wrapperEl.parentNode.removeChild(wrapperEl);
                }
            } catch (e) {
                // Wadah mungkin sudah dilepas oleh dispose(). Aman diabaikan.
            }
        };
    }, [openPreview, item]);

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
            }}
        >
            <Box sx={{ display: "flex", justifyContent: "space-between", mb: 3 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E1E2D" }}>
                    {item?.nama}
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
                {status === "memuat" && (
                    <Typography sx={{ color: "#fff", position: "absolute", zIndex: 1 }}>
                        Memuat Gaussian Splat...
                    </Typography>
                )}

                {status === "error" && (
                    <Typography sx={{ color: "#ef4444", p: 2, textAlign: "center" }}>
                        {errorMessage}
                    </Typography>
                )}

                <Box
                    ref={containerRef}
                    sx={{
                        width: "100%",
                        height: "100%",
                        visibility: status === "error" ? "hidden" : "visible",
                    }}
                />
            </Box>

            <Typography variant="caption" sx={{ color: "#6B7280", mt: 1 }}>
                Pratinjau 3D Gaussian Splat. Geser untuk memutar, gulir untuk memperbesar. Bila
                orientasinya terbalik, sesuaikan Heading, Pitch, dan Roll lewat Ubah Data.
            </Typography>
        </Box>
    );
}
