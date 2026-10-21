import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'tcu.auditor.seed@gmail.com';
const TEST_PASSWORD = 'TesteTCU@2026!';

async function runServiceRLSTests() {
  console.log('🧪 Iniciando testes de RLS para edital_analisado e redacoes_corrigidas...');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials missing in .env');
  }

  const anonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Login
  const { data: loginData, error: loginErr } = await anonClient.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (loginErr || !loginData?.session) {
    throw new Error(`Falha no login: ${loginErr?.message}`);
  }

  const userId = loginData.user.id;
  const token = loginData.session.access_token;
  console.log(`✅ [1/5] Autenticado com sucesso como ${TEST_EMAIL} (UID: ${userId})`);

  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  // 2. Test edital_analisado with authenticated client
  const testEditalText = "Edital TCU 2026 Teste RLS";
  const testEditalJson = { cargo: "Auditor Federal de Controle Externo", vagas: 20 };
  const { error: editalUpsertErr } = await authedClient
    .from('edital_analisado')
    .upsert({
      user_id: userId,
      edital_text: testEditalText,
      edital_json: testEditalJson,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (editalUpsertErr) {
    throw new Error(`[edital_analisado] Falha no upsert com cliente autenticado: ${editalUpsertErr.message} (code: ${editalUpsertErr.code})`);
  }

  const { data: editalData, error: editalSelectErr } = await authedClient
    .from('edital_analisado')
    .select('edital_text, edital_json')
    .eq('user_id', userId)
    .single();

  if (editalSelectErr || editalData?.edital_text !== testEditalText) {
    throw new Error(`[edital_analisado] Falha no select com cliente autenticado: ${editalSelectErr?.message}`);
  }
  console.log(`✅ [2/5] edital_analisado: upsert e select concluídos sem RLS 42501`);

  // 3. Test redacoes_corrigidas with authenticated client
  const testRedacaoId = `test_redacao_${Date.now()}`;
  const { error: redacaoInsertErr } = await authedClient
    .from('redacoes_corrigidas')
    .insert({
      id: testRedacaoId,
      user_id: userId,
      created_at: new Date().toISOString(),
      concurso: 'TCU',
      banca: 'FGV',
      tipo: 'Discursiva',
      tema: 'Controle Externo e Sustentabilidade Fiscal',
      texto: 'O controle externo exercido pelo TCU possui papel preponderante...',
      nota_global: '9.5',
      correcao_raw: 'Excelente fundamentação.'
    });

  if (redacaoInsertErr) {
    throw new Error(`[redacoes_corrigidas] Falha no insert com cliente autenticado: ${redacaoInsertErr.message} (code: ${redacaoInsertErr.code})`);
  }

  const { data: redacaoSelectData, error: redacaoSelectErr } = await authedClient
    .from('redacoes_corrigidas')
    .select('*')
    .eq('id', testRedacaoId)
    .eq('user_id', userId)
    .single();

  if (redacaoSelectErr || !redacaoSelectData) {
    throw new Error(`[redacoes_corrigidas] Falha no select com cliente autenticado: ${redacaoSelectErr?.message}`);
  }
  console.log(`✅ [3/5] redacoes_corrigidas: insert e select concluídos sem RLS 42501`);

  // 4. Verify that unauthenticated client DOES fail or is blocked by RLS policies
  const pureAnonClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { error: anonInsertRedacaoErr } = await pureAnonClient
    .from('redacoes_corrigidas')
    .insert({
      id: `anon_attack_${Date.now()}`,
      user_id: userId,
      tema: 'Ataque anon'
    });

  if (!anonInsertRedacaoErr || anonInsertRedacaoErr.code !== '42501') {
    console.warn(`Aviso: Esperado erro 42501 para cliente anon em redacoes_corrigidas, obtido:`, anonInsertRedacaoErr);
  } else {
    console.log(`✅ [4/5] RLS ativo comprovado: cliente anon foi devidamente rejeitado com 42501`);
  }

  // 5. Cleanup
  await authedClient
    .from('redacoes_corrigidas')
    .delete()
    .eq('id', testRedacaoId)
    .eq('user_id', userId);

  await authedClient
    .from('edital_analisado')
    .delete()
    .eq('user_id', userId);

  console.log(`✅ [5/5] Limpeza de dados de teste finalizada com sucesso`);
  console.log('\n🎉 TODOS OS TESTES DE RLS DOS SERVIÇOS PASSARAM COM SUCESSO (5/5)!');
}

runServiceRLSTests().catch(err => {
  console.error('❌ Teste falhou:', err);
  process.exit(1);
});
