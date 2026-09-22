"use client";
import { Grid, Paper, Typography, Box, Skeleton, Alert } from "@mui/material";
import StorageIcon from "@mui/icons-material/Storage";
import MapIcon from "@mui/icons-material/Map";
import Storage3dIcon from "@mui/icons-material/ViewInAr";
import { useEffect, useState } from "react";

export default function Dashboard({ accessToken }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!accessToken) return;

    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await fetch("/portal/api/statistik", {
          headers: { Authorization: `Bearer ${accessToken}` },
        });
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.message || "Gagal mengambil data statistik");
        }
        setStats(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [accessToken]);

  const cards = [
    {
      label: "Total Data",
      value: stats?.total,
      icon: <StorageIcon />,
      color: "#4F46E5",
      bg: "#EEF2FF",
    },
    {
      label: "Total Data 2D",
      value: stats?.data_2d?.total,
      sub: [
        { label: "Public", value: stats?.data_2d?.public ?? 0 },
        { label: "Private", value: stats?.data_2d?.private ?? 0 },
      ],
      icon: <MapIcon />,
      color: "#16A34A",
      bg: "#ECFDF3",
    },
    {
      label: "Total Data 3D",
      value: stats?.data_3d?.total,
      sub: [
        { label: "Public", value: stats?.data_3d?.public ?? 0 },
        { label: "Private", value: stats?.data_3d?.private ?? 0 },
      ],
      icon: <Storage3dIcon />,
      color: "#F59E0B",
      bg: "#FFFBEB",
    },
  ];

  return (
    <Box>
      <Typography variant="h5" fontWeight={700} mb={3} sx={{ color: "#1E1E2D" }}>
        Dashboard
      </Typography>

      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      <Grid container spacing={3}>
        {cards.map((s) => (
          <Grid key={s.label} size={{ xs: 12, sm: 6, md: 4 }}>
            <Paper
              sx={{
                p: 3,
                display: "flex",
                alignItems: "center",
                gap: 2,
                borderRadius: 3,
                border: "1px solid #EEF0F4",
                boxShadow: "0 1px 2px rgba(16,24,40,0.06)",
              }}
            >
              <Box
                sx={{
                  width: 52,
                  height: 52,
                  borderRadius: 2,
                  bgcolor: s.bg,
                  color: s.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </Box>

              <Box sx={{ minWidth: 0 }}>
                {loading ? (
                  <Skeleton variant="text" width={48} height={44} />
                ) : (
                  <Typography variant="h4" fontWeight={700}>
                    {s.value ?? 0}
                  </Typography>
                )}
                <Typography color="text.secondary" fontSize={14}>
                  {s.label}
                </Typography>
              </Box>

              {s.sub && (
                <Box sx={{ display: "flex", flexDirection: "column", ml: "auto" }}>
                  {loading ? (
                    <>
                      <Skeleton variant="text" width={80} />
                      <Skeleton variant="text" width={80} />
                    </>
                  ) : (
                    s.sub.map((item) => (
                      <Typography
                        key={item.label}
                        color="text.secondary"
                        fontSize={12}
                      >
                        {item.value} Data {item.label}
                      </Typography>
                    ))
                  )}
                </Box>
              )}
            </Paper>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}