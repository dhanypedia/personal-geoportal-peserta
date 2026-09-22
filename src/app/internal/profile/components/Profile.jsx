'use client'
import React, { useEffect, useState } from 'react'
import {
    Container, Box, Typography, Avatar, Card, CardContent,
    Button, Stack, Grid, Chip, Divider, CircularProgress, Alert, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField,
    IconButton, InputAdornment, Snackbar
} from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import LockResetIcon from '@mui/icons-material/LockReset'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import EmailIcon from '@mui/icons-material/Email'
import BadgeIcon from '@mui/icons-material/Badge'
import MapIcon from '@mui/icons-material/Map'
import View3dIcon from '@mui/icons-material/ViewInAr'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { useSession } from 'next-auth/react'

const Profile = () => {
    const { data: session, status } = useSession();
    const [userData, setUserData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // === State untuk dialog ganti password ===
    const [openPasswordDialog, setOpenPasswordDialog] = useState(false);
    const [passwordForm, setPasswordForm] = useState({
        password_lama: '',
        password_baru: '',
        konfirmasi_password: ''
    });
    const [showPassword, setShowPassword] = useState({
        lama: false,
        baru: false,
        konfirmasi: false
    });
    const [passwordError, setPasswordError] = useState('');
    const [passwordSubmitting, setPasswordSubmitting] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });

    useEffect(() => {
        const fetchUserData = async () => {
            const userId = session?.user?.id || session?.user?.user_id;
            const token = session?.accessToken;

            if (!userId || !token) return;

            try {
                setLoading(true);
                const response = await fetch(`/portal/api/users/detail/${userId}`, {
                    headers: {
                        "Authorization": `Bearer ${token}`
                    }
                });

                const result = await response.json();

                if (!response.ok) {
                    throw new Error(result.message || 'Gagal mengambil data profile');
                }

                setUserData(result.data);
            } catch (err) {
                setErrorMsg(err.message);
            } finally {
                setLoading(false);
            }
        };

        if (status === 'authenticated') {
            fetchUserData();
        } else if (status === 'unauthenticated') {
            setLoading(false);
        }
    }, [session, status]);

    const handleOpenPasswordDialog = () => {
        setPasswordForm({ password_lama: '', password_baru: '', konfirmasi_password: '' });
        setPasswordError('');
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
        setPasswordError('');

        const { password_lama, password_baru, konfirmasi_password } = passwordForm;

        if (!password_lama || !password_baru || !konfirmasi_password) {
            setPasswordError('Semua field wajib diisi');
            return;
        }

        if (password_baru !== konfirmasi_password) {
            setPasswordError('Konfirmasi password tidak sesuai dengan password baru');
            return;
        }

        if (password_baru.length < 8) {
            setPasswordError('Password baru minimal 8 karakter');
            return;
        }

        const userId = session?.user?.id || session?.user?.user_id;
        const token = session?.accessToken;

        if (!userId || !token) {
            setPasswordError('Sesi tidak valid, silakan login ulang');
            return;
        }

        try {
            setPasswordSubmitting(true);

            const response = await fetch('/portal/api/users/change-password', {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    user_id: userId,
                    password_lama,
                    password_baru,
                    konfirmasi_password
                })
            });

            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.message || 'Gagal mengganti password');
            }

            setSnackbar({ open: true, message: 'Password berhasil diganti', severity: 'success' });
            setOpenPasswordDialog(false);
        } catch (err) {
            setPasswordError(err.message);
        } finally {
            setPasswordSubmitting(false);
        }
    };

    if (loading || status === 'loading') {
        return (
            <Box display="flex" justifycontent="center" alignitems="center" minheight="60vh">
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
                <Card sx={{ borderRadius: 4, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", overflow: 'hidden' }}>

                    {/* Header Banner */}
                    <Box
                        sx={{
                            height: 120,
                            background: 'linear-gradient(135deg, #1976d2 0%, #004ba0 100%)',
                            position: 'relative'
                        }}
                    />

                    <CardContent sx={{ pt: 0, px: 3, pb: 3 }}>
                        {/* Avatar & Main Info */}
                        <Box
                            display="flex"
                            flexdirection="column"
                            alignitems="center"
                            sx={{ marginTop: '-50px', mb: 2 }}
                        >
                            <Avatar
                                alt={userData?.name || 'User'}
                                src="/avatar.jpg"
                                sx={{
                                    width: 100,
                                    height: 100,
                                    border: '4px solid white',
                                    boxShadow: '0 4px 10px rgba(0,0,0,0.15)',
                                    mb: 1
                                }}
                            />
                            <Typography variant="h5" fontWeight="bold" align="center">
                                {userData?.name || 'Nama Tidak Tersedia'}
                            </Typography>

                            <Stack direction="row" spacing={1} alignitems="center" sx={{ mt: 0.5 }}>
                                <Chip
                                    label={userData?.role || 'User'}
                                    color="primary"
                                    size="small"
                                    sx={{ fontWeight: 'medium', textTransform: 'capitalize' }}
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

                        {/* Quick Stats Data Katalog */}
                        <Paper variant="outlined" sx={{ p: 2, borderRadius: 3, my: 2, backgroundColor: '#a9acaf' }}>
                            <Grid container spacing={2} textalign="center">
                                <Grid xs={6}>
                                    <Stack direction="row" justifycontent="center" alignitems="center" spacing={1}>
                                        <MapIcon color="action" fontSize="small" />
                                        <Typography variant="h6" fontWeight="bold">
                                            {userData?._count?.katalog_data_2d ?? 0}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">Data 2D</Typography>
                                </Grid>
                                <Divider orientation="vertical" flexItem sx={{ mr: "-1px" }} />
                                <Grid xs={6}>
                                    <Stack direction="row" justifycontent="center" alignitems="center" spacing={1}>
                                        <View3dIcon color="action" fontSize="small" />
                                        <Typography variant="h6" fontWeight="bold">
                                            {userData?._count?.katalog_data_3d ?? 0}
                                        </Typography>
                                    </Stack>
                                    <Typography variant="caption" color="text.secondary">Data 3D</Typography>
                                </Grid>
                            </Grid>
                        </Paper>

                        {/* Metadata Info */}
                        <Stack spacing={1.5} sx={{ my: 2.5 }}>
                            <Stack direction="row" alignitems="center" spacing={1.5}>
                                <EmailIcon color="disabled" fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                    {userData?.email}
                                </Typography>
                            </Stack>
                            <Stack direction="row" alignitems="center" spacing={1.5}>
                                <BadgeIcon color="disabled" fontSize="small" />
                                <Typography variant="body2" color="text.secondary">
                                    ID: {userData?.user_id}
                                </Typography>
                            </Stack>
                        </Stack>

                        {/* Action Buttons */}
                        <Stack spacing={1.5}>
                            <Button
                                variant="outlined"
                                fullWidth
                                startIcon={<LockResetIcon />}
                                onClick={handleOpenPasswordDialog}
                                sx={{
                                    borderRadius: 2.5,
                                    py: 1,
                                    textTransform: 'none',
                                    fontWeight: 'bold'
                                }}
                            >
                                Ganti Password
                            </Button>
                        </Stack>
                    </CardContent>
                </Card>
            </Box>

            {/* Dialog Ganti Password */}
            <Dialog open={openPasswordDialog} onClose={handleClosePasswordDialog} fullWidth maxWidth="xs">
                <DialogTitle>Ganti Password</DialogTitle>
                <DialogContent>
                    <Stack spacing={2} sx={{ mt: 1 }}>
                        {passwordError && <Alert severity="error">{passwordError}</Alert>}

                        <TextField
                            label="Password Lama"
                            type={showPassword.lama ? 'text' : 'password'}
                            value={passwordForm.password_lama}
                            onChange={handlePasswordFormChange('password_lama')}
                            fullWidth
                            disabled={passwordSubmitting}
                            inputprops={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={toggleShowPassword('lama')} edge="end">
                                            {showPassword.lama ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <TextField
                            label="Password Baru"
                            type={showPassword.baru ? 'text' : 'password'}
                            value={passwordForm.password_baru}
                            onChange={handlePasswordFormChange('password_baru')}
                            fullWidth
                            disabled={passwordSubmitting}
                            helperText="Minimal 8 karakter"
                            inputprops={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={toggleShowPassword('baru')} edge="end">
                                            {showPassword.baru ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />

                        <TextField
                            label="Konfirmasi Password Baru"
                            type={showPassword.konfirmasi ? 'text' : 'password'}
                            value={passwordForm.konfirmasi_password}
                            onChange={handlePasswordFormChange('konfirmasi_password')}
                            fullWidth
                            disabled={passwordSubmitting}
                            inputprops={{
                                endAdornment: (
                                    <InputAdornment position="end">
                                        <IconButton onClick={toggleShowPassword('konfirmasi')} edge="end">
                                            {showPassword.konfirmasi ? <VisibilityOff /> : <Visibility />}
                                        </IconButton>
                                    </InputAdornment>
                                )
                            }}
                        />
                    </Stack>
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={handleClosePasswordDialog} disabled={passwordSubmitting}>
                        Batal
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitPassword}
                        disabled={passwordSubmitting}
                    >
                        {passwordSubmitting ? <CircularProgress size={22} /> : 'Simpan'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar Notifikasi */}
            <Snackbar
                open={snackbar.open}
                autoHideDuration={3000}
                onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    severity={snackbar.severity}
                    onClose={() => setSnackbar((prev) => ({ ...prev, open: false }))}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
};

export default Profile;