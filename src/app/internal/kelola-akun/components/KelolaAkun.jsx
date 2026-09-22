"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Paper,
  Table,
  TableHead,
  TableBody,
  TableRow,
  TableCell,
  TextField,
  InputAdornment,
  Button,
  Chip,
  IconButton,
  Tooltip,
  Modal,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import { useSession } from "next-auth/react";
import TambahAkun from "./TambahAkun";
import UpdateAkun from "./UpdateAkun";
import HapusAkun from "./HapusAkun";
import { Delete, Edit } from "@mui/icons-material";

// Nilai default form Tambah Akun
const DEFAULT_FORM = {
  name: "",
  email: "",
  password: "",
  role: "viewer",
  is_active: true,
};

export default function KelolaAkun() {
  const [tableData, setTableData] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [focusItem, setFocusItem] = useState(null);

  const [openAdd, setOpenAdd] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const session = useSession();

  // Fungsi Fetch Data dari Client Side
  const getData = async () => {
    try {
      const res = await fetch("/portal/api/users/list", {
        headers: {
          Authorization: `Bearer ${session?.data?.accessToken}`,
        },
      });

      if (res.ok) {
        const result = await res.json();
        setTableData(result.data || result);
      }
    } catch (err) {
      console.error("Gagal mengambil data akun:", err);
    }
  };

  // 1. Trigger Fetch Awal saat Komponen Di-mount / Token Siap
  useEffect(() => {
    if (session?.data?.accessToken) {
      getData();
    }
  }, [session?.data?.accessToken]);

  // 2. Handling Pencarian dan Filter Data
  useEffect(() => {
    if (!search.trim()) {
      setFilteredData(tableData);
      return;
    }
    const query = search.toLowerCase();
    const result = (tableData || []).filter((item) => {
      return (
        item.name?.toLowerCase().includes(query) ||
        item.email?.toLowerCase().includes(query)
      );
    });
    setFilteredData(result);
  }, [search, tableData]);

  const handleOpenAdd = () => {
    setForm(DEFAULT_FORM);
    setOpenAdd(true);
  };

  const handleCloseAdd = () => {
    setForm(DEFAULT_FORM);
    setOpenAdd(false);
  };

  const handleOpenEdit = (item) => {
    setOpenEdit(true);
    setFocusItem(item);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setFocusItem(null);
  };

  const handleOpenDelete = (item) => {
    setOpenDelete(true);
    setFocusItem(item);
  };

  const handleCloseDelete = () => {
    setOpenDelete(false);
    setFocusItem(null);
  };

  return (
    <Box sx={{ p: 1 }}>
      {/* Header Section */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          mb: 2,
          flexWrap: "wrap",
          gap: 2,
        }}
      >
        <Typography variant="h5" fontWeight={700} sx={{ color: "#1E1E2D" }}>
          Kelola Akun
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, height: "40px" }}>
        {/* Search Input */}
        <TextField
          placeholder="Cari name atau email..."
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{
            mb: 2,
            height: "100%",
            width: 320,
            bgcolor: "#1E1E2D",
            borderRadius: 2,
            "& .MuiOutlinedInput-notchedOutline": { border: "none" },
            "& .MuiInputBase-input": { color: "#fff" },
            "& .MuiInputBase-input::placeholder": { color: "#E5E7EB", opacity: 0.8 },
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

        {session?.data?.user?.role === "super_admin" ? (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={handleOpenAdd}
            sx={{
              height: "100%",
              bgcolor: "#4F46E5",
              "&:hover": { bgcolor: "#4338CA" },
              borderRadius: 2,
              textTransform: "none",
              fontWeight: 600,
              px: 2.5,
            }}
          >
            Tambah Akun
          </Button>
        ) : null}
      </Box>

      {/* Data Table */}
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
              <TableCell>Name</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Role</TableCell>
              <TableCell>Status</TableCell>
              <TableCell align="center">Aksi</TableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {filteredData?.length > 0 ? (
              filteredData.map((row) => {
                const isSuperAdmin = row.role === "super_admin";

                return (
                  <TableRow
                    key={row.user_id}
                    hover
                    sx={{ "&:last-child td, &:last-child th": { border: 0 } }}
                  >
                    <TableCell sx={{ fontWeight: 600, color: "#111827" }}>
                      {row.name}
                    </TableCell>

                    <TableCell sx={{ color: "#374151" }}>{row.email}</TableCell>

                    <TableCell>
                      <Chip
                        label={(row.role || "-").toUpperCase()}
                        size="small"
                        color={
                          row.role === "super_admin" ? "error" :
                            row.role === "admin" ? "primary" :
                              row.role === "viewer" ? "info" : "default"
                        }
                        variant="filled"
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>

                    <TableCell>
                      <Chip
                        label={row.is_active ? "AKTIF" : "NONAKTIF"}
                        size="small"
                        color={row.is_active ? "success" : "default"}
                        variant={row.is_active ? "filled" : "outlined"}
                        sx={{ fontWeight: 600, fontSize: 11 }}
                      />
                    </TableCell>

                    <TableCell align="center">
                      <Tooltip title={isSuperAdmin ? "Akun Super Admin tidak dapat diedit" : "Edit Akun"}>
                        <span>
                          <IconButton
                            size="small"
                            color="info"
                            onClick={() => handleOpenEdit(row)}
                            disabled={isSuperAdmin}
                          >
                            <Edit fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title={isSuperAdmin ? "Akun Super Admin tidak dapat dihapus" : "Hapus Akun"}>
                        <span>
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleOpenDelete(row)}
                            disabled={isSuperAdmin}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={5} align="center" sx={{ py: 6 }}>
                  <Typography variant="body1" color="text.secondary">
                    {search
                      ? "Tidak ada akun yang sesuai dengan pencarian."
                      : "Belum ada data akun."}
                  </Typography>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>

      {/* Modal Tambah Akun */}
      <Modal open={openAdd} onClose={handleCloseAdd}>
        <TambahAkun
          form={form}
          setForm={setForm}
          handleCloseAdd={handleCloseAdd}
          getData={getData}
          accessToken={session?.data?.accessToken}
        />
      </Modal>

      {/* Modal Edit Akun */}
      <Modal open={openEdit} onClose={handleCloseEdit}>
        <UpdateAkun
          item={focusItem}
          handleCloseEdit={handleCloseEdit}
          getData={getData}
          accessToken={session?.data?.accessToken}
        />
      </Modal>

      {/* Modal Hapus Akun */}
      <Modal open={openDelete} onClose={handleCloseDelete}>
        <HapusAkun
          item={focusItem}
          accessToken={session?.data?.accessToken}
          getData={getData}
          handleCloseDelete={handleCloseDelete}
        />
      </Modal>
    </Box>
  );
}