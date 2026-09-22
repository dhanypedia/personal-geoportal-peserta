// Membaca balasan sebagai JSON, dan menerjemahkan balasan yang bukan JSON
// menjadi pesan yang bisa dibaca pengguna.
//
// Nginx membalas halaman HTML, bukan JSON, bila unggahan melewati
// client_max_body_size atau bila server di belakangnya kehabisan waktu.
// response.json() atas halaman itu gagal dengan
// "Unexpected token '<' ... is not valid JSON", yang tidak menyebut
// penyebabnya sama sekali.
//
// Dua bentuk disediakan karena dua cara pengiriman memberi datanya secara
// berbeda: fetch() lewat objek Response, sedangkan XMLHttpRequest lewat
// status dan responseText yang sudah berupa teks. Terjemahannya sendiri hanya
// boleh ada di satu tempat, supaya keduanya tidak memberi pesan yang berbeda
// untuk kegagalan yang sama.
export function bacaTeksJson(status, teks) {
    try {
        return JSON.parse(teks);
    } catch {
        if (status === 413) {
            throw new Error(
                "Berkas terlalu besar untuk diunggah. Batas ukurannya diatur oleh client_max_body_size pada nginx.conf."
            );
        }

        if (status === 502 || status === 504) {
            throw new Error(
                `Server tidak selesai memproses dalam batas waktu (${status}). Berkasnya mungkin terlalu besar.`
            );
        }

        throw new Error(
            `Server membalas ${status}, dan isinya bukan JSON. Periksa log container nextjs.`
        );
    }
}

export async function bacaResponsJson(res) {
    return bacaTeksJson(res.status, await res.text());
}
