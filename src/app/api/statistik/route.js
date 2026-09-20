import { NextResponse } from "next/server";
import { requireAuth } from "../../../../lib/auth/verifyBearerToken";
import { db } from "../../../../lib/db";

// Angka untuk dashboard, dihitung dari katalog 2D dan 3D.
export async function GET(request) {
  const { error, status } = requireAuth(request, "viewer");
  if (error) {
    return NextResponse.json({ message: error }, { status });
  }

  try {
    const data2d = await db.katalog_data_2d.findMany({ select: { akses: true } });
    const data3d = await db.katalog_data_3d.findMany({ select: { akses: true } });

    const data_public_2d = data2d.filter((item) => item.akses === "public").length;
    const data_private_2d = data2d.filter((item) => item.akses === "private").length;
    const data_public_3d = data3d.filter((item) => item.akses === "public").length;
    const data_private_3d = data3d.filter((item) => item.akses === "private").length;

    const data = {
      total: data_public_2d + data_private_2d + data_public_3d + data_private_3d,
      data_2d: {
        total: data_public_2d + data_private_2d,
        public: data_public_2d,
        private: data_private_2d,
      },
      data_3d: {
        total: data_public_3d + data_private_3d,
        public: data_public_3d,
        private: data_private_3d,
      },
    };

    return NextResponse.json(
      { message: "Berhasil mengambil data statistik", data },
      { status: 200 },
    );
  } catch (err) {
    return NextResponse.json({ message: err.message }, { status: 500 });
  }
}
