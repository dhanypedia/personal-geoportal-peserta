import { bacaTeksJson } from "./bacaRespons";

// Mengunggah berkas sambil melaporkan kemajuannya.
//
// fetch() tidak dapat melaporkan kemajuan pengiriman. Event progress pada
// fetch hanya berlaku untuk balasan yang sedang diunduh, sedangkan kemajuan
// badan permintaan yang sedang dikirim baru tersedia lewat duplex streams,
// dan dukungannya belum merata. XMLHttpRequest memiliki event progress pada
// objek upload-nya, dan itu yang dibutuhkan pada berkas ratusan MB.
//
// Dua fase dilaporkan, karena keduanya menunggu hal yang berbeda:
//   "mengunggah"  badan permintaan sedang dikirim, kemajuannya terukur
//   "memproses"   badan sudah diterima, server menulis berkas dan DB
//
// Tanpa pemisahan itu, bilah kemajuan berhenti di 100 persen dan terlihat
// macet, padahal server masih bekerja.
export const FASE = {
    MENGUNGGAH: "mengunggah",
    MEMPROSES: "memproses",
};

// Jeda antar laporan kemajuan. Peramban dapat memicu event progress jauh
// lebih sering daripada yang mampu ditampilkan layar, dan setiap laporan
// memicu render ulang komponen.
const JEDA_LAPORAN_MS = 250;

export function unggahDenganProgres({ url, formData, accessToken, onKemajuan, onFase }) {
    const xhr = new XMLHttpRequest();

    let mulaiKirim = 0;
    let laporanTerakhir = 0;

    const janji = new Promise((selesai, gagal) => {
        xhr.open("POST", url);

        // Content-Type sengaja tidak diatur. Perambanlah yang menuliskannya
        // beserta boundary multipart yang dibuatnya sendiri. Menyetelnya
        // secara manual justru menghilangkan boundary itu, dan server tidak
        // lagi dapat memisahkan berkas dari field teksnya.
        if (accessToken) {
            xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
        }

        xhr.upload.onprogress = (e) => {
            if (!onKemajuan || !e.lengthComputable) return;

            // Penghitung waktu dimulai pada potongan pertama, bukan saat
            // permintaan dibuka, supaya angkanya mengukur laju kirim saja.
            if (!mulaiKirim) mulaiKirim = Date.now();

            const sekarang = Date.now();
            const selesaiKirim = e.loaded >= e.total;
            if (!selesaiKirim && sekarang - laporanTerakhir < JEDA_LAPORAN_MS) return;
            laporanTerakhir = sekarang;

            const detik = Math.max((sekarang - mulaiKirim) / 1000, 0.001);

            onKemajuan({
                terkirim: e.loaded,
                total: e.total,
                persen: e.total > 0 ? Math.round((e.loaded / e.total) * 100) : 0,
                bytePerDetik: e.loaded / detik,
            });
        };

        xhr.upload.onload = () => {
            if (onFase) onFase(FASE.MEMPROSES);
        };

        xhr.onload = () => {
            let isi;
            try {
                isi = bacaTeksJson(xhr.status, xhr.responseText);
            } catch (err) {
                gagal(err);
                return;
            }

            selesai({
                ok: xhr.status >= 200 && xhr.status < 300,
                status: xhr.status,
                data: isi,
            });
        };

        xhr.onerror = () => {
            gagal(
                new Error(
                    "Koneksi ke server terputus saat mengunggah. Periksa jaringan Anda, lalu coba lagi."
                )
            );
        };

        xhr.ontimeout = () => {
            gagal(new Error("Server tidak membalas dalam batas waktu."));
        };

        xhr.onabort = () => {
            const err = new Error("Unggahan dibatalkan.");
            err.dibatalkan = true;
            gagal(err);
        };

        // Tanpa timeout. Unggahan berkas besar pada jaringan lambat memang
        // berjalan lama, dan batas waktu di sisi peramban hanya akan memutus
        // unggahan yang sebenarnya masih maju.
        xhr.send(formData);
    });

    return {
        janji,
        batal: () => xhr.abort(),
    };
}

const formatAngka = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 1 });

// Ukuran berkas ditampilkan dalam satuan yang paling mendekati, karena
// "638211086 bita" tidak memberi gambaran apa pun kepada peserta.
export function formatUkuran(bita) {
    if (!bita || bita <= 0) return "0 MB";
    if (bita < 1024 * 1024) return `${formatAngka.format(bita / 1024)} KB`;
    if (bita < 1024 * 1024 * 1024) return `${formatAngka.format(bita / 1024 / 1024)} MB`;
    return `${formatAngka.format(bita / 1024 / 1024 / 1024)} GB`;
}
