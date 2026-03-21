import { useChat } from '@ai-sdk/react'
import { DefaultChatTransport } from 'ai'
import { Alert, Button, Col, Input, Row, Spin, Typography } from 'antd'
import { RobotOutlined, SendOutlined, StopOutlined, UserOutlined } from '@ant-design/icons'
import { useCallback, useMemo, useState } from 'react'
import type { UIMessage } from 'ai'
import { ChatMarkdown } from '../chat/ChatMarkdown'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

function messageText(m: UIMessage): string {
  const parts = m.parts ?? []
  return parts
    .filter((p): p is { type: 'text'; text: string } => p.type === 'text' && 'text' in p)
    .map((p) => p.text)
    .join('')
}

export function AssistantPage() {
  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: `${API_BASE}/chat`,
      }),
    [],
  )

  const { messages, sendMessage, status, error, stop } = useChat({
    transport,
  })

  const [input, setInput] = useState('')
  const busy = status === 'streaming' || status === 'submitted'

  const onSend = useCallback(() => {
    const t = input.trim()
    if (!t || busy) return
    setInput('')
    void sendMessage({ text: t })
  }, [input, busy, sendMessage])

  return (
    <Row gutter={[16, 16]} className="h-full min-h-0 flex-1">
      <Col span={24} className="flex min-h-0 flex-1 flex-col">

          {error && (
            <Alert type="error" className="!mb-3" message={error.message} showIcon closable />
          )}

          <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden rounded-lg border border-slate-200 bg-white px-3 py-3">
            <div className="min-h-0 flex-1 space-y-3 overflow-y-auto">
              {messages.length === 0 && (
                <Typography.Text type="secondary" className="text-sm">
                  Ask anything about travel safety, routes, or emergencies.
                </Typography.Text>
              )}
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex gap-2 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[min(100%,32rem)] rounded-2xl px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-green-600 text-white'
                        : 'border border-slate-200 bg-slate-50 text-slate-900'
                    }`}
                  >
                    <div className="flex items-start gap-2">
                      {m.role === 'assistant' && (
                        <RobotOutlined className="mt-0.5 shrink-0 opacity-70" />
                      )}
                      {m.role === 'user' && <UserOutlined className="mt-0.5 shrink-0 opacity-80" />}
                      <div className="min-w-0 flex-1">
                        <ChatMarkdown content={messageText(m)} variant={m.role === 'user' ? 'user' : 'assistant'} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {busy && (
                <div className="flex items-center gap-2 text-slate-500">
                  <Spin size="small" />
                  <span className="text-sm">Thinking…</span>
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
              <Input.TextArea
                className="min-w-0 flex-1"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about safety, routes, or emergencies…"
                autoSize={{ minRows: 1, maxRows: 4 }}
                onPressEnter={(e) => {
                  if (!e.shiftKey) {
                    e.preventDefault()
                    onSend()
                  }
                }}
                disabled={busy}
              />
              {busy ? (
                <Button type="default" danger icon={<StopOutlined />} onClick={() => stop()}>
                  Stop
                </Button>
              ) : (
                <Button type="primary" icon={<SendOutlined />} onClick={onSend}>
                  Send
                </Button>
              )}
            </div>
          </div>
      </Col>
    </Row>
  )
}
