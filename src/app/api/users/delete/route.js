import { NextResponse } from "next/server";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";
import { db } from "../../../../../lib/db";

export async function DELETE(request) {
    const { payload, error, status } = requireAuth(request, "super_admin");
    if (error) {
        return NextResponse.json({ message: error }, { status });
    }

    // user_id diambil dari query string, bukan dari body. Permintaan DELETE
    // umumnya tidak memuat body, sehingga membaca request.json() akan gagal
    // sebelum pemeriksaan apa pun dijalankan.
    const { searchParams } = new URL(request.url);
    const data = { user_id: searchParams.get("user_id") };

    try {
        const deletedUser = await db.users.delete({
            where: { user_id: data.user_id },
            select: {
                user_id: true,
                email: true
            }
        });

        return NextResponse.json({ message: "Berhasil menghapus user", data: deletedUser }, { status: 200 });

    } catch (err) {
        return NextResponse.json({ message: err.message }, { status: 500 });
    }
}