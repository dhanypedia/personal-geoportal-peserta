"use client";

import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";

// Membingkai kamera pada ukuran model yang sebenarnya.
//
// Kamera bawaan pustaka ini berada di posisi tetap yang hanya cocok untuk
// model berukuran satuan. Nilai scale datang dari formulir, dan bawaannya 100.
// Pada nilai itu seluruh model jatuh di luar bidang jauh kamera, sehingga
// pratinjau tampil kosong tanpa pesan galat apa pun.
function bingkaiModel(viewer, THREE) {
    try {
        const kotak = viewer.splatMesh && viewer.splatMesh.computeBoundingBox(true);
        if (!kotak) return;

        const tengah = kotak.getCenter(new THREE.Vector3());
        const ukuran = kotak.getSize(new THREE.Vector3());
        const radius = Math.max(ukuran.x, ukuran.y, ukuran.z) / 2;
        if (!Number.isFinite(radius) || radius <= 0) return;

        const fov = (viewer.camera.fov * Math.PI) / 180;
        const jarak = (radius / Math.tan(fov / 2)) * 1.3;

        // Bidang potong ikut menyesuaikan. Tanpa ini, model berskala besar
        // berada di luar bidang jauh dan tidak tergambar.
        viewer.camera.near = Math.max(0.01, jarak / 1000);
        viewer.camera.far = jarak * 1000;
        viewer.camera.updateProjectionMatrix();

        viewer.camera.position.set(tengah.x, tengah.y + radius * 0.25, tengah.z + jarak);
        viewer.camera.lookAt(tengah);

        if (viewer.controls) {
            viewer.controls.target.copy(tengah);
            viewer.controls.update();
        }
    } catch (err) {
        // Pembingkaian hanya memperbaiki tampilan. Bila gagal, model tetap
        // ditampilkan dengan kamera bawaan.
        console.warn("Gagal membingkai model:", err);
    }
}

// Pratinjau Gaussian Splat. Pustakanya diimpor saat modal dibuka, bukan di
// tingkat modul, supaya three.js yang berukuran besar tidak ikut ke bundel
// halaman katalog bagi peserta yang hanya memakai model .glb.
export default function PreviewPlyModal({ openPreview, item, handleClosePreview }) {
    const containerRef = useRef(null);
    const viewerRef = useRef(null);
    const [status, setStatus] = useState("idle");
    const [errorMessage, setErrorMessage] = useState("");
    const [persen, setPersen] = useState(0);

    useEffect(() => {
        if (!openPreview || !item?.url || !containerRef.current) return;

        let cancelled = false;
        setStatus("memuat");
        setErrorMessage("");
        setPersen(0);

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
                        // Tanpa ini, layar hanya menampilkan tulisan memuat
                        // selama berkas puluhan megabita diunduh, tanpa tanda
                        // apa pun bahwa ada kemajuan.
                        onProgress: (persen) => {
                            if (cancelled) return;
                            setPersen((lama) => Math.max(lama, Math.round(persen)));
                        },
                    })
                    .then(() => {
                        if (cancelled) return;

                        if (viewer.controls) {
                            viewer.controls.minPolarAngle = 0;
                            viewer.controls.maxPolarAngle = Math.PI;
                            viewer.controls.enableDamping = true;
                        }

                        bingkaiModel(viewer, THREE);

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
                        Memuat Gaussian Splat{persen > 0 ? `... ${persen}%` : "..."}
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
