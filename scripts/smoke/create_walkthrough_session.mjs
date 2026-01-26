import { createClient } from '@supabase/supabase-js';

const email = (process.env.SMOKE_TEST_EMAIL || process.env.DEV_LOGIN_EMAIL || '')
  .trim()
  .toLowerCase();
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!email) {
  console.error('Missing SMOKE_TEST_EMAIL or DEV_LOGIN_EMAIL.');
  process.exit(1);
}

if (!supabaseUrl || !serviceKey) {
  console.error('Missing Supabase env vars.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { persistSession: false }
});

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 200;

  while (true) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`auth.listUsers failed: ${error.message}`);

    const match = data.users.find(
      user => (user.email || '').toLowerCase() === targetEmail
    );
    if (match) return match;

    if (!data.users || data.users.length < perPage) break;
    page += 1;
  }

  return null;
}

const user = await findUserByEmail(email);
if (!user) {
  console.error(`No auth user found for email ${email}.`);
  process.exit(1);
}

const { data: membership, error: memberError } = await supabase
  .from('org_members')
  .select('org_id')
  .eq('user_id', user.id)
  .order('created_at', { ascending: true })
  .limit(1)
  .maybeSingle();

if (memberError || !membership) {
  console.error(`Org membership lookup failed: ${memberError?.message || 'not found'}`);
  process.exit(1);
}

const { data: estimate, error: estimateError } = await supabase
  .from('estimates')
  .select('id')
  .eq('org_id', membership.org_id)
  .order('updated_at', { ascending: false })
  .limit(1)
  .maybeSingle();

if (estimateError || !estimate) {
  console.error(`Estimate lookup failed: ${estimateError?.message || 'not found'}`);
  process.exit(1);
}

const { data: buckets, error: bucketsError } = await supabase.storage.listBuckets();
if (bucketsError) {
  console.error(`Bucket lookup failed: ${bucketsError.message}`);
  process.exit(1);
}

const hasBucket = buckets?.some(bucket => bucket.name === 'walkthrough');
if (!hasBucket) {
  const { error: createError } = await supabase.storage.createBucket(
    'walkthrough',
    { public: false }
  );
  if (createError) {
    console.error(`Bucket create failed: ${createError.message}`);
    process.exit(1);
  }
}

const { data: session, error: sessionError } = await supabase
  .from('walkthrough_sessions')
  .insert({
    org_id: membership.org_id,
    estimate_id: estimate.id,
    created_by: user.id,
    status: 'open'
  })
  .select('id')
  .single();

if (sessionError || !session) {
  console.error(`Session create failed: ${sessionError?.message || 'unknown error'}`);
  process.exit(1);
}

console.log(session.id);
