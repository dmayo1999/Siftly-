import { NextRequest, NextResponse } from 'next/server'
import prisma from '@/lib/db'
import { invalidateSettingsCache } from '@/lib/settings'

function maskKey(raw: string | null): string | null {
  if (!raw) return null
  if (raw.length <= 8) return '********'
  return `${raw.slice(0, 6)}${'*'.repeat(raw.length - 10)}${raw.slice(-4)}`
}

const ALLOWED_ANTHROPIC_MODELS = [
  'claude-3-5-sonnet-latest',
  'claude-3-5-haiku-latest',
  'claude-3-opus-latest',
  'claude-3-sonnet-20240229',
  'claude-3-haiku-20240307',
] as const

// For OpenAI/OpenRouter, we'll allow free-form input in the UI, 
// but keep these as "quick select" defaults.
const DEFAULT_OPENAI_MODELS = [
  'gpt-4o',
  'gpt-4o-mini',
  'o1',
  'o1-mini',
]

export async function GET(): Promise<NextResponse> {
  try {
    const [
      anthropic, 
      anthropicModel, 
      provider, 
      openai, 
      openaiModel, 
      openaiBaseUrl,
      xClientId, 
      xClientSecret
    ] = await Promise.all([
      prisma.setting.findUnique({ where: { key: 'anthropicApiKey' } }),
      prisma.setting.findUnique({ where: { key: 'anthropicModel' } }),
      prisma.setting.findUnique({ where: { key: 'aiProvider' } }),
      prisma.setting.findUnique({ where: { key: 'openaiApiKey' } }),
      prisma.setting.findUnique({ where: { key: 'openaiModel' } }),
      prisma.setting.findUnique({ where: { key: 'openaiBaseUrl' } }),
      prisma.setting.findUnique({ where: { key: 'x_oauth_client_id' } }),
      prisma.setting.findUnique({ where: { key: 'x_oauth_client_secret' } }),
    ])

    return NextResponse.json({
      provider: provider?.value ?? 'anthropic',
      anthropicApiKey: maskKey(anthropic?.value ?? null),
      hasAnthropicKey: anthropic !== null,
      anthropicModel: anthropicModel?.value ?? 'claude-3-5-sonnet-latest',
      openaiApiKey: maskKey(openai?.value ?? null),
      hasOpenaiKey: openai !== null,
      openaiModel: openaiModel?.value ?? 'gpt-4o-mini',
      openaiBaseUrl: openaiBaseUrl?.value ?? '',
      xOAuthClientId: maskKey(xClientId?.value ?? null),
      xOAuthClientSecret: maskKey(xClientSecret?.value ?? null),
      hasXOAuth: !!xClientId?.value,
    })
  } catch (err) {
    console.error('Settings GET error:', err)
    return NextResponse.json(
      { error: `Failed to fetch settings: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  let body: {
    anthropicApiKey?: string
    anthropicModel?: string
    provider?: string
    openaiApiKey?: string
    openaiModel?: string
    openaiBaseUrl?: string
    xOAuthClientId?: string
    xOAuthClientSecret?: string
  } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { 
    anthropicApiKey, 
    anthropicModel, 
    provider, 
    openaiApiKey, 
    openaiModel,
    openaiBaseUrl 
  } = body

  try {
    // Save provider if provided
    if (provider !== undefined) {
      if (provider !== 'anthropic' && provider !== 'openai') {
        return NextResponse.json({ error: 'Invalid provider. Must be anthropic or openai.' }, { status: 400 })
      }
      await prisma.setting.upsert({
        where: { key: 'aiProvider' },
        update: { value: provider },
        create: { key: 'aiProvider', value: provider },
      })
      invalidateSettingsCache()
      return NextResponse.json({ saved: true })
    }

    // Save Anthropic model if provided
    if (anthropicModel !== undefined) {
      await prisma.setting.upsert({
        where: { key: 'anthropicModel' },
        update: { value: anthropicModel },
        create: { key: 'anthropicModel', value: anthropicModel },
      })
      invalidateSettingsCache()
      return NextResponse.json({ saved: true })
    }

    // Save OpenAI model if provided
    if (openaiModel !== undefined) {
      await prisma.setting.upsert({
        where: { key: 'openaiModel' },
        update: { value: openaiModel },
        create: { key: 'openaiModel', value: openaiModel },
      })
      invalidateSettingsCache()
      return NextResponse.json({ saved: true })
    }

    // Save OpenAI Base URL if provided
    if (openaiBaseUrl !== undefined) {
      await prisma.setting.upsert({
        where: { key: 'openaiBaseUrl' },
        update: { value: openaiBaseUrl.trim() },
        create: { key: 'openaiBaseUrl', value: openaiBaseUrl.trim() },
      })
      invalidateSettingsCache()
      return NextResponse.json({ saved: true })
    }

    // Save Anthropic key if provided
    if (anthropicApiKey !== undefined) {
      const trimmed = anthropicApiKey.trim()
      await prisma.setting.upsert({
        where: { key: 'anthropicApiKey' },
        update: { value: trimmed },
        create: { key: 'anthropicApiKey', value: trimmed },
      })
      invalidateSettingsCache()
      return NextResponse.json({ saved: true })
    }

    // Save OpenAI key if provided
    if (openaiApiKey !== undefined) {
      const trimmed = openaiApiKey.trim()
      await prisma.setting.upsert({
        where: { key: 'openaiApiKey' },
        update: { value: trimmed },
        create: { key: 'openaiApiKey', value: trimmed },
      })
      invalidateSettingsCache()
      return NextResponse.json({ saved: true })
    }

    // Save X OAuth credentials if provided
    const { xOAuthClientId, xOAuthClientSecret } = body
    if (xOAuthClientId !== undefined || xOAuthClientSecret !== undefined) {
      if (xOAuthClientId !== undefined) {
        await prisma.setting.upsert({
          where: { key: 'x_oauth_client_id' },
          update: { value: xOAuthClientId.trim() },
          create: { key: 'x_oauth_client_id', value: xOAuthClientId.trim() },
        })
      }
      if (xOAuthClientSecret !== undefined) {
        await prisma.setting.upsert({
          where: { key: 'x_oauth_client_secret' },
          update: { value: xOAuthClientSecret.trim() },
          create: { key: 'x_oauth_client_secret', value: xOAuthClientSecret.trim() },
        })
      }
      return NextResponse.json({ saved: true })
    }

    return NextResponse.json({ error: 'No setting provided' }, { status: 400 })
  } catch (err) {
    console.error('Settings POST error:', err)
    // Return specific error to help diagnostic (DB locks, etc)
    return NextResponse.json(
      { error: `Database error: ${err instanceof Error ? err.message : String(err)}` },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest): Promise<NextResponse> {
  let body: { key?: string } = {}
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const allowed = [
    'anthropicApiKey', 
    'openaiApiKey', 
    'openaiBaseUrl',
    'x_oauth_client_id', 
    'x_oauth_client_secret'
  ]
  if (!body.key || !allowed.includes(body.key)) {
    return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
  }

  await prisma.setting.deleteMany({ where: { key: body.key } })
  invalidateSettingsCache()
  return NextResponse.json({ deleted: true })
}
