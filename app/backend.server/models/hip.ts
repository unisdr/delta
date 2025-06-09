import {dr} from '~/db.server';
import {
    hipTypeTable,
    hipClusterTable,
    hipHazardTable,
} from '~/drizzle/schema';

export interface Hip {
    //type: string
    id: number
    title: string
    description: string
    notation: string
    cluster_id: number
    cluster_name: string
    type_id: number
    type_name: string
}

export interface HipApi {
    last_page: number
    data: Hip[]
}

export async function upsertHip(item: Hip) {
    const [tp] = await dr
        .insert(hipTypeTable)
        .values({
            id: String(item.type_id),
            nameEn: item.type_name
        })
        .onConflictDoUpdate({
            target: hipTypeTable.id,
            set: {nameEn: item.type_name},
        })
        .returning({id: hipTypeTable.id});

    const [cluster] = await dr
        .insert(hipClusterTable)
        .values({
            id: String(item.cluster_id),
            typeId: tp.id,
            nameEn: item.cluster_name
        })
        .onConflictDoUpdate({
            target: hipClusterTable.id,
            set: {typeId: tp.id, nameEn: item.cluster_name},
        })
        .returning({id: hipClusterTable.id});

    await dr
        .insert(hipHazardTable)
        .values({
            id: String(item.id),
            code: item.notation,
            clusterId: String(cluster.id),
            nameEn: item.title,
            descriptionEn: item.description,
        })
        .onConflictDoUpdate({
            target: hipHazardTable.id,
            set: {
                code: item.notation,
                clusterId: String(cluster.id),
                nameEn: item.title,
                descriptionEn: item.description,
            },
        });
}