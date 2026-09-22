import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";

export async function GET(request) {
  const { payload, error, status } = requireAuth(request, "viewer");
  if (error) {
    return NextResponse.json({ message: error }, { status });
  }
  const isPublicRole = payload.role === "viewer";

  try {
    const data = await db.katalog_data_3d.findMany({
      where: isPublicRole ? { akses: "public" } : {},
      select: {
        data_3d_id: true,
        model_name: true,
        akses: true,
        url: true,
        latitude: true,
        longitude: true,
        heading: true,
        pitch: true,
        roll: true,
        scale: true,
        tipe_file: true,
        users: {
          select: {
            email: true,
          },
        },
      },
    });

    if (!data) {
      return NextResponse.json(
        { error: "Data 3D tidak ditemukan" },
        { status: 400 },
      );
    }

    return NextResponse.json(
      { message: "Berhasil mengambil daftar katalog 3D", data: data },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Terjadi kesalahan pada server" },
      { status: 500 },
    );
  }
}
