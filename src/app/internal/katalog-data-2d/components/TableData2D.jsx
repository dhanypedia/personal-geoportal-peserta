"use client";
import { useState, useEffect, useCallback } from "react";
import {
  Table, TableHead, TableBody, TableRow, TableCell, Box, Typography,
  Avatar, Chip, IconButton, Tooltip, CircularProgress, Alert,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import LayersIcon from "@mui/icons-material/Layers";
import { Download, Visibility } from "@mui/icons-material";

const TableData2D = ({ search, onDelete, onUpdate, onDownload, accessToken, role, onPreview }) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!accessToken) {
      setLoading(false);
      return;
    }

    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/portal/api/katalog-data-2d/list", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        if (!response.ok) {
          throw new Error(`Gagal memuat data (${response.status})`);
        }

        const result = await response.json();
        setData(result.data || []);
      } catch (err) {
        setError(err.message || "Gagal mengambil data");
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [accessToken]);

  const filtered = (search
    ? data.filter((d) => (d.layer_name || "").toLowerCase().includes(search.toLowerCase()))
    : data
  );

  if (loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={28} />
      </Box>
    );
  }

  if (error) {
    return <Alert severity="error" sx={{ m: 2 }}>{error}</Alert>;
  }

  return (
    <Table>
      <TableHead>
        <TableRow>
          <TableCell sx={{ textTransform: "uppercase" }}>Layer Name</TableCell>
          <TableCell sx={{ textTransform: "uppercase" }}>Akses</TableCell>
          <TableCell sx={{ textTransform: "uppercase" }}>Editable</TableCell>
          <TableCell sx={{ textTransform: "uppercase" }}>WMS / WFS</TableCell>
          <TableCell sx={{ textTransform: "uppercase" }}>Author</TableCell>
          <TableCell align="right" sx={{ textTransform: "uppercase" }}>Aksi</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {filtered.length === 0 && (
          <TableRow>
            <TableCell colSpan={6} align="center" sx={{ py: 6 }}>
              <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
                <LayersIcon sx={{ fontSize: 32, color: "text.secondary" }} />
                <Typography variant="body2" color="text.secondary">
                  {search ? "Tidak ada layer yang cocok" : "Belum ada data"}
                </Typography>
              </Box>
            </TableCell>
          </TableRow>
        )}

        {filtered.map((row) => (
          <TableRow key={row.data_2d_id} hover>
            <TableCell>
              <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: "primary.dark", color: "primary.main" }}>
                  <LayersIcon sx={{ fontSize: 16 }} />
                </Avatar>
                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                  {row.layer_name}
                </Typography>
              </Box>
            </TableCell>
            <TableCell>
              <Chip
                label={row.akses}
                size="small"
                color={row.akses === "public" ? "primary" : "default"}
                variant={row.akses === "public" ? "filled" : "outlined"}
                sx={{ borderRadius: 1.5, fontWeight: 600, textTransform: "capitalize" }}
              />
            </TableCell>
            <TableCell>
              <Chip
                label={row.is_editable ? "Ya" : "Tidak"}
                size="small"
                variant="outlined"
                sx={{ borderRadius: 1.5, fontWeight: 600 }}
              />
            </TableCell>
            <TableCell sx={{ maxWidth: 260 }}>
              <Tooltip title={row.wms_url}>
                <Typography noWrap variant="body2" sx={{ maxWidth: 240 }}>
                  {row.wms_url}
                </Typography>
              </Tooltip>
            </TableCell>
            <TableCell>
              <Typography variant="body2">
                {row.users?.email || "-"}
              </Typography>
            </TableCell>
            <TableCell align="right">
              {role !== "viewer" ? (
                <>
                  <Tooltip title="Update layer">
                    <IconButton size="small" color="primary" onClick={() => onUpdate(row)}>
                      <EditIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Hapus layer">
                    <IconButton size="small" color="error" onClick={() => onDelete(row)}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </>
              ) : null}
              <Tooltip title="Download layer">
                <IconButton size="small" color="error" onClick={() => onDownload(row)}>
                  <Download fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Preview layer">
                <IconButton size="small" color="primary" onClick={() => onPreview(row)}>
                  <Visibility fontSize="small" />
                </IconButton>
              </Tooltip>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
};

export default TableData2D;