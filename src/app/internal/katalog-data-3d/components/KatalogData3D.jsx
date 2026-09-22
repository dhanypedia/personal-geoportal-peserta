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
  Link,
  Modal,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import TambahData from "./TambahData";
import { Visibility } from "@mui/icons-material";
import { useSession } from "next-auth/react";
import dynamic from "next/dynamic";
import HapusData from "./HapusData";
import UpdateData from "./UpdateData";
import TableData3D from "./TableData3D";

// Keduanya butuh WebGL/browser API — wajib ssr: false
const PreviewCesiumModal = dynamic(() => import("./PreviewCesiumModal"), { ssr: false });
const PreviewPlyModal = dynamic(() => import("./PreviewPlyModal"), { ssr: false });

const DEFAULT_FORM = {
  model_name: "",
  file: null,
  akses: "public",
  latitude: "",
  longitude: "",
  heading: 0,
  pitch: 0,
  roll: 0,
  scale: 1,
};

export default function KatalogData3D({ accessToken, role }) {
  const [tableData, setTableData] = useState([]);
  const [search, setSearch] = useState("");
  const [filteredData, setFilteredData] = useState([]);
  const [focusItem, setFocusItem] = useState(null);

  const [openPreview, setOpenPreview] = useState(false);
  const [openAdd, setOpenAdd] = useState(false);
  const [openDelete, setOpenDelete] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [form, setForm] = useState(DEFAULT_FORM);

  const getData = async () => {
    try {
      const res = await fetch("/portal/api/katalog-data-3d/list", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (res.ok) {
        const result = await res.json();
        setTableData(result.data || result);
      }
    } catch (err) {
      console.error("Gagal mengambil data tabel:", err);
    }
  };

  useEffect(() => {
    if (accessToken) {
      getData();
    }
  }, [accessToken]);

  useEffect(() => {
    if (!search.trim()) {
      setFilteredData(tableData);
      return;
    }
    const query = search.toLowerCase();
    const result = (tableData || []).filter((item) =>
      item.model_name?.toLowerCase().includes(query)
    );
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

  const handleOpenPreview = (item) => {
    setOpenPreview(true);
    setFocusItem(item);
  };

  const handleClosePreview = () => {
    // Lepaskan fokus sebelum modal ditutup. MUI menandai modal yang sedang
    // ditutup dengan aria-hidden, dan peramban menolak menyembunyikan elemen
    // yang masih memegang fokus:
    //
    //   Blocked aria-hidden on an element because its descendant retained focus
    //
    // Melepas fokus lebih dahulu membuat peringatan itu tidak muncul, dan
    // sekaligus membuat pembaca layar tidak kehilangan jejak.
    if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
      document.activeElement.blur();
    }
    setOpenPreview(false);
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

  const handleOpenEdit = (item) => {
    setOpenEdit(true);
    setFocusItem(item);
  };

  const handleCloseEdit = () => {
    setOpenEdit(false);
    setFocusItem(null);
  };

  return (
    <Box sx={{ p: 1 }}>
      <Box sx={{ display: "flex", alignItems: "center", mb: 2, flexWrap: "wrap", gap: 2 }}>
        <Typography variant="h5" fontWeight={700} sx={{ color: "#1E1E2D" }}>
          Katalog Data 3D
        </Typography>
      </Box>

      <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2, height: "40px" }}>
        <TextField
          placeholder="Cari nama model..."
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
        {role !== "viewer" ? (
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
            Tambah Layer 3D
          </Button>
        ) : null}
      </Box>

      <TableData3D filteredData={filteredData} search={search} role={role} handleOpenDelete={handleOpenDelete} handleOpenEdit={handleOpenEdit} handleOpenPreview={handleOpenPreview} accessToken={accessToken}/>

      {/* Modal Form Tambah Data */}
      <Modal open={openAdd} onClose={handleCloseAdd}>
        <TambahData
          form={form}
          setForm={setForm}
          handleCloseAdd={handleCloseAdd}
          getData={getData}
          accessToken={accessToken}
        />
      </Modal>

      {/* Modal Preview — pilih komponen berdasarkan tipe_file milik data yang dipilih */}
      <Modal open={openPreview} onClose={handleClosePreview}>
        {focusItem?.tipe_file === "ply" ? (
          <PreviewPlyModal
            openPreview={openPreview}
            item={focusItem}
            handleClosePreview={handleClosePreview}
          />
        ) : (
          <PreviewCesiumModal
            openPreview={openPreview}
            item={focusItem}
            handleClosePreview={handleClosePreview}
            accessToken={accessToken}
          />
        )}
      </Modal>

      {/* Modal Hapus Data */}
      <Modal open={openDelete} onClose={handleCloseDelete}>
        <HapusData
          item={focusItem}
          accessToken={accessToken}
          getData={getData}
          handleCloseDelete={handleCloseDelete}
        />
      </Modal>

      {/* Modal Edit Data */}
      <Modal open={openEdit} onClose={handleCloseEdit}>
        <UpdateData
          item={focusItem}
          handleCloseEdit={handleCloseEdit}
          getData={getData}
          accessToken={accessToken}
        />
      </Modal>
    </Box>
  );
}