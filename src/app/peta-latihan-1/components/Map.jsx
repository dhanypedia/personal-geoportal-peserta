"use client";

import { useEffect, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";

/* ======================================================================
   KONFIGURASI
   Isi 4 bagian di bawah ini SEBELUM mengerjakan STEP 2, 3, dan 4.
   Untuk STEP 1 kamu tidak perlu mengisi apa pun, bisa langsung jalan.
   ====================================================================== */

// STEP 2 - WMS
const WMS_URL = "https://geoserver.bps.go.id/rw-kumuh-dki/wms"; // contoh: http://localhost:8080/geoserver/geoportal/wms
const WMS_LAYER_NAME = "rw-kumuh-dki:peta_rw_kumuh"; // contoh: geoportal:nama_layer

// STEP 3 - WFS (harus full URL GetFeature, outputFormat=application/json)
const WFS_URL = "https://matiur-geoportal.com/geoserver/geoportal/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=geoportal%3Ajalur_mrt_krl_lrt_257a7a50&maxFeatures=50&outputFormat=application%2Fjson";

// STEP 4 - WCS
const WCS_URL = "https://matiur-geoportal.com/geoserver/raster/wcs"; // contoh: http://localhost:8080/geoserver/geoportal/wcs
const WCS_COVERAGE_ID = "raster:pleiades_clip"; // contoh: geoportal:nama_coverage
const WCS_BBOX = "106.866403239,-6.297444585,106.873220747,-6.29267965"; // minx,miny,maxx,maxy - ganti sesuai cakupan data kamu

export default function LeafletTutorial() {
  const mapContainerRef = useRef(null);
  const mapRef = useRef(null);
  const layersRef = useRef({}); // tempat menyimpan referensi tiap layer, dipakai lagi di STEP 5 & 6

  const [activeBasemap, setActiveBasemap] = useState("osm");

  useEffect(() => {
    let cancelled = false;

    const init = async () => {
      const L = (await import("leaflet")).default;
      if (cancelled || !mapContainerRef.current || mapRef.current) return;

      /* ============================================================
         STEP 1 — TAMPILAN DASAR LEAFLET
         Basemap OpenStreetMap + peta kosong yang bisa di-pan/zoom.
         Ini SUDAH AKTIF (tidak dikomentari), langsung jalankan dulu
         untuk memastikan setup Next.js + Leaflet kamu benar.
         ============================================================ */
      const map = L.map(mapContainerRef.current, {
        center: [-6.2, 106.816666], // Jakarta, ganti sesuai lokasi kamu
        zoom: 11,
      });

      const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "&copy; OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      mapRef.current = map;
      layersRef.current.osm = osm;
      /* ===================== END STEP 1 ===================== */

      /* ============================================================
         STEP 2 — MENAMPILKAN DATA WMS
         Isi WMS_URL & WMS_LAYER_NAME di atas dulu, baru uncomment blok ini.

      const wmsLayer = L.tileLayer.wms(WMS_URL, {
        layers: WMS_LAYER_NAME,
        format: "image/png",
        transparent: true,
        version: "1.1.0",
      }).addTo(map);

      layersRef.current.wms = wmsLayer;

         ===================== END STEP 2 ===================== */

      /* ============================================================
         STEP 3 — MENAMPILKAN DATA WFS
         WFS mengembalikan GeoJSON (bukan gambar/tile seperti WMS), jadi
         kita fetch manual lalu render pakai L.geoJSON.

      try {
        const res = await fetch(WFS_URL);
        const geojson = await res.json();

        const wfsLayer = L.geoJSON(geojson, {
          style: { color: "#4F46E5", weight: 2, fillOpacity: 0.2 },
          onEachFeature: (feature, layer) => {
            const props = feature.properties || {};
            const rows = Object.entries(props)
              .map(([k, v]) => `<tr><td><b>${k}</b></td><td>${v}</td></tr>`)
              .join("");
            layer.bindPopup(`<table>${rows}</table>`);
          },
        }).addTo(map);

        layersRef.current.wfs = wfsLayer;

        const bounds = wfsLayer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      } catch (err) {
        console.error("Gagal memuat WFS:", err);
      }

         ===================== END STEP 3 ===================== */

      /* ============================================================
         STEP 4 — MENAMPILKAN DATA WCS
         WCS umumnya data raster (DEM, citra satelit, dll). Leaflet tidak
         punya "WCS layer" bawaan seperti WMS, jadi kita minta GeoServer
         men-generate satu gambar lewat GetCoverage, lalu tampilkan
         sebagai image overlay dengan bounding box yang sesuai.

         Catatan: tidak semua WCS server bisa langsung output image/png.
         Kalau gagal/blank, cek dulu format yang didukung server kamu
         (biasanya lewat DescribeCoverage) dan sesuaikan parameter format.

      try {
        const [minx, miny, maxx, maxy] = WCS_BBOX.split(",").map(Number);

        const wcsGetCoverageUrl =
          `${WCS_URL}?service=WCS&version=2.0.1&request=GetCoverage` +
          `&coverageId=${encodeURIComponent(WCS_COVERAGE_ID)}` +
          `&format=image/png` +
          `&subset=Long(${minx},${maxx})` +
          `&subset=Lat(${miny},${maxy})`;

        const imageBounds = [
          [miny, minx],
          [maxy, maxx],
        ];

        const wcsLayer = L.imageOverlay(wcsGetCoverageUrl, imageBounds, {
          opacity: 0.8,
        }).addTo(map);

        layersRef.current.wcs = wcsLayer;
      } catch (err) {
        console.error("Gagal memuat WCS:", err);
      }

         ===================== END STEP 4 ===================== */

      /* ============================================================
         STEP 5 — WIDGET LAYER CONTROL (nyalakan/matikan layer)
         Pakai kontrol bawaan Leaflet: L.control.layers.
         Layer yang otomatis muncul di sini hanya yang sudah kamu
         uncomment di STEP 2-4 (wms/wfs/wcs).

      const overlayLayers = {};
      if (layersRef.current.wms) overlayLayers["Layer WMS"] = layersRef.current.wms;
      if (layersRef.current.wfs) overlayLayers["Layer WFS"] = layersRef.current.wfs;
      if (layersRef.current.wcs) overlayLayers["Layer WCS"] = layersRef.current.wcs;

      L.control.layers(null, overlayLayers, { collapsed: false }).addTo(map);

         ===================== END STEP 5 ===================== */

      /* ============================================================
         STEP 6 (bagian 1/3) — SIAPKAN BASEMAP TAMBAHAN
         Kita buat widget switch basemap SENDIRI (bukan pakai kontrol
         bawaan Leaflet) supaya kamu belajar cara kelola layer secara
         manual dari React. Bagian 2 & 3 ada di luar useEffect ini.

      const satellite = L.tileLayer(
        "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
        { attribution: "Tiles &copy; Esri", maxZoom: 19 }
      );

      layersRef.current.basemaps = {
        osm: layersRef.current.osm,
        satellite,
      };

         ===================== END STEP 6 (bagian 1/3) ===================== */

      setTimeout(() => {}, 0); // no-op, biar block di atas tidak jadi statement terakhir yang aneh saat di-uncomment
    };

    init();

    return () => {
      cancelled = true;
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  /* ============================================================
     STEP 6 (bagian 2/3) — FUNGSI SWITCH BASEMAP
     Dipanggil dari tombol di JSX (bagian 3/3, di bawah).

  const handleSwitchBasemap = (key) => {
    const map = mapRef.current;
    const basemaps = layersRef.current.basemaps;
    if (!map || !basemaps || !basemaps[key] || key === activeBasemap) return;

    map.removeLayer(basemaps[activeBasemap]);
    basemaps[key].addTo(map);
    setActiveBasemap(key);
  };

     ===================== END STEP 6 (bagian 2/3) ===================== */

  /* ============================================================
     STEP 7 (bagian 1/2) — LEGENDA DINAMIS DARI LAYER WMS
     GeoServer bisa generate gambar legenda otomatis lewat
     GetLegendGraphic. Kita bentuk URL-nya dari WMS_URL & WMS_LAYER_NAME
     yang sudah kamu isi di STEP 2.

  const legendUrl =
    `${WMS_URL}?REQUEST=GetLegendGraphic&VERSION=1.0.0&FORMAT=image/png` +
    `&WIDTH=20&HEIGHT=20&LAYER=${encodeURIComponent(WMS_LAYER_NAME)}`;

     ===================== END STEP 7 (bagian 1/2) ===================== */

  return (
    <div style={{ position: "relative", width: "100%", height: "600px" }}>
      <div ref={mapContainerRef} style={{ width: "100%", height: "100%" }} />

      {/* ============================================================
         STEP 6 (bagian 3/3) — TOMBOL SWITCH BASEMAP
         Uncomment bareng bagian 1/3 (di dalam useEffect) dan
         bagian 2/3 (handleSwitchBasemap) di atas.

      <div
        style={{
          position: "absolute",
          top: 16,
          left: 16,
          zIndex: 1000,
          display: "flex",
          gap: 8,
          background: "#fff",
          padding: 8,
          borderRadius: 8,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
        }}
      >
        <button
          onClick={() => handleSwitchBasemap("osm")}
          style={{ fontWeight: activeBasemap === "osm" ? 700 : 400 }}
        >
          OpenStreetMap
        </button>
        <button
          onClick={() => handleSwitchBasemap("satellite")}
          style={{ fontWeight: activeBasemap === "satellite" ? 700 : 400 }}
        >
          Satelit
        </button>
      </div>

         ===================== END STEP 6 (bagian 3/3) ===================== */}

      {/* ============================================================
         STEP 7 (bagian 2/2) — TAMPILKAN GAMBAR LEGENDA
         Uncomment bareng bagian 1/2 (variabel legendUrl) di atas.

      <img
        src={legendUrl}
        alt="Legenda"
        style={{
          position: "absolute",
          bottom: 16,
          right: 16,
          background: "#fff",
          padding: 8,
          borderRadius: 8,
          boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
          zIndex: 1000,
        }}
      />

         ===================== END STEP 7 (bagian 2/2) ===================== */}
    </div>
  );
}