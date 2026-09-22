"use client";

import { Box, Button, IconButton, MenuItem, TextField, Typography, List, ListItemButton, ListItemText, CircularProgress, InputAdornment } from "@mui/material";
import UploadIcon from "@mui/icons-material/Upload";
import SearchIcon from "@mui/icons-material/Search";
import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { Close } from "@mui/icons-material";
import { bacaResponsJson } from "../../../../../lib/bacaRespons";

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

const TambahData = ({ form, setForm, handleCloseAdd, getData, accessToken }) => {
    const mapRef = useRef(null);
    const mapInstanceRef = useRef(null);
    const markerRef = useRef(null);
    const [centerPoint, setCenterPoint] = useState([-6.2088, 106.8456]);

    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);
    const [showResults, setShowResults] = useState(false);
    const debounceRef = useRef(null);

    useEffect(() => {
        if (!mapRef.current || mapInstanceRef.current) return;

        let isMounted = true;
        if (!isMounted || !mapRef.current) return;

        delete L.Icon.Default.prototype._getIconUrl;
        L.Icon.Default.mergeOptions({
            iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
            iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
            shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
        });

        const map = L.map(mapRef.current).setView(centerPoint, 13);
        mapInstanceRef.current = map;

        L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
            attribution: "&copy; OpenStreetMap contributors",
        }).addTo(map);

        markerRef.current = L.marker(centerPoint).addTo(map);

        setTimeout(() => {
            map.invalidateSize();
        }, 200);

        map.on("click", (e) => {
            const { lat, lng } = e.latlng;
            pindahkanMarker(lat, lng);
        });

        return () => {
            isMounted = false;
            if (mapInstanceRef.current) {
                mapInstanceRef.current.remove();
                mapInstanceRef.current = null;
            }
        };
    }, []);

    const pindahkanMarker = (lat, lng, zoom) => {
        if (markerRef.current) {
            markerRef.current.setLatLng([lat, lng]);
        } else if (mapInstanceRef.current) {
            markerRef.current = L.marker([lat, lng]).addTo(mapInstanceRef.current);
        }

        if (mapInstanceRef.current) {
            mapInstanceRef.current.setView([lat, lng], zoom || mapInstanceRef.current.getZoom());
        }

        setCenterPoint([lat, lng]);

        if (setForm) {
            setForm((prev) => ({
                ...prev,
                latitude: lat,
                longitude: lng,
            }));
        }
    };

    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);

        if (!searchQuery || searchQuery.trim().length < 3) {
            setSearchResults([]);
            return;
        }

        debounceRef.current = setTimeout(async () => {
            try {
                setSearching(true);
                const res = await fetch(
                    `https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=id&q=${encodeURIComponent(searchQuery)}`
                );
                const data = await res.json();
                setSearchResults(data || []);
                setShowResults(true);
            } catch (err) {
                console.error("Gagal mencari lokasi:", err);
                setSearchResults([]);
            } finally {
                setSearching(false);
            }
        }, 400);

        return () => clearTimeout(debounceRef.current);
    }, [searchQuery]);

    const handleSelectResult = (result) => {
        const lat = parseFloat(result.lat);
        const lon = parseFloat(result.lon);
        pindahkanMarker(lat, lon, 16);
        setSearchQuery(result.display_name);
        setShowResults(false);
    };

    const handleSubmitData = async () => {
        try {
            if (!form?.file) {
                alert("Silakan pilih file 3D terlebih dahulu!");
                return;
            }

            const formData = new FormData();
            formData.append("file", form.file);
            formData.append("model_name", form.model_name || "");
            formData.append("akses", form.akses || "public");
            formData.append("latitude", form.latitude || centerPoint[0]);
            formData.append("longitude", form.longitude || centerPoint[1]);
            formData.append("heading", form.heading);
            formData.append("pitch", form.pitch);
            formData.append("roll", form.roll);
            formData.append("scale", form.scale)

            const response = await fetch("/portal/api/katalog-data-3d/create", {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
                body: formData,
            });

            const result = await bacaResponsJson(response);

            if (!response.ok) {
                throw new Error(result.message || "Gagal menyimpan data");
            }

            alert("Berhasil menambah data 3D!");
            handleCloseAdd();
            getData();
        } catch (err) {
            alert(err.message);
        }
    };

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
                <Typography id="modal-tambah-data-3d" variant="h6" sx={{ fontWeight: 700, color: "#1E1E2D" }}>
                    Tambah Layer Data 3D
                </Typography>
                <IconButton onClick={handleCloseAdd} size="small" sx={{ color: "#6B7280" }}>
                    <Close />
                </IconButton>
            </Box>
            <Box sx={{ display: "flex", flexDirection: { xs: "column", md: "row" }, gap: 2, mt: 1 }}>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1, flex: 1 }}>
                    <TextField
                        label="Nama Layer"
                        fullWidth
                        value={form?.model_name || ""}
                        onChange={(e) =>
                            setForm && setForm((f) => ({ ...f, model_name: e.target.value }))
                        }
                        sx={textFieldStyle}
                    />

                    <Button
                        component="label"
                        variant="outlined"
                        startIcon={<UploadIcon />}
                        sx={{
                            textTransform: "none",
                            justifyContent: "flex-start",
                            py: 1.2,
                            borderRadius: 2,
                            color: "#4B5563",
                            borderColor: "#AFC8B8",
                            "&:hover": { borderColor: "#388E3C", backgroundColor: "#F5FAF6" },
                        }}
                    >
                        <Typography noWrap sx={{ fontSize: 14, maxWidth: "220px", textOverflow: "ellipsis" }}>
                            {form?.file ? form.file.name : "Pilih File 3D (.glb, .ply)"}
                        </Typography>
                        <input
                            type="file"
                            accept=".glb,.ply"
                            hidden
                            onChange={(e) =>
                                setForm && setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))
                            }
                        />
                    </Button>

                    <TextField
                        select
                        label="Akses"
                        fullWidth
                        value={form?.akses || "public"}
                        onChange={(e) => setForm && setForm((f) => ({ ...f, akses: e.target.value }))}
                        sx={textFieldStyle}
                    >
                        <MenuItem value="public">Public</MenuItem>
                        <MenuItem value="private">Private</MenuItem>
                    </TextField>

                    <Box sx={{ display: "flex", gap: 1.5 }}>
                        <TextField
                            label="Heading"
                            type="number"
                            fullWidth
                            value={form?.heading ?? 0}
                            onChange={(e) => setForm && setForm((f) => ({ ...f, heading: e.target.value }))}
                            inputprops={{ step: "1" }}
                            sx={textFieldStyle}
                        />
                        <TextField
                            label="Pitch"
                            type="number"
                            fullWidth
                            value={form?.pitch ?? 0}
                            onChange={(e) => setForm && setForm((f) => ({ ...f, pitch: e.target.value }))}
                            inputprops={{ step: "1" }}
                            sx={textFieldStyle}
                        />
                        <TextField
                            label="Roll"
                            type="number"
                            fullWidth
                            value={form?.roll ?? 0}
                            onChange={(e) => setForm && setForm((f) => ({ ...f, roll: e.target.value }))}
                            inputprops={{ step: "1" }}
                            sx={textFieldStyle}
                        />
                    </Box>

                    <TextField
                        label="Scale"
                        type="number"
                        fullWidth
                        value={form?.scale ?? 1}
                        onChange={(e) => setForm && setForm((f) => ({ ...f, scale: e.target.value }))}
                        inputprops={{ step: "0.1", min: "0" }}
                        sx={textFieldStyle}
                    />

                    <Box sx={{ display: "flex", flexDirection: "row", justifyContent: "flex-end", gap: "10px" }}>
                        <Button
                            variant="contained"
                            color="warning"
                            onClick={handleCloseAdd}
                            sx={{ textTransform: "none" }}
                        >
                            Batalkan
                        </Button>
                        <Button
                            variant="contained"
                            color="info"
                            onClick={handleSubmitData}
                            sx={{ textTransform: "none" }}
                        >
                            Simpan
                        </Button>
                    </Box>
                </Box>

                {/* Peta Pemilihan Lokasi + Pencarian */}
                <Box sx={{ display: "flex", flexDirection: "column", gap: 1, alignItems: "center", width: { xs: "100%", md: "300px" } }}>
                    <Box sx={{ position: "relative", width: "100%" }}>
                        <TextField
                            placeholder="Cari lokasi... (mis. Monas Jakarta)"
                            fullWidth
                            size="small"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onFocus={() => searchResults.length > 0 && setShowResults(true)}
                            sx={textFieldStyle}
                            slotProps={{
                                input: {
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon fontSize="small" sx={{ color: "#6B7280" }} />
                                        </InputAdornment>
                                    ),
                                    endAdornment: searching ? (
                                        <InputAdornment position="end">
                                            <CircularProgress size={16} />
                                        </InputAdornment>
                                    ) : null,
                                },
                            }}
                        />

                        {showResults && searchResults.length > 0 && (
                            <Box
                                sx={{
                                    position: "absolute",
                                    top: "100%",
                                    left: 0,
                                    right: 0,
                                    zIndex: 2000,
                                    bgcolor: "#fff",
                                    borderRadius: 1,
                                    boxShadow: 4,
                                    mt: 0.5,
                                    maxHeight: 180,
                                    overflowY: "auto",
                                    border: "1px solid #E5E7EB",
                                }}
                            >
                                <List dense disablePadding>
                                    {searchResults.map((r) => (
                                        <ListItemButton key={r.place_id} onClick={() => handleSelectResult(r)}>
                                            <ListItemText
                                                primary={r.display_name}
                                                primaryTypographyProps={{ fontSize: 12.5, color: "#1F2937" }}
                                            />
                                        </ListItemButton>
                                    ))}
                                </List>
                            </Box>
                        )}
                    </Box>

                    <Box
                        sx={{
                            width: "100%",
                            height: "250px",
                            borderRadius: 2,
                            overflow: "hidden",
                            border: "1px solid #E5E7EB",
                        }}
                        ref={mapRef}
                    />

                    <Typography variant="caption" sx={{ color: "#6B7280" }}>
                        <b>Lat:</b> {centerPoint[0].toFixed(6)}, <b>Lng:</b> {centerPoint[1].toFixed(6)}
                    </Typography>
                </Box>
            </Box>
        </Box>
    );
};

export default TambahData;