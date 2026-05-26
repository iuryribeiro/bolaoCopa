import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('competition_settings')
      .select('*')
      .eq('is_active', true)
      .single()

    if (error) throw error
    return NextResponse.json({ settings: data })
  } catch (error) {
    return NextResponse.json({ settings: null, error: 'Erro ao buscar configurações' }, { status: 500 })
  }
}
