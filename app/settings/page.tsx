'use client'

import { useState, useEffect } from 'react'
import {
  Eye,
  EyeOff,
  Download,
  Check,
  AlertCircle,
  Key,
  Database,
  Info,
  Trash2,
  Shield,
  ExternalLink,
  ChevronDown,
  Zap,
  Copy,
  Coffee,
  Terminal,
  Loader2,
  X,
  Globe,
  Cpu
} from 'lucide-react'

const ANTHROPIC_MODELS = [
  { value: 'claude-3-5-sonnet-latest', label: 'Sonnet 3.5' },
  { value: 'claude-3-5-haiku-latest', label: 'Haiku 3.5' },
  { value: 'claude-3-opus-latest', label: 'Opus 3' },
]

const OPENAI_MODELS = [
  { value: 'gpt-4o', label: 'GPT-4o' },
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
  { value: 'o1', label: 'o1' },
  { value: 'o1-mini', label: 'o1-mini' },
]

interface Toast {
  type: 'success' | 'error'
  message: string
}

function ToastAlert({ toast }: { toast: Toast }) {
  return (
    <div
      className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium border animate-in fade-in slide-in-from-top-2 ${
        toast.type === 'success'
          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
          : 'bg-red-500/10 text-red-400 border-red-500/20'
      }`}
    >
      {toast.type === 'success' ? <Check size={15} className="shrink-0" /> : <AlertCircle size={15} className="shrink-0" />}
      <span className="break-words">{toast.message}</span>
    </div>
  )
}

interface SectionProps {
  icon: React.ComponentType<{ size?: number; className?: string }>
  title: string
  description: string
  children: React.ReactNode
  variant?: 'default' | 'danger'
}

function Section({ icon: Icon, title, description, children, variant = 'default' }: SectionProps) {
  const isDanger = variant === 'danger'
  return (
    <div
      className={`bg-zinc-900 rounded-2xl p-6 transition-all duration-200 ${
        isDanger
          ? 'border border-red-700/60 hover:border-red-600/70'
          : 'border border-zinc-800 hover:border-zinc-700'
      }`}
    >
      <div className="flex items-start gap-3 mb-5">
        <div
          className={`p-2.5 rounded-xl shrink-0 ${
            isDanger ? 'bg-red-800/40' : 'bg-indigo-500/10'
          }`}
        >
          <Icon size={16} className={isDanger ? 'text-red-500' : 'text-indigo-400'} />
        </div>
        <div>
          <h2 className={`text-base font-semibold ${isDanger ? 'text-red-400' : 'text-zinc-100'}`}>
            {title}
          </h2>
          <p className="text-sm text-zinc-500 mt-0.5 leading-relaxed">{description}</p>
        </div>
      </div>
      {children}
    </div>
  )
}

function ApiKeyField({
  label,
  placeholder,
  fieldKey,
  hint,
  docHref,
  onToast,
  testProvider,
}: {
  label: string
  placeholder: string
  fieldKey: 'anthropicApiKey' | 'openaiApiKey'
  hint: string
  docHref: string
  onToast: (t: Toast) => void
  testProvider?: string
}) {
  const [key, setKey] = useState('')
  const [showKey, setShowKey] = useState(false)
  const [saving, setSaving] = useState(false)
  const [removing, setRemoving] = useState(false)
  const [savedMasked, setSavedMasked] = useState<string | null>(null)
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle')
  const [testError, setTestError] = useState('')

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: Record<string, unknown>) => {
        const hasKeyField = fieldKey === 'openaiApiKey' ? 'hasOpenaiKey' : 'hasAnthropicKey'
        const hasKey = d[hasKeyField]
        const masked = d[fieldKey] as string | null
        if (hasKey && masked) setSavedMasked(masked)
      })
      .catch(() => {})
  }, [fieldKey])

  async function handleSave() {
    if (!key.trim()) {
      onToast({ type: 'error', message: 'Please enter an API key' })
      return
    }
    setSaving(true)
    setTestState('idle')
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [fieldKey]: key.trim() }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      
      setSavedMasked(key.trim().slice(0, 6) + '••••••••' + key.trim().slice(-4))
      setKey('')
      if (testProvider) void handleTest()
      else onToast({ type: 'success', message: `${label} saved successfully` })
    } catch (err) {
      onToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Failed to save API key',
      })
    } finally {
      setSaving(false)
    }
  }

  async function handleRemove() {
    setRemoving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key: fieldKey }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to remove')
      
      setSavedMasked(null)
      setTestState('idle')
      onToast({ type: 'success', message: `${label} removed` })
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to remove key' })
    } finally {
      setRemoving(false)
    }
  }

  async function handleTest() {
    if (!testProvider) return
    setTestState('testing')
    setTestError('')
    try {
      const res = await fetch('/api/settings/test', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: testProvider }),
      })
      const data = await res.json() as { working: boolean; error?: string }
      if (data.working) {
        setTestState('ok')
        onToast({ type: 'success', message: `${label} is working` })
      } else {
        setTestState('fail')
        setTestError(data.error ?? 'Key test failed')
      }
    } catch {
      setTestState('fail')
      setTestError('Connection error')
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between gap-2 min-w-0">
        <p className="text-sm font-medium text-zinc-300 shrink-0">{label}</p>
        <div className="flex items-center gap-2 min-w-0 overflow-hidden">
          {savedMasked && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-lg min-w-0 overflow-hidden">
              <Check size={11} className="shrink-0" /> <span className="shrink-0">Saved:</span> <span className="font-mono truncate">{savedMasked}</span>
            </span>
          )}
          {savedMasked && (
            <button
              onClick={() => void handleRemove()}
              disabled={removing}
              className="shrink-0 text-xs text-red-500/70 hover:text-red-400 transition-colors disabled:opacity-50"
              title="Remove saved key"
            >
              {removing ? 'Removing…' : 'Remove'}
            </button>
          )}
          {testProvider && savedMasked && testState === 'idle' && (
            <button
              onClick={() => void handleTest()}
              className="shrink-0 text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
            >
              Test
            </button>
          )}
          {testState === 'testing' && (
            <span className="flex items-center gap-1 text-xs text-zinc-400 shrink-0">
              <Loader2 size={11} className="animate-spin" /> Testing…
            </span>
          )}
          {testState === 'ok' && (
            <span className="flex items-center gap-1 text-xs text-emerald-400 shrink-0">
              <Check size={11} /> Working
            </span>
          )}
          {testState === 'fail' && (
            <span className="flex items-center gap-1 text-xs text-red-400 shrink-0" title={testError}>
              <X size={11} /> {testError.slice(0, 30) || 'Failed'}
            </span>
          )}
        </div>
      </div>
      <div className="flex gap-2.5">
        <div className="relative flex-1">
          <input
            type={showKey ? 'text' : 'password'}
            value={key}
            onChange={(e) => setKey(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void handleSave()}
            placeholder={savedMasked ? 'Enter new key to replace…' : placeholder}
            className="w-full px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-500 text-sm focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20 transition-all duration-200 pr-10 font-mono"
          />
          <button
            type="button"
            onClick={() => setShowKey((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 transition-colors"
            aria-label={showKey ? 'Hide key' : 'Show key'}
          >
            {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
          </button>
        </div>
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium transition-colors shrink-0"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
      </div>
      <div className="flex items-center justify-between">
        <p className="text-xs text-zinc-600">{hint}</p>
        <a
          href={docHref}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-indigo-500 hover:text-indigo-400 transition-colors"
        >
          Get key <ExternalLink size={11} />
        </a>
      </div>
    </div>
  )
}

function ModelInput({
  suggestions,
  settingKey,
  defaultValue,
  onToast,
}: {
  suggestions: { value: string; label: string }[]
  settingKey: 'anthropicModel' | 'openaiModel'
  defaultValue: string
  onToast: (t: Toast) => void
}) {
  const [value, setValue] = useState(defaultValue)
  const [saved, setSaved] = useState(false)
  const [isFocused, setIsFocused] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => { if (d[settingKey]) setValue(d[settingKey] as string) })
      .catch(() => {})
  }, [settingKey])

  async function handleSave(newModel: string) {
    setValue(newModel)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [settingKey]: newModel.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      onToast({ type: 'error', message: 'Failed to save model preference' })
    }
  }

  return (
    <div className="mt-4">
      <div className="flex items-center gap-2 mb-2">
        <Cpu size={14} className="text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-300">Target Model</span>
      </div>
      <div className="relative group">
        <div className="flex gap-2">
          <input
            type="text"
            value={value}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. gpt-4o, anthropic/claude-3-haiku..."
            className="flex-1 px-3.5 py-2.5 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-100 placeholder:text-zinc-600 text-sm focus:outline-none focus:border-indigo-500 font-mono transition-all"
          />
          <button
            onClick={() => void handleSave(value)}
            className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-300 transition-all"
          >
            {saved ? <Check size={14} className="text-emerald-400" /> : 'Apply'}
          </button>
        </div>
        
        {isFocused && suggestions.length > 0 && (
          <div className="absolute top-full left-0 right-0 mt-1.5 p-1 rounded-xl bg-zinc-800 border border-zinc-700 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100">
            {suggestions.map((s) => (
              <button
                key={s.value}
                onClick={() => void handleSave(s.value)}
                className="w-full text-left px-3 py-2 rounded-lg text-xs hover:bg-zinc-700 text-zinc-400 hover:text-zinc-100 transition-colors flex justify-between items-center"
              >
                <span>{s.label}</span>
                <span className="font-mono text-[10px] opacity-40">{s.value}</span>
              </button>
            ))}
          </div>
        )}
      </div>
      <p className="text-[10px] text-zinc-600 mt-2 italic">Type any model name compatible with your provider/router.</p>
    </div>
  )
}

function BaseUrlField({ onToast }: { onToast: (t: Toast) => void }) {
  const [url, setUrl] = useState('')
  const [saved, setSaved] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d) => { if (d.openaiBaseUrl) setUrl(d.openaiBaseUrl) })
      .catch(() => {})
  }, [])

  async function handleSave() {
    setSaving(true)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ openaiBaseUrl: url.trim() }),
      })
      if (!res.ok) throw new Error('Failed')
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } catch {
      onToast({ type: 'error', message: 'Failed to save Base URL' })
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="mt-5 pt-5 border-t border-zinc-800/50">
      <div className="flex items-center gap-2 mb-2">
        <Globe size={14} className="text-zinc-400" />
        <span className="text-xs font-semibold text-zinc-300">Custom Base URL (OpenRouter / Proxy)</span>
      </div>
      <div className="flex gap-2">
        <input
          type="text"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="e.g. https://openrouter.ai/api/v1"
          className="flex-1 px-3.5 py-2 rounded-xl bg-zinc-800 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 text-xs focus:outline-none focus:border-indigo-500 font-mono transition-all"
        />
        <button
          onClick={() => void handleSave()}
          disabled={saving}
          className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs font-medium text-zinc-400 transition-all shrink-0"
        >
          {saving ? '...' : saved ? <Check size={14} className="text-emerald-400" /> : 'Set URL'}
        </button>
      </div>
      <p className="text-[10px] text-zinc-600 mt-2">Required for OpenRouter or self-hosted LLM proxies. Leave blank for standard OpenAI.</p>
    </div>
  )
}

function ProviderToggle({ value, onChange }: { value: 'anthropic' | 'openai'; onChange: (v: 'anthropic' | 'openai') => void }) {
  return (
    <div className="flex items-center gap-1 p-1 rounded-xl bg-zinc-800 border border-zinc-700 mb-5 text-[13px]">
      <button
        onClick={() => onChange('anthropic')}
        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
          value === 'anthropic'
            ? 'bg-zinc-700 text-indigo-400 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        Anthropic (Claude)
      </button>
      <button
        onClick={() => onChange('openai')}
        className={`flex-1 px-4 py-2 rounded-lg font-medium transition-all ${
          value === 'openai'
            ? 'bg-zinc-700 text-emerald-400 shadow-sm'
            : 'text-zinc-500 hover:text-zinc-300'
        }`}
      >
        OpenAI (GPT / Router)
      </button>
    </div>
  )
}

function ApiKeySection({ onToast }: { onToast: (t: Toast) => void }) {
  const [provider, setProvider] = useState<'anthropic' | 'openai' | null>(null)

  useEffect(() => {
    fetch('/api/settings')
      .then((r) => r.json())
      .then((d: { provider?: string }) => {
        setProvider(d.provider === 'openai' ? 'openai' : 'anthropic')
      })
      .catch(() => setProvider('anthropic'))
  }, [])

  async function handleProviderChange(newProvider: 'anthropic' | 'openai') {
    const prev = provider
    setProvider(newProvider)
    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ provider: newProvider }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to save')
      onToast({ type: 'success', message: `Switched to ${newProvider === 'openai' ? 'OpenAI / Router' : 'Anthropic'}` })
    } catch (err) {
      setProvider(prev) // revert on failure
      onToast({ 
        type: 'error', 
        message: err instanceof Error ? err.message : 'Failed to save provider preference' 
      })
    }
  }

  if (provider === null) {
    return (
      <Section icon={Key} title="AI Provider" description="Loading settings…">
        <div className="flex items-center gap-2 text-sm text-zinc-500 py-4"><Loader2 size={16} className="animate-spin" /></div>
      </Section>
    )
  }

  return (
    <Section
      icon={Key}
      title="AI Provider"
      description="Choose your AI provider and configure keys. CLI auth handles billing automatically."
    >
      <ProviderToggle value={provider} onChange={(v) => void handleProviderChange(v)} />

      {provider === 'anthropic' ? (
        <div className="space-y-5 animate-in fade-in duration-300">
          <ApiKeyField
            label="Anthropic (Claude)"
            placeholder="sk-ant-..."
            fieldKey="anthropicApiKey"
            hint="API key used for enrichment and categorization."
            docHref="https://console.anthropic.com"
            onToast={onToast}
            testProvider="anthropic"
          />
          <ModelInput
            suggestions={ANTHROPIC_MODELS}
            settingKey="anthropicModel"
            defaultValue="claude-3-5-sonnet-latest"
            onToast={onToast}
          />
        </div>
      ) : (
        <div className="space-y-5 animate-in fade-in duration-300">
          <ApiKeyField
            label="OpenAI / OpenRouter Key"
            placeholder="sk-..."
            fieldKey="openaiApiKey"
            hint="API key used for enrichment and categorization."
            docHref="https://openrouter.ai/keys"
            onToast={onToast}
            testProvider="openai"
          />
          <ModelInput
            suggestions={OPENAI_MODELS}
            settingKey="openaiModel"
            defaultValue="gpt-4o-mini"
            onToast={onToast}
          />
          <BaseUrlField onToast={onToast} />
        </div>
      )}
      <p className="text-[11px] text-zinc-600 mt-6 border-t border-zinc-800/30 pt-4">
        Keys are stored in your local SQLite database (<code className="font-mono">prisma/dev.db</code>).
      </p>
    </Section>
  )
}

function ExportButton({ label, href, description }: { label: string; href: string; description: string }) {
  return (
    <button
      onClick={() => { window.location.href = href }}
      className="flex flex-col items-start gap-1 p-4 rounded-xl bg-zinc-800 hover:bg-zinc-750 border border-zinc-700 hover:border-zinc-600 transition-all duration-200 text-left group w-full"
    >
      <div className="flex items-center gap-2">
        <Download size={14} className="text-zinc-400 group-hover:text-zinc-200 transition-colors" />
        <span className="text-sm font-medium text-zinc-300 group-hover:text-zinc-100 transition-colors">{label}</span>
      </div>
      <p className="text-xs text-zinc-600">{description}</p>
    </button>
  )
}

function DataSection() {
  return (
    <Section icon={Database} title="Data Management" description="Export all your bookmarks for backup.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <ExportButton label="Export as CSV" href="/api/export?type=csv" description="Spreadsheet format" />
        <ExportButton label="Export as JSON" href="/api/export?type=json" description="Full object structure" />
      </div>
    </Section>
  )
}

function DangerZoneSection({ onToast }: { onToast: (t: Toast) => void }) {
  const [confirming, setConfirming] = useState(false)
  const [clearing, setClearing] = useState(false)
  const [cleared, setCleared] = useState(false)

  async function handleClearAll() {
    setClearing(true)
    try {
      const res = await fetch('/api/bookmarks', { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Failed to clear')
      }
      onToast({ type: 'success', message: 'All bookmarks deleted successfully' })
      setConfirming(false)
      setCleared(true)
      setTimeout(() => setCleared(false), 3000)
    } catch (err) {
      onToast({ type: 'error', message: err instanceof Error ? err.message : 'Failed to clear bookmarks' })
    } finally {
      setClearing(false)
    }
  }

  return (
    <Section icon={Shield} title="Danger Zone" description="Irreversible actions." variant="danger">
      <div className="flex items-center justify-between p-4 rounded-xl bg-red-900/10 border border-red-800/20">
        <div>
          <p className="text-sm font-medium text-zinc-300">Clear all bookmarks</p>
          <p className="text-xs text-zinc-600">Permanently delete everything.</p>
        </div>
        {!confirming ? (
          <button onClick={() => setConfirming(true)} className="px-4 py-2 rounded-xl text-xs font-semibold text-red-400 bg-red-800/20 hover:bg-red-800/30 border border-red-800/40 transition-all">Clear</button>
        ) : (
          <div className="flex gap-2">
            <button onClick={() => setConfirming(false)} className="px-3 py-2 rounded-lg text-xs text-zinc-500 hover:bg-zinc-800">Cancel</button>
            <button onClick={() => void handleClearAll()} disabled={clearing} className="px-3 py-2 rounded-lg text-xs font-bold bg-red-600 text-white animate-pulse">Delete!</button>
          </div>
        )}
      </div>
    </Section>
  )
}

const DONATION_ADDRESS = '0xcF10B967a9e422753812004Cd59990f62E360760'

function AboutSection() {
  const [copied, setCopied] = useState(false)
  return (
    <Section icon={Info} title="About Siftly" description="Local-first bookmark organizer.">
      <p className="text-sm text-zinc-400 leading-relaxed mb-6">
        Organize your Twitter bookmarks with AI categorization and mindmaps. Built to be secure and isolated.
      </p>
      <div className="flex flex-col sm:flex-row gap-4">
        <a href="https://x.com/viperr" target="_blank" rel="noopener noreferrer" className="flex-1 p-4 rounded-2xl bg-zinc-800/40 border border-zinc-800 hover:border-zinc-700 transition-all flex items-center justify-between group">
          <div className="flex items-center gap-3 text-sm font-medium text-zinc-100">𝕏 @viperr</div>
          <ExternalLink size={14} className="text-zinc-600 group-hover:text-indigo-400 transition-colors" />
        </a>
        <div className="flex-1 p-4 rounded-2xl bg-amber-500/5 border border-amber-500/10">
          <p className="text-xs font-bold text-amber-400 mb-1 flex items-center gap-2"><Coffee size={14} /> Support</p>
          <button onClick={() => { void navigator.clipboard.writeText(DONATION_ADDRESS); setCopied(true); setTimeout(() => setCopied(false), 2000) }} className="w-full font-mono text-[9px] text-zinc-500 hover:text-amber-400 transition-colors truncate">{copied ? 'Address Copied!' : DONATION_ADDRESS}</button>
        </div>
      </div>
    </Section>
  )
}

export default function SettingsPage() {
  const [toast, setToast] = useState<Toast | null>(null)
  return (
    <div className="p-6 md:p-12 max-w-2xl mx-auto min-h-screen">
      <div className="mb-10">
        <p className="text-[10px] text-zinc-500 uppercase tracking-[0.2em] font-bold mb-2">Options</p>
        <h1 className="text-4xl font-black text-white tracking-tight">Settings</h1>
      </div>
      {toast && <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] w-full max-w-sm px-4"><ToastAlert toast={toast} /></div>}
      <div className="space-y-6">
        <ApiKeySection onToast={(t) => { setToast(t); setTimeout(() => setToast(null), 4000) }} />
        <DataSection />
        <DangerZoneSection onToast={(t) => { setToast(t); setTimeout(() => setToast(null), 4000) }} />
        <AboutSection />
      </div>
    </div>
  )
}
