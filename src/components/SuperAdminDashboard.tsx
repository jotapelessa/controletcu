import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { DEFAULT_CMS_CONTENT } from './Homepage';
import CmsEditor from './CmsEditor';
import { 
  Sliders, 
  Database, 
  Users, 
  Save, 
  Search, 
  Activity, 
  AlertTriangle, 
  Clock, 
  CheckSquare, 
  TrendingUp, 
  ShieldAlert,
  RotateCcw,
  CheckCircle,
  XCircle,
  FileSpreadsheet
} from 'lucide-react';

interface SuperAdminDashboardProps {
  currentAdminEmail?: string;
}

interface AlunoPerfil {
  id: string;
  email: string;
  is_super_admin: boolean;
  subscription_status: 'ativo' | 'renovado' | 'cancelado' | 'congelado' | 'banido';
  last_login: string | null;
  updated_at: string | null;
}

interface AlunoEstatisticas {
  totalHoras: number;
  totalQuestoes: number;
  totalAcertos: number;
  aproveitamento: number;
  sessaoContagem: number;
}

export default function SuperAdminDashboard({ currentAdminEmail }: SuperAdminDashboardProps) {
  const [adminTab, setAdminTab] = useState<'cms' | 'database' | 'users'>('cms');
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // --- 1. ESTADOS DO CMS ---
  const [cmsContent, setCmsContent] = useState<any>(DEFAULT_CMS_CONTENT);

  // --- 2. ESTADOS DO BANCO DE DADOS ---
  const [dbStats, setDbStats] = useState({
    totalUsers: 0,
    totalLogs: 0,
    databaseSizeMB: 0.85, // Mock simulado
    healthStatus: 'Saudável',
    latencyMs: 45
  });

  // --- 3. ESTADOS DOS ALUNOS ---
  const [usuarios, setUsuarios] = useState<AlunoPerfil[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalUsersCount, setTotalUsersCount] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AlunoPerfil | null>(null);
  const [selectedUserStats, setSelectedUserStats] = useState<AlunoEstatisticas | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const pageSize = 10;

  // Carregar dados dependendo da aba ativa
  useEffect(() => {
    if (adminTab === 'cms') {
      carregarCMS();
    } else if (adminTab === 'database') {
      carregarEstatisticasDB();
    } else if (adminTab === 'users') {
      carregarUsuarios(currentPage, searchQuery);
    }
  }, [adminTab, currentPage, searchQuery]);

  // --- CARREGAR DADOS DO CMS ---
  const carregarCMS = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('cms_settings')
        .select('*')
        .eq('id', 'global')
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data && data.content) {
        setCmsContent(data.content);
      } else {
        setCmsContent(DEFAULT_CMS_CONTENT);
      }
    } catch (err: any) {
      console.error("Erro ao carregar CMS:", err);
      setErrorMsg("Falha ao conectar à tabela cms_settings.");
    } finally {
      setLoading(false);
    }
  };

  // --- SALVAR DADOS DO CMS ---
  const handleSalvarCMS = async (novoConteudo: any) => {
    try {
      setLoading(true);
      setFeedbackMsg('');
      setErrorMsg('');

      const { error } = await supabase
        .from('cms_settings')
        .upsert({
          id: 'global',
          content: novoConteudo,
          updated_at: new Date().toISOString()
        }, { onConflict: 'id' });

      if (error) throw error;
      setCmsContent(novoConteudo);
      setFeedbackMsg("✔️ Homepage atualizada com sucesso no banco de dados!");
      setTimeout(() => setFeedbackMsg(''), 5000);
    } catch (err: any) {
      console.error("Erro ao salvar CMS:", err);
      setErrorMsg("Erro ao salvar: verifique se você possui permissões de Super Admin.");
    } finally {
      setLoading(false);
    }
  };

  // --- CARREGAR METRICAS DO BANCO DE DADOS ---
  const carregarEstatisticasDB = async () => {
    try {
      setLoading(true);
      const startTime = Date.now();
      
      // Contagem de usuários
      const { count: usersCount, error: usersError } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });

      if (usersError) throw usersError;

      // Contagem de logs de estudo
      const { count: logsCount, error: logsError } = await supabase
        .from('historico_logs')
        .select('*', { count: 'exact', head: true });

      if (logsError) throw logsError;

      const latency = Date.now() - startTime;

      setDbStats({
        totalUsers: usersCount || 0,
        totalLogs: logsCount || 0,
        databaseSizeMB: parseFloat((0.2 + (usersCount || 0) * 0.15 + (logsCount || 0) * 0.002).toFixed(2)),
        healthStatus: 'Saudável',
        latencyMs: latency
      });
    } catch (err: any) {
      console.error("Erro ao ler métricas do DB:", err);
      setErrorMsg("Não foi possível coletar informações de status do Supabase.");
    } finally {
      setLoading(false);
    }
  };

  // --- CARREGAR TODOS OS USUARIOS/ALUNOS ---
  const carregarUsuarios = async (page: number, search: string) => {
    try {
      setLoading(true);
      setSelectedUser(null);
      setSelectedUserStats(null);
      
      let query = supabase
        .from('profiles')
        .select('*', { count: 'exact' });
        
      if (search.trim()) {
        query = query.ilike('email', `%${search.trim()}%`);
      }
      
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      
      const { data, count, error } = await query
        .order('email', { ascending: true })
        .range(from, to);

      if (error) throw error;
      setUsuarios(data || []);
      setTotalUsersCount(count || 0);
    } catch (err: any) {
      console.error("Erro ao ler alunos:", err);
      setErrorMsg("Falha ao listar usuários da tabela profiles.");
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setCurrentPage(1);
    setSearchQuery(searchTerm);
  };

  // --- ALTERAR STATUS DE ASSINATURA ---
  const handleAlterarStatusAssinatura = async (userId: string, novoStatus: AlunoPerfil['subscription_status']) => {
    try {
      setLoading(true);
      setFeedbackMsg('');
      setErrorMsg('');

      const { error } = await supabase
        .from('profiles')
        .update({ subscription_status: novoStatus, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) throw error;

      // Atualizar lista local
      setUsuarios(prev => prev.map(u => u.id === userId ? { ...u, subscription_status: novoStatus } : u));
      if (selectedUser && selectedUser.id === userId) {
        setSelectedUser(prev => prev ? { ...prev, subscription_status: novoStatus } : null);
      }

      setFeedbackMsg(`✔️ Status do aluno atualizado para "${novoStatus}"!`);
      setTimeout(() => setFeedbackMsg(''), 4000);
    } catch (err: any) {
      console.error("Erro ao alterar status da assinatura:", err);
      setErrorMsg("Erro ao alterar status. Verifique as RLS policies.");
    } finally {
      setLoading(false);
    }
  };

  // --- BUSCAR DADOS DE DESEMPENHO E ESTATISTICAS DE UM ALUNO ESPECIFICO ---
  const carregarEstatisticasAluno = async (user: AlunoPerfil) => {
    try {
      setLoadingStats(true);
      setSelectedUser(user);
      setSelectedUserStats(null);

      const { data: logs, error } = await supabase
        .from('historico_logs')
        .select('duracao_minutos, questoes_resolvidas, questoes_acertadas, questoes_erradas')
        .eq('user_id', user.id);

      if (error) throw error;

      let totalMinutos = 0;
      let totalQuestoes = 0;
      let totalAcertos = 0;

      (logs || []).forEach(log => {
        totalMinutos += (log.duracao_minutos || 0);
        totalQuestoes += (log.questoes_resolvidas || 0);
        totalAcertos += (log.questoes_acertadas || 0);
      });

      setSelectedUserStats({
        totalHoras: parseFloat((totalMinutos / 60).toFixed(1)),
        totalQuestoes,
        totalAcertos,
        aproveitamento: totalQuestoes > 0 ? Math.round((totalAcertos / totalQuestoes) * 100) : 0,
        sessaoContagem: (logs || []).length
      });
    } catch (err) {
      console.error("Erro ao carregar estatísticas do aluno:", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Filtragem local removida (agora feita server-side)

  return (
    <div className="bg-[#0F172A] border border-[#1E293B] p-6 rounded shadow-sm space-y-6" id="super-admin-root">
      
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 border-b border-[#1E293B] pb-4">
        <div>
          <h2 className="text-lg font-display font-bold text-[#C5A059] flex items-center gap-2">
            <ShieldAlert size={20} /> Painel de Controle do Super Admin
          </h2>
          <p className="text-xs text-[#64748B]">SaaS Management • Logado como: <strong className="text-[#E2E8F0] font-mono">{currentAdminEmail}</strong></p>
        </div>

        {/* Abas Administrativas */}
        <div className="flex bg-[#0C0E12] p-1 border border-[#1E293B] rounded text-xs font-mono">
          <button
            onClick={() => setAdminTab('cms')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${adminTab === 'cms' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
          >
            <Sliders size={14} /> Homepage CMS
          </button>
          <button
            onClick={() => setAdminTab('database')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${adminTab === 'database' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
          >
            <Database size={14} /> Banco de Dados
          </button>
          <button
            onClick={() => setAdminTab('users')}
            className={`px-3 py-1.5 rounded flex items-center gap-1.5 transition-all cursor-pointer ${adminTab === 'users' ? 'bg-[#C5A059] text-black font-bold' : 'text-[#64748B] hover:text-[#E2E8F0]'}`}
          >
            <Users size={14} /> Alunos & Assinaturas
          </button>
        </div>
      </div>

      {/* Feedbacks de Operação */}
      {feedbackMsg && (
        <div className="bg-emerald-950/40 border border-emerald-800/50 p-3 text-xs text-emerald-400 rounded font-mono transition-all">
          {feedbackMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-950/40 border border-red-850/50 p-3 text-xs text-red-400 rounded font-mono transition-all">
          {errorMsg}
        </div>
      )}

      {/* RENDER ABA 1: HOMEPAGE CMS */}
      {adminTab === 'cms' && (
        <CmsEditor 
          initialContent={cmsContent} 
          onSave={handleSalvarCMS} 
          loading={loading} 
        />
      )}

      {/* RENDER ABA 2: STATUS DO BANCO DE DADOS */}
      {adminTab === 'database' && (
        <div className="space-y-6 animate-fade-in" id="database-status-tab">
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            
            <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#64748B] uppercase block">Total de Alunos</span>
              <div className="flex items-baseline gap-2 mt-2">
                <h4 className="text-3xl font-display font-bold text-[#C5A059]">{dbStats.totalUsers}</h4>
                <span className="text-[10px] text-[#94A3B8] font-mono">perfis criados</span>
              </div>
            </div>

            <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#64748B] uppercase block">Sessões de Foco</span>
              <div className="flex items-baseline gap-2 mt-2">
                <h4 className="text-3xl font-display font-bold text-emerald-400">{dbStats.totalLogs}</h4>
                <span className="text-[10px] text-[#94A3B8] font-mono">rows na nuvem</span>
              </div>
            </div>

            <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#64748B] uppercase block">Tamanho Estimado</span>
              <div className="flex items-baseline gap-2 mt-2">
                <h4 className="text-3xl font-display font-bold text-sky-400">{dbStats.databaseSizeMB} MB</h4>
                <span className="text-[10px] text-[#94A3B8] font-mono">armazenado</span>
              </div>
            </div>

            <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded flex flex-col justify-between">
              <span className="text-[10px] font-mono text-[#64748B] uppercase block">Latência da Conexão</span>
              <div className="flex items-baseline gap-2 mt-2">
                <h4 className="text-3xl font-display font-bold text-amber-500">{dbStats.latencyMs}ms</h4>
                <span className="text-[10px] text-[#94A3B8] font-mono">resposta da API</span>
              </div>
            </div>

          </div>

          <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-4">
            <h3 className="text-xs font-mono font-bold text-[#E2E8F0] uppercase tracking-wider pb-2 border-b border-[#1E293B] flex items-center justify-between">
              <span>Status das Tabelas e RLS do Supabase</span>
              <span className="px-2 py-0.5 rounded text-[9px] font-sans font-bold bg-emerald-500/25 border border-emerald-500/30 text-emerald-400">
                {dbStats.healthStatus}
              </span>
            </h3>

            <div className="divide-y divide-[#1E293B]/60 text-xs">
              <div className="py-3 flex justify-between items-center">
                <span className="font-semibold text-white font-mono">public.profiles</span>
                <span className="text-[#64748B]">RLS Ativo • Políticas de Acesso Restrito</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="font-semibold text-white font-mono">public.user_data_sync</span>
                <span className="text-[#64748B]">RLS Ativo • Isolamento por UID</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="font-semibold text-white font-mono">public.historico_logs</span>
                <span className="text-[#64748B]">RLS Ativo • Inserções Leves Otimizadas</span>
              </div>
              <div className="py-3 flex justify-between items-center">
                <span className="font-semibold text-white font-mono">public.cms_settings</span>
                <span className="text-[#64748B]">RLS Ativo • Leitura Pública / Escrita Apenas Admin</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              onClick={carregarEstatisticasDB}
              disabled={loading}
              className="px-4 py-2 bg-[#1E293B] hover:bg-[#2D3748] text-white border border-[#2D3748] text-xs font-mono rounded flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <RotateCcw size={13} className={loading ? "animate-spin" : ""} /> Testar Conexão Novamente
            </button>
          </div>

        </div>
      )}

      {/* RENDER ABA 3: CONTROLE DE ALUNOS */}
      {adminTab === 'users' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in" id="users-manager-tab">
          
          {/* Coluna Esquerda: Listagem e Filtro de Usuários */}
          <div className="lg:col-span-8 bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-4">
            
            <form onSubmit={handleSearchSubmit} className="flex gap-2">
              <div className="flex-1 flex items-center gap-3 bg-[#0F172A] border border-[#1E293B] rounded px-3 py-2">
                <Search size={16} className="text-[#64748B] shrink-0" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar aluno por e-mail..."
                  className="w-full bg-transparent text-xs text-white outline-none placeholder-[#64748B]"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-[#C5A059] hover:bg-[#B38F4B] text-black font-bold text-xs rounded transition-colors cursor-pointer"
              >
                Buscar
              </button>
            </form>

            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#1E293B] text-[#64748B] uppercase tracking-wider font-mono text-[10px]">
                    <th className="py-2.5">E-mail do Aluno</th>
                    <th className="py-2.5 text-center">Permissão</th>
                    <th className="py-2.5 text-center">Status Assinatura</th>
                    <th className="py-2.5 text-right">Último Login</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#1E293B]/40">
                  {usuarios.map(u => (
                    <tr 
                      key={u.id}
                      onClick={() => carregarEstatisticasAluno(u)}
                      className={`hover:bg-[#1E293B]/40 transition-colors cursor-pointer ${selectedUser?.id === u.id ? 'bg-[#1E293B]/80 font-bold border-l-2 border-l-[#C5A059]' : ''}`}
                    >
                      <td className="py-3 font-mono">{u.email}</td>
                      <td className="py-3 text-center">
                        {u.is_super_admin ? (
                          <span className="px-1.5 py-0.5 rounded text-[9px] bg-red-950 text-red-400 font-mono border border-red-900/40">Super Admin</span>
                        ) : (
                          <span className="text-[#64748B] font-mono">Estudante</span>
                        )}
                      </td>
                      <td className="py-3 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-sans font-bold uppercase tracking-wider border ${
                          u.subscription_status === 'ativo' || u.subscription_status === 'renovado'
                            ? 'bg-emerald-950 text-emerald-400 border-emerald-900/40'
                            : u.subscription_status === 'congelado'
                              ? 'bg-blue-950 text-blue-400 border-blue-900/40'
                              : u.subscription_status === 'banido'
                                ? 'bg-red-950 text-red-400 border-red-900/40'
                                : 'bg-amber-950 text-amber-400 border-amber-900/40'
                        }`}>
                          {u.subscription_status}
                        </span>
                      </td>
                      <td className="py-3 text-right font-mono text-[#64748B]">
                        {u.last_login ? new Date(u.last_login).toLocaleDateString('pt-BR') : 'Sem dados'}
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-[#64748B]">Nenhum aluno encontrado.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex justify-between items-center border-t border-[#1E293B] pt-4 text-[10px] sm:text-xs font-mono text-[#64748B]">
              <span>Total: {totalUsersCount} {totalUsersCount === 1 ? 'aluno' : 'alunos'}</span>
              {totalUsersCount > pageSize && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#2D3A4F] text-white rounded disabled:opacity-40 disabled:hover:bg-[#1E293B] cursor-pointer"
                  >
                    Anterior
                  </button>
                  <span className="text-white">Página {currentPage} de {Math.ceil(totalUsersCount / pageSize)}</span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, Math.ceil(totalUsersCount / pageSize)))}
                    disabled={currentPage >= Math.ceil(totalUsersCount / pageSize)}
                    className="px-2.5 py-1 bg-[#1E293B] hover:bg-[#2D3A4F] text-white rounded disabled:opacity-40 disabled:hover:bg-[#1E293B] cursor-pointer"
                  >
                    Próxima
                  </button>
                </div>
              )}
            </div>

          </div>

          {/* Coluna Direita: Painel de Controle e Estatísticas de Uso do Aluno Selecionado */}
          <div className="lg:col-span-4 space-y-6">
            
            {selectedUser ? (
              <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-6 animate-slide-up">
                
                {/* Cabeçalho do Aluno */}
                <div className="border-b border-[#1E293B] pb-3">
                  <h4 className="text-xs font-mono text-[#C5A059] uppercase">Aluno Selecionado</h4>
                  <span className="text-xs font-bold text-white block truncate font-mono mt-1">{selectedUser.email}</span>
                </div>

                {/* Controles de Status */}
                <div className="space-y-3">
                  <span className="text-[10px] font-mono text-[#64748B] uppercase block">Gerenciamento de Assinatura</span>
                  
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => handleAlterarStatusAssinatura(selectedUser.id, 'ativo')}
                      disabled={loading || selectedUser.subscription_status === 'ativo'}
                      className="py-2 bg-emerald-950 hover:bg-emerald-900 text-emerald-400 rounded text-center text-[10px] font-bold border border-emerald-900 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Ativar/Renovar
                    </button>
                    <button
                      onClick={() => handleAlterarStatusAssinatura(selectedUser.id, 'congelado')}
                      disabled={loading || selectedUser.subscription_status === 'congelado'}
                      className="py-2 bg-blue-950 hover:bg-blue-900 text-blue-400 rounded text-center text-[10px] font-bold border border-blue-900 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Congelar
                    </button>
                    <button
                      onClick={() => handleAlterarStatusAssinatura(selectedUser.id, 'cancelado')}
                      disabled={loading || selectedUser.subscription_status === 'cancelado'}
                      className="py-2 bg-amber-950 hover:bg-amber-900 text-amber-400 rounded text-center text-[10px] font-bold border border-amber-900 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Cancelar
                    </button>
                    <button
                      onClick={() => handleAlterarStatusAssinatura(selectedUser.id, 'banido')}
                      disabled={loading || selectedUser.subscription_status === 'banido'}
                      className="py-2 bg-red-950 hover:bg-red-900 text-red-400 rounded text-center text-[10px] font-bold border border-red-900 transition-colors cursor-pointer disabled:opacity-40"
                    >
                      Banir Aluno
                    </button>
                  </div>
                </div>

                {/* Estatísticas de Foco do Aluno */}
                <div className="space-y-3 border-t border-[#1E293B] pt-4">
                  <span className="text-[10px] font-mono text-[#64748B] uppercase block">Estatísticas de Estudo Recentes</span>
                  
                  {loadingStats ? (
                    <div className="text-center py-4 text-[#64748B] text-xs">Carregando métricas do banco...</div>
                  ) : selectedUserStats ? (
                    <div className="space-y-3 text-xs">
                      
                      <div className="flex justify-between items-center bg-[#0F172A] p-2 rounded">
                        <span className="text-[#94A3B8] flex items-center gap-1.5"><Clock size={12} /> Horas Focadas:</span>
                        <strong className="text-white font-mono">{selectedUserStats.totalHoras}h</strong>
                      </div>

                      <div className="flex justify-between items-center bg-[#0F172A] p-2 rounded">
                        <span className="text-[#94A3B8] flex items-center gap-1.5"><CheckSquare size={12} /> Questões Feitas:</span>
                        <strong className="text-white font-mono">{selectedUserStats.totalQuestoes} Q</strong>
                      </div>

                      <div className="flex justify-between items-center bg-[#0F172A] p-2 rounded">
                        <span className="text-[#94A3B8] flex items-center gap-1.5"><TrendingUp size={12} /> Taxa de Acerto:</span>
                        <strong className="text-[#C5A059] font-mono">{selectedUserStats.aproveitamento}%</strong>
                      </div>

                      <div className="flex justify-between items-center bg-[#0F172A] p-2 rounded">
                        <span className="text-[#94A3B8] flex items-center gap-1.5"><Activity size={12} /> Sessões Logadas:</span>
                        <strong className="text-[#94A3B8] font-mono">{selectedUserStats.sessaoContagem} vezes</strong>
                      </div>

                    </div>
                  ) : (
                    <div className="text-center py-4 text-[#64748B] text-xs italic">Nenhuma atividade registrada na nuvem.</div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-[#0C0E12]/50 border border-[#1E293B] p-8 rounded text-center text-[#64748B] text-xs italic">
                Selecione um aluno na lista ao lado para gerenciar sua assinatura e ver dados de desempenho.
              </div>
            )}

          </div>

        </div>
      )}

    </div>
  );
}
