import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";

export async function POST(request) {
    // 1. Validasi Autentikasi
    const { payload, error, status } = requireAuth(request, "admin");
    if (error) {
        return NextResponse.json({ message: error }, { status });
    }
    try {
        const formData = await request.formData();
        const data_3d_id = formData.get("data_3d_id");
        const akses = formData.get("akses");
        const latitude = formData.get("latitude");
        const longitude = formData.get("longitude");
        const heading = formData.get("heading");
        const pitch = formData.get("pitch");
        const roll = formData.get("roll");
        const scale = formData.get("scale");

        // 2. Validasi input wajib
        if (!data_3d_id) {
            return NextResponse.json({ message: "data_3d_id tidak boleh kosong" }, { status: 400 });
        }

        // 3. Cek apakah data dengan id tersebut ada
        const isDataExist = await db.katalog_data_3d.findUnique({
            where: { data_3d_id: data_3d_id },
        });

        if (!isDataExist) {
            return NextResponse.json({ message: "Data 3D tidak ditemukan" }, { status: 404 });
        }

        // 4. Update hanya field yang diizinkan
        await db.katalog_data_3d.update({
            where: { data_3d_id: data_3d_id },
            data: {
                akses: akses,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                heading: parseFloat(heading),
                pitch: parseFloat(pitch),
                roll: parseFloat(roll),
                scale: parseFloat(scale)
            },
        });

        return NextResponse.json({ message: "Berhasil memperbarui data 3D" }, { status: 200 });
    } catch (err) {
        console.error("Error Upload:", err);
        return NextResponse.json({ message: err.message || "Terjadi kesalahan pada server" }, { status: 500 });
    }
}