import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db"; // Sesuaikan path Prisma Client
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";

export async function PATCH(request) {
    // 1. Validasi Autentikasi
    const { payload, error, status } = requireAuth(request, "admin");
    if (error) {
        return NextResponse.json({ message: error }, { status });
    }

    try {
        const body = await request.json();
        const { data_2d_id, akses, editable } = body;

        if (!data_2d_id) {
            return NextResponse.json({ error: "data_2d_id wajib diisi" }, { status: 400 });
        }

        if (akses === undefined && editable === undefined) {
            return NextResponse.json(
                { error: "Tidak ada field yang diupdate (akses / editable)" },
                { status: 400 }
            );
        }

        if (akses !== undefined && !["public", "private"].includes(akses)) {
            return NextResponse.json(
                { error: "Nilai akses harus 'public' atau 'private'" },
                { status: 400 }
            );
        }

        if (editable !== undefined && typeof editable !== "boolean") {
            return NextResponse.json({ error: "Nilai editable harus boolean" }, { status: 400 });
        }

        // 2. Ambil data existing dari katalog
        const existing = await db.katalog_data_2d.findUnique({
            where: { data_2d_id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Layer tidak ditemukan di katalog" }, { status: 404 });
        }

        // layer_name disimpan dalam format "workspace:tableName"
        const [workspace, tableName] = existing.layer_name.split(":");
        if (!workspace || !tableName) {
            return NextResponse.json(
                { error: "Format layer_name di katalog tidak valid" },
                { status: 500 }
            );
        }

        const newAkses = akses !== undefined ? akses : existing.akses;
        const newEditable = editable !== undefined ? editable : existing.is_editable;

        const geoserverUrl = process.env.GEOSERVER_URL;
        const workspaceEnv = process.env.GEOSERVER_WORKSPACE;
        const datastore = process.env.GEOSERVER_POSTGIS_DATASTORE;
        const auth = Buffer.from(
            `${process.env.GEOSERVER_USERNAME}:${process.env.GEOSERVER_PASSWORD}`
        ).toString("base64");

        // 3. Update metadata "disable.wfs.transactions" di featureType GeoServer
        //    (hanya jika field editable memang dikirim & berubah)
        if (editable !== undefined && editable !== existing.is_editable) {
            await updateGeoServerFeatureTypeEditable({
                geoserverUrl,
                workspace: workspaceEnv,
                datastore,
                tableName,
                isEditable: newEditable,
                auth,
            });
        }

        // 4. Update ACL security rule (read/write) di GeoServer
        //    Selalu di-refresh ulang berdasarkan kombinasi akses & editable terbaru
        await updateGeoServerLayerSecurity({
            geoserverUrl,
            workspace: workspaceEnv,
            tableName,
            akses: newAkses,
            isEditable: newEditable,
            auth,
        });

        // 5. Update record di tabel katalog_data_2d
        const updated = await db.katalog_data_2d.update({
            where: { data_2d_id },
            data: {
                ...(akses !== undefined && { akses: newAkses }),
                ...(editable !== undefined && { is_editable: newEditable }),
            },
            select: {
                data_2d_id: true,
                layer_name: true,
                akses: true,
                is_editable: true,
                wms_url: true,
                wfs_url: true,
                users: {
                    select: { email: true },
                },
            },
        });

        return NextResponse.json({
            success: true,
            message: `Layer ${existing.layer_name} berhasil diupdate!`,
            data: updated,
        });
    } catch (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Update flag "disable.wfs.transactions" pada metadata featureType di GeoServer.
 * Mengambil featureType existing dulu (GET) supaya field lain tidak tertimpa,
 * lalu menimpa/menambah entry metadata yang relevan saja (PUT).
 */
async function updateGeoServerFeatureTypeEditable({
    geoserverUrl,
    workspace,
    datastore,
    tableName,
    isEditable,
    auth,
}) {
    const featureTypeUrl = `${geoserverUrl}/rest/workspaces/${workspace}/datastores/${datastore}/featuretypes/${tableName}.json`;

    const getRes = await fetch(featureTypeUrl, {
        headers: { Authorization: `Basic ${auth}` },
    });

    if (!getRes.ok) {
        const err = await getRes.text();
        throw new Error(`Gagal mengambil featureType dari GeoServer: ${err}`);
    }

    const current = await getRes.json();
    const rawEntries = current?.featureType?.metadata?.entry;

    // Normalisasi: entry bisa berupa array atau objek tunggal tergantung jumlahnya
    const existingEntries = Array.isArray(rawEntries)
        ? rawEntries
        : rawEntries
            ? [rawEntries]
            : [];

    const filteredEntries = existingEntries.filter(
        (e) => e["@key"] !== "disable.wfs.transactions"
    );
    filteredEntries.push({
        "@key": "disable.wfs.transactions",
        $: (!isEditable).toString(),
    });

    const putRes = await fetch(featureTypeUrl, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify({
            featureType: {
                metadata: { entry: filteredEntries },
            },
        }),
    });

    if (!putRes.ok) {
        const err = await putRes.text();
        throw new Error(`Gagal update featureType di GeoServer: ${err}`);
    }
}

/**
 * Refresh ACL security rule (read/write) untuk sebuah layer di GeoServer.
 * Rule lama dihapus dulu (DELETE, 404 diabaikan) supaya tidak ada rule "nyangkut"
 * dari state sebelumnya (misal dari editable -> tidak editable), baru rule baru
 * dibuat ulang (POST) sesuai kombinasi akses & editable terbaru.
 */
async function updateGeoServerLayerSecurity({
    geoserverUrl,
    workspace,
    tableName,
    akses,
    isEditable,
    auth,
}) {
    const layerPattern = `${workspace}.${tableName}`;
    const readKey = `${layerPattern}.r`;
    const writeKey = `${layerPattern}.w`;

    // Hapus rule lama (abaikan error/404, karena rule mungkin belum ada)
    await Promise.all([
        fetch(`${geoserverUrl}/rest/security/acl/layers/${readKey}`, {
            method: "DELETE",
            headers: { Authorization: `Basic ${auth}` },
        }).catch(() => { }),
        fetch(`${geoserverUrl}/rest/security/acl/layers/${writeKey}`, {
            method: "DELETE",
            headers: { Authorization: `Basic ${auth}` },
        }).catch(() => { }),
    ]);

    const readRoles = akses === "private" ? ["ADMIN"] : ["ROLE_ANONYMOUS", "ADMIN"];
    const writeRoles = isEditable ? ["ADMIN"] : [];

    const rules = { [readKey]: readRoles.join(",") };
    if (writeRoles.length > 0) {
        rules[writeKey] = writeRoles.join(",");
    }

    const res = await fetch(`${geoserverUrl}/rest/security/acl/layers`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Basic ${auth}`,
        },
        body: JSON.stringify(rules),
    });

    if (!res.ok) {
        const err = await res.text();
        throw new Error(`Gagal update security rule GeoServer: ${err}`);
    }
}