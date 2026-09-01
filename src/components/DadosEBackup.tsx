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
  Info,
  Sparkles,
  Sliders,
  Check
} from 'lucide-react';
import { gerarDadosSimuladosExtrema } from '../utils/seeder';


interface AppBackup {
  version: string;
  timestamp: string;
  materias: Materia[];
  ciclo: CicloEstudo | null;
  simulados: Simulado[];
  revisoes: RevisaoEspacada[];
  historico: LogSessao[];
  planejamentoSemanal?: any;
  configuracoes?: any;
}

interface DadosEBackupProps {
  materias: Materia[];
  ciclo: CicloEstudo | null;
  simulados: Simulado[];
  revisoes: RevisaoEspacada[];
  historico: LogSessao[];
  onImportBackup: (backup: AppBackup) => void;
  onResetGeral: (confirmar?: boolean) => void;
  onResetDadosEstudo: () => Promise<void>;
  onResetConfiguracoes: () => void;
  onSalvarMaterias: (materias: Materia[]) => void;
  userEmail?: string;
  onOpenAuth: () => void;
  onLogout: () => void;
  onSyncCloud: () => Promise<void>;
  isSyncingCloud?: boolean;
  lastSyncCloudTime?: string;
  isLoggedIn?: boolean;
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
  onResetDadosEstudo,
  onResetConfiguracoes,
  onSalvarMaterias,
  userEmail,
  onOpenAuth,
  onLogout,
  onSyncCloud,
  isSyncingCloud = false,
  lastSyncCloudTime,
  isLoggedIn = false
}: DadosEBackupProps) {
  // Local Stats & General State
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => {
    return localStorage.getItem('superestrategico_last_sync_time') || new Date().toLocaleString('pt-BR');
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
    return localStorage.getItem('superestrategico_github_token') || '';
  });
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isConnecting, setIsConnecting] = useState<boolean>(false);
  const [githubProfile, setGithubProfile] = useState<GitHubProfile | null>(null);
  const [gistId, setGistId] = useState<string>(() => {
    return localStorage.getItem('superestrategico_github_gist_id') || '';
  });
  const [isBackingUpGitHub, setIsBackingUpGitHub] = useState<boolean>(false);
  const [isRestoringGitHub, setIsRestoringGitHub] = useState<boolean>(false);

  // Safety Confirmation for Reset
  const [resetConfirmInput, setResetConfirmInput] = useState<string>('');
  const [resetEstudoInput, setResetEstudoInput] = useState<string>('');
  const [resetConfigInput, setResetConfigInput] = useState<string>('');
  const [isResettingEstudo, setIsResettingEstudo] = useState(false);
  const [configResetSuccess, setConfigResetSuccess] = useState(false);

  // Gemini API Key Personal States
  const [geminiApiKey, setGeminiApiKey] = useState<string>(() => {
    return localStorage.getItem('superestrategico_user_gemini_api_key') || '';
  });
  const [testStatus, setTestStatus] = useState<'idle' | 'testing' | 'success' | 'error'>('idle');
  const [testMessage, setTestMessage] = useState<string>('');

  const handleSalvarGeminiKey = () => {
    localStorage.setItem('superestrategico_user_gemini_api_key', geminiApiKey.trim());
    window.dispatchEvent(new Event('superestrategico_config_updated'));
    setSuccessMsg('🗝️ Chave de API do Gemini salva com sucesso localmente!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleRemoverGeminiKey = () => {
    localStorage.removeItem('superestrategico_user_gemini_api_key');
    window.dispatchEvent(new Event('superestrategico_config_updated'));
    setGeminiApiKey('');
    setTestStatus('idle');
    setTestMessage('');
    setSuccessMsg('🗑️ Chave de API do Gemini removida com sucesso!');
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const handleTestarGeminiConexao = async () => {
    if (!geminiApiKey.trim()) {
      setTestStatus('error');
      setTestMessage('Por favor, insira uma chave de API para testar.');
      return;
    }
    setTestStatus('testing');
    setTestMessage('Iniciando comunicação com o Google AI Studio...');
    
    try {
      const modelsToTry = ['gemini-3.5-flash', 'gemini-2.5-flash', 'gemini-1.5-flash', 'gemini-3.1-flash-lite'];
      let response: Response | null = null;
      let data: any = {};
      let lastError = '';
      let usedModel = '';

      for (const currentModel of modelsToTry) {
        try {
          usedModel = currentModel;
          setTestMessage(`Testando conexão via ${currentModel}...`);
          
          response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${currentModel}:generateContent?key=${geminiApiKey.trim()}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              contents: [{ parts: [{ text: 'Diga "Ok" se estiver funcionando.' }] }]
            })
          });
          
          data = await response.json().catch(() => ({}));
          
          if (response.ok) {
            lastError = '';
            break;
          } else {
            lastError = data.error?.message || `Erro HTTP ${response.status}`;
            console.warn(`Falha no teste com o modelo ${currentModel}: ${lastError}`);
            
            if (response.status === 400 || response.status === 403 || lastError.toLowerCase().includes('key') || lastError.toLowerCase().includes('invalid')) {
              break;
            }
          }
        } catch (fetchErr: any) {
          lastError = fetchErr.message || 'Erro de rede';
          console.warn(`Erro de rede no teste com o modelo ${currentModel}: ${lastError}`);
        }
      }

      if (response && response.ok && data.candidates?.[0]?.content?.parts?.[0]?.text) {
        setTestStatus('success');
        setTestMessage(`Conexão ativa! O Gemini (${usedModel}) respondeu com sucesso.`);
      } else {
        const errorMsg = lastError || 'Erro desconhecido retornado pela API do Gemini.';
        const isQuota = (response && response.status === 429) || errorMsg.toLowerCase().includes('quota') || errorMsg.toLowerCase().includes('limit');
        const isHighDemand = (response && response.status === 503) || errorMsg.toLowerCase().includes('demand') || errorMsg.toLowerCase().includes('overload') || errorMsg.toLowerCase().includes('busy');
        
        setTestStatus('error');
        if (isQuota) {
          setTestMessage(`Falha: Limite de cota excedido no Google AI Studio (Erro 429). Se estiver usando a chave gratuita, aguarde 1 minuto ou ative o faturamento (Pay-as-you-go).`);
        } else if (isHighDemand) {
          setTestMessage(`Falha: Servidores do Gemini sob alta demanda (Erro 503). Tente novamente em alguns instantes.`);
        } else {
          setTestMessage(`Falha: ${errorMsg}`);
        }
      }
    } catch (e: any) {
      setTestStatus('error');
      setTestMessage(`Erro de rede: ${e.message || e}`);
    }
  };

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
      localStorage.setItem('superestrategico_materias', JSON.stringify(materias));
      if (ciclo) localStorage.setItem('superestrategico_ciclo', JSON.stringify(ciclo));
      localStorage.setItem('superestrategico_simulados', JSON.stringify(simulados));
      localStorage.setItem('superestrategico_revisoes', JSON.stringify(revisoes));
      localStorage.setItem('superestrategico_historico', JSON.stringify(historico));

      const now = new Date().toLocaleString('pt-BR');
      localStorage.setItem('superestrategico_last_sync_time', now);
      setLastSyncTime(now);

      setIsSyncingLocal(false);
      setSuccessMsg('⚡ Banco de dados local sincronizado e otimizado com sucesso!');
      setTimeout(() => setSuccessMsg(''), 5000);
    }, 1200);
  };

  // 2. HELPERS TO GENERATE CURRENT STATE DATA AS BACKUP SCHEMA
  const obterDadosBackupLayout = (): AppBackup => {
    const planejamentoSemanalRaw = localStorage.getItem('superestrategico_planejamento_semanal');
    let planejamentoSemanal = null;
    if (planejamentoSemanalRaw) {
      try {
        planejamentoSemanal = JSON.parse(planejamentoSemanalRaw);
      } catch (e) {
        // Keep null if corrupt
      }
    }

    const getLocalStorageItemJson = (key: string) => {
      const item = localStorage.getItem(key);
      if (!item) return null;
      try {
        return JSON.parse(item);
      } catch {
        return item;
      }
    };

    const configuracoes = {
      timer_segundos: parseInt(localStorage.getItem('superestrategico_timer_segundos') || '0', 10),
      timer_modo_regressivo: localStorage.getItem('superestrategico_timer_modo_regressivo') === 'true',
      timer_hora_inicio: localStorage.getItem('superestrategico_timer_hora_inicio'),
      timer_hora_fim: localStorage.getItem('superestrategico_timer_hora_fim'),
      timer_correct_list: getLocalStorageItemJson('superestrategico_timer_correct_list') || [],
      timer_wrong_list: getLocalStorageItemJson('superestrategico_timer_wrong_list') || [],
      timer_limite_questoes: parseInt(localStorage.getItem('superestrategico_timer_limite_questoes') || '50', 10),
      timer_modal_open: localStorage.getItem('superestrategico_timer_modal_open') === 'true',
      ia_diagnostico_recente: localStorage.getItem('superestrategico_ia_diagnostico_recente'),
      github_token: localStorage.getItem('superestrategico_github_token') || '',
      github_gist_id: localStorage.getItem('superestrategico_github_gist_id') || ''
    };

    return {
      version: "1.2.0",
      timestamp: new Date().toISOString(),
      materias,
      ciclo,
      simulados,
      revisoes,
      historico,
      planejamentoSemanal,
      configuracoes
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
      a.download = `superestrategico_auditor_backup_${new Date().toISOString().split('T')[0]}.json`;
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
      localStorage.setItem('superestrategico_github_token', tokenToCheck);
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
        localStorage.removeItem('superestrategico_github_token');
      }
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDesconectarGitHub = () => {
    localStorage.removeItem('superestrategico_github_token');
    localStorage.removeItem('superestrategico_github_gist_id');
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
      const backupFile = gistData.files['superestrategico_auditor_backup.json'];

      if (!backupFile || !backupFile.content) {
        throw new Error('O backup selecionado não contém o arquivo "superestrategico_auditor_backup.json" esperado.');
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
          "superestrategico_auditor_backup.json": {
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
          localStorage.removeItem('superestrategico_github_gist_id');
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
          localStorage.setItem('superestrategico_github_gist_id', retryGistData.id);
          setSuccessMsg('🛰️ Backup e Gist recriados e sincronizados com sucesso no GitHub!');
          setTimeout(() => setSuccessMsg(''), 5000);
          return;
        }
        throw new Error('Falha ao salvar dados no GitHub. Verifique os limites de Gist da sua API.');
      }

      const gistData = await response.json();
      if (!gistId) {
        setGistId(gistData.id);
        localStorage.setItem('superestrategico_github_gist_id', gistData.id);
      }

      setSuccessMsg('✅ Backup enviado e guardado com sucesso no seu GitHub privado!');
      setTimeout(() => setSuccessMsg(''), 5000);

    } catch (err: any) {
      setErrorMsg(`Erro ao enviar backup para o GitHub: ${err.message}`);
    } finally {
      setIsBackingUpGitHub(false);
    }
  };

  // 6. RESET HANDLERS
  const handleConfirmarResetCompleto = () => {
    if (resetConfirmInput.trim().toUpperCase() !== 'RESETAR') {
      alert('Por favor, digite a palavra "RESETAR" corretamente para prosseguir.');
      return;
    }
    onResetGeral(false);
  };

  const handleConfirmarResetEstudo = async () => {
    if (resetEstudoInput.trim().toUpperCase() !== 'ESTUDOS') return;
    setIsResettingEstudo(true);
    await onResetDadosEstudo();
    setIsResettingEstudo(false);
  };

  const handleConfirmarResetConfig = () => {
    if (resetConfigInput.trim().toUpperCase() !== 'CONFIG') return;
    onResetConfiguracoes();
    setResetConfigInput('');
    setConfigResetSuccess(true);
    setTimeout(() => setConfigResetSuccess(false), 4000);
  };

  const handleCarregarSimulacaoIA = () => {
    if (confirm("⚠️ ATENÇÃO: Esta ação irá sobrescrever o seu progresso local para carregar os dados de simulação de 120h/semana por 3 meses. Deseja prosseguir?")) {
      try {
        const dadosSimulados = gerarDadosSimuladosExtrema();
        
        onImportBackup({
          version: "1.2.0",
          timestamp: new Date().toISOString(),
          materias: dadosSimulados.materias,
          ciclo: dadosSimulados.ciclo,
          simulados: dadosSimulados.simulados,
          revisoes: dadosSimulados.revisoes,
          historico: dadosSimulados.historico
        });

        setSuccessMsg('⚡ Dados de simulação extrema carregados com sucesso! Atualizando painel...');
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } catch (err: any) {
        setErrorMsg('Erro ao gerar dados de simulação: ' + err.message);
      }
    }
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

                  {/* Checklist de sincronização */}
                  <div className="pt-3.5 border-t border-[#1E293B]/60 space-y-2">
                    <span className="text-[10px] font-mono text-[#64748B] uppercase tracking-wider block">Itens Sincronizados</span>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-[11px] font-mono">
                      {[
                        { label: 'Configurações', key: 'configuracoes' },
                        { label: 'Progresso do Edital', key: 'materias' },
                        { label: 'Ciclo de Estudos', key: 'ciclo' },
                        { label: 'Planejamento Semanal', key: 'planejamento' },
                        { label: 'Simulados', key: 'simulados' },
                        { label: 'Revisões Espaçadas', key: 'revisoes' },
                        { label: 'Histórico de Foco', key: 'historico' }
                      ].map((item, idx) => {
                        const isSynced = Boolean(lastSyncCloudTime);
                        return (
                          <div key={idx} className="flex items-center gap-2 text-[#94A3B8]">
                            {isSyncingCloud ? (
                              <RefreshCw size={11} className="text-[#C5A059] animate-spin shrink-0" />
                            ) : isSynced ? (
                              <Check size={11} className="text-emerald-400 shrink-0" />
                            ) : (
                              <div className="w-1.5 h-1.5 rounded-full bg-[#1E293B] shrink-0" />
                            )}
                            <span className={isSyncingCloud ? "animate-pulse" : isSynced ? "text-[#E2E8F0]" : ""}>
                              {item.label}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
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

          {/* CARD 3: CONFIGURAÇÃO DE METAS DE ACERTOS POR MATÉRIA */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded flex flex-col overflow-hidden">
            <div className="border-b border-[#1E293B] bg-[#0F172A]/80 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sliders size={18} className="text-[#C5A059]" />
                <h3 className="text-sm font-display font-medium text-white tracking-widest uppercase">Metas de Acertos por Disciplina</h3>
              </div>
              <span className="text-[9px] font-mono bg-[#C5A059]/10 text-[#C5A059] border border-[#C5A059]/20 px-2 py-0.5 rounded uppercase">
                Metas Individuais
              </span>
            </div>

            <div className="p-5 flex-1 space-y-4">
              <p className="text-xs text-[#94A3B8] leading-relaxed">
                Configure metas de assertividade específicas para cada disciplina. O IA Tutor Coach e os alertas do dashboard utilizarão essas metas para analisar seu rendimento crítico.
              </p>

              {/* Ações Rápidas */}
              <div className="grid grid-cols-2 gap-3 pb-2">
                <button
                  onClick={() => {
                    const novasMaterias = materias.map(m => ({ ...m, metaAcertos: 90 }));
                    onSalvarMaterias(novasMaterias);
                  }}
                  className="px-3 py-2 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#C5A059] border border-[#C5A059]/30 rounded text-center text-xs font-bold transition-all cursor-pointer"
                >
                  Definir Todas para 90%
                </button>
                <button
                  onClick={() => {
                    const novasMaterias = materias.map(m => ({
                      ...m,
                      metaAcertos: ['CEX', 'AFO', 'AUD'].includes(m.sigla) ? 95 : 90
                    }));
                    onSalvarMaterias(novasMaterias);
                  }}
                  className="px-3 py-2 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#C5A059] border border-[#C5A059]/30 rounded text-center text-xs font-bold transition-all cursor-pointer"
                >
                  Restaurar Padrão
                </button>
              </div>

              {/* Lista de Matérias com Slider */}
              <div className="space-y-3.5 max-h-[360px] overflow-y-auto pr-1.5 no-scrollbar">
                {materias.map(m => {
                  const currentMeta = m.metaAcertos !== undefined ? m.metaAcertos : (['CEX', 'AFO', 'AUD'].includes(m.sigla) ? 95 : 90);
                  
                  return (
                    <div key={m.id} className="bg-[#0C0E12] border border-[#1E293B]/60 rounded p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-[160px]">
                        <span className="px-1.5 py-0.5 text-[9px] font-mono font-black rounded text-white shrink-0" style={{ backgroundColor: m.cor }}>
                          {m.sigla}
                        </span>
                        <span className="text-xs font-semibold text-[#E2E8F0] truncate">{m.nome}</span>
                      </div>

                      <div className="flex items-center gap-3 flex-1 justify-end">
                        <input
                          type="range"
                          min="50"
                          max="100"
                          value={currentMeta}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            const novasMaterias = materias.map(x => x.id === m.id ? { ...x, metaAcertos: val } : x);
                            onSalvarMaterias(novasMaterias);
                          }}
                          className="w-full max-w-[180px] accent-[#C5A059] h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="w-10 text-right font-mono font-bold text-[#C5A059] text-xs">
                          {currentMeta}%
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
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

          {/* CARD NOVO: CHAVE DE API GEMINI PESSOAL */}
          <div className="bg-[#0F172A] border border-[#1E293B] rounded p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1E293B]/80 pb-3">
              <Key size={16} className="text-[#C5A059]" />
              <h3 className="text-sm font-display font-medium text-white tracking-widest uppercase">Chave API do Gemini Pessoal</h3>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed">
              Use sua própria chave do Gemini para realizar diagnósticos de estudos diretamente do seu navegador.
              <strong className="text-emerald-400"> 100% Seguro: </strong> sua chave é salva apenas neste computador e nunca é transmitida para nossos servidores ou banco de dados.
            </p>

            <div className="bg-[#1E293B]/30 border border-[#C5A059]/10 p-3 rounded text-[11px] text-[#94A3B8] space-y-1">
              <p>1. Acesse o <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer" className="text-[#C5A059] hover:underline inline-flex items-center gap-0.5">Google AI Studio <ExternalLink size={10} /></a></p>
              <p>2. Crie uma chave de API gratuita.</p>
              <p>3. Cole-a abaixo para habilitar o Tutor Coach sem limites da plataforma.</p>
            </div>

            <div className="space-y-2">
              <div className="relative">
                <input
                  type="password"
                  placeholder="Cole sua API Key (AIzaSy...)"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#2D3748] rounded p-2.5 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={handleSalvarGeminiKey}
                  className="flex-1 px-3 py-2 bg-[#1E293B] hover:bg-[#1E293B]/80 text-[#C5A059] border border-[#C5A059]/40 font-bold text-xs rounded transition-all cursor-pointer"
                >
                  Salvar Chave
                </button>
                {localStorage.getItem('superestrategico_user_gemini_api_key') && (
                  <button
                    onClick={handleRemoverGeminiKey}
                    className="px-3 py-2 bg-rose-955/20 border border-rose-500/30 text-rose-400 hover:bg-rose-700 hover:text-white font-bold text-xs rounded transition-all cursor-pointer"
                  >
                    Excluir
                  </button>
                )}
              </div>

              <button
                onClick={handleTestarGeminiConexao}
                disabled={testStatus === 'testing'}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-[#0C0E12] border border-[#1E293B] hover:border-[#C5A059]/30 text-white font-semibold text-xs rounded transition-all cursor-pointer"
              >
                {testStatus === 'testing' ? 'Testando Conexão...' : 'Testar Conexão com Gemini'}
              </button>

              {testStatus !== 'idle' && (
                <div className={`p-2.5 rounded text-[10px] font-mono leading-relaxed border ${
                  testStatus === 'success' 
                    ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-400' 
                    : testStatus === 'error' 
                    ? 'bg-rose-950/20 border-rose-500/30 text-rose-400' 
                    : 'bg-blue-950/20 border-blue-500/30 text-blue-400'
                }`}>
                  {testMessage}
                </div>
              )}
            </div>
          </div>

          {/* CARD 2: SIMULAÇÃO PARA TESTE (IA COACH) */}
          <div className="bg-[#0F172A] border border-[#C5A059]/20 rounded p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-[#1E293B]/80 pb-3">
              <Sparkles size={16} className="text-[#C5A059]" />
              <h3 className="text-sm font-display font-medium text-white tracking-widest uppercase">Simulação para IA Coach</h3>
            </div>

            <p className="text-xs text-[#94A3B8] leading-relaxed font-sans">
              Deseja testar as respostas e relatórios do <strong>IA Tutor Coach</strong> sem precisar preencher dados reais? Carregue um histórico simulado de alta performance.
            </p>

            <div className="bg-[#C5A059]/5 border border-[#C5A059]/20 text-xs text-[#94A3B8] p-3.5 rounded space-y-1.5 font-sans">
              <p className="font-bold text-[#C5A059] flex items-center gap-1.5">⚡ O que será gerado:</p>
              <ul className="list-disc pl-4 space-y-1 text-[11px] text-[#A0AEC0]">
                <li>Histórico denso de <strong>3 meses (90 dias)</strong> de estudo.</li>
                <li><strong>Carga Horária Extrema: 120h/semana</strong> de estudo líquido.</li>
                <li>Métricas de acertos realistas: de <strong>78% a 93%</strong>.</li>
                <li>Simulados FGV periódicos com evolução de notas.</li>
                <li>Revisões espaçadas ativas concluídas e pendentes.</li>
              </ul>
            </div>

            <button
              onClick={handleCarregarSimulacaoIA}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#C5A059] text-black hover:bg-[#C5A059]/90 font-bold text-xs rounded transition-all cursor-pointer shadow-sm font-sans"
            >
              <Sparkles size={13} />
              Carregar Dados de Simulação (120h/semana)
            </button>
          </div>

          {/* CARD 3: ZONA DE PERIGO (RESET DATA) */}
          <div className="bg-[#0F172A] border border-rose-950/40 rounded p-5 space-y-5">
            
            <div className="flex items-center gap-2 border-b border-rose-950/30 pb-3 text-rose-400">
              <ShieldAlert size={16} />
              <h3 className="text-sm font-display font-medium tracking-widest uppercase">Danger Zone • Resets</h3>
            </div>

            {/* RESET 1: DADOS DE ESTUDO */}
            <div className="bg-rose-950/10 border border-rose-900/25 rounded p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Trash2 size={14} className="text-rose-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-300 font-mono uppercase tracking-wide">Resetar Dados de Estudo</p>
                  <p className="text-[10px] text-[#64748B] mt-1 leading-relaxed">
                    Apaga: histórico de sessões, progresso das aulas, simulados, revisões espaçadas e ciclo atual.
                    {isLoggedIn && <span className="text-amber-400 block mt-1">⚡ Logado: a nuvem também será limpa antes do reset.</span>}
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
                  Digite <strong className="text-rose-400">ESTUDOS</strong> para confirmar:
                </label>
                <input
                  type="text"
                  placeholder="ESTUDOS"
                  value={resetEstudoInput}
                  onChange={(e) => setResetEstudoInput(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-rose-500/20 rounded p-2 text-xs font-mono text-rose-400 placeholder-rose-950 focus:outline-none focus:border-rose-500/40 text-center"
                />
              </div>
              <button
                onClick={handleConfirmarResetEstudo}
                disabled={resetEstudoInput.trim().toUpperCase() !== 'ESTUDOS' || isResettingEstudo}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-rose-950/10 hover:bg-rose-700 hover:text-white border border-rose-500/30 text-rose-400 font-bold text-xs rounded transition-all cursor-pointer disabled:opacity-30 disabled:hover:bg-rose-950/10 disabled:hover:text-rose-400"
              >
                <Trash2 size={12} />
                {isResettingEstudo ? 'Limpando nuvem e reiniciando...' : 'Resetar Dados de Estudo'}
              </button>
            </div>

            {/* RESET 2: CONFIGURAÇÕES */}
            <div className="bg-amber-950/10 border border-amber-900/25 rounded p-4 space-y-3">
              <div className="flex items-start gap-2">
                <Sliders size={14} className="text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-amber-300 font-mono uppercase tracking-wide">Resetar Configurações</p>
                  <p className="text-[10px] text-[#64748B] mt-1 leading-relaxed">
                    Apaga: timer, listas de questões, token GitHub, diagnóstico IA e planejamento semanal. <span className="text-emerald-400">Não afeta seu histórico de estudos.</span>
                  </p>
                </div>
              </div>
              {configResetSuccess && (
                <div className="flex items-center gap-2 text-emerald-400 text-[10px] font-mono">
                  <CheckCircle size={12} /> Configurações resetadas com sucesso!
                </div>
              )}
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
                  Digite <strong className="text-amber-400">CONFIG</strong> para confirmar:
                </label>
                <input
                  type="text"
                  placeholder="CONFIG"
                  value={resetConfigInput}
                  onChange={(e) => setResetConfigInput(e.target.value)}
                  className="w-full bg-[#0C0E12] border border-amber-500/20 rounded p-2 text-xs font-mono text-amber-400 placeholder-amber-950 focus:outline-none focus:border-amber-500/40 text-center"
                />
              </div>
              <button
                onClick={handleConfirmarResetConfig}
                disabled={resetConfigInput.trim().toUpperCase() !== 'CONFIG'}
                className="w-full flex items-center justify-center gap-1.5 px-4 py-2 bg-amber-950/10 hover:bg-amber-700 hover:text-black border border-amber-500/30 text-amber-400 font-bold text-xs rounded transition-all cursor-pointer disabled:opacity-30"
              >
                <Sliders size={12} />
                Resetar Configurações
              </button>
            </div>

            {/* RESET 3: TUDO (EXISTENTE) */}
            <div className="bg-rose-950/5 border border-rose-900/20 rounded p-4 space-y-3">
              <div className="flex items-start gap-2">
                <ShieldAlert size={14} className="text-rose-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-bold text-rose-500 font-mono uppercase tracking-wide">Resetar Absolutamente Tudo</p>
                  <p className="text-[10px] text-[#64748B] mt-1 leading-relaxed">
                    Apaga dados de estudo + todas as configurações. Retorna ao estado inicial.
                  </p>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[9px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">
                  Digite <strong className="text-rose-500">RESETAR</strong> para confirmar:
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
