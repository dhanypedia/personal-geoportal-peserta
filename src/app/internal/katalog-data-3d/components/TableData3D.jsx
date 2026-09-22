import { Delete, Download, Edit, Visibility } from '@mui/icons-material'
import { Box, Chip, IconButton, Link, Paper, Table, TableBody, TableCell, TableHead, TableRow, Tooltip, Typography } from '@mui/material'
import React from 'react'

const TableData3D = ({filteredData, search, role, handleOpenDelete, handleOpenEdit, handleOpenPreview, accessToken}) => {
    
    const handleDownload = async (url, modelName, tipeFile) => {
        try {
            // Tampilkan status loading / proses jika perlu
            const response = await fetch(`${url}?access_token=${accessToken}`);
            if (!response.ok) throw new Error('Gagal mengunduh file');

            const blob = await response.blob();
            const downloadUrl = window.URL.createObjectURL(blob);
            
            const link = document.createElement('a');
            link.href = downloadUrl;
            
            // Tentukan nama file saat diunduh
            const extension = tipeFile ? `.${tipeFile}` : '';
            link.download = `${modelName || 'model-3d'}${extension}`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            // Bersihkan objek URL
            window.URL.revokeObjectURL(downloadUrl);
        } catch (error) {
            console.error('Error downloading file:', error);
            alert('Gagal mendownload file. Pastikan Anda memiliki akses.');
        }
    };

    return (
        <Paper
            sx={{
                borderRadius: 3,
                overflow: "hidden",
                border: (theme) => `1px solid ${theme.palette.divider}`,
            }}
        >
            <Table>
                <TableHead>
                    <TableRow>
                        <TableCell>Nama Model</TableCell>
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
                            <TableRow key={row.data_3d_id} hover>
                                <TableCell sx={{ fontWeight: 600 }}>{row.model_name}</TableCell>

                                <TableCell sx={{ color: "text.secondary", fontSize: 13 }}>
                                    {row.latitude?.toFixed(4)}, {row.longitude?.toFixed(4)}
                                </TableCell>

                                <TableCell sx={{ color: "text.secondary" }}>{row.users?.email}</TableCell>

                                <TableCell>
                                    <Chip
                                        label={(row.tipe_file).toUpperCase()}
                                        size="small"
                                        color={row.tipe_file === "glb" ? "primary" : "default"}
                                        variant={row.tipe_file === "glb" ? "filled" : "outlined"}
                                        sx={{ fontWeight: 600, fontSize: 11 }}
                                    />
                                </TableCell>

                                <TableCell>
                                    <Chip
                                        label={(row.akses).toUpperCase()}
                                        size="small"
                                        color={row.akses === "public" ? "primary" : "default"}
                                        variant={row.akses === "public" ? "filled" : "outlined"}
                                        sx={{ fontWeight: 600, fontSize: 11 }}
                                    />
                                </TableCell>

                                <TableCell align="center">
                                    <Tooltip title={row.tipe_file === "ply" ? "Preview Gaussian Splat" : "Preview di Cesium"}>
                                        <IconButton size="small" color="primary" onClick={() => handleOpenPreview(row)}>
                                            <Visibility fontSize="small" />
                                        </IconButton>
                                    </Tooltip>

                                    {/* Tombol Download Menggunakan Fungsi HandleDownload */}
                                    <Tooltip title={row.tipe_file === "ply" ? "Download .ply" : "Download .glb"}>
                                        <IconButton 
                                            size="small" 
                                            color="primary" 
                                            onClick={() => handleDownload(row.url, row.model_name, row.tipe_file)}
                                        >
                                            <Download fontSize="small" />
                                        </IconButton>
                                    </Tooltip>

                                    {role !== "viewer" ? (
                                        <>
                                            <Tooltip title="Edit Metadata">
                                                <IconButton size="small" color="secondary" onClick={() => handleOpenEdit(row)}>
                                                    <Edit fontSize="small" />
                                                </IconButton>
                                            </Tooltip>
                                            <Tooltip title="Hapus Layer">
                                                <IconButton size="small" color="error" onClick={() => handleOpenDelete(row)}>
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
                                <Typography variant="body1" color="text.secondary">
                                    {search ? "Tidak ada data 3D yang sesuai dengan pencarian." : "Belum ada katalog data 3D."}
                                </Typography>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Paper>
    )
}

export default TableData3D;