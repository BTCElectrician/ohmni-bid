import { NextResponse } from 'next/server';

import { transcribeAudio } from '@/lib/ai/transcribe';
import { getServerSupabase } from '@/lib/db/supabaseServer';

const WALKTHROUGH_BUCKET = process.env.WALKTHROUGH_BUCKET || 'walkthrough';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const audio = formData.get('audio');
    const sessionId = formData.get('session_id');
    const startedAt = formData.get('started_at');
    const endedAt = formData.get('ended_at');

    if (!(audio instanceof File) || typeof sessionId !== 'string') {
      return NextResponse.json(
        { error: 'Missing audio file or session_id.' },
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

    const transcript = await transcribeAudio(audio);

    const extension = audio.name?.split('.').pop();
    const safeExtension = extension && extension.length <= 8 ? extension : 'webm';
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const audioPath = `org-${sessionRow.org_id}/sessions/${sessionRow.id}/audio/${timestamp}.${safeExtension}`;

    const { error: uploadError } = await supabase.storage
      .from(WALKTHROUGH_BUCKET)
      .upload(audioPath, audio, {
        contentType: audio.type || 'audio/webm'
      });

    if (uploadError) {
      return NextResponse.json({ error: uploadError.message }, { status: 500 });
    }

    const { data: noteRow, error: noteError } = await supabase
      .from('walkthrough_notes')
      .insert({
        session_id: sessionId,
        transcript_text: transcript,
        started_at: typeof startedAt === 'string' ? startedAt : null,
        ended_at: typeof endedAt === 'string' ? endedAt : null,
        raw_audio_path: audioPath
      })
      .select('id')
      .single();

    if (noteError) {
      return NextResponse.json({ error: noteError.message }, { status: 500 });
    }

    return NextResponse.json({
      transcript,
      noteId: noteRow?.id,
      audioPath
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Transcription failed.' },
      { status: 500 }
    );
  }
}
