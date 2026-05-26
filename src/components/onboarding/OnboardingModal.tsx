'use client'

import { useState, useEffect } from 'react'
import { Shield, Calendar, Users, GitBranch, Swords, Trophy, ChevronRight, X } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'bolao_onboarding_done'

const steps = [
  {
    icon: Shield,
    color: 'from-emerald-500 to-teal-600',
    iconColor: 'text-white',
    title: 'Bem-vindo ao Bolão da Copa 2026!',
    description: '48 seleções, 104 jogos e muita disputa. Faça seus palpites, suba no ranking e mostre que entende de futebol.',
    detail: null,
  },
  {
    icon: Calendar,
    color: 'from-blue-500 to-blue-700',
    iconColor: 'text-white',
    title: 'Palpites de Jogos',
    description: 'Antes de cada partida, você pode palpitar o placar. Quanto mais preciso, mais pontos.',
    detail: [
      { label: 'Placar exato', points: '+3 pts', color: 'text-green-400' },
      { label: 'Vencedor correto', points: '+1 pt', color: 'text-yellow-400' },
      { label: 'Errou', points: '0 pts', color: 'text-gray-500' },
    ],
  },
  {
    icon: Users,
    color: 'from-blue-400 to-indigo-600',
    iconColor: 'text-white',
    title: 'Classificados',
    description: 'Escolha os times que você acredita que vão avançar na fase de grupos.',
    detail: [
      { label: '1º ou 2º de cada grupo', points: '+1 pt', color: 'text-blue-400' },
      { label: '8 melhores 3ºs colocados', points: '+1 pt', color: 'text-blue-400' },
    ],
  },
  {
    icon: GitBranch,
    color: 'from-purple-500 to-purple-700',
    iconColor: 'text-white',
    title: 'Mata-mata',
    description: 'Preveja quem avança em cada rodada eliminatória. Fases mais avançadas valem mais pontos.',
    detail: [
      { label: 'Rodada de 32 / Oitavas', points: '+2 pts', color: 'text-purple-400' },
      { label: 'Quartas / Semifinal', points: '+3 pts', color: 'text-purple-400' },
      { label: 'Finalista / Campeão', points: '+5 pts', color: 'text-yellow-400' },
    ],
  },
  {
    icon: Swords,
    color: 'from-orange-500 to-red-600',
    iconColor: 'text-white',
    title: 'Artilheiro',
    description: 'Escolha quem você acha que vai ser o artilheiro do torneio. Vale uma boa fatia de pontos!',
    detail: [
      { label: 'Acertar o artilheiro', points: '+5 pts', color: 'text-orange-400' },
    ],
  },
  {
    icon: Trophy,
    color: 'from-yellow-500 to-amber-600',
    iconColor: 'text-white',
    title: 'Tudo pronto!',
    description: 'Faça seus palpites antes do prazo de cada jogo e acompanhe o ranking em tempo real. Boa sorte!',
    detail: null,
  },
]

interface OnboardingModalProps {
  forceShow?: boolean
  onClose?: () => void
}

export function OnboardingModal({ forceShow = false, onClose }: OnboardingModalProps) {
  const [visible, setVisible] = useState(false)
  const [step, setStep] = useState(0)

  useEffect(() => {
    if (forceShow) {
      setVisible(true)
      setStep(0)
      return
    }
    if (typeof window !== 'undefined' && !localStorage.getItem(STORAGE_KEY)) {
      setVisible(true)
    }
  }, [forceShow])

  const close = () => {
    if (!forceShow) localStorage.setItem(STORAGE_KEY, '1')
    setVisible(false)
    setStep(0)
    onClose?.()
  }

  const next = () => {
    if (step < steps.length - 1) setStep(s => s + 1)
    else close()
  }

  if (!visible) return null

  const current = steps[step]
  const Icon = current.icon
  const isLast = step === steps.length - 1

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-4 sm:p-6">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={close}
      />

      {/* Modal */}
      <div className="relative w-full max-w-sm bg-[#0d1520] border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        {/* Progress bar */}
        <div className="h-1 bg-white/5">
          <div
            className="h-full bg-emerald-500 transition-all duration-500 ease-out"
            style={{ width: `${((step + 1) / steps.length) * 100}%` }}
          />
        </div>

        {/* Close button */}
        <button
          onClick={close}
          className="absolute top-3 right-3 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all z-10"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Content */}
        <div className="p-6 pt-5">
          {/* Icon */}
          <div className={cn(
            'w-14 h-14 rounded-2xl bg-gradient-to-br flex items-center justify-center mb-4',
            current.color
          )}>
            <Icon className={cn('w-7 h-7', current.iconColor)} />
          </div>

          {/* Step counter */}
          <p className="text-xs text-gray-500 mb-1">{step + 1} de {steps.length}</p>

          {/* Title */}
          <h2 className="text-lg font-bold text-white mb-2">{current.title}</h2>

          {/* Description */}
          <p className="text-sm text-gray-400 leading-relaxed">{current.description}</p>

          {/* Detail rows */}
          {current.detail && (
            <div className="mt-4 space-y-2">
              {current.detail.map((row, i) => (
                <div key={i} className="flex items-center justify-between bg-white/5 rounded-lg px-3 py-2">
                  <span className="text-xs text-gray-300">{row.label}</span>
                  <span className={cn('text-xs font-bold', row.color)}>{row.points}</span>
                </div>
              ))}
            </div>
          )}

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 mt-5 mb-4">
            {steps.map((_, i) => (
              <button
                key={i}
                onClick={() => setStep(i)}
                className={cn(
                  'rounded-full transition-all',
                  i === step
                    ? 'w-4 h-1.5 bg-emerald-400'
                    : 'w-1.5 h-1.5 bg-white/20 hover:bg-white/40'
                )}
              />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {step > 0 && (
              <Button variant="secondary" size="sm" onClick={() => setStep(s => s - 1)} className="flex-1">
                Voltar
              </Button>
            )}
            <Button onClick={next} size="sm" className={cn('flex items-center gap-1', step === 0 ? 'w-full' : 'flex-1')}>
              {isLast ? 'Começar!' : <>Próximo <ChevronRight className="w-3.5 h-3.5" /></>}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
