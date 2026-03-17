import { NextResponse } from 'next/server';

const BACKEND_BASE = (
    process.env.API_URL ||
    process.env.NEXT_PUBLIC_API_URL ||
    'http://localhost:3001'
).trim().replace(/\/api\/?$/, '').replace(/\/+$/, '');

async function proxyRequest(request, method) {
    const backendUrl = `${BACKEND_BASE}/api/admin/api-keys`;
    const authHeader = request.headers.get('authorization');
    const contentType = request.headers.get('content-type');

    const headers = {};
    if (authHeader) headers.authorization = authHeader;
    if (contentType) headers['content-type'] = contentType;

    const init = { method, headers };
    if (method !== 'GET') {
        init.body = await request.text();
    }

    const backendResponse = await fetch(backendUrl, init);
    const payload = await backendResponse.json().catch(() => ({
        success: false,
        error: { code: 'UPSTREAM_ERROR', message: 'Backend returned a non-JSON response' },
    }));

    return NextResponse.json(payload, { status: backendResponse.status });
}

export async function GET(request) {
    try {
        return await proxyRequest(request, 'GET');
    } catch (err) {
        return NextResponse.json(
            { success: false, error: { code: 'PROXY_ERROR', message: String(err.message) } },
            { status: 502 },
        );
    }
}

export async function POST(request) {
    try {
        return await proxyRequest(request, 'POST');
    } catch (err) {
        return NextResponse.json(
            { success: false, error: { code: 'PROXY_ERROR', message: String(err.message) } },
            { status: 502 },
        );
    }
}
