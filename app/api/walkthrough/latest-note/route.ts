import { NextResponse } from 'next/server';

import { getServerSupabase } from '@/lib/db/supabaseServer';

export async function GET() {
  const supabase = await getServerSupabase();
  const { data: userData } = await supabase.auth.getUser();

  if (!userData?.user) {
    return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
  }

  const { data, error } = await supabase
    .from('walkthrough_notes')
    .select('id, transcript_text, created_at, session_id')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!data) {
    return NextResponse.json({ error: 'No walkthrough notes found.' }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    transcript: data.transcript_text,
    createdAt: data.created_at,
    sessionId: data.session_id
  });
}
