import { useState } from 'react'
import { MessageCircle } from 'lucide-react'
import { cn } from '@/lib/cn'

type Role = 'ai' | 'user'

interface Msg {
  role: Role
  text: string
}

const canned: Record<string, string> = {
  hello: 'Hello! I am the demo AI. I only pretend to know Zygfryd — ask me his role, skills or services.',
  skills: 'His strongest skills are TypeScript, React, Node.js and PostgreSQL. Ask me to list his services!',
  services: 'He offers friendly AI chatbot embedding, React + TypeScript builds, and full-stack consulting.',
  default:
    'Nice question! In this demo I only understand a few prompts: try "skills", "services" or "hello". Otherwise, ask a real Zygfryd.',
}

function answer(q: string): string {
  const s = q.toLowerCase()
  if (s.includes('skill')) return canned.skills
  if (s.includes('service') || s.includes('offer') || s.includes('do')) return canned.services
  if (s.includes('hello') || s.includes('hi ') || s.includes('hey')) return canned.hello
  return canned.default
}

export function AiChat() {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: 'ai', text: 'Hi! I am a friendly demo assistant that knows a bit about Zygfryd. Ask me about his skills or services.' },
  ])
  const [input, setInput] = useState('')
  const [typing, setTyping] = useState(false)

  const send = () => {
    const q = input.trim()
    if (!q) return
    setMsgs((m) => [...m, { role: 'user', text: q }])
    setInput('')
    setTyping(true)
    // simulate latency, then reveal the canned answer
    setTimeout(() => {
      setMsgs((m) => [...m, { role: 'ai', text: answer(q) }])
      setTyping(false)
    }, 700)
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary-100 bg-white shadow-sm">
      <div className="flex items-center gap-2 border-b border-primary-100 bg-gradient-to-r from-ai-400 to-ai-500 px-4 py-3 text-white">
        <MessageCircle className="h-5 w-5" />
        <span className="font-semibold">Ask AI about Zygfryd</span>
        <span className="ml-auto text-xs text-white/90">demo — no real data</span>
      </div>

      <div className="flex h-72 flex-col gap-3 overflow-y-auto p-4" aria-live="polite">
        {msgs.map((m, i) => (
          <div key={i} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
            <div
              className={cn(
                'max-w-[80%] rounded-2xl px-3 py-2 text-sm',
                m.role === 'user'
                  ? 'bg-primary-700 text-white'
                  : 'bg-primary-50 text-ink',
              )}
            >
              {m.text}
            </div>
          </div>
        ))}
        {typing && (
          <div className="flex justify-start">
            <div className="rounded-2xl bg-primary-50 px-3 py-2 text-sm text-ink-soft">…</div>
          </div>
        )}
      </div>

      <div className="flex gap-2 border-t border-primary-100 p-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && send()}
          placeholder="Try: what are his skills?"
          className="h-11 flex-1 rounded-xl border border-primary-200 bg-cream px-4 text-sm text-ink outline-none focus:border-primary-500"
          aria-label="Chat message"
        />
        <button onClick={send} className="h-11 rounded-xl bg-ai-500 px-4 text-sm font-semibold text-white hover:bg-ai-600 cursor-pointer">
          Send
        </button>
      </div>
    </div>
  )
}
