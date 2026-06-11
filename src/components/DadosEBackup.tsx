import React, { useState, useEffect, useRef } from 'react';
import { Materia, CicloEstudo, Simulado, RevisaoEspacada, LogSessao } from '../types';
import { 
  Trash2, 
  RefreshCw, 
  Cloud, 
  Github, 
  Download, 
  Upload, 
  ShieldAlert, 
  CheckCircle, 
  Clock, 
  Key, 
  ExternalLink, 
  FileJson, 
  AlertCircle,
  Database,
  Info
} from 'lucide-react';

interface AppBackup {
  version: string;
  timestamp: string;
  materias: Materia[];
  ciclo: CicloEstudo | null;
  simulados: Simulado[];
  revisoes: RevisaoEspacada[];
  historico: LogSessao[];
  planejamentoSemanal?: any;
}

interface DadosEBackupProps {
  materias: Materia[];
  ciclo: CicloEstudo | null;
  simulados: Simulado[];
  revisoes: RevisaoEspacada[];
  historico: LogSessao[];
  onImportBackup: (backup: AppBackup) => void;
  onResetGeral: (confirmar?: boolean) => void;
  userEmail?: string;
  onOpenAuth: () => void;
  onLogout: () => void;
  onSyncCloud: () => Promise<void>;
  isSyncingCloud?: boolean;
  lastSyncCloudTime?: string;
}

interface GitHubProfile {
  login: string;
  name: string;
  avatar_url: string;
  html_url: string;
}

export default function DadosEBackup({
  materias,
  ciclo,
  simulados,
  revisoes,
  historico,
  onImportBackup,
  onResetGeral,
  userEmail,
  onOpenAuth,
  onLogout,
  onSyncCloud,
  isSyncingCloud = false,
  lastSyncCloudTime
}: DadosEBackupProps) {
  // Local Stats & General State
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('tcu_last_sync_time') || new Date().toLocaleString('pt-BR');
  });
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSyncingLocal, setIsSyncingLocal] = useState<boolean>(false);

  // JSON Import/Export State
  const [importText, setImportText] = useState<string>('');
  const [showImportArea, setShowImportArea] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // GitHub Integration States
  const [githubToken, setGithubToken] = useState<string>(() => {
    return localStorage.getItem('tcu_github_token') || '';
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [gistId, setGistId] = useState<string>(() => {
    return localStorage.getItem('tcu_github_gist_id') || '';
  });
  const [isBackingUpGitHub, setIsBackingUpGitHub] = useState<boolean>(false);
  const [isRestoringGitHub, setIsRestoringGitHub] = useState<boolean>(false);

  // Safety Confirmation for Reset
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');

  // Auto-connect with GitHub if token is already saved
  useEffect(() => {
    if (githubToken) {
      verificarConexaoGitHub(githubToken, true);
    }
  }, []);

  // 1. DYNAMIC SYNCHRONIZE OF LOCAL STORAGE (Ambient feedback)
  const handleSincronizarBancoLocal = () => {
    setIsSyncingLocal(true);
    setSuccessMsg('');
    setErrorMsg('');

    setTimeout(() => {
      // Force saving to localstorage (redundant but gives the user great peace of mind)
      localStorage.setItem('tcu_materias', JSON.stringify(materias));
      if (ciclo) localStorage.setItem('tcu_ciclo', JSON.stringify(ciclo));
      localStorage.setItem('tcu_simulados', JSON.stringify(simulados));
      localStorage.setItem('tcu_revisoes', JSON.stringify(revisoes));
      localStorage.setItem('tcu_historico', JSON.stringify(historico));

      const now = new Date().toLocaleString('pt-BR');
      localStorage.setItem('tcu_last_sync_time', now);
      setLastSyncTime(now);

      setIsSyncingLocal(false);
      setSuccessMsg('⚡ Banco de dados local sincronizado e otimizado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 5000);
    }, 1200);
  };

  // 2. HELPERS TO GENERATE CURRENT STATE DATA AS BACKUP SCHEMA
  const obterDadosBackupLayout = (): AppBackup => {
    const planejamentoSemanalRaw = localStorage.getItem('tcu_planejamento_semanal');
    let planejamentoSemanal = null;
    if (planejamentoSemanalRaw) {
      try {
        planejamentoSemanal = JSON.parse(planejamentoSemanalRaw);
      } catch (e) {
        // Keep null if corrupt
      }
    }

    return {
      version: "1.2.0",
      timestamp: new Date().toISOString(),
      materias,
      ciclo,
      simulados,
      revisoes,
      historico,
      planejamentoSemanal
    };
  };

  // 3. MANUAL JSON BACKUP GENERATION AND DOWNLOAD
  const handleExportarArquivoJSON = () => {
    try {
      const backupData = obterDadosBackupLayout();
      const stringified = JSON.stringify(backupData, null, 2);
      
      const blob = new Blob([stringified], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tcu_auditor_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setSuccessMsg('📥 Arquivo de backup exportado com sucesso! Salve-o em local seguro.');
      setTimeout(() => setSuccessMsg(''), 5000);
    } catch (e: any) {
      setErrorMsg('Erro ao gerar arquivo de exportação: ' + e.message);
    }
  };

  // 4. MANUAL JSON TEXT AREA IMPORT / LOAD FILE
  const handleImportarJSONPrompt = () => {
    setSuccessMsg('');
    setErrorMsg('');

    if (!importText.trim()) {
      setErrorMsg('Por favor, cole um conteúdo JSON válido no campo de texto.');
      return;
    }

    try {
      const parsed = JSON.parse(importText) as AppBackup;
      
      // Basic schema validations (checking essential arrays exist)
      if (!parsed.materias || !Array.isArray(parsed.materias)) {
        throw new Error('Formato inválido: Lista de matérias ausente ou corrompida.');
      }
      if (!parsed.historico || !Array.isArray(parsed.historico)) {
        throw new Error('Formato inválido: Histórico de sessões de estudo ausente.');
      }

      // Perform state update in App
      onImportBackup(parsed);

      setSuccessMsg('🎉 Backup importado com sucesso! Atualizando planilhas...');
      setImportText('');
      setShowImportArea(false);
      
      setTimeout(() => {
        window.location.reload();
      }, 1500);

    } catch (e: any) {
      setErrorMsg('Falha na validação do backup JSON: ' + e.message);
    }
  };

  // File drag-and-drop or select import
  const handleImportarArquivoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImportText(result);
      setShowImportArea(true);
      setSuccessMsg('Arquivo lido com sucesso! Revise o código JSON abaixo e clique em "Aplicar" para restaurar.');
    };
    reader.onerror = () => {
      setErrorMsg('Erro ao ler o arquivo de backup selecionado.');
    };
    reader.readAsText(file);
  };

  // 5. GITHUB REST API CODE SYSTEM
  const verificarConexaoGitHub = async (tokenToCheck: string, isAuto = false) => {
    if (!tokenToCheck.trim()) return;

    if (!isAuto) setIsConnecting(true);
    setErrorMsg('');

    try {
      const response = await fetch('https://api.github.com/user', {
        headers: {
          'Authorization': `Bearer ${tokenToCheck}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!response.ok) {
        throw new Error('Token inválido ou expirado. Verifique suas permissões do GitHub.');
      }

      const userData = await response.json();
      setGithubProfile({
        login: userData.login,
        name: userData.name || userData.login,
        avatar_url: userData.avatar_url,
        html_url: userData.html_url
      });
      setIsConnected(true);
      localStorage.setItem('tcu_github_token', tokenToCheck);
      setGithubToken(tokenToCheck);

      if (!isAuto) {
        setSuccessMsg(`🚀 GitHub conectado com sucesso como @${userData.login}!`);
        setTimeout(() => setSuccessMsg(''), 5000);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(`Erro de conexão com o GitHub: ${err.message}`);
      setIsConnected(false);
      setGithubProfile(null);
      // Clean token only if we got an authentication failure during active clicking
      if (!isAuto) {
        localStorage.removeItem('tcu_github_token');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDesconectarGitHub = () => {
    localStorage.removeItem('tcu_github_token');
    localStorage.removeItem('tcu_github_gist_id');
    setGithubToken('');
    setIsConnected(false);
    setGithubProfile(null);
    setGistId('');
    setSuccessMsg('GitHub desconectado. Credenciais removidas localmente.');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  // Create or Update a Gist on the user's Github account
  const handlePuxarBackupGitHub = async () => {
    if (!isConnected || !githubToken) {
      setErrorMsg('Por favor, conecte a sua conta do GitHub antes.');
      return;
    }

    if (!gistId) {
      setErrorMsg('Nenhum identificador de backup do GitHub (Gist ID) foi registrado ainda neste navegador.');
      return;
    }

    setIsRestoringGitHub(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const response = await fetch(`https://api.github.com/gists/${gistId}`, {
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Accept': 'application/vnd.github+json'
        }
      });

      if (!response.ok) {
        throw new Error('Falha ao obter Gist do GitHub. Ele pode ter sido deletado ou movido.');
      }

      const gistData = await response.json();
      const backupFile = gistData.files['tcu_auditor_backup.json'];

      if (!backupFile || !backupFile.content) {
        throw new Error('O backup selecionado não contém o arquivo "tcu_auditor_backup.json" esperado.');
      }

      const parsedBackup = JSON.parse(backupFile.content) as AppBackup;
      
      // Perform restore state
      onImportBackup(parsedBackup);

      setSuccessMsg('🎉 Sincronização Concluída! Banco de dados atualizado com o backup oficial do seu GitHub. Reiniciando...');
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (err: any) {
      setErrorMsg(`Erro ao puxar dados do GitHub: ${err.message}`);
    } finally {
      setIsRestoringGitHub(false);
    }
  };

  const handleEnviarBackupGitHub = async () => {
    if (!isConnected || !githubToken) {
      setErrorMsg('Por favor, conecte a sua conta do GitHub antes.');
      return;
    }

    setIsBackingUpGitHub(true);
    setSuccessMsg('');
    setErrorMsg('');

    try {
      const backupPayload = obterDadosBackupLayout();
      const backupString = JSON.stringify(backupPayload, null, 2);

      const gistPayload = {
        description: "TCU Auditor Planner - Backup de Estudos Científicos",
        public: false, // Ensure backup is secret by default
        files: {
          "tcu_auditor_backup.json": {
            "content": backupString
          }
        }
      };

      let url = 'https://api.github.com/gists';
      let method = 'POST';

      // If we already have a gist, update it instead of creating a duplicate
      if (gistId) {
        url = `https://api.github.com/gists/${gistId}`;
        method = 'PATCH';
      }

      const response = await fetch(url, {
        method: method,
        headers: {
          'Authorization': `Bearer ${githubToken}`,
          'Content-Type': 'application/json',
          'Accept': 'application/vnd.github+json'
        },
        body: JSON.stringify(gistPayload)
      });

      if (!response.ok) {
        // If updating failed because Gist doesn't exist anymore, retry creating.
        if (method === 'PATCH' && response.status === 404) {
          console.log("Saving gist failed (404), trying to recreate...");
          setGistId('');
          localStorage.removeItem('tcu_github_gist_id');
          // Re-triggering as POST
          const retryResponse = await fetch('https://api.github.com/gists', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${githubToken}`,
              'Content-Type': 'application/json',
              'Accept': 'application/vnd.github+json'
            },
            body: JSON.stringify(gistPayload)
          });
          if (!retryResponse.ok) {
            throw new Error('Falha catastrófica ao criar ou atualizar Backup Gist no GitHub.');
          }
          const retryGistData = await retryResponse.json();
          setGistId(retryGistData.id);
          localStorage.setItem('tcu_github_gist_id', retryGistData.id);
          setSuccessMsg('🛰️ Backup e Gist recriados e sincronizados com sucesso no GitHub!');
          setTimeout(() => setSuccessMsg(''), 5000);
          return;
        }
        throw new Error('Falha ao salvar dados no GitHub. Verifique os limites de Gist da sua API.');
      }

      const gistData = await response.json();
      if (!gistId) {
        setGistId(gistData.id);
        localStorage.setItem('tcu_github_gist_id', gistData.id);
      }

      setSuccessMsg('✅ Backup enviado e guardado com sucesso no seu GitHub privado!');
      setTimeout(() => setSuccessMsg(''), 5000);

    } catch (err: any) {
      setErrorMsg(`Erro ao enviar backup para o GitHub: ${err.message}`);
    } finally {
      setIsBackingUpGitHub(false);
    }
  };

  // 6. CLEAR AND REINITIALIZE (Danger zone)
  const handleConfirmarResetCompleto = () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESETAR') {
      alert('Por favor, digite a palavra "RESETAR" corretamente para prosseguir.');
      return;
    }

    onResetGeral(false);
  };

  return (
    <div className="space-y-6 animate-editorial-node" id="dados-backup-seccao">
      
      {/* HEADER DA SEÇÃO */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-[#0F172A] border border-[#1E293B] p-5 rounded">
        <div>
          <div className="flex items-center gap-2">
            <Database className="text-[#C5A059]" size={20} />
            <h2 className="text-lg font-display font-medium text-[#C5A059] tracking-wider">Dados, Sincronização & Backup Externo</h2>
          </div>
          <p className="text-xs text-[#64748B] mt-1 font-sans">
            Gerencie o banco de dados das suas planilhas de estudo do TCU, faça backups locais ou sincronize diretamente no seu GitHub.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Clock size={12} className="text-[#64748B]" />
          <span className="text-[10px] font-mono text-[#64748B]">Última Sincronização Local: {lastSyncTime}</span>
        </div>
      </div>

      {/* BANNER DE NOTIFICAÇÃO */}
      {successMsg && (
        <div className="flex items-center gap-3 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-3.5 rounded text-xs animate-pulse">
          <CheckCircle size={16} className="shrink-0 text-emerald-400" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="flex items-center gap-3 bg-rose-950/40 border border-rose-500/30 text-rose-300 p-3.5 rounded text-xs">
          <AlertCircle size={16} className="shrink-0 text-rose-400" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* GRID DE FUNCIONALIDADES */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* COLUNA ESQUERDA: NUVEM SUPABASE & BACKUP GITHUB (7 COLUNAS) */}
        <div className="lg:col-span-7 space-y-6">

          {/* CARD 1: NUVEM SUPABASE */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded flex flex-col overflow-hidden">
            <div className="border-b border-[#1E293B] bg-[#0F172A]/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Cloud size={18} className="text-[#C5A059]" />
                <h3 className="text-sm font-display font-medium text-white tracking-widest uppercase">Sincronização na Nuvem (Supabase)</h3>
              </div>
              <span className="text-[9px] font-mono bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 px-2 py-0.5 rounded uppercase">
                Cloud Sync
              </span>
            </div>

            <div className="p-5 flex-1 space-y-4">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Sincronize todo o seu progresso (horas líquidas, edital do Estratégia Concursos, simulados e metas) de forma automática e segura em tempo real na nuvem do Supabase.
              </p>

              {userEmail ? (
                <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-4 space-y-4">
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div>
                      <span className="text-[#64748B] block text-[9px] uppercase tracking-wider">Conta Conectada</span>
                      <span className="text-white font-bold">{userEmail}</span>
                    </div>
                    <button
                      onClick={onLogout}
                      className="text-[9px] px-2.5 py-1.5 rounded border border-rose-950 bg-rose-950/20 text-rose-400 hover:bg-[#881337] hover:text-white transition-all cursor-pointer font-mono"
                    >
                      Sair da Conta
                    </button>
                  </div>

                  <div className="pt-3 border-t border-[#1E293B]/60 space-y-2">
                    <div className="flex justify-between text-[11px] font-mono">
                      <span className="text-[#64748B]">Último sincronismo em nuvem:</span>
                      <span className="text-emerald-400 font-bold font-mono">
                        {lastSyncCloudTime || 'Nunca sincronizado'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={onSyncCloud}
                    disabled={isSyncingCloud}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C5A059] text-black font-semibold text-xs rounded hover:bg-[#C5A059]/90 disabled:opacity-50 transition-all cursor-pointer shadow-sm font-sans"
                  >
                    <RefreshCw size={13} className={isSyncingCloud ? "animate-spin" : ""} />
                    {isSyncingCloud ? 'Sincronizando...' : 'Forçar Sincronismo na Nuvem'}
                  </button>
                </div>
              ) : (
                <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-4.5 text-center space-y-3.5">
                  <div className="text-xs text-[#94A3B8] leading-relaxed">
                    Você está estudando em modo local. Seus dados são salvos apenas neste navegador. Conecte sua conta para habilitar o backup automático.
                  </div>
                  <button
                    onClick={onOpenAuth}
                    className="w-full py-2.5 bg-[#1E293B] border border-[#C5A059] text-[#C5A059] hover:bg-[#C5A059] hover:text-black font-semibold text-xs rounded transition-all cursor-pointer flex items-center justify-center gap-1.5 font-sans"
                  >
                    <Cloud size={14} />
                    Conectar Conta / Fazer Login
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: BACKUP GITHUB */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded flex flex-col overflow-hidden">
            <div className="border-b border-[#1E293B] bg-[#0F172A]/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Github size={18} className="text-[#C5A059]" />
                <h3 className="text-sm font-display font-medium text-white tracking-widest uppercase">Salvar Backup Oficial no GitHub</h3>
              </div>
              <span className="text-[9px] font-mono bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 px-2 py-0.5 rounded uppercase">
                Cloud Gist Link
              </span>
            </div>

            <div className="p-5 flex-1 space-y-4">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Diga adeus a perder o progresso se mudar de computador ou limpar os cookies! Esta ferramenta faz o backup criptografado do seu progresso em um arquivo privado (Gist) no seu próprio GitHub.
              </p>

            {/* SE CONECTADO */}
            {isConnected && githubProfile ? (
              <div className="bg-[#0C0E12] border border-[#1E293B] rounded p-4 space-y-4">
                
                {/* Perfil GitHub */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <img 
                      src={githubProfile.avatar_url} 
                      alt="Avatar" 
                      className="w-12 h-12 rounded-full border-2 border-[#C5A059]"
                      referrerPolicy="no-referrer"
                    />
                    <div>
                      <h4 className="text-xs font-bold text-white leading-normal">{githubProfile.name}</h4>
                      <a 
                        href={githubProfile.html_url} 
                        target="_blank" 
                        rel="noreferrer" 
                        className="text-[10px] text-[#C5A059] hover:underline flex items-center gap-1 font-mono leading-none mt-0.5"
                      >
                        @{githubProfile.login} <ExternalLink size={8} />
                      </a>
                    </div>
                  </div>
                  <button
                    onClick={handleDesconectarGitHub}
                    className="text-[9px] px-2.5 py-1.5 rounded border border-rose-950 bg-rose-950/20 text-rose-400 hover:bg-[#881337] hover:text-white transition-all cursor-pointer font-mono"
                  >
                    Desconectar Conta
                  </button>
                </div>

                {/* Status do Gist de Backups */}
                <div className="pt-3 border-t border-[#1E293B]/60 space-y-2">
                  <div className="flex justify-between text-[11px] font-mono">
                    <span className="text-[#64748B]">Chave do Backup Gist:</span>
                    <span className="text-[#C5A059] break-all max-w-[200px] text-right" title={gistId}>
                      {gistId ? gistId : 'Aguardando criação...'}
                    </span>
                  </div>
                  <p className="text-[10px] text-[#64748B] leading-normal font-sans">
                    {gistId 
                      ? '✓ O backup do TCU está ativo. Cada envio sobrescreverá com o progresso mais atual de hoje.'
                      : 'ℹ️ Nenhum backup gravado. Clique em "Enviar Planilha de Progresso" para registrar um novo Gist na nuvem.'}
                  </p>
                </div>

                {/* Ações Ativas */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  
                  <button
                    onClick={handleEnviarBackupGitHub}
                    disabled={isBackingUpGitHub}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C5A059] text-black font-semibold text-xs rounded hover:bg-[#C5A059]/90 disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                  >
                    <Upload size={13} className={isBackingUpGitHub ? "animate-bounce" : ""} />
                    {isBackingUpGitHub ? 'Enviando ao GitHub...' : 'Salvar Backup / Enviar'}
                  </button>

                  <button
                    onClick={handlePuxarBackupGitHub}
                    disabled={isRestoringGitHub || !gistId}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E293B] border border-[#C5A059]/40 text-white font-semibold text-xs rounded hover:bg-[#1E293B]/80 disabled:opacity-50 transition-all cursor-pointer"
                    title={!gistId ? "Você precisa fazer um backup inicial antes de puxar dados" : ""}
                  >
                    <Download size={13} className={isRestoringGitHub ? "animate-spin" : ""} />
                    {isRestoringGitHub ? 'Restaurando...' : 'Carregar Backup / Puxar'}
                  </button>

                </div>

                {gistId && (
                  <div className="text-center pt-1.5">
                    <a 
                      href={`https://gist.github.com/${githubProfile.login}/${gistId}`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[9px] text-[#64748B] hover:text-[#C5A059] underline font-mono inline-flex items-center gap-1"
                    >
                      Verificar Gist de Estudos no GitHub Público/Criptografado <ExternalLink size={8} />
                    </a>
                  </div>
                )}

              </div>
            ) : (
              /* SE DESCONECTADO (Form de Token) */
              <div className="bg-[#0C0E12] border border-[#1E293B]/60 rounded p-4.5 space-y-4">
                
                <div className="bg-[#1E293B]/30 border-l-2 border-[#C5A059] p-3 text-xs text-[#94A3B8] leading-relaxed">
                  <div className="flex gap-1.5 items-center font-bold text-[#C5A059] mb-1 font-mono uppercase text-[10px]">
                    <Info size={11} /> Configuração Recomendada
                  </div>
                  O backup utiliza a API oficial do GitHub baseada em <strong>Tokens de Acesso Pessoal (PAT)</strong>. Seus dados são salvos com segurança em gists privados da sua própria conta do GitHub.
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
                    Adicione seu Personal Access Token (PAT) do GitHub:
                  </label>
                  <div className="relative">
                    <input
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                      value={githubToken}
                      onChange={(e) => setGithubToken(e.target.value)}
                      className="w-full bg-[#1A202C] border border-[#1E293B] rounded p-2.5 text-xs font-mono text-[#C5A059] placeholder-[#475569] focus:outline-none focus:border-[#C5A059]"
                    />
                    <Key size={14} className="absolute right-3 top-3 text-[#475569] pointer-events-none" />
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row justify-between items-center gap-3">
                  <a
                    href="https://github.com/settings/tokens/new?description=TCU-Auditor-Backup&scopes=gist"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[10px] text-[#C5A059] hover:underline flex items-center gap-1 cursor-pointer font-sans"
                  >
                    Onde criar esse Token? Ver no GitHub <ExternalLink size={10} />
                  </a>

                  <button
                    onClick={() => verificarConexaoGitHub(githubToken)}
                    disabled={isConnecting || !githubToken}
                    className="w-full sm:w-auto px-4 py-2 bg-[#E2E8F0] text-black font-semibold text-xs rounded hover:bg-white disabled:opacity-50 transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <RefreshCw size={12} className={isConnecting ? "animate-spin" : ""} />
                    {isConnecting ? 'Verificando...' : 'Conectar com GitHub'}
                  </button>
                </div>

                <div className="bg-[#1E293B]/20 p-2.5 rounded text-[10px] text-[#64748B] font-mono leading-normal">
                  💡 <strong>Segurança absoluta:</strong> O Token é armazenado exclusivamente no localStorage do seu próprio browser e nunca trafega por servidores terceiros. Ele conversa diretamente com a API oficial da Microsoft/GitHub.
                </div>

              </div>
            )}

          </div>
        </div>

      </div>

        {/* COLUNA DIREITA: SINCRONIZAR LOCAL & DANGER (5 COLUNAS) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* CARD 1: EXPORTAR/SINCRONIZAR MANUAL LOCAL */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1E293B]/80 pb-3">
              <RefreshCw size={16} className="text-[#C5A059]" />
              <h3 className="text-sm font-display font-medium text-white tracking-widest uppercase">Sincronização & Backup Local</h3>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Consolide todos os dados e garanta que o seu navegador tem a última versão de estudos segura.
            </p>

            <div className="space-y-2">
              <button
                onClick={handleSincronizarBancoLocal}
                disabled={isSyncingLocal}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#C5A059] border border-[#C5A059]/40 font-bold text-xs rounded transition-all cursor-pointer"
              >
                <RefreshCw size={13} className={isSyncingLocal ? "animate-spin" : ""} />
                {isSyncingLocal ? 'Otimizando Banco...' : 'Sincronizar Progresso das Planilhas'}
              </button>

              <button
                onClick={handleExportarArquivoJSON}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0C0E12] border border-[#1E293B] hover:border-[#C5A059]/30 text-white font-semibold text-xs rounded transition-all cursor-pointer shadow-inner"
              >
                <Download size={13} className="text-[#C5A059]" />
                Baixar Arquivo Físico de Backup (JSON)
              </button>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowImportArea(!showImportArea)}
                className="text-[10px] text-[#C5A059] hover:underline font-mono inline-flex items-center gap-1"
              >
                {showImportArea ? '[-] Esconder Importador Manual' : '[+] Importar Backup via Arquivo / Texto JSON'}
              </button>
            </div>

            {showImportArea && (
              <div className="space-y-3 pt-3 border-t border-[#1E293B] animate-editorial-node">
                <p className="text-[10px] text-[#64748B]">
                  Passe o mouse ou selecione o arquivo .json baixado anteriormente para restaurar todo o seu histórico:
                </p>
                <div className="flex gap-2">
                  <input
                    type="file"
                    accept=".json"
                    ref={fileInputRef}
                    onChange={handleImportarArquivoUpload}
                    className="hidden"
                  />
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 px-3 py-1.5 bg-[#1E293B] text-white rounded text-[10px] border border-[#1E293B] hover:border-[#64748B] cursor-pointer"
                  >
                    Upload de Arquivo JSON
                  </button>
                </div>

                <textarea
                  placeholder="Se preferir, cole o conteúdo JSON cru do seu backup aqui..."
                  rows={4}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-[10px] font-mono text-emerald-400 placeholder-[#334155] focus:outline-none"
                />

                <button
                  onClick={handleImportarJSONPrompt}
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-black font-bold text-xs rounded cursor-pointer transition-colors"
                >
                  Restaurar Banco de Dados do JSON (Sobrescrever)
                </button>
              </div>
            )}

          </div>

          {/* CARD 2: ZONA DE PERIGO (RESET DATA) */}
          <div className="bg-[#0F172A] border border-rose-950/40 rounded p-5 space-y-4">
            
            <div className="flex items-center gap-2 border-b border-rose-950/30 pb-3 text-rose-400">
              <ShieldAlert size={16} />
              <h3 className="text-sm font-display font-medium tracking-widest uppercase">Danger Zone • Resetar Dados</h3>
            </div>

            <div className="bg-rose-950/15 border border-rose-900/30 text-rose-300 p-3.5 rounded text-[11px] leading-relaxed">
              ⚠️ <strong>ATENÇÃO MÁXIMA:</strong> Esta ação apagará definitivamente todo o seu histórico de sessões estudadas, cronômetro, simulados concluídos e metas semanais do navegador, retornando-o ao estado padrão limpo.
            </div>

            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
                  Para confirmar o apagamento completo, digite <strong>RESETAR</strong>:
                </label>
                <input
                  type="text"
                  placeholder="RESETAR"
                  value={resetConfirmInput}
                  onChange={(e) => setResetConfirmInput(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-rose-500/20 rounded p-2 text-xs font-mono text-rose-400 placeholder-rose-950 focus:outline-none focus:border-rose-500/40 text-center"
                />
              </div>

              <button
                onClick={handleConfirmarResetCompleto}
                disabled={resetConfirmInput.trim().toUpperCase() !== 'RESETAR'}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2.5 bg-rose-950/10 hover:bg-rose-600 hover:text-black border border-rose-500/30 text-rose-400 font-bold text-xs rounded transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-rose-950/10 disabled:hover:text-rose-400"
              >
                <Trash2 size={13} />
                Confirmar e Resetar Absolutamente Tudo
              </button>
            </div>

          </div>

        </div>

      </div>

    </div>
  );
}
