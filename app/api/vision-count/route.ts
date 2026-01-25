import { NextResponse } from 'next/server';

import { countFromImage } from '@/lib/ai/visionCount';
import { getServerSupabase } from '@/lib/db/supabaseServer';

const WALKTHROUGH_BUCKET = process.env.WALKTHROUGH_BUCKET || 'walkthrough';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const image = formData.get('image');
    const sessionId = formData.get('session_id');

    if (!(image instanceof File) || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing image file or session_id.' },
        { status: 400 }
      );
    }

    const supabase = await getServerSupabase();
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      return NextResponse.json({ error: 'Unauthorized.' }, { status: 401 });
    }

    const { data: sessionRow, error: sessionError } = await supabase
      .from('walkthrough_sessions')
      .select('id, org_id')
      .eq('id', sessionId)
      .single();

    if (sessionError || !sessionRow) {
      return NextResponse.json(
        { error: sessionError?.message || 'Session not found.' },
        { status: 404 }
      );
    }

    const extension = image.name?.split('.').pop();
    const safeExtension = extension && extension.length <= 8 ? extension : 'jpg';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const imagePath = `org-${sessionRow.org_id}/sessions/${sessionRow.id}/photos/${timestamp}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from(WALKTHROUGH_BUCKET)
      .upload(imagePath, image, {
        contentType: image.type || 'image/jpeg'
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const result = await countFromImage(image);

    const { data: photoRow, error: photoError } = await supabase
      .from('walkthrough_photos')
      .insert({
        session_id: sessionId,
        storage_path: imagePath,
        ai_counts_json: result,
        reviewed_by: null,
        reviewed_at: null
      })
      .select('id')
      .single();

    if (photoError) {
      return NextResponse.json({ error: photoError.message }, { status: 500 });
    }

    return NextResponse.json({
      ...result,
      photoId: photoRow?.id,
      imagePath
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Vision count failed.' },
      { status: 500 }
    );
  }
}
