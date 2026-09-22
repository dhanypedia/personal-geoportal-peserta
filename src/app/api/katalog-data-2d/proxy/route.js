import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";

const INTERNAL_PARAMS = ["data_2d_id", "type", "token"];
const PRIVILEGED_ROLES = ["admin"]; // role yang selalu boleh akses layer private

function withBearerFromQuery(request, url) {
  if (request.headers.get("authorization")) return request;
  const token = url.searchParams.get("token");
  if (!token) return request;

  const headers = new Headers(request.headers);
  headers.set("authorization", `Bearer ${token}`);
  return new Request(request.url, { method: request.method, headers });
}

export async function GET(request) {
  const url = new URL(request.url);

  const dataId = url.searchParams.get("data_2d_id");
  const type = url.searchParams.get("type"); // "wms" | "wfs"

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

  // Hanya layer PRIVATE yang wajib punya token valid + cek kepemilikan/role.
  // Layer public tidak perlu autentikasi sama sekali.
  if (layer.akses === "private") {
    const authRequest = withBearerFromQuery(request, url);
    const { payload, error, status } = requireAuth(authRequest);
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    const isOwner = layer.author === payload.user_id;
    const isPrivileged = PRIVILEGED_ROLES.includes(payload.role);

    if (!isOwner && !isPrivileged) {
      return NextResponse.json(
        { message: "Anda tidak memiliki akses ke layer ini" },
        { status: 403 },
      );
    }
  }

  // Derive endpoint GeoServer asli dari layer_name (format "workspace:table")
  const geoserverUrl = process.env.GEOSERVER_URL;
  const workspace = process.env.GEOSERVER_WORKSPACE;

  const target =
    type === "wfs"
      ? new URL(
          `${geoserverUrl}/${workspace}/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=${layer.layer_name}&outputFormat=application/json`,
        )
      : new URL(`${geoserverUrl}/${workspace}/wms`);

  // Teruskan query param tambahan dari request asli (bbox, width, height, dst,
  // yang otomatis dibuat Leaflet untuk tiap tile WMS)
  url.searchParams.forEach((value, key) => {
    if (!INTERNAL_PARAMS.includes(key)) {
      target.searchParams.set(key, value);
    }
  });

  if (type === "wms" && !target.searchParams.get("LAYERS")) {
    target.searchParams.set("LAYERS", layer.layer_name);
  }

  // GeoServer sendiri butuh credential ADMIN untuk layer private (lihat
  // applyGeoServerLayerSecurity di route create), jadi proxy tetap selalu
  // bawa Basic Auth ini ke GeoServer, terlepas dari akses public/private.
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
