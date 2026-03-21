import { CheckCircleOutlined, LoadingOutlined, SendOutlined } from '@ant-design/icons'
import { Modal, Typography } from 'antd'
import { useEffect, useState } from 'react'
import type { TrustedContact } from '../../lib/monitorStorage'

type Props = {
  open: boolean
  /** Note the user set when starting the timer */
  timerMessage: string
  contacts: TrustedContact[]
  onClose: () => void
}

type SendStatus = 'pending' | 'sending' | 'sent'

/**
 * Dummy UI: shows alerts “going out” to each trusted contact with staggered success.
 */
export function AlertDispatchModal({ open, timerMessage, contacts, onClose }: Props) {
  const [statuses, setStatuses] = useState<Record<string, SendStatus>>({})

  useEffect(() => {
    if (!open) {
      setStatuses({})
      return
    }
    const initial: Record<string, SendStatus> = {}
    for (const c of contacts) initial[c.id] = 'pending'
    setStatuses(initial)

    const timers: ReturnType<typeof setTimeout>[] = []
    contacts.forEach((c, i) => {
      const start = setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [c.id]: 'sending' }))
      }, i * 450 + 200)
      const done = setTimeout(() => {
        setStatuses((prev) => ({ ...prev, [c.id]: 'sent' }))
      }, i * 450 + 900)
      timers.push(start, done)
    })
    return () => timers.forEach(clearTimeout)
  }, [open, contacts])

  const iconFor = (id: string) => {
    const s = statuses[id]
    if (s === 'sent') return <CheckCircleOutlined className="text-emerald-500" />
    if (s === 'sending') return <LoadingOutlined className="text-amber-500" />
    return <SendOutlined className="text-slate-300" />
  }

  return (
    <Modal
      open={open}
      title={
        <span className="text-red-700">
          Check-in timer ended — sending safety alert
        </span>
      }
      onOk={onClose}
      onCancel={onClose}
      okText="Dismiss"
      cancelButtonProps={{ style: { display: 'none' } }}
      closable
      destroyOnHidden
    >
      <Typography.Paragraph type="secondary" className="!mb-3 !text-sm">
        This is a preview only — no messages are actually sent.
      </Typography.Paragraph>
      <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
        <span className="font-medium">Your note: </span>
        {timerMessage || '—'}
      </div>
      {contacts.length === 0 ? (
        <Typography.Text type="secondary">No trusted contacts to notify.</Typography.Text>
      ) : (
        <ul className="m-0 list-none space-y-2 p-0">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white px-3 py-2"
            >
              <div className="min-w-0">
                <div className="truncate font-medium text-slate-900">{c.name}</div>
                {c.phone ? (
                  <div className="truncate text-xs text-slate-500">{c.phone}</div>
                ) : null}
              </div>
              <div className="shrink-0 text-lg" aria-hidden>
                {iconFor(c.id)}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  )
}
