import { NextRequest, NextResponse } from 'next/server';
import { Redis } from '@upstash/redis';

function getRedisClient() {
    const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
    if (url && token) {
        return new Redis({ url, token });
    }
    return null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    
    const redis = getRedisClient();
    
    if (!redis) {
        return new NextResponse('KV not configured', { status: 500 });
    }

    try {
        const result = await redis.get<string>(`img_${id}`);
        
        if (!result) {
            return new NextResponse('Not found', { status: 404 });
        }

        const base64Data = result.split(',')[1] || result;
        const buffer = Buffer.from(base64Data, 'base64');
        
        return new NextResponse(buffer, {
            headers: {
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=31536000, immutable',
            },
        });
    } catch (e) {
        console.error("Error fetching image from KV:", e);
        return new NextResponse('Internal error', { status: 500 });
    }
}
