const DEFAULT_API_BASE_URL = 'http://localhost:3001';

const BACKEND_PATH_CANDIDATES = [
  '/api/admin/donors/bulk/upload',
  '/api/admin/donors/bulk/import',
  '/api/admin/donors/import/csv',
  '/admin/donors/bulk/upload',
  '/admin/donors/bulk/import',
  '/admin/donors/import/csv',
];

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function normalizeBase(base) {
  const raw = String(base || '').trim().replace(/\/+$/, '');
  return {
    raw,
    withoutApiSuffix: raw.replace(/\/api$/i, ''),
  };
}

function buildBackendBaseCandidates() {
  const envBase = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_BASE_URL;
  const normalized = normalizeBase(envBase);
  return unique([
    normalized.raw,
    normalized.withoutApiSuffix,
  ]);
}

function buildCandidateUrls() {
  const baseCandidates = buildBackendBaseCandidates();
  const urls = [];

  baseCandidates.forEach((base) => {
    BACKEND_PATH_CANDIDATES.forEach((path) => {
      urls.push(`${base}${path}`);
    });
  });

  return unique(urls);
}

function isRetriableNotFound(status, textBody = '') {
  if (status !== 404) return false;
  const text = String(textBody || '').toLowerCase();
  return text.includes('route post') || text.includes('not found') || text.includes('server action not found');
}

async function forwardCsvUpload(request) {
  const incomingForm = await request.formData();
  const file = incomingForm.get('file');

  if (!file || typeof file.arrayBuffer !== 'function') {
    return new Response(JSON.stringify({ success: false, message: 'No CSV file provided' }), {
      status: 400,
      headers: { 'content-type': 'application/json' },
    });
  }

  const candidateUrls = buildCandidateUrls();
  const authHeader = request.headers.get('authorization');

  for (let i = 0; i < candidateUrls.length; i += 1) {
    const targetUrl = candidateUrls[i];

    const form = new FormData();
    form.append('file', file, file.name || 'import.csv');

    const response = await fetch(targetUrl, {
      method: 'POST',
      headers: authHeader ? { authorization: authHeader } : undefined,
      body: form,
    });

    const responseText = await response.text();

    if (response.ok) {
      const contentType = response.headers.get('content-type') || 'application/json';
      return new Response(responseText, {
        status: response.status,
        headers: { 'content-type': contentType },
      });
    }

    if (isRetriableNotFound(response.status, responseText)) {
      continue;
    }

    const contentType = response.headers.get('content-type') || 'application/json';
    return new Response(responseText, {
      status: response.status,
      headers: { 'content-type': contentType },
    });
  }

  return new Response(
    JSON.stringify({
      success: false,
      message: 'CSV import failed. No compatible upload route was found on the backend.',
    }),
    {
      status: 404,
      headers: { 'content-type': 'application/json' },
    }
  );
}

export async function POST(request) {
  try {
    return await forwardCsvUpload(request);
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        message: error?.message || 'CSV proxy upload failed',
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      }
    );
  }
}
