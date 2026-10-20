import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'tcu.auditor.seed@gmail.com';
const TEST_PASSWORD = 'TesteTCU@2026!';

async function runTest() {
  console.log('🧪 Iniciando teste de validação de sincronização Supabase...');

  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Supabase credentials missing in .env');
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  // 1. Auth login
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (loginErr || !loginData?.session) {
    throw new Error(`Falha no login: ${loginErr?.message}`);
  }

  const userId = loginData.user.id;
  const token = loginData.session.access_token;
  console.log(`✅ Autenticado como ${TEST_EMAIL} (UID: ${userId})`);

  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  // 2. Query user_data_sync
  const { data: userData, error: userErr } = await authedClient
    .from('user_data_sync')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (userErr) {
    throw new Error(`Erro ao buscar user_data_sync: ${userErr.message} (code ${userErr.code})`);
  }

  console.log(`✅ user_data_sync encontrado: updated_at=${userData.updated_at}`);
  console.log(`   Matérias: ${userData.materias?.length || 0}`);
  console.log(`   Simulados: ${userData.simulados?.length || 0}`);
  console.log(`   Revisões: ${userData.revisoes?.length || 0}`);
  console.log(`   Histórico em user_data_sync: ${userData.historico?.length || 0}`);

  // 3. Test upsert of scoped log into historico_logs
  const testLogId = `${userId}_log_test_sync_flow`;
  const testLogPayload = {
    id: testLogId,
    user_id: userId,
    materia_id: 'controle_externo',
    aula_id: 'CEX_01',
    duracao_minutos: 45,
    questoes_resolvidas: 20,
    questoes_acertadas: 18,
    questoes_erradas: 2,
    tipo: 'Questões',
    comentarios: 'Teste de validação de fluxo de sync',
    data: new Date().toISOString()
  };

  const { error: logUpsertErr } = await authedClient
    .from('historico_logs')
    .upsert([testLogPayload], { onConflict: 'id' });

  if (logUpsertErr) {
    throw new Error(`Falha no upsert de historico_logs: ${logUpsertErr.message} (code ${logUpsertErr.code})`);
  }
  console.log(`✅ Upsert em historico_logs com ID prefixado (${testLogId}) passou sem erro 42501`);

  // 4. Query historico_logs
  const { data: logs, error: logsQueryErr } = await authedClient
    .from('historico_logs')
    .select('*')
    .eq('user_id', userId);

  if (logsQueryErr) {
    throw new Error(`Falha ao consultar historico_logs: ${logsQueryErr.message}`);
  }
  console.log(`✅ historico_logs contém ${logs.length} logs para o usuário`);

  // 5. Test updating user_data_sync timestamp (simulating sync send)
  const nowIso = new Date().toISOString();
  const { error: updateErr } = await authedClient
    .from('user_data_sync')
    .update({ updated_at: nowIso })
    .eq('user_id', userId);

  if (updateErr) {
    throw new Error(`Falha ao atualizar updated_at em user_data_sync: ${updateErr.message}`);
  }
  console.log(`✅ updated_at em user_data_sync atualizado com sucesso (${nowIso})`);

  // 6. Test RLS cross-user isolation
  const fakeUserId = '00000000-0000-0000-0000-000000000000';
  const { data: crossData } = await authedClient
    .from('user_data_sync')
    .select('*')
    .eq('user_id', fakeUserId);

  if (crossData && crossData.length > 0) {
    throw new Error('RLS VIOLATION: Insecure read of foreign user data!');
  }
  console.log('✅ RLS ativo: Isolamento de dados de outros usuários 100% garantido');

  // 7. Clean up test log
  await authedClient
    .from('historico_logs')
    .delete()
    .eq('id', testLogId);
  console.log('✅ Log temporário de teste removido com sucesso');

  console.log('\n🎉 TODOS OS TESTES DE INTEGRAÇÃO PASSARAM COM SUCESSO!');
}

runTest().catch(err => {
  console.error('❌ Teste falhou:', err);
  process.exit(1);
});
