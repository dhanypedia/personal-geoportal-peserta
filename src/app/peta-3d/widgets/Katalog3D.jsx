"use client";

import { useState } from "react";
import { Box, Tooltip } from "@mui/material";
import { ViewInAr, MenuOpen } from "@mui/icons-material";
import CatalogPanel3D from "./CatalogPanel3D";

const tooltipSlotProps = {
  tooltip: {
    sx: {
      backgroundColor: "#0F2A24",
      color: "#F4EFE2",
      fontWeight: 800,
      fontSize: "0.8rem",
      borderRadius: "999px",
      px: 1.2,
      py: 0.7,
      boxShadow: "0 8px 24px rgba(15,42,36,0.28)",
    },
  },
  arrow: { sx: { color: "#0F2A24" } },
};

export default function Katalog3D({ viewer, addedModelsRef, buttonSize = 48 }) {
  const [open, setOpen] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  const handleToggle = () => {
    setOpen((prev) => !prev);
    setTooltipOpen(false);
  };

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "row",
        alignItems: "flex-start",
        columnGap: "10px",
      }}
    >
      <Tooltip
        title="Katalog Model 3D"
        open={tooltipOpen}
        placement="right"
        arrow
        disableInteractive
        onClose={() => setTooltipOpen(false)}
        slotProps={tooltipSlotProps}
      >
        <Box
          onClick={handleToggle}
          onMouseEnter={() => !open && setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          sx={{
            width: buttonSize,
            height: buttonSize,
            backgroundColor: open ? "#0F2A24" : "#F4EFE2",
            borderRadius: 1.5,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
            transition: "background-color 0.2s",
            "&:hover": { backgroundColor: open ? "#16332B" : "#e9e2cf" },
          }}
          id="katalog-model-3d-public"
        >
          {open ? (
            <MenuOpen sx={{ fontSize: 22, color: "#F4EFE2" }} />
          ) : (
            <ViewInAr sx={{ fontSize: 22, color: "#0F2A24" }} />
          )}
        </Box>
      </Tooltip>

      <CatalogPanel3D
        open={open}
        viewer={viewer}
        addedModelsRef={addedModelsRef}
      />
    </Box>
  );
}