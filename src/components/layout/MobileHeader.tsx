'use client'

import Link from 'next/link'
import { Settings } from 'lucide-react'
import { Avatar } from '../ui/Avatar'
import { NotificationBell } from '../notifications/NotificationBell'
import { BolaoLogoSmall } from '../ui/BolaoLogo'
import type { UserProfile } from '@/types'

interface MobileHeaderProps {
  profile: UserProfile | null
  isAdmin?: boolean
}

export function MobileHeader({ profile, isAdmin }: MobileHeaderProps) {
  return (
    <header className="lg:hidden sticky top-0 z-40 bg-[#060c18]/85 backdrop-blur-md border-b border-white/[0.1] px-4 py-3">
      <div className="flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center gap-2">
          <BolaoLogoSmall size={32} />
          <span className="font-bold text-white text-sm">Bolão 2026</span>
        </Link>

        <div className="flex items-center gap-1">
          <NotificationBell />
          {isAdmin && (
            <Link href="/admin" className="p-2.5 rounded-lg hover:bg-white/10 text-gray-400 hover:text-white transition-all">
              <Settings className="w-5 h-5" />
            </Link>
          )}
          <Link href="/perfil">
            <Avatar src={profile?.avatar_url} name={profile?.name || 'U'} size="sm" />
          </Link>
        </div>
      </div>
    </header>
  )
}
