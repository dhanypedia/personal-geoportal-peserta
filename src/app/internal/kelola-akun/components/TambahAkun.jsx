"use client";

import { useState } from "react";
import {
    Box,
    Button,
    IconButton,
    MenuItem,
    TextField,
    Typography,
    InputAdornment,
    FormControlLabel,
    Switch,
} from "@mui/material";
import { Close, Visibility, VisibilityOff } from "@mui/icons-material";
import { textFieldStyle, disabledFieldStyle } from "../style/style";

const TambahAkun = ({ form, setForm, handleCloseAdd, getData, accessToken }) => {
    const [showPassword, setShowPassword] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    const handleSubmitData = async () => {
        try {
            if (!form?.name || !form?.email || !form?.password) {
                alert("Name, email, dan password wajib diisi!");
                return;
            }

            setSubmitting(true);

            const response = await fetch("/portal/api/users/create", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify({
                    name: form.name,
                    email: form.email,
                    password: form.password,
                    is_active: form.is_active ?? true,
                    role: form.role || "viewer",
                }),
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menyimpan akun");
            }

            alert("Berhasil menambah akun!");
            handleCloseAdd();
            getData();
        } catch (err) {
            alert(err.message);
        } finally {
            setSubmitting(false);
        }
    };

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
                    Tambah Akun
                </Typography>
                <IconButton onClick={handleCloseAdd} size="small" sx={{ color: "#6B7280" }}>
                    <Close />
                </IconButton>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
                {/* Name */}
                <TextField
                    label="Name"
                    fullWidth
                    value={form?.name || ""}
                    onChange={(e) =>
                        setForm && setForm((f) => ({ ...f, name: e.target.value }))
                    }
                    sx={textFieldStyle}
                />

                {/* Email */}
                <TextField
                    label="Email"
                    type="email"
                    fullWidth
                    value={form?.email || ""}
                    onChange={(e) =>
                        setForm && setForm((f) => ({ ...f, email: e.target.value }))
                    }
                    sx={textFieldStyle}
                />

                {/* Password */}
                <TextField
                    label="Password"
                    type={showPassword ? "text" : "password"}
                    fullWidth
                    value={form?.password || ""}
                    onChange={(e) =>
                        setForm && setForm((f) => ({ ...f, password: e.target.value }))
                    }
                    slotProps={{
                        input: {
                            endAdornment: (
                                <InputAdornment position="end">
                                    <IconButton
                                        onClick={() => setShowPassword((prev) => !prev)}
                                        edge="end"
                                        size="small"
                                    >
                                        {showPassword ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
                                    </IconButton>
                                </InputAdornment>
                            ),
                        },
                    }}
                    sx={textFieldStyle}
                />

                {/* Role */}
                <TextField
                    select
                    label="Role"
                    fullWidth
                    value={form?.role || "viewer"}
                    onChange={(e) =>
                        setForm && setForm((f) => ({ ...f, role: e.target.value }))
                    }
                    sx={textFieldStyle}
                >
                    <MenuItem value="admin">Admin</MenuItem>
                    <MenuItem value="viewer">Viewer</MenuItem>
                </TextField>

                {/* Status Aktif */}
                <FormControlLabel
                    control={
                        <Switch
                            checked={form?.is_active ?? true}
                            onChange={(e) =>
                                setForm && setForm((f) => ({ ...f, is_active: e.target.checked }))
                            }
                        />
                    }
                    label={form?.is_active ?? true ? "Akun Aktif" : "Akun Nonaktif"}
                />

                {/* Tombol Aksi */}
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "10px" }}>
                    <Button
                        variant="contained"
                        color="warning"
                        onClick={handleCloseAdd}
                        sx={{ textTransform: "none" }}
                        disabled={submitting}
                    >
                        Batalkan
                    </Button>
                    <Button
                        variant="contained"
                        color="info"
                        onClick={handleSubmitData}
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

export default TambahAkun;