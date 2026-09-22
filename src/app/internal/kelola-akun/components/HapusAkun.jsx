"use client";

import { useState } from "react";
import { Box, Button, IconButton, Typography } from "@mui/material";
import { Close, WarningAmberRounded } from "@mui/icons-material";

const HapusAkun = ({ item, accessToken, getData, handleCloseDelete }) => {
    const [submitting, setSubmitting] = useState(false);

    const handleDelete = async () => {
        if (!item?.user_id) {
            alert("Data akun tidak valid untuk dihapus.");
            return;
        }

        try {
            setSubmitting(true);

            const response = await fetch(`/portal/api/users/delete?user_id=${item.user_id}`, {
                method: "DELETE",
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || "Gagal menghapus akun");
            }

            alert("Berhasil menghapus akun!");
            handleCloseDelete();
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
                width: { xs: "90%", sm: 400 },
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
                    Hapus Akun
                </Typography>
                <IconButton onClick={handleCloseDelete} size="small" sx={{ color: "#6B7280" }}>
                    <Close />
                </IconButton>
            </Box>

            <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1.5, py: 1 }}>
                <WarningAmberRounded sx={{ fontSize: 48, color: "#F59E0B" }} />
                <Typography sx={{ textAlign: "center", color: "#374151" }}>
                    Apakah Anda yakin ingin menghapus akun{" "}
                    <b>{item.name}</b> ({item.email})? Tindakan ini tidak dapat dibatalkan.
                </Typography>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end", gap: "10px", mt: 3 }}>
                <Button
                    variant="contained"
                    color="warning"
                    onClick={handleCloseDelete}
                    sx={{ textTransform: "none" }}
                    disabled={submitting}
                >
                    Batalkan
                </Button>
                <Button
                    variant="contained"
                    color="error"
                    onClick={handleDelete}
                    sx={{ textTransform: "none" }}
                    disabled={submitting}
                >
                    {submitting ? "Menghapus..." : "Hapus"}
                </Button>
            </Box>
        </Box>
    );
};

export default HapusAkun;