import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Navigation } from '@/components/layout/Navigation'
import { MobileHeader } from '@/components/layout/MobileHeader'
import { OnboardingModal } from '@/components/onboarding/OnboardingModal'
import CR7Effect from '@/components/CR7Effect'

export default async function MainLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  return (
    <div className="flex min-h-screen" style={{ background: 'linear-gradient(160deg, #080e1a 0%, #0d1f3c 40%, #0a1628 70%, #080e1a 100%)' }}>
      <Navigation profile={profile} isAdmin={profile?.is_admin} />

      <div className="flex-1 flex flex-col overflow-x-hidden lg:overflow-hidden">
        <MobileHeader profile={profile} isAdmin={profile?.is_admin} />

        <main className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto p-4 lg:p-6 pb-28 lg:pb-6">
            {children}
          </div>
        </main>
        <OnboardingModal />
        <CR7Effect />
      </div>
    </div>
  )
}
