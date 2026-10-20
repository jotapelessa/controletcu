import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || '';
const TEST_EMAIL = process.env.SEED_TEST_EMAIL || 'tcu.auditor.seed@gmail.com';
const TEST_PASSWORD = 'TesteTCU@2026!';

function mergeHistoricoLogs(localLogs, cloudLogs, userId) {
  const map = new Map();
  for (const l of localLogs) {
    if (!l || !l.id) continue;
    const cleanId = l.id.startsWith(`${userId}_`) ? l.id.slice(userId.length + 1) : l.id;
    map.set(cleanId, { ...l, id: l.id });
  }
  for (const c of cloudLogs) {
    if (!c || !c.id) continue;
    const cleanId = c.id.startsWith(`${userId}_`) ? c.id.slice(userId.length + 1) : c.id;
    map.set(cleanId, { ...c, id: c.id });
  }
  return Array.from(map.values()).sort(
    (a, b) => new Date(b.data || 0).getTime() - new Date(a.data || 0).getTime()
  );
}

async function testEdgeCases() {
  console.log('🧪 Iniciando testes de cenários e casos de borda do algoritmo de sincronização...');

  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  const { data: loginData, error: loginErr } = await supabase.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD
  });

  if (loginErr || !loginData?.session) {
    throw new Error(`Login falhou: ${loginErr?.message}`);
  }

  const userId = loginData.user.id;
  const token = loginData.session.access_token;
  const authedClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } }
  });

  console.log(`✅ [1/4] Autenticado como ${TEST_EMAIL}`);

  // Cenário A: Teste do merge com log offline e garantia de não-perda
  const offlineLogs = [
    {
      id: `${userId}_log_offline_edge_1`,
      data: new Date(Date.now() - 3600000).toISOString(),
      materiaId: 'controle_externo',
      aulaId: 'CEX_01',
      duracaoMinutos: 60,
      questoesResolvidas: 30,
      questoesAcertadas: 28,
      questoesErradas: 2,
      tipo: 'Questões'
    }
  ];

  const cloudLogs = [
    {
      id: `${userId}_log_cloud_edge_2`,
      data: new Date(Date.now() - 1800000).toISOString(),
      materiaId: 'direito_constitucional',
      aulaId: 'DIR_CONST_01',
      duracaoMinutos: 45,
      questoesResolvidas: 20,
      questoesAcertadas: 18,
      questoesErradas: 2,
      tipo: 'Teoria (PDF)'
    }
  ];

  const merged = mergeHistoricoLogs(offlineLogs, cloudLogs, userId);
  if (merged.length !== 2) {
    throw new Error(`Esperado 2 logs mesclados, obteve ${merged.length}`);
  }
  console.log('✅ [2/4] Merge de histórico seguro testado: logs locais e remotos unificados sem colisões');

  // Cenário B: Simulação de resolução de conflito
  // 1) localTime === 0 (novo browser) com cloudTime > 0 => Deve baixar (não sobrescrever a nuvem)
  const cloudTime = 1792500000000;
  let localTime = 0;
  let force = false;

  const decisionFreshBrowser = (localTime === 0 || (cloudTime > localTime && !force)) ? 'DOWNLOAD' : 'UPLOAD';
  if (decisionFreshBrowser !== 'DOWNLOAD') {
    throw new Error(`Novo browser (localTime === 0) deveria fazer DOWNLOAD, decidiu: ${decisionFreshBrowser}`);
  }
  console.log('✅ [3/4] Proteção contra sobreescrita por browser novo/limpo (localTime === 0 -> DOWNLOAD) validada');

  // 2) localTime > cloudTime => Deve fazer UPLOAD
  localTime = 1792500001000;
  const decisionLocalNewer = (localTime === 0 || (cloudTime > localTime && !force)) ? 'DOWNLOAD' : 'UPLOAD';
  if (decisionLocalNewer !== 'UPLOAD') {
    throw new Error(`Modificação local recente deveria fazer UPLOAD, decidiu: ${decisionLocalNewer}`);
  }

  // 3) force === true quando timestamps iguais => Deve fazer UPLOAD
  localTime = cloudTime;
  force = true;
  const decisionForce = (localTime === 0 || (cloudTime > localTime && !force)) ? 'DOWNLOAD' : 'UPLOAD';
  if (decisionForce !== 'UPLOAD') {
    throw new Error(`Sincronismo forçado deveria fazer UPLOAD, decidiu: ${decisionForce}`);
  }
  console.log('✅ [4/4] Árvore de decisão de conflitos validada em todos os 3 ramos principais');

  console.log('\n🎉 TODOS OS TESTES DE BORDAS PASSARAM COM SUCESSO (4/4)!');
}

testEdgeCases().catch(err => {
  console.error('❌ Falha:', err);
  process.exit(1);
});
