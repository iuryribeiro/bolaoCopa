'use client'

import { useState, useEffect } from 'react'
import {
  Settings, RefreshCw, BarChart3, Sliders, CheckCircle,
  XCircle, Clock, Lock, Unlock, AlertTriangle, Zap, Database, Megaphone, DollarSign
} from 'lucide-react'
import { Card, CardHeader, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { formatRelativeTime, cn } from '@/lib/utils'

interface SyncLog {
  id: string
  type: string
  status: string
  message: string | null
  records_affected: number
  created_at: string
}

interface CompetitionSettings {
  id: string
  phase: string
  groups_prediction_locked: boolean
  knockout_prediction_locked: boolean
  champion_prediction_locked: boolean
  top_scorer_prediction_locked: boolean
  entry_fee: number | null
}

interface ScoringRules {
  id: string
  exact_score_points: number
  correct_winner_points: number
  group_qualified_points: number
  knockout_advance_points: number
  finalist_points: number
  champion_points: number
  top_scorer_points: number
  prediction_deadline_hours: number
}

interface ApiUsage {
  used: number
  limit: number
  remaining: number
  last_request_at: string | null
}

interface UsageHistory {
  date: string
  requests_count: number
  requests_limit: number
}

export default function AdminPage() {
  const [syncing, setSyncing] = useState(false)
  const [recalculating, setRecalculating] = useState(false)
  const [syncMessage, setSyncMessage] = useState('')
  const [syncError, setSyncError] = useState(false)
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [settings, setSettings] = useState<CompetitionSettings | null>(null)
  const [rules, setRules] = useState<ScoringRules | null>(null)
  const [savingRules, setSavingRules] = useState(false)
  const [participants, setParticipants] = useState<Array<{ user_id: string; name: string; avatar_url: string | null; total_points: number; payment_confirmed: boolean }>>([])
  const [togglingPayment, setTogglingPayment] = useState<string | null>(null)
  const [paymentError, setPaymentError] = useState<string | null>(null)
  const [migrationNeeded, setMigrationNeeded] = useState(false)
  const [entryFee, setEntryFee] = useState<number>(100)
  const [savingEntryFee, setSavingEntryFee] = useState(false)
  const [resettingKnockout, setResettingKnockout] = useState(false)
  const [resetKnockoutMsg, setResetKnockoutMsg] = useState('')
  const [notifTitle, setNotifTitle] = useState('')
  const [notifBody, setNotifBody] = useState('')
  const [notifUrl, setNotifUrl] = useState('')
  const [sendingNotif, setSendingNotif] = useState(false)
  const [notifSent, setNotifSent] = useState(false)
  const [usage, setUsage] = useState<ApiUsage | null>(null)
  const [usageHistory, setUsageHistory] = useState<UsageHistory[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [logsRes, settingsRes, usageRes, paymentsRes] = await Promise.all([
        fetch('/api/admin/logs').catch(() => null),
        fetch('/api/admin/settings').catch(() => null),
        fetch('/api/admin/usage').catch(() => null),
        fetch('/api/admin/payments').catch(() => null),
      ])

      if (logsRes?.ok) {
        const d = await logsRes.json().catch(() => ({}))
        setLogs(d.logs || [])
      }

      if (settingsRes?.ok) {
        const d = await settingsRes.json().catch(() => ({}))
        setSettings(d.settings ?? null)
        setRules(d.rules ?? null)
        if (d.settings?.entry_fee != null) setEntryFee(d.settings.entry_fee)
      }

      if (usageRes?.ok) {
        const d = await usageRes.json().catch(() => ({}))
        setUsage(d.usage ?? null)
        setUsageHistory(d.history || [])
      }

      if (paymentsRes) {
        const d = await paymentsRes.json().catch(() => ({}))
        setParticipants(d.participants || [])
        setMigrationNeeded(!!d.migration_needed)
        if (d.error && !(d.participants?.length)) setPaymentError(d.error)
      }
    } finally {
      setLoading(false)
    }
  }

  const togglePayment = async (userId: string, current: boolean) => {
    setTogglingPayment(userId)
    setPaymentError(null)
    // Optimistic update
    setParticipants(prev =>
      prev.map(p => p.user_id === userId ? { ...p, payment_confirmed: !current } : p)
    )
    try {
      const res = await fetch('/api/admin/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, payment_confirmed: !current }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || `Erro ${res.status}`)
      }
    } catch (err) {
      // Revert on error
      setParticipants(prev =>
        prev.map(p => p.user_id === userId ? { ...p, payment_confirmed: current } : p)
      )
      setPaymentError(err instanceof Error ? err.message : 'Erro ao atualizar pagamento')
    } finally {
      setTogglingPayment(null)
    }
  }

  const handleSaveEntryFee = async () => {
    setSavingEntryFee(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry_fee: entryFee }),
      })
      if (!res.ok) throw new Error('Erro ao salvar')
      const data = await res.json()
      if (data.settings?.entry_fee != null) setEntryFee(data.settings.entry_fee)
    } finally {
      setSavingEntryFee(false)
    }
  }

  const handleSync = async (type: string) => {
    let password: string | undefined
    if (type === 'full') {
      const pwd = prompt('Senha para sincronizar todos os jogos:')
      if (!pwd) return
      password = pwd
    }
    setSyncing(true)
    setSyncMessage('')
    setSyncError(false)
    try {
      const res = await fetch('/api/admin/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, ...(password ? { password } : {}) }),
      })
      const data = await res.json()

      if (!res.ok) {
        setSyncError(true)
        setSyncMessage(data.error || 'Erro na sincronização')
      } else {
        setSyncMessage(data.message || 'Concluído')
      }

      fetchData()
    } finally {
      setSyncing(false)
    }
  }

  const handleRecalculate = async () => {
    setRecalculating(true)
    setSyncError(false)
    try {
      const res = await fetch('/api/admin/recalculate', { method: 'POST' })
      const data = await res.json()
      setSyncMessage(data.message || 'Recalculado')
      fetchData()
    } finally {
      setRecalculating(false)
    }
  }

  const handleToggleLock = async (field: keyof CompetitionSettings) => {
    if (!settings) return
    const newValue = !settings[field]
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: newValue }),
      })
      if (res.ok) setSettings(prev => prev ? { ...prev, [field]: newValue } : prev)
    } catch (err) {
      console.error(err)
    }
  }

  const handleSendNotification = async () => {
    if (!notifTitle.trim() || !notifBody.trim()) return
    setSendingNotif(true)
    try {
      await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: notifTitle, body: notifBody, action_url: notifUrl || undefined }),
      })
      setNotifTitle('')
      setNotifBody('')
      setNotifUrl('')
      setNotifSent(true)
      setTimeout(() => setNotifSent(false), 3000)
    } finally {
      setSendingNotif(false)
    }
  }

  const handleSaveRules = async () => {
    if (!rules) return
    setSavingRules(true)
    try {
      await fetch('/api/admin/rules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rules),
      })
    } finally {
      setSavingRules(false)
    }
  }

  const usagePct = usage ? (usage.used / usage.limit) * 100 : 0
  const usageColor = usagePct >= 90 ? 'bg-red-500' : usagePct >= 70 ? 'bg-yellow-500' : 'bg-emerald-500'

  const logStatusIcon = (status: string) => {
    if (status === 'success') return <CheckCircle className="w-4 h-4 text-green-400" />
    if (status === 'error') return <XCircle className="w-4 h-4 text-red-400" />
    return <Clock className="w-4 h-4 text-yellow-400 animate-pulse" />
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-purple-400" />
        <h1 className="text-2xl font-bold text-white">Administração</h1>
      </div>

      {syncMessage && (
        <div className={cn(
          'p-3 rounded-lg text-sm border',
          syncError
            ? 'bg-red-500/10 border-red-500/20 text-red-400'
            : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
        )}>
          {syncMessage}
        </div>
      )}

      {/* API Usage meter — destaque */}
      <Card className={cn(
        'p-4',
        usagePct >= 90 ? 'bg-red-500/10 border-red-500/30' :
        usagePct >= 70 ? 'bg-yellow-500/10 border-yellow-500/30' :
        'bg-blue-500/10 border-blue-500/30'
      )}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap className={cn('w-4 h-4', usagePct >= 90 ? 'text-red-400' : usagePct >= 70 ? 'text-yellow-400' : 'text-blue-400')} />
            <span className="text-sm font-semibold text-white">Uso da API-Football hoje</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-bold text-white">{usage?.used ?? '…'}</span>
            <span className="text-gray-400 text-sm">/ {usage?.limit ?? 100} req</span>
          </div>
        </div>

        {/* Barra de progresso */}
        <div className="h-3 bg-white/10 rounded-full overflow-hidden">
          <div
            className={cn('h-full rounded-full transition-all', usageColor)}
            style={{ width: `${Math.min(usagePct, 100)}%` }}
          />
        </div>

        <div className="flex items-center justify-between mt-2 text-xs text-gray-400">
          <span>
            {usage?.remaining ?? 100} requisições restantes
          </span>
          {usage?.last_request_at && (
            <span>Última: {formatRelativeTime(usage.last_request_at)}</span>
          )}
        </div>

        {/* Histórico 7 dias */}
        {usageHistory.length > 1 && (
          <div className="mt-3 pt-3 border-t border-white/10">
            <p className="text-xs text-gray-500 mb-2">Últimos 7 dias</p>
            <div className="flex items-end gap-1 h-8">
              {usageHistory.slice().reverse().map(h => {
                const pct = (h.requests_count / h.requests_limit) * 100
                return (
                  <div
                    key={h.date}
                    title={`${h.date}: ${h.requests_count} req`}
                    className="flex-1 rounded-sm bg-blue-500/40 min-h-[2px]"
                    style={{ height: `${Math.max(pct, 2)}%` }}
                  />
                )
              })}
            </div>
          </div>
        )}

        {usagePct >= 90 && (
          <div className="mt-3 flex items-start gap-2 text-xs text-red-300">
            <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
            Atenção: você está próximo do limite. Os dados são servidos do cache do banco.
          </div>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Sync */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-blue-400" />
              <h2 className="text-sm font-semibold text-white">Sincronização</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="p-3 bg-white/5 rounded-lg text-xs text-gray-400 space-y-1">
              <p className="flex items-center gap-2"><Database className="w-3 h-3" /> Sincronizar jogos: <span className="text-green-400 font-medium">1 req</span> (recomendado)</p>
              <p className="flex items-center gap-2"><Database className="w-3 h-3" /> Sincronizar todos: <span className="text-white font-medium">1 req</span> (requer senha)</p>
              <p className="flex items-center gap-2"><Database className="w-3 h-3" /> Atualizar ao vivo: <span className="text-white font-medium">1 req</span> (cache 2min)</p>
              <p className="flex items-center gap-2"><Database className="w-3 h-3" /> Artilheiros/Grupos: <span className="text-white font-medium">2 req</span> (cache 1h)</p>
            </div>

            <Button
              onClick={() => handleSync('today')}
              loading={syncing}
              variant="primary"
              fullWidth
              disabled={(usage?.remaining ?? 100) < 1}
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar jogos
              <Badge variant="green">1 req</Badge>
            </Button>

            <Button
              onClick={() => handleSync('full')}
              loading={syncing}
              variant="secondary"
              fullWidth
              disabled={(usage?.remaining ?? 100) < 1}
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar todos os jogos
              <Badge variant="blue">1 req</Badge>
            </Button>

            <Button
              onClick={() => handleSync('live')}
              loading={syncing}
              variant="secondary"
              fullWidth
              disabled={(usage?.remaining ?? 100) < 1}
            >
              <RefreshCw className="w-4 h-4" />
              Forçar atualização ao vivo
              <Badge variant="blue">1 req</Badge>
            </Button>

            <Button
              onClick={() => handleSync('scorers')}
              loading={syncing}
              variant="secondary"
              fullWidth
              disabled={(usage?.remaining ?? 100) < 1}
            >
              <RefreshCw className="w-4 h-4" />
              Sincronizar artilheiros
              <Badge variant="blue">1 req</Badge>
            </Button>

            <Button
              onClick={handleRecalculate}
              loading={recalculating}
              variant="outline"
              fullWidth
            >
              <BarChart3 className="w-4 h-4" />
              Recalcular pontuação
              <Badge variant="gray">0 req</Badge>
            </Button>
          </CardContent>
        </Card>

        {/* Locks */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-yellow-400" />
              <h2 className="text-sm font-semibold text-white">Controle de Prazos</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { key: 'groups_prediction_locked' as const, label: 'Previsão de grupos' },
              { key: 'knockout_prediction_locked' as const, label: 'Mata-mata' },
              { key: 'champion_prediction_locked' as const, label: 'Campeão' },
              { key: 'top_scorer_prediction_locked' as const, label: 'Artilheiro' },
            ].map(({ key, label }) => (
              <div key={key} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{label}</span>
                <button
                  onClick={() => handleToggleLock(key)}
                  className={cn(
                    'flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all',
                    settings?.[key]
                      ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                      : 'bg-green-500/20 text-green-400 border border-green-500/30'
                  )}
                >
                  {settings?.[key]
                    ? <><Lock className="w-3 h-3" /> Bloqueado</>
                    : <><Unlock className="w-3 h-3" /> Aberto</>
                  }
                </button>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Reset Mata-mata */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-red-400" />
              <h2 className="text-sm font-semibold text-white">Resetar Mata-mata</h2>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-gray-400">
              Apaga todas as previsões de mata-mata de todos os participantes. Use quando precisar redesenhar o bracket.
            </p>
            {resetKnockoutMsg && (
              <p className="text-xs text-emerald-400">{resetKnockoutMsg}</p>
            )}
            <Button
              variant="outline"
              fullWidth
              loading={resettingKnockout}
              onClick={async () => {
                if (!confirm('Tem certeza? Isso apagará todas as previsões de mata-mata de todos os usuários.')) return
                setResettingKnockout(true)
                setResetKnockoutMsg('')
                try {
                  const res = await fetch('/api/admin/reset-knockout', { method: 'DELETE' })
                  const data = await res.json()
                  if (res.ok) setResetKnockoutMsg(`✓ ${data.deleted} previsões apagadas.`)
                  else setResetKnockoutMsg(`Erro: ${data.error}`)
                } finally {
                  setResettingKnockout(false)
                }
              }}
            >
              <AlertTriangle className="w-4 h-4 text-red-400" />
              Limpar todas as previsões de mata-mata
            </Button>
          </CardContent>
        </Card>

        {/* Scoring Rules */}
        {rules && (
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-emerald-400" />
                <h2 className="text-sm font-semibold text-white">Pontuação</h2>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {([
                { key: 'exact_score_points', label: 'Placar exato (pts)' },
                { key: 'correct_winner_points', label: 'Vencedor correto (pts)' },
                { key: 'group_qualified_points', label: 'Classificado grupo (pts)' },
                { key: 'knockout_advance_points', label: 'Avança mata-mata (pts)' },
                { key: 'finalist_points', label: 'Finalista (pts)' },
                { key: 'champion_points', label: 'Campeão (pts)' },
                { key: 'top_scorer_points', label: 'Artilheiro (pts)' },
                { key: 'prediction_deadline_hours', label: 'Prazo antecipado (horas — ex: 0.167 = 10min)' },
              ] as const).map(({ key, label }) => (
                <div key={key} className="flex items-center justify-between gap-3">
                  <label className="text-sm text-gray-300">{label}</label>
                  <input
                    type="number"
                    min={0}
                    value={rules[key]}
                    onChange={e => setRules(prev => prev ? { ...prev, [key]: parseInt(e.target.value) || 0 } : prev)}
                    className="w-16 bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-white text-sm text-center focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
                  />
                </div>
              ))}
              <Button onClick={handleSaveRules} loading={savingRules} fullWidth>
                Salvar Regras
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Sync Logs */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-gray-400" />
                <h2 className="text-sm font-semibold text-white">Logs de Sincronização</h2>
              </div>
              <button onClick={fetchData} className="text-xs text-emerald-400 hover:text-emerald-300">
                Atualizar
              </button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <div className="p-4 text-center text-gray-500 text-sm">Nenhum log ainda</div>
            ) : (
              <div className="divide-y divide-white/5">
                {logs.slice(0, 10).map(log => (
                  <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                    {logStatusIcon(log.status)}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-white">{log.type}</span>
                        {log.records_affected > 0 && (
                          <Badge variant="gray">{log.records_affected} registros</Badge>
                        )}
                      </div>
                      {log.message && (
                        <p className="text-xs text-gray-500 truncate mt-0.5">{log.message}</p>
                      )}
                    </div>
                    <span className="text-xs text-gray-600 shrink-0 whitespace-nowrap">
                      {formatRelativeTime(log.created_at)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Confirmação de pagamentos */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <h2 className="text-sm font-semibold text-white">Confirmação de Pagamentos</h2>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="text-emerald-400">{participants.filter(p => p.payment_confirmed).length} confirmados</span>
              <span className="text-gray-600">·</span>
              <span className="text-orange-400">{participants.filter(p => !p.payment_confirmed).length} pendentes</span>
            </div>
          </div>
        </CardHeader>

        {/* Valor do bolão */}
        <div className="px-4 pb-3 flex items-center gap-3 border-b border-white/10">
          <label className="text-sm text-gray-300 shrink-0">Valor por participante (R$)</label>
          <div className="flex items-center gap-2 ml-auto">
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400 text-sm">R$</span>
              <input
                type="number"
                min={0}
                step={5}
                value={entryFee}
                onChange={e => setEntryFee(parseInt(e.target.value) || 0)}
                className="w-24 bg-white/5 border border-white/10 rounded-lg pl-8 pr-2 py-1.5 text-white text-sm text-right focus:outline-none focus:ring-1 focus:ring-emerald-500/50"
              />
            </div>
            <Button
              size="sm"
              variant="secondary"
              onClick={handleSaveEntryFee}
              loading={savingEntryFee}
            >
              Salvar
            </Button>
          </div>
        </div>

        {paymentError && (
          <div className="mx-4 mt-3 flex items-center gap-2 text-red-400 text-xs p-2.5 bg-red-500/10 rounded-lg border border-red-500/20">
            <XCircle className="w-3.5 h-3.5 shrink-0" />
            {paymentError}
          </div>
        )}

        {migrationNeeded && (
          <div className="mx-4 mt-3 flex items-start gap-2 text-yellow-400 text-xs p-2.5 bg-yellow-500/10 rounded-lg border border-yellow-500/20">
            <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>
              Coluna <code className="font-mono bg-yellow-500/20 px-1 rounded">payment_confirmed</code> não existe ainda.
              Execute <code className="font-mono bg-yellow-500/20 px-1 rounded">supabase/add_payment_confirmed.sql</code> no Supabase para habilitar confirmação de pagamentos.
            </span>
          </div>
        )}

        <CardContent className="p-0">
          {participants.length === 0 ? (
            <div className="p-6 text-center space-y-1">
              <p className="text-gray-400 text-sm font-medium">Nenhum participante encontrado</p>
              <p className="text-gray-600 text-xs">
                {loading ? 'Carregando…' : 'Nenhum usuário cadastrado ainda ou erro ao carregar.'}
              </p>
              <button onClick={fetchData} className="mt-2 text-xs text-emerald-400 hover:text-emerald-300 underline underline-offset-2">
                Tentar novamente
              </button>
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {participants.map(p => (
                <div key={p.user_id} className="flex items-center gap-3 px-4 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-white truncate">{p.name}</p>
                    <p className="text-xs text-gray-500">{p.total_points} pts</p>
                  </div>
                  <button
                    onClick={() => togglePayment(p.user_id, p.payment_confirmed)}
                    disabled={togglingPayment === p.user_id}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border min-w-[90px] justify-center',
                      togglingPayment === p.user_id
                        ? 'opacity-50 cursor-not-allowed bg-white/5 text-gray-400 border-white/10'
                        : p.payment_confirmed
                          ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/25'
                          : 'bg-white/5 text-gray-400 border-white/10 hover:border-orange-500/40 hover:text-orange-400'
                    )}
                  >
                    {togglingPayment === p.user_id ? (
                      <span className="inline-block w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
                    ) : p.payment_confirmed ? (
                      <><CheckCircle className="w-3 h-3" /> Pago</>
                    ) : (
                      <><Clock className="w-3 h-3" /> Pendente</>
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="px-4 py-3 border-t border-white/10 flex items-center justify-between">
            <span className="text-xs text-gray-500">
              {participants.filter(p => p.payment_confirmed).length} × R$ {entryFee.toLocaleString('pt-BR')}
            </span>
            <span className="text-sm font-bold text-emerald-400">
              Total: R$ {(participants.filter(p => p.payment_confirmed).length * entryFee).toLocaleString('pt-BR')}
            </span>
          </div>
        </CardContent>
      </Card>

      {/* Enviar notificação */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Megaphone className="w-4 h-4 text-blue-400" />
            <h2 className="text-sm font-semibold text-white">Enviar Aviso para Todos</h2>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {notifSent && (
            <div className="flex items-center gap-2 text-green-400 text-xs p-2.5 bg-green-500/10 rounded-lg border border-green-500/20">
              <CheckCircle className="w-4 h-4" /> Notificação enviada com sucesso!
            </div>
          )}
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Título</label>
            <input
              type="text"
              value={notifTitle}
              onChange={e => setNotifTitle(e.target.value)}
              placeholder="Ex: Palpites abertos para a fase final!"
              maxLength={80}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Mensagem</label>
            <textarea
              value={notifBody}
              onChange={e => setNotifBody(e.target.value)}
              placeholder="Escreva o conteúdo do aviso..."
              rows={3}
              maxLength={300}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50 resize-none"
            />
          </div>
          <div>
            <label className="text-xs text-gray-400 mb-1 block">Link (opcional)</label>
            <input
              type="text"
              value={notifUrl}
              onChange={e => setNotifUrl(e.target.value)}
              placeholder="/mata-mata"
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm placeholder-gray-600 focus:outline-none focus:ring-1 focus:ring-blue-500/50"
            />
          </div>
          <Button
            onClick={handleSendNotification}
            loading={sendingNotif}
            disabled={!notifTitle.trim() || !notifBody.trim()}
            fullWidth
          >
            <Megaphone className="w-4 h-4" />
            Enviar para todos os usuários
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
