import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

import { getEmbedding } from '@/lib/ai/embeddings';

const DEFAULT_LIMIT = 25;
const MAX_LIMIT = 50;

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

function getSupabase() {
  if (!supabaseUrl || !(supabaseServiceKey || supabaseAnonKey)) {
    return null;
  }
  const apiKey = supabaseServiceKey || supabaseAnonKey;
  return createClient(supabaseUrl, apiKey, {
    auth: { persistSession: false }
  });
}

function parseLimit(value: unknown) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return DEFAULT_LIMIT;
  return Math.min(Math.max(Math.round(parsed), 1), MAX_LIMIT);
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const query = typeof body?.query === 'string' ? body.query.trim() : '';
  const rawCategory =
    typeof body?.category === 'string' ? body.category.trim() : '';
  const category = rawCategory && rawCategory !== 'all' ? rawCategory : null;
  const limit = parseLimit(body?.limit);

  const supabase = getSupabase();
  if (!supabase) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars.' },
      { status: 500 }
    );
  }

  const includeInactive = body?.includeInactive === true;

  let notice: string | null = null;

  if (query && process.env.OPENAI_API_KEY) {
    try {
      const embedding = await getEmbedding(query);
      const { data, error } = await supabase.rpc('match_pricing_items', {
        query_embedding: embedding,
        match_count: limit,
        category_filter: category
      });

      if (error) {
        throw new Error(error.message);
      }

      return NextResponse.json({
        items: data || [],
        mode: 'semantic'
      });
    } catch (error) {
      notice =
        error instanceof Error
          ? `Semantic search unavailable: ${error.message}`
          : 'Semantic search unavailable.';
    }
  } else if (query) {
    notice = 'Semantic search unavailable: missing OPENAI_API_KEY.';
  }

  let queryBuilder = supabase
    .from('pricing_items')
    .select(
      'id, category, subcategory, name, description, size, unit_type, material_cost, labor_hours, market_price'
    )
    .order('updated_at', { ascending: false })
    .limit(limit);

  if (!includeInactive) {
    queryBuilder = queryBuilder.eq('is_active', true);
  }

  if (category) {
    queryBuilder = queryBuilder.eq('category', category);
  }

  if (query) {
    queryBuilder = queryBuilder.ilike('name', `%${query}%`);
  }

  const { data, error } = await queryBuilder;

  if (error) {
    return NextResponse.json(
      { error: `Catalog lookup failed: ${error.message}` },
      { status: 500 }
    );
  }

  return NextResponse.json({
    items: data || [],
    mode: query ? 'text' : 'recent',
    notice
  });
}
