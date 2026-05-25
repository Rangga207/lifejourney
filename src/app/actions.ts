'use server';

import fs from 'fs/promises';
import path from 'path';
import { revalidatePath, unstable_noStore as noStore } from 'next/cache';

export async function verifyLogin(pin: string): Promise<boolean> {
    // Check against the 6-digit numeric passcode
    return pin === '230706';
}

export interface Memory {
    id: string;
    title: string;
    content: string;
    date: string;
    emoji: string;
    color: string;
    imageUrl?: string;
    imageUrls?: string[];
    isGalleryOnly?: boolean;
    hideFromGallery?: boolean;
}

const dbPath = path.join(process.cwd(), 'database.json');

async function getDb(): Promise<Memory[]> {
    noStore();
    
    const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    
    if (kvUrl && kvToken) {
        try {
            const res = await fetch(`${kvUrl}/get/memories_metadata`, {
                headers: { Authorization: `Bearer ${kvToken}` },
                cache: 'no-store'
            });
            const json = await res.json();
            if (json.result) {
                const data = typeof json.result === 'string' ? JSON.parse(json.result) : json.result;
                return Array.isArray(data) ? data : [];
            }
            return [];
        } catch (e) {
            console.error("Vercel KV Read Error:", e);
        }
    }

    try {
        const data = await fs.readFile(dbPath, 'utf8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveDb(memories: Memory[]) {
    const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;

    if (kvUrl && kvToken) {
        try {
            const res = await fetch(`${kvUrl}/set/memories_metadata`, {
                method: 'POST',
                headers: { 
                    Authorization: `Bearer ${kvToken}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(memories)
            });
            if (!res.ok) throw new Error("Failed to save metadata");
            return;
        } catch (e) {
            console.error("Vercel KV Write Error:", e);
            throw e;
        }
    }

    await fs.writeFile(dbPath, JSON.stringify(memories, null, 2), 'utf8');
}

async function saveImageToCloud(id: string, base64: string): Promise<string> {
    const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (kvUrl && kvToken) {
        // Only save if it is actually base64 (not already an API route URL)
        if (base64.startsWith('data:image')) {
            await fetch(`${kvUrl}/set/img_${id}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${kvToken}` },
                body: base64
            });
            return `/api/img/${id}`;
        }
    }
    return base64;
}

async function deleteImageFromCloud(url: string) {
    if (!url.startsWith('/api/img/')) return;
    const id = url.replace('/api/img/', '');
    const kvUrl = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL;
    const kvToken = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN;
    if (kvUrl && kvToken) {
        await fetch(`${kvUrl}/del/img_${id}`, {
            headers: { Authorization: `Bearer ${kvToken}` }
        });
    }
}

export async function getMemories() {
    return await getDb();
}

export async function addMemory(data: { title: string; content: string; imageUrl?: string; imageUrls?: string[]; isGalleryOnly?: boolean; hideFromGallery?: boolean }) {
    const memories = await getDb();
    const memoryId = Math.random().toString(36).substring(2, 15);
    
    let processedUrls: string[] | undefined = undefined;
    
    // Save images externally if online
    if (data.imageUrls && data.imageUrls.length > 0) {
        processedUrls = await Promise.all(
            data.imageUrls.map((base64, idx) => saveImageToCloud(`${memoryId}_${idx}`, base64))
        );
    } else if (data.imageUrl) {
        processedUrls = [await saveImageToCloud(`${memoryId}_0`, data.imageUrl)];
    }
    
    const newMemory: Memory = {
        id: memoryId,
        title: data.title,
        content: data.content,
        emoji: '💌',
        color: '',
        imageUrl: processedUrls ? processedUrls[0] : undefined,
        imageUrls: processedUrls,
        isGalleryOnly: data.isGalleryOnly,
        hideFromGallery: data.hideFromGallery,
        date: new Date().toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'long',
            year: 'numeric',
        }),
    };
    
    const updated = [newMemory, ...memories];
    await saveDb(updated);
    
    revalidatePath('/');
    return newMemory;
}

export async function removeMemory(id: string) {
    const memories = await getDb();
    const memory = memories.find(m => m.id === id);
    if (memory) {
        if (memory.imageUrls) {
            await Promise.all(memory.imageUrls.map(deleteImageFromCloud));
        } else if (memory.imageUrl) {
            await deleteImageFromCloud(memory.imageUrl);
        }
    }
    const updated = memories.filter(m => m.id !== id);
    await saveDb(updated);
    revalidatePath('/');
}

export async function updateMemory(id: string, data: Partial<Memory>) {
    const memories = await getDb();
    const currentDate = new Date().toLocaleDateString('en-US', {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
    });

    const updated = memories.map(m => m.id === id ? { ...m, ...data, date: currentDate } : m);
    await saveDb(updated);
    revalidatePath('/');
    return updated.find(m => m.id === id);
}
