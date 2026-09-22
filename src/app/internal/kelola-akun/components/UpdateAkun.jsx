"use client";

import { useState, useEffect } from "react";
import {
    Box,
    Button,
    IconButton,
    MenuItem,
    TextField,
    Typography,
    FormControlLabel,
    Switch,
} from "@mui/material";
import { Close } from "@mui/icons-material";
import { textFieldStyle, disabledFieldStyle } from "../style/style";

const UpdateAkun = ({ item, handleCloseEdit, getData, accessToken }) => {
    const [form, setForm] = useState({
        role: item?.role || "viewer",
        is_active: item?.is_active ?? true,
    });
    const [submitting, setSubmitting] = useState(false);

    // Sinkronkan form setiap kali item (baris yang diedit) berubah
    useEffect(() => {
        if (item) {
            setForm({
                role: item.role || "viewer",
                is_active: item.is_active ?? true,
            });
        }
    }, [item]);

    const handleSubmit = async () => {
        if (!item?.user_id) {
            alert("Data akun tidak valid untuk diperbarui.");
            return;
        }

        try {
            setSubmitting(true);

            const response = await fetch("/portal/api/users/update", {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    user_id: item.user_id,
                    is_active: form.is_active,
                    role: form.role,
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal memperbarui akun");
            }

            alert("Berhasil memperbarui akun!");
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
                width: { xs: "90%", sm: 450, md: 500 },
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
                    Edit Akun: {item.name}
                </Typography>
                <IconButton onClick={handleCloseEdit} size="small" sx={{ color: "#6B7280" }}>
                    <Close />
                </IconButton>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
                {/* Info yang tidak bisa diubah lewat endpoint update */}
                <TextField
                    label="Name"
                    fullWidth
                    value={item.name || ""}
                    disabled
                    sx={disabledFieldStyle}
                />
                <TextField
                    label="Email"
                    fullWidth
                    value={item.email || ""}
                    disabled
                    sx={disabledFieldStyle}
                />

                {/* Role — bisa diubah */}
                <TextField
                    select
                    label="Role"
                    fullWidth
                    value={form.role}
                    onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                    sx={textFieldStyle}
                >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                </TextField>

                {/* Status Aktif — bisa diubah */}
                <FormControlLabel
                    control={
                        <Switch
                            checked={form.is_active}
                            onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))}
                        />
                    }
                    label={form.is_active ? "Akun Aktif" : "Akun Nonaktif"}
                />

                {/* Tombol Aksi */}
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
        </Box>
    );
};

export default UpdateAkun;