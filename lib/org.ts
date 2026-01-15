import type { SupabaseClient, User } from '@supabase/supabase-js';

export async function getOrCreateOrgId(
  supabase: SupabaseClient,
  user: User
): Promise<string> {
  const { data: membership, error: membershipError } = await supabase
    .from('org_members')
    .select('org_id')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  if (membershipError) {
    throw new Error(`Org lookup failed: ${membershipError.message}`);
  }

  if (membership?.org_id) {
    return membership.org_id;
  }

  const orgName = user.email ? `${user.email} Org` : 'Primary Org';
  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName, created_by: user.id })
    .select('id')
    .single();

  if (orgError || !org) {
    throw new Error(`Org create failed: ${orgError?.message || 'Unknown error'}`);
  }

  const { error: memberError } = await supabase.from('org_members').insert({
    org_id: org.id,
    user_id: user.id,
    role: 'owner'
  });

  if (memberError) {
    throw new Error(`Org membership failed: ${memberError.message}`);
  }

  return org.id;
}
