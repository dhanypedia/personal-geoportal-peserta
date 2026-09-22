"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import {
    Box, TextField, MenuItem, FormControlLabel, Switch, Button, Stack, Typography,
} from "@mui/material";
import Swal from "sweetalert2";

export default function UpdateData2D({ row, submitting, setSubmitting, onClose, onSuccess }) {
    const { data: session } = useSession();

    const [form, setForm] = useState({
        akses: row?.akses ?? "private",
        editable: row?.is_editable ?? false,
    });

    // Sinkronkan form setiap kali row yang dipilih berubah
    useEffect(() => {
        setForm({
            akses: row?.akses ?? "private",
            editable: row?.is_editable ?? false,
        });
    }, [row]);

    const handleSubmit = async () => {
        if (!row?.data_2d_id) return;

        const accessToken = session?.accessToken;
        if (!accessToken) {
            Swal.fire("Gagal!", "Access token tidak tersedia.", "error");
            return;
        }

        // Body JSON yang dikirim ke API update
        const payload = {
            data_2d_id: row.data_2d_id,
            akses: form.akses,
            editable: form.editable,
        };

        setSubmitting(true);
        try {
            const res = await fetch(`/portal/api/katalog-data-2d/update`, {
                method: "PATCH",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${accessToken}`,
                },
                body: JSON.stringify(payload),
            });

            const result = await res.json();

            if (!res.ok) {
                throw new Error(result.message || result.error || "Gagal update layer");
            }

            Swal.fire("Berhasil", result.message || "Layer berhasil diupdate", "success");
            onSuccess?.();
            onClose?.();
        } catch (err) {
            Swal.fire("Gagal!", err.message || "Terjadi kesalahan saat update", "error");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <Box>
            <Typography variant="body2" sx={{ mb: 2, color: "#6B7280" }}>
                Mengubah layer: <b>{row?.layer_name}</b>
            </Typography>

            <Stack spacing={2.5}>
                <TextField
                    select
                    label="Akses"
                    value={form.akses}
                    onChange={(e) => setForm((f) => ({ ...f, akses: e.target.value }))}
                    fullWidth
                    disabled={submitting}
                >
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="private">Private</MenuItem>
                </TextField>

                <FormControlLabel
                    control={
                        <Switch
                            checked={form.editable}
                            onChange={(e) => setForm((f) => ({ ...f, editable: e.target.checked }))}
                            disabled={submitting}
                        />
                    }
                    label={form.editable ? "Editable (bisa diedit via WFS-T)" : "Tidak Editable"}
                />
            </Stack>

            <Stack direction="row" justifycontent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
                <Button onClick={onClose} disabled={submitting} sx={{ textTransform: "none", color: "#6B7280" }}>
                    Batal
                </Button>
                <Button
                    variant="contained"
                    onClick={handleSubmit}
                    disabled={submitting}
                    sx={{ bgcolor: "#4F46E5", "&:hover": { bgcolor: "#4338CA" }, textTransform: "none", fontWeight: 600, px: 3 }}
                >
                    {submitting ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
            </Stack>
        </Box>
    );
}