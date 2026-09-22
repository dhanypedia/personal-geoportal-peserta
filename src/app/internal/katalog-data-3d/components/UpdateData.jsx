"use client";

import { useEffect, useRef, useState } from "react";
import {
    Box,
    Button,
    IconButton,
    MenuItem,
    TextField,
    Typography,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Style dasar dipakai untuk semua TextField agar konsisten dengan TambahData
const textFieldStyle = {
    "& .MuiInputBase-input": { color: "#1F2937" },
    "& .MuiInputLabel-root": { color: "#6B7280" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#1976D2" },
    "& .MuiOutlinedInput-root": {
        "& fieldset": { borderColor: "#BFC5CC" },
        "&:hover fieldset": { borderColor: "#1976D2" },
        "&.Mui-focused fieldset": { borderColor: "#1976D2" },
    },
};

// Style khusus untuk field disabled (Nama Layer, URL File) agar tetap terbaca jelas
const disabledFieldStyle = {
    ...textFieldStyle,
    "& .MuiInputBase-input.Mui-disabled": {
        color: "#1F2937",
        WebkitTextFillColor: "#1F2937", // penting: override default fade Safari/Chrome
    },
    "& .MuiInputLabel-root.Mui-disabled": { color: "#6B7280" },
    "& .MuiOutlinedInput-root.Mui-disabled .MuiOutlinedInput-notchedOutline": {
        borderColor: "#D1D5DB",
    },
};

const UpdateData = ({ item, handleCloseEdit, getData, accessToken }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);

    const [form, setForm] = useState({
        akses: item?.akses || "public",
        latitude: item?.latitude ?? -6.2088,
        longitude: item?.longitude ?? 106.8456,
        heading: item?.heading ?? 0,
        pitch: item?.pitch ?? 0,
        roll: item?.roll ?? 0,
        scale: item?.scale ?? 1,
    });
    const [submitting, setSubmitting] = useState(false);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current || !item) return;

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        const initialCenter = [item.latitude ?? -6.2088, item.longitude ?? 106.8456];
        const map = L.map(mapRef.current).setView(initialCenter, 15);
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        markerRef.current = L.marker(initialCenter).addTo(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        map.on("click", (e) => {
            const { lat, lng } = e.latlng;
            if (markerRef.current) {
                markerRef.current.setLatLng([lat, lng]);
            } else {
                markerRef.current = L.marker([lat, lng]).addTo(map);
            }
            setForm((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
            }));
        });

        return () => {
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, [item]);

    const handleScaleChange = (e) => {
        const raw = e.target.value;

        if (raw === "") {
            setForm((f) => ({ ...f, scale: "" }));
            return;
        }

        const numValue = Number(raw);
        if (Number.isNaN(numValue)) return;

        setForm((f) => ({ ...f, scale: numValue < 1 ? 1 : numValue }));
    };

    const handleScaleBlur = () => {
        setForm((f) => ({
            ...f,
            scale: !f.scale || Number(f.scale) < 1 ? 1 : f.scale,
        }));
    };

    const handleSubmit = async () => {
        if (!item?.data_3d_id) {
            alert("Data tidak valid untuk diperbarui.");
            return;
        }

        try {
            setSubmitting(true);

            const formData = new FormData();
            formData.append("data_3d_id", item.data_3d_id);
            formData.append("akses", form.akses);
            formData.append("latitude", form.latitude);
            formData.append("longitude", form.longitude);
            formData.append("heading", form.heading);
            formData.append("pitch", form.pitch);
            formData.append("roll", form.roll);
            formData.append("scale", form.scale);

            const response = await fetch("/portal/api/katalog-data-3d/update", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal memperbarui data");
            }

            alert("Berhasil memperbarui data 3D!");
            handleCloseEdit();
            getData();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

    if (!item) return null;

    return (
        <Box
            sx={{
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
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
                <Typography variant="h6" sx={{ fontWeight: 700, color: "#1E1E2D" }}>
                    Edit Layer: {item.model_name}
                </Typography>
                <IconButton onClick={handleCloseEdit} size="small" sx={{ color: "#6B7280" }}>
                    <Close />
                </IconButton>
            </Box>

            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, mt: 1 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1, flex: 1 }}>
                    {/* Info yang tidak bisa diubah */}
                    <TextField
                        label="Nama Layer"
                        fullWidth
                        value={item.model_name || ""}
                        disabled
                        sx={disabledFieldStyle}
                    />
                    <TextField
                        label="URL File"
                        fullWidth
                        value={item.url || ""}
                        disabled
                        sx={disabledFieldStyle}
                    />

                    {/* Akses */}
                    <TextField
                        select
                        label="Akses"
                        fullWidth
                        value={form.akses}
                        onChange={(e) => setForm((f) => ({ ...f, akses: e.target.value }))}
                        sx={textFieldStyle}
                    >
                        <MenuItem value="public">Public</MenuItem>
                        <MenuItem value="private">Private</MenuItem>
                    </TextField>

                    {/* Orientasi */}
                    <Box sx={{ display: "flex", gap: 1.5 }}>
                        <TextField
                            label="Heading"
                            type="number"
                            fullWidth
                            value={form.heading}
                            onChange={(e) => setForm((f) => ({ ...f, heading: e.target.value }))}
                            sx={textFieldStyle}
                        />
                        <TextField
                            label="Pitch"
                            type="number"
                            fullWidth
                            value={form.pitch}
                            onChange={(e) => setForm((f) => ({ ...f, pitch: e.target.value }))}
                            sx={textFieldStyle}
                        />
                        <TextField
                            label="Roll"
                            type="number"
                            fullWidth
                            value={form.roll}
                            onChange={(e) => setForm((f) => ({ ...f, roll: e.target.value }))}
                            sx={textFieldStyle}
                        />
                    </Box>

                    <TextField
                        label="Scale"
                        type="number"
                        fullWidth
                        value={form.scale}
                        onChange={handleScaleChange}
                        onBlur={handleScaleBlur}
                        inputprops={{ step: "0.1", min: "1" }}
                        sx={textFieldStyle}
                    />

                    <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={handleCloseEdit}
                            sx={{ textTransform: "none" }}
                            disabled={submitting}
                        >
                            Batalkan
                        </Button>
                        <Button
                            variant="contained"
                            color="info"
                            onClick={handleSubmit}
                            sx={{ textTransform: "none" }}
                            disabled={submitting}
                        >
                            {submitting ? "Menyimpan..." : "Simpan"}
                        </Button>
                    </Box>
                </Box>

                {/* Peta untuk update lokasi */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center" }}>
                    <Box
                        sx={{
                            width: { xs: "100%", md: "300px" },
                            height: "250px",
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid #E5E7EB",
                        }}
                        ref={mapRef}
                    />
                    <Typography variant="caption" sx={{ color: "#6B7280" }}>
                        <b>Lat:</b> {Number(form.latitude).toFixed(6)}, <b>Lng:</b> {Number(form.longitude).toFixed(6)}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default UpdateData;