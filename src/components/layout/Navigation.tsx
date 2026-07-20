'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, Calendar, Star, Trophy, Eye, GitBranch,
  Swords, Settings, LogOut, Medal, TrendingUp, Crown
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { Avatar } from '../ui/Avatar'
import { NotificationBell } from '../notifications/NotificationBell'
import { BolaoLogo } from '../ui/BolaoLogo'
import type { UserProfile } from '@/types'

const navItems = [
  { href: '/dashboard',     icon: LayoutDashboard, label: 'Dashboard',   mobileLabel: 'Início'    },
  { href: '/jogos',         icon: Calendar,        label: 'Jogos',        mobileLabel: 'Jogos'     },
  { href: '/meus-palpites', icon: Star,            label: 'Meus Palpites',mobileLabel: 'Palpites'  },
  { href: '/ranking',       icon: Trophy,          label: 'Ranking',      mobileLabel: 'Ranking'   },
  { href: '/classificados',  icon: TrendingUp,      label: 'Classificados',   mobileLabel: 'Grupos'  },
  { href: '/galera',         icon: Eye,             label: 'Palpites Galera', mobileLabel: 'Galera'  },
  { href: '/mata-mata',     icon: GitBranch,       label: 'Mata-mata',    mobileLabel: 'Mata-mata' },
  { href: '/artilheiros',   icon: Swords,          label: 'Artilheiros',  mobileLabel: 'Gols'      },
  { href: '/premiacao',     icon: Medal,           label: 'Premiação',    mobileLabel: 'Prêmio'   },
  { href: '/homenagem',    icon: Crown,           label: 'Campeão',      mobileLabel: 'Campeão'  },
]

interface NavigationProps {
  profile: UserProfile | null
  isAdmin?: boolean
}

export function Navigation({ profile, isAdmin }: NavigationProps) {
  const pathname = usePathname()
  const router = useRouter()

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
  }

  const mobileItems = [
    ...navItems,
    ...(isAdmin ? [{ href: '/admin', icon: Settings, label: 'Admin', mobileLabel: 'Admin' }] : []),
  ]

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex flex-col w-64 bg-[#060c18]/80 backdrop-blur-md border-r border-white/[0.08] h-screen sticky top-0 p-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <BolaoLogo size={36} />
          <div>
            <p className="font-bold text-white text-sm leading-tight">Bolão da Copa</p>
            <p className="text-xs text-gray-400">FIFA 2026</p>
          </div>
        </div>

        {/* Nav Links */}
        <nav className="flex-1 space-y-1">
          {navItems.map(({ href, icon: Icon, label }) => (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                pathname === href || pathname.startsWith(href + '/')
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'text-gray-300 hover:text-white hover:bg-white/10'
              )}
            >
              <Icon className="w-4 h-4" />
              {label}
            </Link>
          ))}

          {isAdmin && (
            <Link
              href="/admin"
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                pathname.startsWith('/admin')
                  ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                  : 'text-gray-400 hover:text-white hover:bg-white/10'
              )}
            >
              <Settings className="w-4 h-4" />
              Admin
            </Link>
          )}
        </nav>

        {/* User Profile */}
        <div className="border-t border-white/10 pt-4 mt-4">
          <div className="flex items-center gap-3 px-2 mb-3">
            <Avatar src={profile?.avatar_url} name={profile?.name || 'U'} size="sm" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{profile?.name}</p>
              <p className="text-xs text-emerald-400">{profile?.total_points || 0} pts</p>
            </div>
            <NotificationBell />
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2.5 rounded-lg text-sm text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-all"
          >
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Nav — scroll horizontal com todos os itens */}
      <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-50 bg-[#060c18]/95 backdrop-blur-md border-t border-white/[0.12]">
        {/* Fade direita indica que há mais itens */}
        <div className="relative">
          <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-8 z-10 bg-gradient-to-l from-black/90 to-transparent" />
          <div className="flex overflow-x-auto scrollbar-hide">
            {mobileItems.map(({ href, icon: Icon, mobileLabel }) => {
              const active = pathname === href || pathname.startsWith(href + '/')
              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    'relative flex flex-col items-center justify-center gap-1 py-2.5 shrink-0 min-w-[60px] transition-all',
                    active ? 'text-emerald-400' : 'text-gray-400'
                  )}
                >
                  <Icon className="w-5 h-5" />
                  <span className={cn(
                    'text-[10px] leading-none font-medium',
                    active ? 'text-emerald-400' : 'text-gray-400'
                  )}>
                    {mobileLabel}
                  </span>
                  {active && (
                    <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full bg-emerald-400" />
                  )}
                </Link>
              )
            })}
          </div>
        </div>
      </nav>
    </>
  )
}
