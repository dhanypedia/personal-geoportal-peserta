import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../../lib/auth/verifyBearerToken";
import { db } from "../../../../../../lib/db";

export async function GET(request, { params }) {
  try {
    const { user_id } = await params;

    // Validasi Token
    const { payload, error, status } = requireAuth(request, "viewer");
    if (error) {
      return NextResponse.json({ message: error }, { status });
    }

    // Pengecekan akses data diri sendiri (sesuaikan payload field user_id)
    const currentUserId = payload.user_id || payload.id;
    if (user_id !== currentUserId) {
      return NextResponse.json(
        { message: "Tidak bisa mengakses data profile orang lain" },
        { status: 403 },
      );
    }

    // Fetch data dari database beserta jumlah kontribusi data
    const user = await db.users.findUnique({
      where: { user_id },
      select: {
        user_id: true,
        name: true,
        email: true,
        role: true,
        is_active: true,
        _count: {
          select: {
            katalog_data_2d: true,
            katalog_data_3d: true,
          },
        },
      },
    });

    if (!user) {
      return NextResponse.json(
        { message: "User tidak ditemukan" },
        { status: 404 },
      );
    }

    return NextResponse.json({
      status: "success",
      data: user,
    });
  } catch (err) {
    return NextResponse.json(
      { message: err.message || "Internal Server Error" },
      { status: 500 },
    );
  }
}
