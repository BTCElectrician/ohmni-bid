import 'server-only';
import { Buffer } from 'buffer';

const OPENAI_VISION_MODEL =
  process.env.OPENAI_VISION_MODEL || 'gpt-4o-mini';

export interface VisionCountResult {
  counts: Record<string, number>;
  confidence: Record<string, number>;
  notes: string;
}

function parseJsonPayload(raw: string) {
  const trimmed = raw.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    const match = trimmed.match(/\{[\s\S]*\}/);
    if (!match) return null;
    try {
      return JSON.parse(match[0]);
    } catch {
      return null;
    }
  }
}

export async function countFromImage(file: File): Promise<VisionCountResult> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const base64 = buffer.toString('base64');
  const mimeType = file.type || 'image/jpeg';
  const dataUrl = `data:${mimeType};base64,${base64}`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_VISION_MODEL,
      temperature: 0.2,
      messages: [
        {
          role: 'system',
          content:
            'You estimate electrical takeoff quantities from photos. ' +
            'Return JSON only with keys: counts, confidence, notes. ' +
            'counts and confidence are objects keyed by item name.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text:
                'Review the photo and suggest approximate counts for visible ' +
                'electrical devices (receptacles, switches, fixtures, panels).'
            },
            {
              type: 'image_url',
              image_url: { url: dataUrl }
            }
          ]
        }
      ]
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Vision count failed: ${text}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const raw = data.choices?.[0]?.message?.content || '';
  const parsed = parseJsonPayload(raw);
  if (!parsed) {
    throw new Error('Vision count returned invalid JSON');
  }

  return {
    counts: parsed.counts || {},
    confidence: parsed.confidence || {},
    notes: parsed.notes || ''
  };
}
