"use client";

import { useState, useEffect, useRef } from "react";
import { MyLocation, MyLocationOutlined } from "@mui/icons-material";
import { Paper, IconButton, Tooltip } from "@mui/material";

const MONAS_COORDS = { latitude: -6.1754, longitude: 106.8272 };

const locationIconSVG = `
<svg width="256px" height="256px" viewBox="0 0 18 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M9 0C3.99844 0 0 3.99844 0 9C0 10.7297 0.515625 12.0656 1.41094 13.4203L8.05313 23.4984C8.25469 23.8031 8.60156 24 9 24C9.39844 24 9.75 23.7984 9.94688 23.4984L16.5891 13.4203C17.4844 12.0656 18 10.7297 18 9C18 3.99844 14.0016 0 9 0ZM9 13.9969C6.23906 13.9969 3.99844 11.7563 3.99844 8.99063C3.99844 6.225 6.23906 3.98438 9 3.98438C11.7609 3.98438 14.0016 6.225 14.0016 8.99063C14.0016 11.7563 11.7609 13.9969 9 13.9969Z" fill="#003577"/>
  <circle cx="9" cy="9" r="5" fill="#F7941D"/>
</svg>`;
const locationIconUrl = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(locationIconSVG);

const Locate = ({ viewer, userMarkerRef, buttonSize = 40, tooltip = "left" }) => {
  const [isWidgetActive, setIsWidgetActive] = useState(true);
  const requestedRef = useRef(false);

  const removeMarker = () => {
    if (userMarkerRef.current && viewer && !viewer.isDestroyed()) {
      viewer.entities.remove(userMarkerRef.current);
    }
    userMarkerRef.current = null;
  };

  const placeMarker = ({ latitude, longitude }) => {
    if (!viewer || viewer.isDestroyed()) return;
    const Cesium = window.Cesium;
    const pos = Cesium.Cartesian3.fromDegrees(longitude, latitude);

    removeMarker();
    userMarkerRef.current = viewer.entities.add({
      position: pos,
      name: "Lokasi Anda",
      billboard: {
        image: locationIconUrl,
        width: 38,
        height: 38,
        verticalOrigin: Cesium.VerticalOrigin.BOTTOM,
        heightReference: Cesium.HeightReference.CLAMP_TO_GROUND,
        disableDepthTestDistance: Number.POSITIVE_INFINITY,
      },
    });

    viewer.camera.flyToBoundingSphere(new Cesium.BoundingSphere(pos, 1), {
      offset: new Cesium.HeadingPitchRange(0, Cesium.Math.toRadians(-45), 1000),
      duration: 1.5,
    });
  };

  const getUserLocation = () => {
    if (!("geolocation" in navigator)) return placeMarker(MONAS_COORDS);
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => placeMarker(coords),
      () => placeMarker(MONAS_COORDS),
      { timeout: 10000, maximumAge: 0 }
    );
  };

  useEffect(() => {
    if (!viewer || requestedRef.current) return;
    requestedRef.current = true;
    const t = setTimeout(getUserLocation, 1500);
    return () => clearTimeout(t);
  }, [viewer]);

  const btnSx = {
    width: buttonSize,
    height: buttonSize,
    borderRadius: 1.5,
    bgcolor: "#0F2A24",
    color: "#F4EFE2",
    "&:hover": { bgcolor: "#16332B" },
  };

  return isWidgetActive ? (
    <Tooltip title="Matikan Lokasi" placement={tooltip}>
      <Paper
        elevation={3}
        component={IconButton}
        onClick={() => {
          removeMarker();
          setIsWidgetActive(false);
        }}
        sx={btnSx}
      >
        <MyLocationOutlined fontSize="small" />
      </Paper>
    </Tooltip>
  ) : (
    <Tooltip title="Aktifkan Lokasi" placement={tooltip}>
      <Paper
        elevation={3}
        component={IconButton}
        onClick={() => {
          setIsWidgetActive(true);
          setTimeout(getUserLocation, 800);
        }}
        sx={btnSx}
      >
        <MyLocation fontSize="small" />
      </Paper>
    </Tooltip>
  );
};

export default Locate;