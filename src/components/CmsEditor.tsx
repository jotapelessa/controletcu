import React, { useState, useEffect } from 'react';
import { Save, Info, Check, Sparkles } from 'lucide-react';
import { mergeCmsContent } from './Homepage';

interface CmsEditorProps {
  initialContent: any;
  onSave: (newContent: any) => Promise<void>;
  loading: boolean;
}

export default function CmsEditor({ initialContent, onSave, loading }: CmsEditorProps) {
  const [localContent, setLocalContent] = useState<any>(null);
  const [cmsSubTab, setCmsSubTab] = useState<'geral' | 'funcionalidades' | 'secoes' | 'metodologia' | 'planos'>('geral');
  const [selectedSecIdx, setSelectedSecIdx] = useState<number>(0);

  // Sincroniza estado local com dados do banco/prop inicial
  useEffect(() => {
    if (initialContent) {
      setLocalContent(mergeCmsContent(initialContent));
    }
  }, [initialContent]);

  if (!localContent) {
    return (
      <div className="text-center py-12 text-xs font-mono text-[#64748B] animate-pulse">
        Carregando formulário do CMS...
      </div>
    );
  }

  const handleTextChange = (field: string, value: string) => {
    setLocalContent((prev: any) => ({
      ...prev,
      [field]: value
    }));
  };

  const handleFeatureChange = (idx: number, field: 'title' | 'desc', value: string) => {
    setLocalContent((prev: any) => {
      const updatedFeatures = prev.features.map((f: any, i: number) => {
        if (i === idx) {
          return { ...f, [field]: value };
        }
        return f;
      });
      return { ...prev, features: updatedFeatures };
    });
  };

  const handleSectionChange = (secIdx: number, field: 'badge' | 'title' | 'desc', value: string) => {
    setLocalContent((prev: any) => {
      const updatedSections = prev.sections.map((s: any, i: number) => {
        if (i === secIdx) {
          return { ...s, [field]: value };
        }
        return s;
      });
      return { ...prev, sections: updatedSections };
    });
  };

  const handleSectionBulletChange = (secIdx: number, bulletIdx: number, value: string) => {
    setLocalContent((prev: any) => {
      const updatedSections = prev.sections.map((s: any, i: number) => {
        if (i === secIdx) {
          const updatedBullets = s.bullets.map((b: string, j: number) => j === bulletIdx ? value : b);
          return { ...s, bullets: updatedBullets };
        }
        return s;
      });
      return { ...prev, sections: updatedSections };
    });
  };

  const handleMethodologyCardChange = (cardIdx: number, field: 'title' | 'desc', value: string) => {
    setLocalContent((prev: any) => {
      const updatedCards = prev.methodologyCards.map((c: any, i: number) => {
        if (i === cardIdx) {
          return { ...c, [field]: value };
        }
        return c;
      });
      return { ...prev, methodologyCards: updatedCards };
    });
  };

  const handlePlanChange = (planIdx: number, field: string, value: any) => {
    setLocalContent((prev: any) => {
      const updatedPlans = prev.plans.map((p: any, i: number) => {
        if (i === planIdx) {
          return { ...p, [field]: value };
        }
        return p;
      });
      return { ...prev, plans: updatedPlans };
    });
  };

  const handlePlanFeatureChange = (planIdx: number, featIdx: number, value: string) => {
    setLocalContent((prev: any) => {
      const updatedPlans = prev.plans.map((p: any, i: number) => {
        if (i === planIdx) {
          const updatedFeats = p.features.map((f: string, j: number) => j === featIdx ? value : f);
          return { ...p, features: updatedFeats };
        }
        return p;
      });
      return { ...prev, plans: updatedPlans };
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(localContent);
  };

  const sectionThemes = [
    { name: "Métricas", label: "Métricas de Progresso" },
    { name: "Ciclos de Estudo", label: "Ciclos Adaptativos" },
    { name: "Cronômetro", label: "Cronômetro e Gabarito" },
    { name: "Cronograma", label: "Grade Semanal" },
    { name: "Edital/Estratégia", label: "Grade do Edital" },
    { name: "Revisões", label: "Revisão e Simulado" },
    { name: "IA Coach", label: "Gemini Coach" }
  ];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 animate-fade-in" id="cms-editor-subform">
      {/* Menu de Sub-abas Horizontais */}
      <div className="flex flex-wrap border-b border-[#1E293B] gap-1.5 pb-2">
        {[
          { id: 'geral', label: '1. Geral & Hero' },
          { id: 'funcionalidades', label: '2. Recursos Bento' },
          { id: 'secoes', label: '3. Seções da Home' },
          { id: 'metodologia', label: '4. Metodologia' },
          { id: 'planos', label: '5. Planos de Preços' }
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setCmsSubTab(tab.id as any)}
            className={`px-3 py-1.5 rounded text-[11px] font-mono font-bold transition-all cursor-pointer ${
              cmsSubTab === tab.id
                ? 'bg-[#C5A059]/20 border border-[#C5A059] text-[#C5A059]'
                : 'border border-transparent text-[#64748B] hover:text-[#E2E8F0] hover:bg-[#1E293B]/45'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* 1. ABA GERAL */}
      {cmsSubTab === 'geral' && (
        <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-4">
          <h3 className="text-xs font-mono font-bold text-[#C5A059] uppercase tracking-wider border-b border-[#1E293B] pb-2 flex items-center gap-1.5">
            Header e Banner Principal
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-mono text-[#64748B] uppercase block">Barra Promocional (Topo):</label>
                <span className="text-[8px] text-[#64748B] font-mono">{(localContent.promoBanner || '').length}/120</span>
              </div>
              <input
                type="text"
                maxLength={120}
                value={localContent.promoBanner || ''}
                onChange={(e) => handleTextChange('promoBanner', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
                placeholder="Ex: 🔥 Promoção Especial..."
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-mono text-[#64748B] uppercase block">Título do Hero (Banner Principal):</label>
                <span className="text-[8px] text-[#64748B] font-mono">{(localContent.heroTitle || '').length}/100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={localContent.heroTitle || ''}
                onChange={(e) => handleTextChange('heroTitle', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
                required
              />
            </div>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="text-[10px] font-mono text-[#64748B] uppercase block">Subtítulo do Hero:</label>
              <span className="text-[8px] text-[#64748B] font-mono">{(localContent.heroSubtitle || '').length}/250</span>
            </div>
            <textarea
              maxLength={250}
              value={localContent.heroSubtitle || ''}
              onChange={(e) => handleTextChange('heroSubtitle', e.target.value)}
              className="w-full bg-[#0F172A] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059] h-20 resize-none"
              required
            />
          </div>

          <div className="w-64 space-y-1">
            <div className="flex justify-between items-baseline">
              <label className="text-[10px] font-mono text-[#64748B] uppercase block">Texto do Botão de Ação:</label>
              <span className="text-[8px] text-[#64748B] font-mono">{(localContent.heroBtnText || '').length}/30</span>
            </div>
            <input
              type="text"
              maxLength={30}
              value={localContent.heroBtnText || ''}
              onChange={(e) => handleTextChange('heroBtnText', e.target.value)}
              className="w-full bg-[#0F172A] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
              required
            />
          </div>
        </div>
      )}

      {/* 2. ABA FUNCIONALIDADES (BENTO) */}
      {cmsSubTab === 'funcionalidades' && (
        <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-4">
          <h3 className="text-xs font-mono font-bold text-[#C5A059] uppercase tracking-wider border-b border-[#1E293B] pb-2">
            Grade Bento - 4 Recursos Principais
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {localContent.features.map((feature: any, idx: number) => (
              <div key={idx} className="bg-[#0F172A] border border-[#1E293B] p-4 rounded space-y-3">
                <span className="text-[9px] font-mono text-[#C5A059] block font-bold">Recurso #{idx + 1}</span>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[9px] text-[#64748B] uppercase">Título:</label>
                    <span className="text-[8px] text-[#64748B] font-mono">{(feature.title || '').length}/40</span>
                  </div>
                  <input
                    type="text"
                    maxLength={40}
                    value={feature.title}
                    onChange={(e) => handleFeatureChange(idx, 'title', e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-xs text-white outline-none focus:border-[#C5A059]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[9px] text-[#64748B] uppercase">Descrição:</label>
                    <span className="text-[8px] text-[#64748B] font-mono">{(feature.desc || '').length}/140</span>
                  </div>
                  <textarea
                    maxLength={140}
                    value={feature.desc}
                    onChange={(e) => handleFeatureChange(idx, 'desc', e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-xs text-white outline-none focus:border-[#C5A059] h-16 resize-none"
                    required
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3. ABA SEÇÕES DETALHADAS */}
      {cmsSubTab === 'secoes' && (
        <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-4">
          <h3 className="text-xs font-mono font-bold text-[#C5A059] uppercase tracking-wider border-b border-[#1E293B] pb-2">
            Seções Explicativas Individuais (Homepage)
          </h3>

          {/* Sub-menu horizontal segmentado de seções */}
          <div className="flex flex-wrap gap-1 bg-[#0F172A] p-1 border border-[#1E293B] rounded">
            {sectionThemes.map((sec, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedSecIdx(i)}
                className={`px-3 py-1.5 rounded text-[10px] font-mono font-bold transition-all cursor-pointer flex-1 text-center ${
                  selectedSecIdx === i
                    ? 'bg-[#C5A059] text-black'
                    : 'text-[#64748B] hover:text-[#E2E8F0]'
                }`}
              >
                {sec.name}
              </button>
            ))}
          </div>

          {/* Formulário da Seção Selecionada */}
          {localContent.sections[selectedSecIdx] && (
            <div className="bg-[#0F172A] border border-[#1E293B] p-4 rounded space-y-4 animate-fade-in">
              <span className="text-[10px] bg-[#C5A059]/15 text-[#C5A059] px-2 py-0.5 rounded font-mono font-bold uppercase">
                {sectionThemes[selectedSecIdx].label}
              </span>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[10px] font-mono text-[#64748B] uppercase block">Etiqueta Superior (Badge):</label>
                    <span className="text-[8px] text-[#64748B] font-mono">{(localContent.sections[selectedSecIdx].badge || '').length}/40</span>
                  </div>
                  <input
                    type="text"
                    maxLength={40}
                    value={localContent.sections[selectedSecIdx].badge}
                    onChange={(e) => handleSectionChange(selectedSecIdx, 'badge', e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-xs text-white outline-none focus:border-[#C5A059]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <label className="text-[10px] font-mono text-[#64748B] uppercase block">Título Principal da Seção:</label>
                    <span className="text-[8px] text-[#64748B] font-mono">{(localContent.sections[selectedSecIdx].title || '').length}/100</span>
                  </div>
                  <input
                    type="text"
                    maxLength={100}
                    value={localContent.sections[selectedSecIdx].title}
                    onChange={(e) => handleSectionChange(selectedSecIdx, 'title', e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-xs text-white outline-none focus:border-[#C5A059]"
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between items-baseline">
                  <label className="text-[10px] font-mono text-[#64748B] uppercase block">Texto Descritivo / Parágrafo Principal:</label>
                  <span className="text-[8px] text-[#64748B] font-mono">{(localContent.sections[selectedSecIdx].desc || '').length}/400</span>
                </div>
                <textarea
                  maxLength={400}
                  value={localContent.sections[selectedSecIdx].desc}
                  onChange={(e) => handleSectionChange(selectedSecIdx, 'desc', e.target.value)}
                  className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-2 text-xs text-white outline-none focus:border-[#C5A059] h-24 resize-none"
                  required
                />
              </div>

              {/* Tópicos / Bullets */}
              <div className="border border-[#1E293B] p-4 rounded bg-[#0C0E12] space-y-3">
                <div className="flex items-center gap-2 border-b border-[#1E293B] pb-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#C5A059]"></span>
                  <label className="text-[10px] font-mono text-[#E2E8F0] uppercase block font-bold">Itens da Lista (Bullet Points)</label>
                </div>

                <div className="space-y-2.5">
                  {localContent.sections[selectedSecIdx].bullets.map((bullet: string, bIdx: number) => (
                    <div key={bIdx} className="flex items-center gap-2">
                      <span className="text-[#C5A059] font-bold text-xs select-none">•</span>
                      <div className="flex-1 space-y-1">
                        <input
                          type="text"
                          maxLength={100}
                          value={bullet}
                          onChange={(e) => handleSectionBulletChange(selectedSecIdx, bIdx, e.target.value)}
                          className="w-full bg-[#0F172A] border border-[#1E293B] rounded p-1.5 text-xs text-white outline-none focus:border-[#C5A059]"
                          placeholder={`Item de lista #${bIdx + 1}`}
                        />
                      </div>
                      <span className="text-[8px] text-[#64748B] font-mono">{bullet.length}/100</span>
                    </div>
                  ))}
                </div>
                <p className="text-[9px] text-[#64748B] italic pt-1 flex items-center gap-1">
                  <Info size={10} /> A Homepage suporta até 3 itens. Itens deixados em branco serão omitidos do site automaticamente.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ABA METODOLOGIA */}
      {cmsSubTab === 'metodologia' && (
        <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-4">
          <h3 className="text-xs font-mono font-bold text-[#C5A059] uppercase tracking-wider border-b border-[#1E293B] pb-2">
            Estrutura da Metodologia de Estudos
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-mono text-[#64748B] uppercase block">Título Central:</label>
                <span className="text-[8px] text-[#64748B] font-mono">{(localContent.methodologyTitle || '').length}/100</span>
              </div>
              <input
                type="text"
                maxLength={100}
                value={localContent.methodologyTitle || ''}
                onChange={(e) => handleTextChange('methodologyTitle', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059]"
                required
              />
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-baseline">
                <label className="text-[10px] font-mono text-[#64748B] uppercase block">Subtítulo Explicativo:</label>
                <span className="text-[8px] text-[#64748B] font-mono">{(localContent.methodologySubtitle || '').length}/250</span>
              </div>
              <textarea
                maxLength={250}
                value={localContent.methodologySubtitle || ''}
                onChange={(e) => handleTextChange('methodologySubtitle', e.target.value)}
                className="w-full bg-[#0F172A] border border-[#1E293B] rounded p-2 text-xs text-[#E2E8F0] outline-none focus:border-[#C5A059] h-16 resize-none"
                required
              />
            </div>
          </div>

          <div className="border-t border-[#1E293B] pt-4 space-y-4">
            <h4 className="text-[11px] font-mono text-[#E2E8F0] uppercase block font-bold">Os 3 Pilares Metodológicos</h4>
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {localContent.methodologyCards.map((card: any, idx: number) => (
                <div key={idx} className="bg-[#0F172A] border border-[#1E293B] p-4 rounded space-y-3">
                  <span className="text-[9px] font-mono text-[#C5A059] block font-bold">Pilar #{idx + 1}</span>

                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[9px] text-[#64748B] uppercase">Título:</label>
                      <span className="text-[8px] text-[#64748B] font-mono">{(card.title || '').length}/40</span>
                    </div>
                    <input
                      type="text"
                      maxLength={40}
                      value={card.title}
                      onChange={(e) => handleMethodologyCardChange(idx, 'title', e.target.value)}
                      className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-1.5 text-xs text-white outline-none focus:border-[#C5A059]"
                      required
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex justify-between items-baseline">
                      <label className="text-[9px] text-[#64748B] uppercase">Descrição:</label>
                      <span className="text-[8px] text-[#64748B] font-mono">{(card.desc || '').length}/300</span>
                    </div>
                    <textarea
                      maxLength={300}
                      value={card.desc}
                      onChange={(e) => handleMethodologyCardChange(idx, 'desc', e.target.value)}
                      className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-1.5 text-xs text-white outline-none focus:border-[#C5A059] h-24 resize-none"
                      required
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5. ABA PLANOS DE PREÇOS */}
      {cmsSubTab === 'planos' && (
        <div className="bg-[#0C0E12] border border-[#1E293B] p-5 rounded space-y-4">
          <h3 className="text-xs font-mono font-bold text-[#C5A059] uppercase tracking-wider border-b border-[#1E293B] pb-2">
            Planos de Assinatura
          </h3>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {localContent.plans.map((plan: any, idx: number) => (
              <div key={idx} className="bg-[#0F172A] border border-[#1E293B] p-4 rounded space-y-3">
                <span className="text-[9px] font-mono text-[#C5A059] block font-bold">Plano #{idx + 1} - {plan.name}</span>

                <div className="space-y-1">
                  <label className="text-[9px] text-[#64748B] uppercase">Nome Comercial:</label>
                  <input
                    type="text"
                    value={plan.name}
                    onChange={(e) => handlePlanChange(idx, 'name', e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-1.5 text-xs text-white outline-none focus:border-[#C5A059]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-[#64748B] uppercase">Preço (Texto formatado):</label>
                  <input
                    type="text"
                    value={plan.price}
                    onChange={(e) => handlePlanChange(idx, 'price', e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-1.5 text-xs text-white outline-none focus:border-[#C5A059]"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] text-[#64748B] uppercase">Período:</label>
                  <input
                    type="text"
                    value={plan.period}
                    onChange={(e) => handlePlanChange(idx, 'period', e.target.value)}
                    className="w-full bg-[#0C0E12] border border-[#1E293B] rounded p-1.5 text-xs text-white outline-none focus:border-[#C5A059]"
                    required
                  />
                </div>

                {/* Plan Popularity Toggle */}
                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="checkbox"
                    id={`plan-popular-${idx}`}
                    checked={plan.popular}
                    onChange={(e) => handlePlanChange(idx, 'popular', e.target.checked)}
                    className="rounded border-[#1E293B] text-[#C5A059] focus:ring-0 focus:ring-offset-0 bg-[#0C0E12] cursor-pointer"
                  />
                  <label htmlFor={`plan-popular-${idx}`} className="text-[9px] text-[#94A3B8] uppercase cursor-pointer select-none">
                    Mais Recomendado / Destaque
                  </label>
                </div>

                {/* Features list */}
                <div className="border border-[#1E293B] p-2.5 rounded bg-[#0C0E12] space-y-1.5">
                  <span className="text-[8px] font-mono text-[#64748B] uppercase block">Recursos inclusos (Lista):</span>
                  {plan.features.map((feat: string, fIdx: number) => (
                    <input
                      key={fIdx}
                      type="text"
                      value={feat}
                      onChange={(e) => handlePlanFeatureChange(idx, fIdx, e.target.value)}
                      className="w-full bg-[#0F172A] border border-[#1E293B] rounded p-1 text-[10px] text-white outline-none focus:border-[#C5A059]"
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Botão de Submeter */}
      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-3 bg-[#C5A059] hover:bg-[#C5A059]/90 text-black font-extrabold text-xs uppercase tracking-widest flex items-center gap-2 rounded cursor-pointer transition-all disabled:opacity-50 shadow-md shadow-[#C5A059]/10 hover:scale-[1.01] active:scale-[0.99]"
        >
          <Save size={14} /> {loading ? "Gravando..." : "Salvar Alterações no CMS"}
        </button>
      </div>
    </form>
  );
}
