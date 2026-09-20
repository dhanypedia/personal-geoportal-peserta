import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";

// Daftar model 3D publik menurut jenis berkasnya. Dipisah karena berkas .glb
// dan .ply ditampilkan oleh penampil yang berbeda, sehingga pemanggil API
// perlu tahu mana yang harus dipakai tanpa menebak dari alamat berkasnya.
export async function GET(request) {
    try {
        const data = await db.katalog_data_3d.findMany({
            where: {
                akses: "public",
                tipe_file: "ply"
            },
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
                scale: true,
                tipe_file: true,
                users: {
                    select: {
                        email: true
                    }
                }
            }
        });

        return NextResponse.json({ message: "Berhasil mengambil daftar katalog 3D", data: data }, { status: 200 })
    } catch (err) {
        return NextResponse.json({ message: err.message || "Terjadi kesalahan pada server" }, { status: 500 })
    }
}
