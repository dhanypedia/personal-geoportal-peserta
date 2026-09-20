"use client";

import {
  Box, Chip, IconButton, Link, Paper, Table, TableBody, TableCell,
  TableHead, TableRow, Tooltip, Typography,
} from "@mui/material";
import { Delete, Download, Edit, Visibility } from "@mui/icons-material";

// Tabel katalog data 3D. Diasumsikan sudah siap dipakai oleh KatalogData3D,
// tetapi sengaja belum dipasang di sana: tabel pada halaman itu masih
// ditulis langsung di dalam komponennya, dan menggantinya berarti menulis
// ulang sebagian besar berkas tersebut.
const TableData3D = ({
  filteredData,
  search,
  role,
  accessToken,
  handleOpenDelete,
  handleOpenEdit,
  handleOpenPreview,
}) => {
  // Berkas model dilayani endpoint models, yang meminta token untuk data
  // private. Token dikirim lewat query string karena tautan unduhan tidak
  // membawa header.
  const handleDownload = async (url, nama, tipeFile) => {
    try {
      const response = await fetch(`${url}?access_token=${accessToken}`);
      if (!response.ok) throw new Error("Gagal mengunduh file");

      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);

      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${nama || "model-3d"}${tipeFile ? `.${tipeFile}` : ""}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (error) {
      console.error("Error downloading file:", error);
      alert("Gagal mendownload file. Pastikan Anda memiliki akses.");
    }
  };

  return (
    <Paper
      sx={{
        borderRadius: 3,
        overflow: "hidden",
        border: "1px solid #E5E7EB",
        boxShadow: "0 1px 3px rgba(16,24,40,0.1)",
      }}
    >
      <Table>
        <TableHead>
          <TableRow
            sx={{
              "& .MuiTableCell-root": {
                bgcolor: "#1E1E2D",
                color: "#fff",
                fontWeight: 600,
                fontSize: 13,
                letterSpacing: 0.3,
              },
            }}
          >
            <TableCell>Nama Layer</TableCell>
            <TableCell>URL File</TableCell>
            <TableCell>Koordinat (Lat, Long)</TableCell>
            <TableCell>Pembuat</TableCell>
            <TableCell>Tipe File</TableCell>
            <TableCell>Akses</TableCell>
            <TableCell align="center">Aksi</TableCell>
          </TableRow>
        </TableHead>

        <TableBody>
          {filteredData?.length > 0 ? (
            filteredData.map((row) => (
              <TableRow
                key={row.data_3d_id}
                hover
                sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
              >
                <TableCell sx={{ fontWeight: 600, color: "#111827" }}>
                  {row.nama}
                </TableCell>

                <TableCell>
                  <Link
                    href={row.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    underline="hover"
                    sx={{
                      color: "#4F46E5",
                      maxWidth: 220,
                      display: "inline-block",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                      verticalAlign: "middle",
                    }}
                  >
                    {row.url}
                  </Link>
                </TableCell>

                <TableCell sx={{ color: "#4B5563", fontSize: 13 }}>
                  {row.latitude?.toFixed(4)}, {row.longitude?.toFixed(4)}
                </TableCell>

                <TableCell sx={{ color: "#374151" }}>
                  {row.users?.email || "-"}
                </TableCell>

                <TableCell>
                  <Chip
                    label={(row.tipe_file || "-").toUpperCase()}
                    size="small"
                    color={row.tipe_file === "glb" ? "primary" : "default"}
                    variant={row.tipe_file === "glb" ? "filled" : "outlined"}
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                </TableCell>

                <TableCell>
                  <Chip
                    label={(row.akses || "private").toUpperCase()}
                    size="small"
                    color={row.akses === "public" ? "success" : "default"}
                    variant={row.akses === "public" ? "filled" : "outlined"}
                    sx={{ fontWeight: 600, fontSize: 11 }}
                  />
                </TableCell>

                <TableCell align="center">
                  <Tooltip
                    title={
                      row.tipe_file === "ply"
                        ? "Preview Gaussian Splat"
                        : "Preview di Cesium"
                    }
                  >
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleOpenPreview(row)}
                    >
                      <Visibility fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  <Tooltip title={row.tipe_file === "ply" ? "Unduh .ply" : "Unduh .glb"}>
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => handleDownload(row.url, row.nama, row.tipe_file)}
                    >
                      <Download fontSize="small" />
                    </IconButton>
                  </Tooltip>

                  {role !== "viewer" ? (
                    <>
                      <Tooltip title="Edit Metadata">
                        <IconButton
                          size="small"
                          color="info"
                          onClick={() => handleOpenEdit(row)}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>

                      <Tooltip title="Hapus Layer">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleOpenDelete(row)}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </>
                  ) : null}
                </TableCell>
              </TableRow>
            ))
          ) : (
            <TableRow>
              <TableCell colSpan={7} align="center" sx={{ py: 6 }}>
                <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                  <Typography variant="body1" color="text.secondary">
                    {search
                      ? "Tidak ada data 3D yang sesuai dengan pencarian."
                      : "Belum ada katalog data 3D."}
                  </Typography>
                </Box>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
    </Paper>
  );
};

export default TableData3D;
