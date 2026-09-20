import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";

export async function GET(request) {
    const { payload, error, status } = requireAuth(request, "viewer");
    if (error) {
        return NextResponse.json({ message: error }, { status });
    }

    try {
        const data = await db.katalog_data_3d.findMany({
            select: {
                data_3d_id: true,
                nama: true,
                akses: true,
                url: true,
                latitude: true,
                longitude: true,
                heading: true,
                pitch: true,
                roll: true,
                // scale diperlukan halaman pratinjau untuk menentukan ukuran
                // model. Sebelumnya nilai itu ditulis tetap di frontend,
                // sehingga nilai yang tersimpan tidak pernah terpakai.
                scale: true,
                // tipe_file dipakai tabel katalog untuk memilih penampil:
                // .ply dibuka dengan penampil Gaussian Splat, .glb dengan
                // Cesium. Tanpa kolom ini, berkas .ply selalu dibuka Cesium.
                tipe_file: true,
                users: {
                    select: {
                        email: true
                    }
                }
            }
        });

        if (!data) {
            return NextResponse.json({ error: "Data 3D tidak ditemukan" }, { status: 400 });
        }

        return NextResponse.json({ message: "Berhasil mengambil daftar katalog 3D", data: data }, { status: 200 })
    } catch (err) {
        return NextResponse.json({ message: err.message || "Terjadi kesalahan pada server" }, { status: 500 })
    }
}