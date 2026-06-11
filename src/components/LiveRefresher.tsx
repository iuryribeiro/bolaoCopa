'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw } from 'lucide-react'

interface LiveRefresherProps {
  intervalSeconds?: number
  active?: boolean
}

export function LiveRefresher({ intervalSeconds = 60, active = true }: LiveRefresherProps) {
  const router = useRouter()
  const [lastUpdate, setLastUpdate] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const nextRefreshRef = useRef(intervalSeconds)

  useEffect(() => {
    if (!active) return

    const ticker = setInterval(() => {
      setLastUpdate(prev => prev + 1)
      nextRefreshRef.current -= 1

      if (nextRefreshRef.current <= 0) {
        nextRefreshRef.current = intervalSeconds
        setRefreshing(true)
        setLastUpdate(0)
        // Sincroniza com API externa antes de atualizar a UI
        fetch('/api/football/live').finally(() => {
          router.refresh()
          setTimeout(() => setRefreshing(false), 1000)
        })
      }
    }, 1000)

    return () => clearInterval(ticker)
  }, [active, intervalSeconds, router])

  if (!active) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-gray-600">
      <RefreshCw className={`w-3 h-3 ${refreshing ? 'animate-spin text-emerald-400' : ''}`} />
      <span>
        {refreshing
          ? 'Atualizando…'
          : lastUpdate === 0
            ? 'Atualizado agora'
            : `Atualizado há ${lastUpdate}s`}
      </span>
      <span className="text-gray-700">· próximo em {nextRefreshRef.current}s</span>
    </div>
  )
}
