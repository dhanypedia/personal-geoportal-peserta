// Membaca balasan sebagai JSON, dan menerjemahkan balasan yang bukan JSON
// menjadi pesan yang bisa dibaca pengguna.
//
// Nginx membalas halaman HTML, bukan JSON, bila unggahan melewati
// client_max_body_size atau bila server di belakangnya kehabisan waktu.
// response.json() atas halaman itu gagal dengan
// "Unexpected token '<' ... is not valid JSON", yang tidak menyebut
// penyebabnya sama sekali.
export async function bacaResponsJson(res) {
    const teks = await res.text();

    try {
        return JSON.parse(teks);
    } catch {
        if (res.status === 413) {
            throw new Error(
                "Berkas terlalu besar untuk diunggah. Batas ukurannya diatur oleh client_max_body_size pada nginx.conf."
            );
        }

        if (res.status === 502 || res.status === 504) {
            throw new Error(
                `Server tidak selesai memproses dalam batas waktu (${res.status}). Berkasnya mungkin terlalu besar.`
            );
        }

        throw new Error(
            `Server membalas ${res.status}, dan isinya bukan JSON. Periksa log container nextjs.`
        );
    }
}
