'use client'

import { useState, useEffect, useCallback, useId } from 'react'
import { createPortal } from 'react-dom'
import { Bell, X, Trophy, Calendar, Megaphone, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import { cn, formatRelativeTime } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'

interface Notification {
  id: string
  title: string
  body: string
  type: string
  action_url: string | null
  created_at: string
  read: boolean
}

const typeIcon = {
  announcement: Megaphone,
  match_result: Trophy,
  deadline: Calendar,
}

const typeColor = {
  announcement: 'text-blue-400 bg-blue-500/10',
  match_result: 'text-emerald-400 bg-emerald-500/10',
  deadline: 'text-orange-400 bg-orange-500/10',
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [mounted, setMounted] = useState(false)
  const instanceId = useId()

  const unread = notifications.filter(n => !n.read).length

  useEffect(() => { setMounted(true) }, [])

  const fetchNotifications = useCallback(async () => {
    try {
      const res = await fetch('/api/notifications')
      const data = await res.json()
      setNotifications(data.notifications || [])
    } catch {}
  }, [])

  useEffect(() => {
    fetchNotifications()

    const supabase = createClient()
    const channel = supabase
      .channel(`notif-${instanceId.replace(/:/g, '')}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications' },
        () => fetchNotifications())
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [fetchNotifications, instanceId])

  const markAllRead = useCallback(async () => {
    const unreadIds = notifications.filter(n => !n.read).map(n => n.id)
    if (!unreadIds.length) return
    setNotifications(prev => prev.map(n => ({ ...n, read: true })))
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notification_ids: unreadIds }),
    })
  }, [notifications])

  const handleOpen = () => {
    setOpen(true)
    markAllRead()
  }

  const modal = mounted && open ? createPortal(
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setOpen(false)} />

      {/* Painel */}
      <div className="relative w-full max-w-sm bg-[#0d1520] border border-white/10 rounded-2xl shadow-2xl flex flex-col max-h-[80vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gray-400" />
            <span className="text-sm font-semibold text-white">Notificações</span>
            {unread > 0 && (
              <span className="px-1.5 py-0.5 rounded-full text-xs font-bold bg-red-500/20 text-red-400">
                {unread}
              </span>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Lista */}
        <div className="overflow-y-auto flex-1">
          {notifications.length === 0 ? (
            <div className="py-12 text-center">
              <Bell className="w-10 h-10 mx-auto mb-3 text-gray-600" />
              <p className="text-sm text-gray-400">Nenhuma notificação ainda</p>
              <p className="text-xs text-gray-600 mt-1">Você verá avisos e resultados aqui</p>
            </div>
          ) : (
            notifications.map(n => {
              const IconComp = typeIcon[n.type as keyof typeof typeIcon] || Megaphone
              const colorClass = typeColor[n.type as keyof typeof typeColor] || typeColor.announcement

              const content = (
                <div className={cn(
                  'flex items-start gap-3 px-4 py-3.5 border-b border-white/5 last:border-0',
                  !n.read ? 'bg-white/[0.03]' : ''
                )}>
                  <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5', colorClass)}>
                    <IconComp className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className={cn('text-xs font-semibold leading-snug', n.read ? 'text-gray-300' : 'text-white')}>
                        {n.title}
                      </p>
                      {!n.read && <span className="w-1.5 h-1.5 rounded-full bg-blue-400 shrink-0 mt-1" />}
                    </div>
                    <p className="text-xs text-gray-500 mt-1 leading-relaxed">{n.body}</p>
                    <p className="text-xs text-gray-600 mt-1.5">{formatRelativeTime(n.created_at)}</p>
                  </div>
                  {n.action_url && <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0 mt-1" />}
                </div>
              )

              return n.action_url ? (
                <Link key={n.id} href={n.action_url} onClick={() => setOpen(false)}>
                  {content}
                </Link>
              ) : (
                <div key={n.id}>{content}</div>
              )
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  ) : null

  return (
    <>
      <button
        onClick={handleOpen}
        className="relative p-2.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/10 transition-all"
        aria-label="Notificações"
      >
        <Bell className="w-5 h-5" />
        {unread > 0 && (
          <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
        )}
      </button>
      {modal}
    </>
  )
}
