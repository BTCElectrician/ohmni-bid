import { NextResponse } from 'next/server';

const CODE_SEARCH_URL = process.env.AZURE_CODE_SEARCH_URL || '';
const CODE_SEARCH_KEY = process.env.AZURE_CODE_SEARCH_KEY || '';

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  const searchContext =
    typeof body?.search_context === 'string' ? body.search_context : 'nfpa70';
  const indexes = Array.isArray(body?.indexes) ? body.indexes : undefined;

  if (!query) {
    return NextResponse.json({ error: 'Missing query.' }, { status: 400 });
  }

  if (!CODE_SEARCH_URL || !CODE_SEARCH_KEY) {
    return NextResponse.json(
      { error: 'Missing Azure code search configuration.' },
      { status: 500 }
    );
  }

  const response = await fetch(CODE_SEARCH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-functions-key': CODE_SEARCH_KEY
    },
    body: JSON.stringify({
      query,
      search_context: searchContext,
      indexes,
      top: 6,
      skip_synthesis: true
    })
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    return NextResponse.json(
      { error: payload?.message || 'Code search failed.' },
      { status: response.status }
    );
  }

  return NextResponse.json({
    query: payload?.query,
    results: payload?.results || [],
    search_context: payload?.search_context,
    context: payload?.context
  });
}
