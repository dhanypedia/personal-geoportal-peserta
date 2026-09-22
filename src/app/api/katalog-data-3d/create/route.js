import { NextResponse } from "next/server";
import Busboy from "busboy";
import { Readable } from "stream";
import { createWriteStream } from "fs";
import { mkdir, unlink, rename, readdir, stat } from "fs/promises";
import { pipeline } from "stream/promises";
import path from "path";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";

// Batas ukuran berkas di sisi aplikasi. Nginx sudah menahannya lebih dahulu
// lewat client_max_body_size pada nginx.conf, dan nilainya sengaja disamakan
// dengan baris itu supaya keduanya tidak berbeda. Fungsinya sebagai jaring
// pengaman: bila Nginx dilonggarkan tanpa baris ini ikut diubah, permintaan
// yang tidak menyertakan Content-Length tetap tidak dapat menulis lebih dari
// batas ini ke disk.
const BATAS_BERKAS = 1024 * 1024 * 1024;

// Batas waktu menyeluruh untuk satu unggahan. Satu berkas 1 GB pada laju
// 1 MB/detik selesai dalam sekitar 17 menit, jadi satu jam masih longgar.
const BATAS_WAKTU_KIRIM = 60 * 60 * 1000;

const EKSTENSI_DIIZINKAN = [".glb", ".ply"];

// Badan permintaan dialirkan langsung ke disk, bukan ditampung di memori.
//
// request.formData() menahan seluruh isi berkas di dalam memori, lalu
// file.arrayBuffer() menambah satu salinan lagi. Diukur pada berkas 608 MB,
// puncak pemakaian memori mencapai 1,03 GB. Sementara itu pemakaian puncak
// sebuah VM pelatihan hanya 4 GB, dan di dalamnya sudah berjalan GeoServer
// serta Nginx. Berkas 1 GB dengan cara itu akan menghabiskan seluruh memori
// VM.
//
// Dengan busboy, isinya mengalir dari socket ke disk sepotong demi sepotong.
// Diukur pada berkas 608 MB, puncak pemakaian memorinya 96 MB dan tidak
// tumbuh mengikuti besar berkas.
export async function POST(request) {
    // 1. Validasi Autentikasi, sebelum badannya dibaca sedikit pun.
    const { payload, error, status } = requireAuth(request, "admin");
    if (error) {
        return NextResponse.json({ message: error }, { status });
    }

    const tipeKonten = request.headers.get("content-type") || "";
    if (!tipeKonten.startsWith("multipart/form-data")) {
        return NextResponse.json(
            { message: "Permintaan harus dikirim sebagai multipart/form-data" },
            { status: 400 }
        );
    }

    // 2. Generate UUID terlebih dahulu, karena namanya dipakai sebagai nama
    // berkas fisik sejak byte pertama ditulis.
    const data_3d_id = crypto.randomUUID();

    const uploadDir = path.join(process.cwd(), "data/models");
    await mkdir(uploadDir, { recursive: true });

    // Berkas sementara dari unggahan yang putus dibersihkan di sini, bukan
    // saat putusnya. Alasannya, sambungan yang diputus tanpa penutup yang rapi
    // tidak selalu menghasilkan galat di sisi server: permintaannya bisa
    // berhenti begitu saja tanpa pernah selesai. Karena itu tidak ada satu pun
    // peristiwa yang bisa dipakai sebagai pemicu pembersihan.
    bersihkanBerkasSementara(uploadDir);

    const kolom = {}; // field teks, diisi sambil berkasnya mengalir
    let filePath = null;
    let filePathSementara = null;
    let aliranTulis = null;
    let tipeFile = null;
    let berkasTerlaluBesar = false;
    let ekstensiDitolak = null;

    const bb = Busboy({
        headers: { "content-type": tipeKonten },
        limits: { fileSize: BATAS_BERKAS, files: 1, fields: 30 },
    });

    const tugasTulis = [];

    bb.on("file", (_namaField, aliran, info) => {
        const fileExtension = path.extname(info.filename || "").toLowerCase();

        if (!EKSTENSI_DIIZINKAN.includes(fileExtension)) {
            // Isinya tetap harus dibuang. Tanpa resume(), busboy berhenti di
            // tengah dan permintaannya menggantung sampai batas waktu.
            ekstensiDitolak = fileExtension || "(tanpa ekstensi)";
            aliran.resume();
            return;
        }

        tipeFile = fileExtension.replace(".", "");
        filePath = path.join(uploadDir, `${data_3d_id}${fileExtension}`);

        // Isinya ditulis ke nama sementara lebih dahulu, dan baru diganti nama
        // menjadi nama akhir setelah utuh. Tanpa itu, unggahan yang putus di
        // tengah meninggalkan berkas .ply yang terpotong di folder model,
        // tampak seperti model sungguhan padahal isinya separuh.
        filePathSementara = `${filePath}.part`;

        aliran.on("limit", () => {
            berkasTerlaluBesar = true;
        });

        aliranTulis = createWriteStream(filePathSementara);
        tugasTulis.push(pipeline(aliran, aliranTulis));
    });

    bb.on("field", (nama, nilai) => {
        kolom[nama] = nilai;
    });

    let galatParsing = null;

    try {
        await new Promise((selesai, gagal) => {
            const aliranPermintaan = Readable.fromWeb(request.body);

            // Batas waktu menyeluruh untuk satu unggahan. Satu berkas 1 GB pada
            // laju 1 MB/detik selesai dalam sekitar 17 menit, jadi satu jam
            // masih longgar. Tanpa batas ini, permintaan yang berhenti tanpa
            // galat akan menunggu selamanya sambil menahan berkas sementaranya.
            const pengawas = setTimeout(() => {
                aliranPermintaan.destroy();
                gagal(new Error("Unggahan tidak selesai dalam batas waktu."));
            }, BATAS_WAKTU_KIRIM);
            pengawas.unref?.();

            const tutup = (fn) => (arg) => {
                clearTimeout(pengawas);
                fn(arg);
            };

            // Peserta yang menekan Hentikan unggahan memutus socketnya di
            // tengah jalan, dan aliran badan permintaannya berakhir dengan
            // galat ECONNRESET. Tanpa penanganan di sini, galat itu naik
            // menjadi uncaughtException yang dilaporkan Next.js sebagai
            // "⨯ uncaughtException: Error: aborted", bukan sekadar kegagalan
            // satu permintaan.
            aliranPermintaan.on("error", tutup(gagal));
            bb.on("close", tutup(selesai));
            bb.on("error", tutup(gagal));
            aliranPermintaan.pipe(bb);
        });
    } catch (err) {
        galatParsing = err;
    }

    // allSettled, bukan all. Saat parsing gagal, penulisan berkasnya juga
    // gagal, dan Promise.all akan melepas penolakan yang tidak tertangani
    // begitu promise pertamanya menolak.
    const hasilTulis = await Promise.allSettled(tugasTulis);
    const galatTulis = hasilTulis.find((h) => h.status === "rejected");

    if (galatParsing || galatTulis) {
        const err = galatParsing || galatTulis.reason;
        await hapusBerkas(filePathSementara);
        console.error("Error Upload:", err);
        return NextResponse.json(
            { message: err.message || "Terjadi kesalahan saat menerima berkas" },
            { status: 500 }
        );
    }

    if (berkasTerlaluBesar) {
        await hapusBerkas(filePathSementara);
        return NextResponse.json(
            {
                message: `Berkas melebihi batas ${BATAS_BERKAS / 1024 / 1024} MB.`,
            },
            { status: 413 }
        );
    }

    if (ekstensiDitolak) {
        return NextResponse.json(
            { message: `Format ${ekstensiDitolak} tidak didukung. Pakai berkas .glb atau .ply.` },
            { status: 400 }
        );
    }

    if (!filePath) {
        return NextResponse.json({ message: "File 3D tidak boleh kosong" }, { status: 400 });
    }

    try {
        // Baru sekarang berkasnya memperoleh nama akhirnya. Sampai baris ini
        // isinya sudah lengkap dan tertutup, jadi tidak ada lagi yang bisa
        // menulis ke sana.
        await rename(filePathSementara, filePath);
    } catch (err) {
        await hapusBerkas(filePathSementara);
        console.error("Error Upload:", err);
        return NextResponse.json(
            { message: "Gagal menyelesaikan penyimpanan berkas" },
            { status: 500 }
        );
    }

    // Alamat disimpan relatif, tanpa domain. Alasannya, alamat aplikasi
    // berganti dari alamat IP menjadi subdomain pada tahap berikutnya, dan
    // alamat mutlak yang tersimpan akan menunjuk ke alamat lama. Alamat
    // relatif dibaca dari domain yang sedang dipakai peramban.
    const fileUrl = `/portal/api/katalog-data-3d/models/${data_3d_id}`;

    try {
        // 3. Simpan ke Database Prisma dengan UUID yang sama
        await db.katalog_data_3d.create({
            data: {
                data_3d_id: data_3d_id,
                model_name: kolom.model_name,
                akses: kolom.akses,
                url: fileUrl,
                latitude: parseFloat(kolom.latitude),
                longitude: parseFloat(kolom.longitude),
                heading: parseFloat(kolom.heading),
                pitch: parseFloat(kolom.pitch),
                roll: parseFloat(kolom.roll),
                scale: parseFloat(kolom.scale),
                tipe_file: tipeFile,
                author: payload.id,
            },
        });
    } catch (err) {
        // Barisnya gagal dibuat, jadi berkasnya tidak akan pernah dirujuk.
        // Membiarkannya hanya menumpuk disk VM tanpa ada yang menyadarinya.
        await hapusBerkas(filePath);
        console.error("Error Upload:", err);
        return NextResponse.json(
            { message: err.message || "Terjadi kesalahan pada server" },
            { status: 500 }
        );
    }

    return NextResponse.json({ message: "Data dan file 3D berhasil disimpan!" }, { status: 200 });
}

async function hapusBerkas(filePath) {
    if (!filePath) return;

    try {
        await unlink(filePath);
    } catch {
        // Berkasnya mungkin belum sempat dibuat, atau sudah tidak ada. Tidak
        // ada yang perlu dilaporkan, karena kegagalan yang sebenarnya sudah
        // ditangani pemanggilnya.
    }
}

// Membuang berkas .part yang tertinggal dari unggahan yang putus.
//
// Dijalankan tanpa ditunggu, dan kegagalannya sengaja tidak dilaporkan: ini
// pembersihan latar, bukan bagian dari permintaan yang sedang dilayani.
const UMUR_BERKAS_SEMENTARA = 60 * 60 * 1000;

function bersihkanBerkasSementara(uploadDir) {
    void (async () => {
        try {
            const isi = await readdir(uploadDir);
            const batas = Date.now() - UMUR_BERKAS_SEMENTARA;

            for (const nama of isi) {
                if (!nama.endsWith(".part")) continue;

                const lokasi = path.join(uploadDir, nama);
                const info = await stat(lokasi).catch(() => null);
                if (info && info.mtimeMs < batas) await unlink(lokasi);
            }
        } catch {
            // Folder modelnya mungkin belum ada. Permintaannya sendiri sudah
            // membuatnya lewat mkdir sebelum memanggil fungsi ini.
        }
    })();
}