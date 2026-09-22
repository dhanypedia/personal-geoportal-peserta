import { useState } from "react";
import { Box, Button, MenuItem, TextField, FormControlLabel, Switch, Typography, LinearProgress } from "@mui/material";
import UploadFileIcon from "@mui/icons-material/UploadFile";
import { useSession } from "next-auth/react";
import { FASE, unggahDenganProgres, formatUkuran } from "../../../../../lib/unggahDenganProgres";
import { berhasil, gagal, peringatan } from "../../../../../lib/notifikasi";

const TambahData2D = ({ form, setForm, submitting, setSubmitting, onSuccess, onClose }) => {
  const { data: session } = useSession();
  const [unggahan, setUnggahan] = useState(null);

  const handleCreate = async () => {
    if (!form.layer_name || !form.file) {
      peringatan("Isian belum lengkap", "Nama layer dan berkas GeoJSON wajib diisi.");
      return;
    }

    const accessToken = session?.accessToken;
    if (!accessToken) {
      gagal("Sesi tidak ditemukan", "Masuk ulang ke portal, lalu coba lagi.");
      return;
    }

    setSubmitting(true);
    setUnggahan({
      fase: FASE.MENGUNGGAH,
      persen: 0,
      terkirim: 0,
      total: form.file.size,
      bytePerDetik: 0,
    });

    try {
      const formData = new FormData();
      formData.append("layer_name", form.layer_name);
      formData.append("file", form.file);
      formData.append("akses", form.akses);
      formData.append("editable", form.editable);

      // Kemajuannya dilaporkan seperti pada dialog 3D: satu tahap mengikuti
      // byte yang terkirim, satu tahap lagi menunggu server menyimpan.
      const { janji } = unggahDenganProgres({
        url: "/portal/api/katalog-data-2d/create",
        formData,
        accessToken,
        onKemajuan: (kemajuan) =>
          setUnggahan((u) => (u ? { ...u, ...kemajuan, fase: FASE.MENGUNGGAH } : u)),
        onFase: (fase) => setUnggahan((u) => (u ? { ...u, fase } : u)),
      });

      const { ok, data: result } = await janji;

      if (!ok || !result.success) {
        throw new Error(result.message || result.error || "Gagal menyimpan layer");
      }

      // Dialog ditutup lebih dahulu, baru pemberitahuannya tampil.
      onClose();
      onSuccess();
      await berhasil("Layer ditambahkan", result.message || `Layer "${result.data.layer_name}" berhasil disimpan.`);
    } catch (err) {
      await gagal("Gagal menyimpan layer", err.message || "Terjadi kesalahan saat menyimpan");
    } finally {
      setUnggahan(null);
      setSubmitting(false);
    }
  };

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2.5, mt: 1 }}>
      <TextField
        label="Nama Layer"
        fullWidth
        value={form.layer_name}
        onChange={(e) => setForm((f) => ({ ...f, layer_name: e.target.value }))}
        sx={{
          "& .MuiInputBase-input": { color: "#1E1E2D" },
          "& .MuiInputLabel-root": { color: "#6B7280" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D1D5DB" },
        }}
      />

      <Button
        component="label"
        variant="outlined"
        startIcon={<UploadFileIcon />}
        sx={{
          textTransform: "none",
          justifyContent: "flex-start",
          py: 1.2,
          borderRadius: 2,
          color: "#1E1E2D",
          borderColor: "#D1D5DB",
        }}
      >
        {form.file ? form.file.name : "Pilih File GeoJSON"}
        <input
          type="file"
          accept=".geojson,application/geo+json,application/json"
          hidden
          onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
        />
      </Button>

      <TextField
        select
        label="Akses"
        fullWidth
        value={form.akses}
        onChange={(e) => setForm((f) => ({ ...f, akses: e.target.value }))}
        sx={{
          "& .MuiInputBase-input": { color: "#1E1E2D" },
          "& .MuiInputLabel-root": { color: "#6B7280" },
          "& .MuiOutlinedInput-notchedOutline": { borderColor: "#D1D5DB" },
        }}
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
            checked={form.editable === "true"}
            onChange={(e) => setForm((f) => ({ ...f, editable: e.target.checked ? "true" : "false" }))}
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

      {unggahan && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 1, mb: 0.75 }}>
            <Typography aria-live="polite" sx={{ fontSize: 13, fontWeight: 600, color: "#1E1E2D" }}>
              {unggahan.fase === FASE.MEMPROSES ? "Server sedang menyimpan layer" : "Mengunggah berkas"}
            </Typography>
            {unggahan.fase === FASE.MENGUNGGAH && (
              <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1976D2", fontVariantNumeric: "tabular-nums" }}>
                {unggahan.persen}%
              </Typography>
            )}
          </Box>

          <LinearProgress
            variant={unggahan.fase === FASE.MEMPROSES ? "indeterminate" : "determinate"}
            value={unggahan.persen}
            sx={{
              height: 8,
              borderRadius: 1,
              bgcolor: "#E5E7EB",
              "& .MuiLinearProgress-bar": { bgcolor: "#1976D2" },
            }}
          />

          <Box sx={{ display: "flex", justifyContent: "space-between", gap: 1, mt: 0.75 }}>
            <Typography sx={{ fontSize: 12, color: "#6B7280", fontVariantNumeric: "tabular-nums" }}>
              {unggahan.fase === FASE.MEMPROSES
                ? `${formatUkuran(unggahan.total)} terkirim. Jangan tutup halaman ini.`
                : `${formatUkuran(unggahan.terkirim)} dari ${formatUkuran(unggahan.total)}`}
            </Typography>
            {unggahan.fase === FASE.MENGUNGGAH && unggahan.bytePerDetik > 0 && (
              <Typography sx={{ fontSize: 12, color: "#6B7280", whiteSpace: "nowrap", fontVariantNumeric: "tabular-nums" }}>
                {formatUkuran(unggahan.bytePerDetik)}/detik
              </Typography>
            )}
          </Box>
        </Box>
      )}

      <Button
        onClick={handleCreate}
        variant="contained"
        disabled={submitting}
        sx={{ bgcolor: "#4F46E5", "&:hover": { bgcolor: "#4338CA" }, textTransform: "none", fontWeight: 600 }}
      >
        {submitting ? "Menyimpan..." : "Simpan"}
      </Button>
    </Box>
  );
};

export default TambahData2D;