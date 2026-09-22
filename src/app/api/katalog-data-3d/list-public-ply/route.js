import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";

export async function GET(request) {
    try {
        const data = await db.katalog_data_3d.findMany({
            where: {
                akses: "public",
                tipe_file: "ply"
            },
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