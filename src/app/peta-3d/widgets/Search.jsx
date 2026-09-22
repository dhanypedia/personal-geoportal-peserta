"use client";

import { useCallback, useEffect, useState } from "react";
import { Box, Paper, InputBase, IconButton, Fade } from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";

export default function Search({ viewer, markerRef }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);

  const runSearch = useCallback(async (text) => {
    if (!text || text.trim().length < 3) {
      setSuggestions([]);
      return;
    }
    setSearching(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=id&q=${encodeURIComponent(text)}`,
        { headers: { Accept: "application/json" } }
      );
      setSuggestions((await res.json()) || []);
    } catch {
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 450);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  const removeMarker = useCallback(() => {
    if (markerRef.current && viewer && !viewer.isDestroyed()) {
      viewer.entities.remove(markerRef.current);
    }
    markerRef.current = null;
  }, [viewer, markerRef]);

  const handleSelectResult = useCallback(
    (result) => {
      if (!viewer || viewer.isDestroyed()) return;
      const Cesium = window.Cesium;
      const pos = Cesium.Cartesian3.fromDegrees(parseFloat(result.lon), parseFloat(result.lat));

      removeMarker();
      const pin = new Cesium.PinBuilder().fromColor(Cesium.Color.fromCssColorString("#D98E3B"), 48);
      markerRef.current = viewer.entities.add({
        position: pos,
        billboard: {
          image: pin.toDataURL(),
          verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
          heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
          disableDepthTestDistance: Number.POSITIVE_INFINITY,
        },
      });

      viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(pos, 1), {
        offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 1200),
        duration: 1.5,
      });

      setQuery(result.display_name);
      setSuggestions([]);
    },
    [viewer, markerRef, removeMarker]
  );

  const handleClearSearch = useCallback(() => {
    setQuery("");
    setSuggestions([]);
    removeMarker();
  }, [removeMarker]);

  return (
    <Box sx={{ width: { xs: 280, sm: 220, md: 320 }, zIndex: 1000 }}>
      <Paper
        elevation={3}
        sx={{ display: "flex", alignItems: "center", px: 1.5, py: 0.5, borderRadius: 2, bgcolor: "#F7F3E7" }}
      >
        <SearchIcon sx={{ color: "#0F2A24", opacity: 0.6, mr: 1 }} fontSize="small" />
        <InputBase
          placeholder="Cari alamat atau lokasi..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          sx={{ flex: 1, fontSize: 13, color: "#16241F" }}
        />
        {query && (
          <IconButton size="small" onClick={handleClearSearch}>
            <CloseIcon fontSize="small" sx={{ color: "#4A5750" }} />
          </IconButton>
        )}
      </Paper>

      <Fade in={suggestions.length > 0}>
        <Paper
          elevation={4}
          sx={{ mt: 0.5, borderRadius: 2, bgcolor: "#F7F3E7", maxHeight: 260, overflowY: "auto" }}
        >
          {suggestions.map((r, idx) => (
            <Box
              key={idx}
              onClick={() => handleSelectResult(r)}
              sx={{
                px: 2,
                py: 1.2,
                fontSize: 13,
                color: "#16241F",
                cursor: "pointer",
                borderBottom: idx !== suggestions.length - 1 ? "1px solid rgba(0,0,0,0.06)" : "none",
                "&:hover": { bgcolor: "rgba(42,157,143,0.08)" },
              }}
            >
              {r.display_name}
            </Box>
          ))}
        </Paper>
      </Fade>

      {searching && (
        <Box sx={{ mt: 0.5, fontSize: 11, color: "#16241F", opacity: 0.7 }}>Mencari...</Box>
      )}
    </Box>
  );
}