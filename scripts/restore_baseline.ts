import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { MATERIAS_PADRAO, CICLO_PADRAO } from '../src/data';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'tcu.auditor.seed@gmail.com';
const TEST_PASSWORD = 'TesteTCU@2026!';

async function restoreBaseline() {
  console.log(`Restaurando baseline limpo (17 matérias, 0h) para ${TEST_EMAIL}...`);
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (loginErr || !loginData?.session) {
    throw new Error(`Falha no login: ${loginErr?.message}`);
  }

  const userId = loginData.user.id;
  const token = loginData.session.access_token;

  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  // Deep clone to ensure 0 progress
  const materias = JSON.parse(JSON.stringify(MATERIAS_PADRAO));
  const ciclo = JSON.parse(JSON.stringify(CICLO_PADRAO));

  // Reset all aula progress to 0 and 'Não Iniciado'
  materias.forEach((m: any) => {
    m.aulas.forEach((a: any) => {
      a.status = 'Não Iniciado';
      a.questoesResolvidas = 0;
      a.questoesAcertadas = 0;
      a.questoesErradas = 0;
      a.horasEstudadas = 0;
      delete a.dataConclusao;
    });
  });

  const payload = {
    user_id: userId,
    updated_at: new Date().toISOString(),
    materias,
    ciclo,
    simulados: [],
    revisoes: [],
    historico: [],
    planejamento_semanal: null,
    configuracoes: {}
  };

  const { data, error } = await authedClient
    .from('user_data_sync')
    .upsert(payload, { onConflict: 'user_id' })
    .select('updated_at')
    .single();

  if (error) {
    throw new Error(`Erro ao restaurar baseline: ${error.message}`);
  }

  // Also clean historico_logs for this test user
  await authedClient
    .from('historico_logs')
    .delete()
    .eq('user_id', userId);

  console.log(`✅ Baseline restaurado com sucesso para ${TEST_EMAIL}! Updated at: ${data.updated_at}`);
}

restoreBaseline().catch(err => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
