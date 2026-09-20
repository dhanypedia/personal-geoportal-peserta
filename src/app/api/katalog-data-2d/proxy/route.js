import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";
import { hasRequiredRole } from "../../../../../lib/auth/roles";

// Parameter yang dipakai proxy sendiri, tidak boleh ikut diteruskan ke
// GeoServer karena bukan bagian dari protokol WMS/WFS.
const INTERNAL_PARAMS = ["data_2d_id", "type", "token"];

// Leaflet memuat tile WMS lewat <img>, sehingga tidak bisa menyertakan
// header Authorization. Token karena itu boleh datang dari query string.
function withBearerFromQuery(request, url) {
  if (request.headers.get("authorization")) return request;
  const token = url.searchParams.get("token");
  if (!token) return request;

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${token}`);
  return new Request(request.url, { method: request.method, headers });
}

// Meneruskan permintaan WMS/WFS ke GeoServer. Alamat GeoServer tidak pernah
// dikirim ke browser, dan akses layer private diperiksa di sini.
export async function GET(request) {
  const url = new URL(request.url);

  const dataId = url.searchParams.get("data_2d_id");
  const type = url.searchParams.get("type");

  if (!dataId || !type || !["wms", "wfs"].includes(type)) {
    return NextResponse.json(
      { message: "Parameter 'data_2d_id' dan 'type' (wms|wfs) wajib diisi" },
      { status: 400 },
    );
  }

  const layer = await db.katalog_data_2d.findUnique({
    where: { data_2d_id: dataId },
  });

  if (!layer) {
    return NextResponse.json(
      { message: "Layer tidak ditemukan" },
      { status: 404 },
    );
  }

  // Layer public tidak perlu autentikasi sama sekali.
  if (layer.akses === "private") {
    const authRequest = withBearerFromQuery(request, url);
    const { payload, error, status } = requireAuth(authRequest);
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    // Token lama hanya memuat klaim "id". Setelah lib/auth/jwt.js ikut
    // menandatangani "user_id", keduanya bisa dipakai.
    const pemilik = payload.user_id || payload.id;
    const isOwner = layer.author === pemilik;
    const isPrivileged = hasRequiredRole(payload.role, "admin");

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { message: "Anda tidak memiliki akses ke layer ini" },
        { status: 403 },
      );
    }
  }

  // Endpoint GeoServer diturunkan dari layer_name (format "workspace:table").
  const geoserverUrl = process.env.GEOSERVER_URL;
  const workspace = process.env.GEOSERVER_WORKSPACE;

  const target =
    type === "wfs"
      ? new URL(
        `${geoserverUrl}/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer.layer_name}&outputFormat=application/json`,
      )
      : new URL(`${geoserverUrl}/${workspace}/wms`);

  // Parameter lain diteruskan apa adanya, misalnya bbox, width, dan height
  // yang dibuat Leaflet untuk tiap tile.
  url.searchParams.forEach((value, key) => {
    if (!INTERNAL_PARAMS.includes(key)) {
      target.searchParams.set(key, value);
    }
  });

  if (type === "wms" && !target.searchParams.get("LAYERS")) {
    target.searchParams.set("LAYERS", layer.layer_name);
  }

  // Layer private di GeoServer hanya dapat dibaca ADMIN, jadi proxy selalu
  // membawa Basic Auth milik GeoServer, terlepas dari public atau private.
  const geoserverAuth = Buffer.from(
    `${process.env.GEOSERVER_USERNAME}:${process.env.GEOSERVER_PASSWORD}`,
  ).toString("base64");

  try {
    const geoserverRes = await fetch(target.toString(), {
      headers: { Authorization: `Basic ${geoserverAuth}` },
    });

    if (!geoserverRes.ok) {
      const text = await geoserverRes.text();
      return NextResponse.json(
        { message: "GeoServer mengembalikan error", detail: text },
        { status: geoserverRes.status },
      );
    }

    const contentType =
      geoserverRes.headers.get("content-type") || "application/octet-stream";
    const buffer = await geoserverRes.arrayBuffer();

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Cache-Control": "private, max-age=60",
      },
    });
  } catch (err) {
    return NextResponse.json(
      { message: "Gagal menghubungi GeoServer", detail: err.message },
      { status: 502 },
    );
  }
}
