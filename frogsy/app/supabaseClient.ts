import { createClient } from '@supabase/supabase-js';

// Debug: Log environment variables (remove in production)
console.log(' Supabase Debug:');
console.log('URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
console.log('Anon Key exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
console.log('Anon Key starts with eyJ:', process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.startsWith('eyJ'));

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);