import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { LogIn, UserPlus, X, Mail, Lock, AlertCircle, CheckCircle } from 'lucide-react';

interface AuthModalProps {
  onClose: () => void;
  onSuccess: () => void;
}

export default function SupabaseAuthModal({ onClose, onSuccess }: AuthModalProps) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!isSupabaseConfigured) {
      setErrorMsg('Erro: Supabase não está configurado. Configure as variáveis de ambiente VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY no arquivo .env.');
      return;
    }

    if (!email.trim() || !password.trim()) {
      setErrorMsg('Por favor, preencha todos os campos.');
      return;
    }

    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        setSuccessMsg('Conta criada com sucesso! Caso a confirmação de e-mail esteja ativa, valide o link enviado. Caso contrário, você já pode fazer login.');
        setIsSignUp(false);
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;

        setSuccessMsg('Acesso concedido com sucesso!');
        setTimeout(() => {
          onSuccess();
          onClose();
        }, 1000);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erro durante a autenticação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-[#0C0E12]/80 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-fade-in" id="auth-modal-overlay">
      <div className="bg-[#0F172A] border border-[#1E293B] rounded w-full max-w-md p-6 shadow-2xl relative" id="auth-modal-box">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-[#64748B] hover:text-[#E2E8F0] transition-colors cursor-pointer"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="w-12 h-12 bg-[#C5A059]/10 rounded-full flex items-center justify-center mx-auto mb-3 border border-[#C5A059]/20">
            {isSignUp ? <UserPlus className="text-[#C5A059]" size={22} /> : <LogIn className="text-[#C5A059]" size={22} />}
          </div>
          <h3 className="text-lg font-display font-medium text-white">
            {isSignUp ? 'Criar Conta de Estudante (TCU)' : 'Acessar Nuvem Supabase'}
          </h3>
          <p className="text-xs text-[#94A3B8] mt-1 font-sans">
            {isSignUp ? 'Crie seu cadastro para sincronizar seus ciclos de estudos.' : 'Sincronize seu progresso local com todos os seus dispositivos.'}
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 flex items-start gap-2 bg-rose-950/40 border border-rose-500/30 text-rose-300 p-3 rounded text-xs leading-normal">
            <AlertCircle size={16} className="shrink-0 text-rose-400 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 flex items-start gap-2 bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 p-3 rounded text-xs leading-normal">
            <CheckCircle size={16} className="shrink-0 text-emerald-400 mt-0.5" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Email</label>
            <div className="relative">
              <input
                type="email"
                placeholder="seu.email@dominio.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2.5 pl-9 text-xs text-[#E2E8F0] placeholder-[#334155] focus:outline-none focus:border-[#C5A059] font-sans"
                required
              />
              <Mail size={14} className="absolute left-3 top-3 text-[#475569]" />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-mono font-bold text-[#64748B] uppercase tracking-wider block">Senha</label>
            <div className="relative">
              <input
                type="password"
                placeholder="Sua senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2.5 pl-9 text-xs text-[#E2E8F0] placeholder-[#334155] focus:outline-none focus:border-[#C5A059] font-sans"
                required
              />
              <Lock size={14} className="absolute left-3 top-3 text-[#475569]" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 bg-[#C5A059] text-black font-semibold text-xs rounded hover:bg-[#C5A059]/90 disabled:opacity-50 transition-all flex items-center justify-center gap-1.5 font-sans mt-6 cursor-pointer shadow-md shadow-[#C5A059]/10"
          >
            {loading ? 'Processando...' : isSignUp ? 'Criar Cadastro' : 'Entrar na Conta'}
          </button>
        </form>

        <div className="mt-5 text-center text-xs border-t border-[#1E293B]/60 pt-4">
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setErrorMsg('');
              setSuccessMsg('');
            }}
            className="text-[#C5A059] hover:underline font-medium cursor-pointer"
          >
            {isSignUp ? 'Já tem uma conta? Entrar' : 'Não tem conta? Cadastre-se'}
          </button>
        </div>
      </div>
    </div>
  );
}
