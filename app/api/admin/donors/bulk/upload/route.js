/**
 * Next.js proxy route for CSV donor upload.
 *
 * In local development, the browser sends relative XHR to
 * /api/admin/donors/bulk/upload which hits this Next.js server.
 * This handler forwards the multipart request to the Express backend.
 *
 * In production (Traefik), PathPrefix('/api') routes the browser request
 * directly to the Express backend — this handler is not invoked at all.
 */
import { NextResponse } from 'next/server';

const BACKEND_BASE = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001'
).trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');

export async function POST(request) {
    const backendUrl = `${BACKEND_BASE}/api/admin/donors/bulk/upload`;

    try {
        const formData = await request.formData();
        const authHeader = request.headers.get('authorization');

        const headers = {};
        if (authHeader) headers['authorization'] = authHeader;

        const backendResponse = await fetch(backendUrl, {
            method: 'POST',
            headers,
            body: formData,
        });

        const payload = await backendResponse.json().catch(() => ({
            success: false,
            error: { code: 'UPSTREAM_ERROR', message: 'Backend returned a non-JSON response' },
        }));

        return NextResponse.json(payload, { status: backendResponse.status });
    } catch (err) {
        return NextResponse.json(
            { success: false, error: { code: 'PROXY_ERROR', message: String(err.message) } },
            { status: 502 },
        );
    }
}
