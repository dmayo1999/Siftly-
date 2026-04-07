import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { resolveAnthropicClient, getCliAuthStatus } from '@/lib/claude-cli-auth'
import { resolveOpenAIClient } from '@/lib/openai-auth'

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: { provider?: string } = {}
  try {
    const text = await request.text()
    if (text.trim()) body = JSON.parse(text)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const provider = body.provider ?? 'anthropic'

  if (provider === 'anthropic') {
    const setting = await prisma.setting.findUnique({ where: { key: 'anthropicApiKey' } })
    const dbKey = setting?.value?.trim()
    const modelSetting = await prisma.setting.findUnique({ where: { key: 'anthropicModel' } })
    const model = modelSetting?.value?.trim() || 'claude-3-5-sonnet-latest'

    let client
    try {
      client = resolveAnthropicClient({ dbKey })
    } catch {
      const cliStatus = getCliAuthStatus()
      if (cliStatus.available && cliStatus.expired) {
        return NextResponse.json({ working: false, error: 'Claude CLI session expired — run `claude` to refresh' })
      }
      return NextResponse.json({ working: false, error: 'No API key found. Add one in Settings or log in with Claude CLI.' })
    }

    try {
      await client.messages.create({
        model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      })
      return NextResponse.json({ working: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const friendly = msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('authentication')
        ? 'Invalid API key'
        : msg.includes('403')
        ? 'Key does not have permission'
        : msg.includes('404')
        ? `Model "${model}" not found on this provider`
        : msg.slice(0, 120)
      return NextResponse.json({ working: false, error: friendly })
    }
  }

  if (provider === 'openai') {
    const setting = await prisma.setting.findUnique({ where: { key: 'openaiApiKey' } })
    const dbKey = setting?.value?.trim()
    const urlSetting = await prisma.setting.findUnique({ where: { key: 'openaiBaseUrl' } })
    const baseURL = urlSetting?.value?.trim()
    const modelSetting = await prisma.setting.findUnique({ where: { key: 'openaiModel' } })
    const model = modelSetting?.value?.trim() || 'gpt-4o-mini'

    let client
    try {
      client = resolveOpenAIClient({ dbKey, baseURL: baseURL || undefined })
    } catch {
      return NextResponse.json({ working: false, error: 'No OpenAI API key found. Add one in Settings.' })
    }

    try {
      await client.chat.completions.create({
        model,
        max_tokens: 5,
        messages: [{ role: 'user', content: 'hi' }],
      })
      return NextResponse.json({ working: true })
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      const friendly = msg.includes('401') || msg.includes('invalid_api_key') || msg.includes('authentication')
        ? `Invalid API key (tested against ${baseURL || 'OpenAI'})`
        : msg.includes('403')
        ? 'Key does not have permission'
        : msg.includes('404') || msg.includes('not_found')
        ? `Model "${model}" not found on this provider`
        : msg.slice(0, 120)
      return NextResponse.json({ working: false, error: friendly })
    }
  }

  return NextResponse.json({ error: 'Unknown provider' }, { status: 400 })
}
