"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import {
  Box, Typography, Paper, TextField, InputAdornment, Button, Dialog,
  DialogTitle, DialogContent, DialogActions,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { berhasil, gagal, maklumat, tanyaHapus } from "../../../../../lib/notifikasi";
import TambahData2D from "./TambahData2D";
import UpdateData2D from "./UpdateData2D";
import TableData2D from "./TableData2D";
import PreviewData2D from "./PreviewData2D";

export default function KatalogData2D({ accessToken, role }) {
  const [search, setSearch] = useState("");
  const [openCreate, setOpenCreate] = useState(false);
  const [openUpdate, setOpenUpdate] = useState(false);
  const [selectedRow, setSelectedRow] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [form, setForm] = useState({ layer_name: "", file: null, akses: "private", editable: "false" });
  const [openPreview, setOpenPreview] = useState(false);

  const handleOpenCreate = () => {
    setForm({ layer_name: "", file: null, akses: "private", editable: "false" });
    setOpenCreate(true);
  };

  const handleDelete = async (row) => {
    const setuju = await tanyaHapus(
      `Hapus "${row.layer_name}"?`,
      "Layer beserta tabelnya di GeoServer ikut terhapus. Tindakan ini tidak dapat dibatalkan."
    );
    if (!setuju) return;
    try {
      const res = await fetch(`/portal/api/katalog-data-2d/delete?data_2d_id=${row.data_2d_id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${accessToken}` },
        }
      );

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.message || result.error || "Gagal menghapus layer");
      }

      await berhasil("Layer dihapus", result.message || `Layer "${row.layer_name}" berhasil dihapus.`);
      setRefreshKey((k) => k + 1);
    } catch (err) {
      await gagal("Gagal menghapus layer", err.message || "Terjadi kesalahan saat menghapus");
    }
  };

  const handleDownload = async (row) => {
    if (!row.wfs_url) {
      maklumat("Alamat WFS tidak ada", "Layer ini belum diterbitkan di GeoServer, jadi belum dapat diunduh.");
      return;
    }

    // Nama file aman untuk filesystem (layer_name biasanya "workspace:table")
    const safeFilename = (row.layer_name || "data_layer").replace(/[:/\\?*"<>|]/g, "_");

    try {
      // wfs_url sekarang mengarah ke API proxy internal (bukan langsung ke
      // GeoServer). Proxy yang menentukan endpoint GeoServer sebenarnya dan
      // mengecek akses public/private berdasarkan token ini, jadi kita fetch
      // langsung ke sana tanpa lewat route download-data lagi.
      const response = await fetch(row.wfs_url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (!response.ok) {
        let message = "Gagal mendownload file.";
        try {
          const errData = await response.json();
          message = errData.message || errData.error || message;
        } catch {
          // Respons bukan JSON (mis. error mentah dari GeoServer), pakai pesan default
        }
        throw new Error(message);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${safeFilename}.geojson`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      await gagal("Gagal mengunduh layer", error.message);
    }
  };

  const handleUpdate = (row) => {
    setSelectedRow(row);
    setOpenUpdate(true);
  };

  const handlePreview = (row) => { setSelectedRow(row); setOpenPreview(true); };

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} sx={{ color: "#1E1E2D" }}>Katalog Data 2D</Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenCreate}
          sx={{ bgcolor: "#4F46E5", "&:hover": { bgcolor: "#4338CA" }, borderRadius: 2, textTransform: "none", fontWeight: 600, px: 2.5 }}
        >
          Tambah Layer
        </Button>
      </Box>

      <TextField
        placeholder="Cari nama layer..."
        size="small"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        sx={{
          mb: 2, width: 320, bgcolor: "#1E1E2D", borderRadius: 2,
          "& .MuiOutlinedInput-notchedOutline": { border: "none" },
          "& .MuiInputBase-input": { color: "#fff" },
          "& .MuiInputBase-input::placeholder": { color: "#E5E7EB", opacity: 1 },
        }}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" sx={{ color: "#E5E7EB" }} />
              </InputAdornment>
            ),
          },
        }}
      />

      <Paper sx={{ borderRadius: 4, overflow: "hidden", border: "1px solid #EEF0F4", boxShadow: "0 1px 2px rgba(16,24,40,0.06)" }}>
        <TableData2D key={refreshKey} search={search} onDelete={handleDelete} onUpdate={handleUpdate} onDownload={handleDownload} accessToken={accessToken} role={role} onPreview={handlePreview} />
      </Paper>

      {/* Dialog Tambah Layer */}
      <Dialog
        open={openCreate}
        onClose={() => !submitting && setOpenCreate(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { bgcolor: "#fff", color: "#1E1E2D", borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#1E1E2D" }}>Tambah Layer Data 2D</DialogTitle>
        <DialogContent>
          <TambahData2D
            form={form}
            setForm={setForm}
            submitting={submitting}
            setSubmitting={setSubmitting}
            onClose={() => setOpenCreate(false)}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setOpenCreate(false)} disabled={submitting} sx={{ textTransform: "none", color: "#6B7280" }}>
            Batal
          </Button>
        </DialogActions>
      </Dialog>

      {/* Dialog Update Layer (akses & editable) */}
      <Dialog
        open={openUpdate}
        onClose={() => !submitting && setOpenUpdate(false)}
        fullWidth
        maxWidth="sm"
        slotProps={{ paper: { sx: { bgcolor: "#fff", color: "#1E1E2D", borderRadius: 3 } } }}
      >
        <DialogTitle sx={{ fontWeight: 700, color: "#1E1E2D" }}>Update Layer</DialogTitle>
        <DialogContent>
          <UpdateData2D
            row={selectedRow}
            submitting={submitting}
            setSubmitting={setSubmitting}
            onClose={() => setOpenUpdate(false)}
            onSuccess={() => setRefreshKey((k) => k + 1)}
          />
        </DialogContent>
      </Dialog>

      {/* Preview Data 2D */}
      <PreviewData2D open={openPreview} onClose={() => setOpenPreview(false)} row={selectedRow} accessToken={accessToken} />
    </Box>
  );
}