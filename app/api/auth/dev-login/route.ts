import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';

export async function POST(request: NextRequest) {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Not available.' }, { status: 404 });
  }

  if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    return NextResponse.json(
      { error: 'Missing Supabase env vars for dev login.' },
      { status: 400 }
    );
  }

  let email = process.env.DEV_LOGIN_EMAIL || '';
  try {
    const body = await request.json();
    if (body && typeof body.email === 'string') {
      email = body.email.trim();
    }
  } catch {
    // Ignore invalid JSON and fall back to env.
  }

  if (!email) {
    return NextResponse.json(
      { error: 'Dev login email is required.' },
      { status: 400 }
    );
  }

  const serviceClient = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { persistSession: false }
  });

  let { data, error } = await serviceClient.auth.admin.generateLink({
    type: 'magiclink',
    email
  });

  if (error && error.message.toLowerCase().includes('user not found')) {
    const { error: createError } = await serviceClient.auth.admin.createUser({
      email,
      email_confirm: true
    });
    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }
    ({ data, error } = await serviceClient.auth.admin.generateLink({
      type: 'magiclink',
      email
    }));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const oneTimeCode = data?.properties?.email_otp;
  if (!oneTimeCode) {
    return NextResponse.json(
      { error: 'Dev login failed to generate a one-time code.' },
      { status: 500 }
    );
  }

  const response = NextResponse.json({ ok: true });
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return request.cookies.get(name)?.value;
      },
      set(name, value, options) {
        response.cookies.set({ name, value, ...options });
      },
      remove(name, options) {
        response.cookies.set({ name, value: '', ...options });
      }
    }
  });

  const { error: verifyError } = await supabase.auth.verifyOtp({
    email,
    token: oneTimeCode,
    type: 'magiclink'
  });

  if (verifyError) {
    return NextResponse.json({ error: verifyError.message }, { status: 500 });
  }

  return response;
}
