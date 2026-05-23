// src/lib/supabase.js
// Inicializa o cliente Supabase a partir das variáveis de ambiente.
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL  = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_KEY  = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  // Erro amigável caso as envs não estejam configuradas
  // eslint-disable-next-line no-console
  console.error(
    '[supabase] Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY não configuradas. ' +
    'Crie um arquivo .env na raiz do frontend com elas.',
  );
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false },
});
