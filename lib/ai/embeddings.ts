import 'server-only';

const OPENAI_EMBEDDINGS_MODEL =
  process.env.OPENAI_EMBEDDINGS_MODEL || 'text-embedding-3-small';

export async function getEmbedding(input: string): Promise<number[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: OPENAI_EMBEDDINGS_MODEL,
      input
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embedding request failed: ${text}`);
  }

  const data = (await response.json()) as {
    data: Array<{ embedding: number[] }>;
  };

  const embedding = data.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('Embedding response missing data');
  }

  return embedding;
}
