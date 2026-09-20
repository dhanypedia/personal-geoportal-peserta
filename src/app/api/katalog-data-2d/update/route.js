import { NextResponse } from "next/server";
import { db } from "../../../../../lib/db";
import { requireAuth } from "../../../../../lib/auth/verifyBearerToken";

// Mengubah akses dan is_editable sebuah layer. Nilai yang sama harus
// disampaikan ke tiga tempat, kalau tidak ketiganya bisa saling
// bertentangan: metadata featureType, ACL layer, dan baris katalog.
export async function PATCH(request) {
    const { error, status } = requireAuth(request, "admin");
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

        const existing = await db.katalog_data_2d.findUnique({
            where: { data_2d_id },
        });

        if (!existing) {
            return NextResponse.json({ error: "Layer tidak ditemukan di katalog" }, { status: 404 });
        }

        // layer_name disimpan dalam format "workspace:tableName".
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

        // Metadata hanya perlu dikirim ulang bila is_editable benar-benar berubah.
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

        await updateGeoServerLayerSecurity({
            geoserverUrl,
            workspace: workspaceEnv,
            tableName,
            akses: newAkses,
            isEditable: newEditable,
            auth,
        });

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

// Menimpa flag "disable.wfs.transactions" pada metadata featureType.
// FeatureType diambil dulu (GET) lalu dikirim balik (PUT) supaya field lain
// tidak ikut terhapus oleh badan permintaan yang hanya berisi metadata.
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

    // GeoServer mengirim satu entry sebagai objek, bukan array, bila hanya
    // ada satu metadata. Kedua bentuk harus diterima.
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

// Menyusun ulang ACL layer. Rule lama dihapus lebih dulu supaya tidak ada
// rule sisa dari keadaan sebelumnya (misalnya write yang tertinggal setelah
// is_editable dimatikan), lalu rule baru dibuat sesuai kombinasi terbaru.
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

    // ADMIN dan ROLE_ANONYMOUS di sini peran milik GeoServer, bukan peran
    // aplikasi. Aturan peran aplikasi ada di lib/auth/roles.js.
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
