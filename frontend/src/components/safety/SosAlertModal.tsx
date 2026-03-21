import { CheckCircleOutlined, PhoneOutlined, WarningOutlined } from '@ant-design/icons'
import { Modal, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { loadTrustedContacts, type TrustedContact } from '../../lib/monitorStorage'

type Phase = 'intro' | 'countdown' | 'sent'

function safeVibrate(pattern: number | number[]): void {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return
  try {
    navigator.vibrate(pattern)
  } catch {
    /* ignore */
  }
}

type Props = {
  open: boolean
  onClose: () => void
}

export function SosAlertModal({ open, onClose }: Props) {
  const [phase, setPhase] = useState<Phase>('intro')
  const [count, setCount] = useState(5)
  const [contacts, setContacts] = useState<TrustedContact[]>([])
  const reset = useCallback(() => {
    setPhase('intro')
    setCount(5)
  }, [])

  useEffect(() => {
    if (!open) {
      reset()
      return
    }
    setContacts(loadTrustedContacts())
  }, [open, reset])

  // Intro → countdown after a short beat
  useEffect(() => {
    if (!open || phase !== 'intro') return
    const t = setTimeout(() => {
      setPhase('countdown')
      safeVibrate(30)
    }, 1600)
    return () => clearTimeout(t)
  }, [open, phase])

  // 5 → 4 → … → 1 → sent (single interval — do not depend on `count` or timers reset every tick)
  useEffect(() => {
    if (!open || phase !== 'countdown') return
    setCount(5)
    safeVibrate(25)

    const id = setInterval(() => {
      setCount((c) => {
        if (c <= 1) {
          clearInterval(id)
          setPhase('sent')
          safeVibrate([120, 80, 160, 80, 220])
          return 0
        }
        safeVibrate(40)
        return c - 1
      })
    }, 1000)

    return () => clearInterval(id)
  }, [open, phase])

  const handleClose = () => {
    if (phase === 'countdown') return
    onClose()
  }

  return (
    <Modal
      open={open}
      title={
        <span className="flex items-center gap-2 text-red-700">
          <WarningOutlined />
          SOS alert
        </span>
      }
      onCancel={handleClose}
      footer={null}
      closable={phase !== 'countdown'}
      maskClosable={phase !== 'countdown'}
      destroyOnHidden
      width={420}
      centered
    >
      {phase === 'intro' && (
        <div className="space-y-4 py-1">
          <Typography.Paragraph className="!mb-0 !text-base !font-medium !text-slate-900">
            SOS alert sending to emergency contacts (trusted contacts)
          </Typography.Paragraph>
          <Typography.Text type="secondary" className="text-sm">
            This is a demo — nothing is actually sent. Names come from your Monitor page list.
          </Typography.Text>
          {contacts.length === 0 ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-950">
              No trusted contacts yet. Add them on the <strong>Monitor</strong> tab.
            </div>
          ) : (
            <div>
              <Typography.Text className="mb-2 block text-xs font-semibold uppercase tracking-wide text-slate-500">
                Notifying
              </Typography.Text>
              <ul className="m-0 list-none space-y-2 p-0">
                {contacts.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2"
                  >
                    <PhoneOutlined className="text-red-500" />
                    <span className="font-medium text-slate-900">{c.name}</span>
                    {c.phone ? <span className="text-xs text-slate-500">{c.phone}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Typography.Text type="secondary" className="block text-center text-sm">
            Starting countdown…
          </Typography.Text>
        </div>
      )}

      {phase === 'countdown' && (
        <div className="flex flex-col items-center gap-6 py-6">
          <Typography.Text className="!text-slate-600">Sending in</Typography.Text>
          <div
            className="flex h-36 w-36 items-center justify-center rounded-full border-4 border-red-600 bg-red-600 text-6xl font-black tabular-nums text-white shadow-lg ring-4 ring-red-200"
            aria-live="polite"
          >
            {count}
          </div>
          <Typography.Text type="secondary" className="text-center text-xs">
            Keep this screen open
          </Typography.Text>
        </div>
      )}

      {phase === 'sent' && (
        <div className="flex flex-col items-center gap-4 py-6 text-center">
          <CheckCircleOutlined className="text-5xl text-emerald-500" />
          <Typography.Title level={4} className="!mb-0 !text-slate-900">
            Alert sent
          </Typography.Title>
          <Typography.Paragraph className="!mb-0 !text-slate-600">
            Your SOS demo was completed. In a real app, your message would go to trusted contacts.
          </Typography.Paragraph>
          <button
            type="button"
            className="mt-2 rounded-lg bg-slate-900 px-6 py-2 text-sm font-medium text-white hover:bg-slate-800"
            onClick={() => onClose()}
          >
            Done
          </button>
        </div>
      )}
    </Modal>
  )
}
