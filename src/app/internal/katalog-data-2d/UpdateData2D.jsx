"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box, Button, FormControlLabel, MenuItem, Stack, Switch, TextField, Typography,
} from "@mui/material";
import Swal from "sweetalert2";

const fieldStyle = {
  "& .MuiInputBase-input": { color: "#1E1E2D" },
  "& .MuiInputLabel-root": { color: "#6B7280" },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D1D5DB" },
};

// Form ubah akses dan is_editable sebuah layer 2D. Keduanya memengaruhi
// security rule di GeoServer, bukan hanya baris di database.
export default function UpdateData2D({ row, submitting, setSubmitting, onClose, onSuccess }) {
  const { data: session } = useSession();

  const [form, setForm] = useState({
    akses: row?.akses ?? "private",
    editable: row?.is_editable ?? false,
  });

  // Baris yang dipilih bisa berganti tanpa dialog ditutup, jadi isian harus
  // disinkronkan ulang setiap kali row berubah.
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

    setSubmitting(true);
    try {
      const res = await fetch("/portal/api/katalog-data-2d/update", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          data_2d_id: row.data_2d_id,
          akses: form.akses,
          editable: form.editable,
        }),
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
          sx={fieldStyle}
          slotProps={{
            select: {
              slotProps: {
                paper: { sx: { bgcolor: "#fff", color: "#1E1E2D" } },
              },
            },
          }}
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
              sx={{
                "& .MuiSwitch-track": { borderRadius: 999, bgcolor: "#D1D5DB", opacity: 1 },
                "& .MuiSwitch-thumb": { boxShadow: "0 1px 3px rgba(0,0,0,0.2)" },
                "& .Mui-checked + .MuiSwitch-track": { bgcolor: "#4F46E5 !important", opacity: 1 },
                "& .Mui-checked .MuiSwitch-thumb": { color: "#fff" },
              }}
            />
          }
          label="Editable (WFS-T)"
          sx={{ color: "#1E1E2D", m: 0 }}
        />
      </Stack>

      <Stack direction="row" justifyContent="flex-end" spacing={1.5} sx={{ mt: 3 }}>
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
