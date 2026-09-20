"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import {
  Alert, Avatar, Box, Button, Card, CardContent, Chip, CircularProgress,
  Container, Dialog, DialogActions, DialogContent, DialogTitle, Divider,
  Grid, IconButton, InputAdornment, Paper, Snackbar, Stack, TextField,
  Typography,
} from "@mui/material";
import BadgeIcon from "@mui/icons-material/Badge";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import EmailIcon from "@mui/icons-material/Email";
import LockResetIcon from "@mui/icons-material/LockReset";
import MapIcon from "@mui/icons-material/Map";
import View3dIcon from "@mui/icons-material/ViewInAr";
import Visibility from "@mui/icons-material/Visibility";
import VisibilityOff from "@mui/icons-material/VisibilityOff";

export default function Profile() {
  const { data: session, status } = useSession();
  const [userData, setUserData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    password_lama: "",
    password_baru: "",
    konfirmasi_password: "",
  });
  const [showPassword, setShowPassword] = useState({
    lama: false,
    baru: false,
    konfirmasi: false,
  });
  const [passwordError, setPasswordError] = useState("");
  const [passwordSubmitting, setPasswordSubmitting] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: "" });

  // Endpoint detail hanya mengembalikan data pemilik token, jadi user_id
  // yang dikirim harus milik sesi yang sedang aktif.
  const userId = session?.user?.id || session?.user?.user_id;
  const accessToken = session?.accessToken;

  useEffect(() => {
    const fetchUserData = async () => {
      if (!userId || !accessToken) return;

      try {
        setLoading(true);
        setErrorMsg("");

        const response = await fetch(`/portal/api/users/detail/${userId}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
        });

        const result = await response.json();

        if (!response.ok) {
          throw new Error(result.message || "Gagal mengambil data profile");
        }

        setUserData(result.data);
      } catch (err) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    };

    if (status === "authenticated") {
      fetchUserData();
    } else if (status === "unauthenticated") {
      setLoading(false);
    }
  }, [status, userId, accessToken]);

  const handleOpenPasswordDialog = () => {
    setPasswordForm({ password_lama: "", password_baru: "", konfirmasi_password: "" });
    setPasswordError("");
    setOpenPasswordDialog(true);
  };

  const handleClosePasswordDialog = () => {
    if (passwordSubmitting) return;
    setOpenPasswordDialog(false);
  };

  const handlePasswordFormChange = (field) => (e) => {
    setPasswordForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const toggleShowPassword = (field) => () => {
    setShowPassword((prev) => ({ ...prev, [field]: !prev[field] }));
  };

  const handleSubmitPassword = async () => {
    setPasswordError("");

    const { password_lama, password_baru, konfirmasi_password } = passwordForm;

    if (!password_lama || !password_baru || !konfirmasi_password) {
      setPasswordError("Semua field wajib diisi");
      return;
    }

    if (password_baru !== konfirmasi_password) {
      setPasswordError("Konfirmasi password tidak sesuai dengan password baru");
      return;
    }

    if (password_baru.length < 8) {
      setPasswordError("Password baru minimal 8 karakter");
      return;
    }

    if (!userId || !accessToken) {
      setPasswordError("Sesi tidak valid, silakan login ulang");
      return;
    }

    try {
      setPasswordSubmitting(true);

      const response = await fetch("/portal/api/users/change-password", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
          user_id: userId,
          password_lama,
          password_baru,
          konfirmasi_password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Gagal mengganti password");
      }

      setSnackbar({ open: true, message: "Password berhasil diganti" });
      setOpenPasswordDialog(false);
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSubmitting(false);
    }
  };

  if (loading || status === "loading") {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "60vh" }}>
        <CircularProgress />
      </Box>
    );
  }

  if (errorMsg) {
    return (
      <Container maxWidth="sm" sx={{ mt: 4 }}>
        <Alert severity="error">{errorMsg}</Alert>
      </Container>
    );
  }

  return (
    <Container maxWidth="sm">
      <Box sx={{ py: 4 }}>
        <Card sx={{ borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: "hidden" }}>
          <Box
            sx={{
              height: 120,
              background: "linear-gradient(135deg, #6366F1 0%, #4338CA 100%)",
            }}
          />

          <CardContent sx={{ pt: 0, px: 3, pb: 3 }}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                marginTop: "-50px",
                mb: 2,
              }}
            >
              <Avatar
                alt={userData?.nama || "User"}
                sx={{
                  width: 100,
                  height: 100,
                  bgcolor: "#4F46E5",
                  color: "#fff",
                  fontSize: 36,
                  fontWeight: 700,
                  border: "4px solid white",
                  boxShadow: "0 4px 10px rgba(0,0,0,0.15)",
                  mb: 1,
                }}
              >
                {userData?.nama?.charAt(0)?.toUpperCase() ||
                  userData?.email?.charAt(0)?.toUpperCase() ||
                  "U"}
              </Avatar>

              <Typography variant="h5" fontWeight="bold" align="center" sx={{ color: "#1E1E2D" }}>
                {userData?.nama || "Nama belum diisi"}
              </Typography>

              <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 0.5 }}>
                <Chip
                  label={userData?.role || "User"}
                  size="small"
                  sx={{
                    fontWeight: 600,
                    textTransform: "capitalize",
                    bgcolor: "#EEF2FF",
                    color: "#4F46E5",
                  }}
                />
                {userData?.is_active && (
                  <Chip
                    icon={<CheckCircleIcon />}
                    label="Aktif"
                    color="success"
                    variant="outlined"
                    size="small"
                  />
                )}
              </Stack>
            </Box>

            {/* Jumlah katalog yang pernah dibuat pengguna ini. */}
            <Paper
              variant="outlined"
              sx={{ p: 2, borderRadius: 3, my: 2, bgcolor: "#F9FAFB", borderColor: "#EEF0F4" }}
            >
              <Grid container spacing={2} sx={{ textAlign: "center" }}>
                <Grid size={{ xs: 6 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                    <MapIcon sx={{ color: "#6B7280" }} fontSize="small" />
                    <Typography variant="h6" fontWeight="bold" sx={{ color: "#1E1E2D" }}>
                      {userData?._count?.katalog_data_2d ?? 0}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "#6B7280" }}>
                    Data 2D
                  </Typography>
                </Grid>
                <Divider orientation="vertical" flexItem />
                <Grid size={{ xs: 6 }}>
                  <Stack direction="row" justifyContent="center" alignItems="center" spacing={1}>
                    <View3dIcon sx={{ color: "#6B7280" }} fontSize="small" />
                    <Typography variant="h6" fontWeight="bold" sx={{ color: "#1E1E2D" }}>
                      {userData?._count?.katalog_data_3d ?? 0}
                    </Typography>
                  </Stack>
                  <Typography variant="caption" sx={{ color: "#6B7280" }}>
                    Data 3D
                  </Typography>
                </Grid>
              </Grid>
            </Paper>

            <Stack spacing={1.5} sx={{ my: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <EmailIcon sx={{ color: "#9CA3AF" }} fontSize="small" />
                <Typography variant="body2" sx={{ color: "#6B7280" }}>
                  {userData?.email}
                </Typography>
              </Stack>
              <Stack direction="row" alignItems="center" spacing={1.5}>
                <BadgeIcon sx={{ color: "#9CA3AF" }} fontSize="small" />
                <Typography variant="body2" sx={{ color: "#6B7280" }}>
                  ID: {userData?.user_id}
                </Typography>
              </Stack>
            </Stack>

            <Stack spacing={1.5}>
              <Button
                variant="outlined"
                fullWidth
                startIcon={<LockResetIcon />}
                onClick={handleOpenPasswordDialog}
                sx={{
                  borderRadius: 2.5,
                  py: 1,
                  textTransform: "none",
                  fontWeight: "bold",
                  borderColor: "#D1D5DB",
                  color: "#4F46E5",
                  "&:hover": { borderColor: "#4F46E5", bgcolor: "#EEF2FF" },
                }}
              >
                Ganti Password
              </Button>
            </Stack>
          </CardContent>
        </Card>
      </Box>

      <Dialog open={openPasswordDialog} onClose={handleClosePasswordDialog} fullWidth maxWidth="xs">
        <DialogTitle sx={{ fontWeight: 700, color: "#1E1E2D" }}>Ganti Password</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            {passwordError && <Alert severity="error">{passwordError}</Alert>}

            <TextField
              label="Password Lama"
              type={showPassword.lama ? "text" : "password"}
              value={passwordForm.password_lama}
              onChange={handlePasswordFormChange("password_lama")}
              fullWidth
              disabled={passwordSubmitting}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={toggleShowPassword("lama")} edge="end">
                        {showPassword.lama ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Password Baru"
              type={showPassword.baru ? "text" : "password"}
              value={passwordForm.password_baru}
              onChange={handlePasswordFormChange("password_baru")}
              fullWidth
              disabled={passwordSubmitting}
              helperText="Minimal 8 karakter"
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={toggleShowPassword("baru")} edge="end">
                        {showPassword.baru ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />

            <TextField
              label="Konfirmasi Password Baru"
              type={showPassword.konfirmasi ? "text" : "password"}
              value={passwordForm.konfirmasi_password}
              onChange={handlePasswordFormChange("konfirmasi_password")}
              fullWidth
              disabled={passwordSubmitting}
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton onClick={toggleShowPassword("konfirmasi")} edge="end">
                        {showPassword.konfirmasi ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={handleClosePasswordDialog} disabled={passwordSubmitting} sx={{ color: "#6B7280" }}>
            Batal
          </Button>
          <Button
            variant="contained"
            onClick={handleSubmitPassword}
            disabled={passwordSubmitting}
            sx={{ bgcolor: "#4F46E5", "&:hover": { bgcolor: "#4338CA" }, textTransform: "none" }}
          >
            {passwordSubmitting ? <CircularProgress size={22} /> : "Simpan"}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={snackbar.open}
        autoHideDuration={3000}
        onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      >
        <Alert
          severity="success"
          onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
        >
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Container>
  );
}
