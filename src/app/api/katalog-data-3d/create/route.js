import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";
import { writeFile } from "fs/promises";
import path from "path";
import fs from "fs";

export async function POST(request) {
    // 1. Validasi Autentikasi
    const { payload, error, status } = requireAuth(request, "admin");
    if (error) {
        return NextResponse.json({ message: error }, { status });
    }

    try {
        const formData = await request.formData();
        const file = formData.get("file");
        const model_name = formData.get("model_name");
        const akses = formData.get("akses");
        const latitude = formData.get("latitude");
        const longitude = formData.get("longitude");
        const heading = formData.get("heading");
        const pitch = formData.get("pitch");
        const roll = formData.get("roll");
        const scale = formData.get("scale");

        if (!file) {
            return NextResponse.json({ message: "File 3D tidak boleh kosong" }, { status: 400 });
        }

        // 2. Generate UUID terlebih dahulu
        const data_3d_id = crypto.randomUUID();

        // Dapatkan ekstensi asli dari file
        const fileExtension = path.extname(file.name); // .glb / .ply — dipakai untuk nama file fisik
        const tipeFile = fileExtension.replace(".", "").toLowerCase(); // "glb" / "ply" — disimpan ke DB

        // Buat nama file berdasarkan UUID semata
        const filename = `${data_3d_id}${fileExtension}`;

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        const uploadDir = path.join(process.cwd(), "data/models");

        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, filename);

        // Tulis file ke storage lokal
        await writeFile(filePath, buffer);

        // Alamat disimpan relatif, tanpa domain. Alasannya, alamat aplikasi
        // berganti dari alamat IP menjadi subdomain pada tahap berikutnya, dan
        // alamat mutlak yang tersimpan akan menunjuk ke alamat lama. Alamat
        // relatif dibaca dari domain yang sedang dipakai peramban.
        const fileUrl = `/portal/api/katalog-data-3d/models/${data_3d_id}`;

        // 3. Simpan ke Database Prisma dengan UUID yang sama
        await db.katalog_data_3d.create({
            data: {
                data_3d_id: data_3d_id,
                model_name: model_name,
                akses: akses,
                url: fileUrl,
                latitude: parseFloat(latitude),
                longitude: parseFloat(longitude),
                heading: parseFloat(heading),
                pitch: parseFloat(pitch),
                roll: parseFloat(roll),
                scale: parseFloat(scale),
                tipe_file: tipeFile,
                author: payload.id,
            },
        });

        return NextResponse.json({ message: "Data dan file 3D berhasil disimpan!" }, { status: 200 });
    } catch (err) {
        console.error("Error Upload:", err);
        return NextResponse.json({ message: err.message || "Terjadi kesalahan pada server" }, { status: 500 });
    }
}