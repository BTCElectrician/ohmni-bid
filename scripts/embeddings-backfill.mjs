import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const openaiKey = process.env.OPENAI_API_KEY || '';
const embeddingModel = process.env.OPENAI_EMBEDDINGS_MODEL || 'text-embedding-3-small';
const batchSize = Number(process.env.EMBEDDINGS_BATCH_SIZE || 40);
const dryRun = process.env.EMBEDDINGS_DRY_RUN === '1';

if (!supabaseUrl || !supabaseServiceKey || !openaiKey) {
  console.error('Missing required env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, OPENAI_API_KEY.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { persistSession: false }
});

function buildEmbeddingText(item) {
  return [
    item.category,
    item.subcategory,
    item.name,
    item.description,
    item.size,
    item.unit_type
  ]
    .filter(Boolean)
    .join(' | ');
}

async function getEmbedding(input) {
  const response = await fetch('https://api.openai.com/v1/embeddings', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${openaiKey}`
    },
    body: JSON.stringify({
      model: embeddingModel,
      input
    })
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Embedding request failed: ${text}`);
  }

  const data = await response.json();
  const embedding = data?.data?.[0]?.embedding;
  if (!embedding) {
    throw new Error('Embedding response missing data');
  }
  return embedding;
}

async function backfill() {
  let offset = 0;
  let totalUpdated = 0;

  while (true) {
    const { data, error } = await supabase
      .from('pricing_items')
      .select('id, category, subcategory, name, description, size, unit_type')
      .is('embedding', null)
      .range(offset, offset + batchSize - 1);

    if (error) {
      throw new Error(`Supabase select failed: ${error.message}`);
    }

    if (!data || data.length === 0) {
      break;
    }

    for (const item of data) {
      const text = buildEmbeddingText(item);
      const embedding = await getEmbedding(text);
      if (!dryRun) {
        const { error: updateError } = await supabase
          .from('pricing_items')
          .update({ embedding })
          .eq('id', item.id);
        if (updateError) {
          throw new Error(`Update failed for ${item.id}: ${updateError.message}`);
        }
      }
      totalUpdated += 1;
      process.stdout.write(`Updated ${totalUpdated}\r`);
    }

    offset += data.length;
  }

  process.stdout.write('\n');
  console.log(`Done. Backfilled ${totalUpdated} embeddings.`);
}

backfill().catch(error => {
  console.error(error);
  process.exit(1);
});
