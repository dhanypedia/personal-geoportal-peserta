import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";

// Nilai angka dari FormData selalu berupa teks. Kolom yang tidak dikirim
// atau nilainya kosong akan menjadi NaN bila dipaksa parseFloat, dan Prisma
// menolak NaN. Nilai seperti itu dikembalikan ke isi database.
function angka(nilai, bawaan) {
    const n = parseFloat(nilai);
    return Number.isFinite(n) ? n : bawaan;
}

// Mengubah metadata data 3D: akses, posisi, dan orientasi model. Nama dan
// berkas modelnya tidak diubah, jadi tidak ada field itu di sini.
export async function POST(request) {
    const { error, status } = requireAuth(request, "admin");
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

        if (!data_3d_id) {
            return NextResponse.json({ message: "data_3d_id tidak boleh kosong" }, { status: 400 });
        }

        const isDataExist = await db.katalog_data_3d.findUnique({
            where: { data_3d_id: data_3d_id },
        });

        if (!isDataExist) {
            return NextResponse.json({ message: "Data 3D tidak ditemukan" }, { status: 404 });
        }

        await db.katalog_data_3d.update({
            where: { data_3d_id: data_3d_id },
            data: {
                akses: ["public", "private"].includes(akses) ? akses : isDataExist.akses,
                latitude: angka(latitude, isDataExist.latitude),
                longitude: angka(longitude, isDataExist.longitude),
                heading: angka(heading, isDataExist.heading),
                pitch: angka(pitch, isDataExist.pitch),
                roll: angka(roll, isDataExist.roll),
                scale: angka(scale, isDataExist.scale),
            },
        });

        return NextResponse.json({ message: "Berhasil memperbarui data 3D" }, { status: 200 });
    } catch (err) {
        console.error("Error update data 3D:", err);
        return NextResponse.json({ message: err.message || "Terjadi kesalahan pada server" }, { status: 500 });
    }
}
