import 'server-only';

const OPENAI_TRANSCRIBE_MODEL =
  process.env.OPENAI_TRANSCRIBE_MODEL || 'gpt-4o-mini-transcribe';

export async function transcribeAudio(file: File) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const formData = new FormData();
  formData.append('model', OPENAI_TRANSCRIBE_MODEL);
  formData.append('file', file, file.name || 'audio.webm');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`
    },
    body: formData
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Transcription failed: ${text}`);
  }

  const data = (await response.json()) as { text?: string };
  if (typeof data.text !== 'string') {
    throw new Error('Transcription response missing text');
  }

  return data.text;
}
