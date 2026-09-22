"use client";

import { useEffect, useRef, useState } from "react";
import { Box, IconButton, Typography } from "@mui/material";
import { Close } from "@mui/icons-material";

// Menghitung kotak pembatas yang kokoh, yaitu dari persentil 5 sampai 95
// posisi splat, bukan dari titik terjauh.
//
// Alasannya, hasil rekonstruksi Gaussian Splat hampir selalu memuat splat
// nyasar yang terlempar jauh dari subjeknya. Diukur pada gedung-3d.ply:
// separuh splatnya berkumpul dalam kotak 6,9 x 4,4 x 7,6 satuan, sedangkan
// kotak penuhnya 388 x 175 x 391 satuan. Selisihnya 55 kali. Bila kamera
// dibingkai pada kotak penuh, bangunannya tampil sebagai bintik kecil di
// tengah layar, dan itulah yang terlihat seperti pratinjau rusak.
//
// Sampling dipakai supaya tetap cepat pada berkas berukuran ratusan ribu
// splat, dan hanya sebagian posisi yang perlu dibaca untuk mendapat
// persentil yang stabil.
function kotakKokoh(viewer, THREE, sampelMaks = 20000) {
    const total = viewer.splatMesh && viewer.splatMesh.getSplatCount();
    if (!total || !viewer.splatMesh.getSplatCenter) return null;

    const langkah = Math.max(1, Math.floor(total / sampelMaks));
    const v = new THREE.Vector3();
    const xs = [];
    const ys = [];
    const zs = [];

    for (let i = 0; i < total; i += langkah) {
        viewer.splatMesh.getSplatCenter(i, v, true);
        xs.push(v.x);
        ys.push(v.y);
        zs.push(v.z);
    }
    if (xs.length < 100) return null;

    const persentil = (arr, p) => {
        const s = arr.slice().sort((a, b) => a - b);
        return s[Math.min(s.length - 1, Math.max(0, Math.floor(s.length * p)))];
    };

    return new THREE.Box3(
        new THREE.Vector3(persentil(xs, 0.05), persentil(ys, 0.05), persentil(zs, 0.05)),
        new THREE.Vector3(persentil(xs, 0.95), persentil(ys, 0.95), persentil(zs, 0.95))
    );
}

// Membingkai kamera pada ukuran model yang sebenarnya.
//
// Kamera bawaan pustaka ini berada di posisi tetap yang hanya cocok untuk
// model berukuran satuan. Nilai scale datang dari formulir, dan bawaannya 100.
// Pada nilai itu seluruh model jatuh di luar bidang jauh kamera, sehingga
// pratinjau tampil kosong tanpa pesan galat apa pun.
function bingkaiModel(viewer, THREE) {
    try {
        let kotak = viewer.splatMesh && viewer.splatMesh.computeBoundingBox(true);
        if (!kotak) return;

        // Kotak kokoh dipakai hanya bila jauh lebih kecil daripada kotak penuh,
        // karena itulah tanda ada splat nyasar. Pada model yang bersih, kedua
        // kotak hampir sama dan kotak penuh yang dipakai.
        try {
            const kokoh = kotakKokoh(viewer, THREE);
            if (kokoh) {
                const lebarPenuh = kotak.getSize(new THREE.Vector3()).length();
                const lebarKokoh = kokoh.getSize(new THREE.Vector3()).length();
                if (lebarPenuh > 0 && lebarKokoh / lebarPenuh < 0.5) {
                    kotak = kokoh;
                }
            }
        } catch (err) {
            console.warn("Kotak kokoh gagal dihitung, memakai kotak penuh:", err);
        }

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
