import { ClockCircleOutlined, DeleteOutlined, PlusOutlined, StopOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Col, Input, InputNumber, Row, Space, Typography } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { AlertDispatchModal } from '../monitor/AlertDispatchModal'
import {
  loadTravelTimer,
  loadTrustedContacts,
  type TravelTimerPersist,
  type TrustedContact,
  saveTravelTimer,
  saveTrustedContacts,
} from '../../lib/monitorStorage'

function formatRemaining(ms: number): string {
  if (ms <= 0) return '0:00'
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function MonitorPage() {
  const [message, setMessage] = useState("I'll be home in 15 mins")
  const [durationMinutes, setDurationMinutes] = useState(15)

  const [timer, setTimer] = useState<TravelTimerPersist | null>(null)
  const [tick, setTick] = useState(0)

  const [contacts, setContacts] = useState<TrustedContact[]>(() => loadTrustedContacts())
  const [newName, setNewName] = useState('')
  const [newPhone, setNewPhone] = useState('')

  const [alertOpen, setAlertOpen] = useState(false)
  const [alertMessage, setAlertMessage] = useState('')

  const active = timer != null && timer.endsAt > Date.now()
  const remainingMs = useMemo(() => {
    if (!timer) return 0
    return Math.max(0, timer.endsAt - Date.now())
  }, [timer, tick])

  // Restore from localStorage on mount
  useEffect(() => {
    const persisted = loadTravelTimer()
    if (!persisted) return
    if (persisted.endsAt > Date.now()) {
      setTimer(persisted)
      setMessage(persisted.message)
      setDurationMinutes(persisted.durationMinutes)
    } else {
      saveTravelTimer(null)
      setAlertMessage(persisted.message)
      setAlertOpen(true)
    }
  }, [])

  // Tick every second while a timer exists (running or just ended)
  useEffect(() => {
    if (!timer) return
    const id = window.setInterval(() => setTick((t) => t + 1), 1000)
    return () => clearInterval(id)
  }, [timer])

  // Fire when countdown hits zero (in-session)
  useEffect(() => {
    if (!timer) return
    if (timer.endsAt > Date.now()) return
    saveTravelTimer(null)
    setAlertMessage(timer.message)
    setTimer(null)
    setAlertOpen(true)
  }, [timer, tick])

  const persistContacts = useCallback((next: TrustedContact[]) => {
    setContacts(next)
    saveTrustedContacts(next)
  }, [])

  const startTimer = useCallback(() => {
    const msg = message.trim()
    const mins = Number(durationMinutes)
    if (!msg || !Number.isFinite(mins) || mins <= 0) return
    const endsAt = Date.now() + mins * 60 * 1000
    const next: TravelTimerPersist = {
      message: msg,
      durationMinutes: mins,
      endsAt,
    }
    saveTravelTimer(next)
    setTimer(next)
  }, [message, durationMinutes])

  const stopTimer = useCallback(() => {
    saveTravelTimer(null)
    setTimer(null)
  }, [])

  const addContact = useCallback(() => {
    const name = newName.trim()
    if (!name) return
    const id =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `c-${Date.now()}`
    const phone = newPhone.trim() || undefined
    persistContacts([...contacts, { id, name, phone }])
    setNewName('')
    setNewPhone('')
  }, [newName, newPhone, contacts, persistContacts])

  const removeContact = useCallback(
    (id: string) => {
      persistContacts(contacts.filter((c) => c.id !== id))
    },
    [contacts, persistContacts],
  )

  return (
    <>
      <Row gutter={[16, 16]}>
        <Col xs={24} lg={14}>
          <Card
            title={
              <Space>
                <ClockCircleOutlined />
                Travel check-in timer
              </Space>
            }
            className="card-dark"
          >
            <Space orientation="vertical" size="middle" className="w-full">
              <Typography.Text className="!text-slate-600">
                Set a message and how long until you expect to check in. If the timer runs out, we’ll
                show a preview of alerts to your trusted contacts (demo only — nothing is sent).
              </Typography.Text>

              <div>
                <Typography.Text className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                  Message
                </Typography.Text>
                <Input
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={`e.g. "I'll be home in 15 mins"`}
                  disabled={active}
                  maxLength={200}
                  showCount
                />
              </div>

              <div>
                <Typography.Text className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
                  Minutes
                </Typography.Text>
                <InputNumber
                  min={1}
                  max={24 * 60}
                  value={durationMinutes}
                  onChange={(v) => setDurationMinutes(typeof v === 'number' ? v : 15)}
                  disabled={active}
                  className="w-full max-w-xs"
                />
              </div>

              {active ? (
                <div className="rounded-lg border border-violet-200 bg-violet-50 px-4 py-4 text-center">
                  <div className="text-xs font-medium uppercase tracking-wider text-violet-800">
                    Time left
                  </div>
                  <div className="mt-1 font-mono text-4xl font-semibold tabular-nums text-violet-950">
                    {formatRemaining(remainingMs)}
                  </div>
                  <Button
                    danger
                    type="primary"
                    icon={<StopOutlined />}
                    className="mt-4"
                    onClick={stopTimer}
                  >
                    Cancel timer
                  </Button>
                </div>
              ) : (
                <Button type="primary" size="large" icon={<ClockCircleOutlined />} onClick={startTimer}>
                  Start timer
                </Button>
              )}
            </Space>
          </Card>
        </Col>

        <Col xs={24} lg={10}>
          <Card title="Trusted contacts" className="card-dark h-full">
            <Space orientation="vertical" size="middle" className="w-full">
              <Typography.Text className="!text-slate-600">
                People who would receive a check-in alert (stored on this device only).
              </Typography.Text>

              <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                <div className="min-w-0 flex-1">
                  <Typography.Text className="mb-1 block text-xs text-slate-500">Name</Typography.Text>
                  <Input
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    placeholder="Alex"
                    onPressEnter={addContact}
                  />
                </div>
                <div className="min-w-0 flex-1">
                  <Typography.Text className="mb-1 block text-xs text-slate-500">Phone (optional)</Typography.Text>
                  <Input
                    value={newPhone}
                    onChange={(e) => setNewPhone(e.target.value)}
                    placeholder="+1 …"
                    onPressEnter={addContact}
                  />
                </div>
                <Button type="primary" icon={<PlusOutlined />} onClick={addContact}>
                  Add
                </Button>
              </div>

              {contacts.length === 0 ? (
                <Alert type="info" showIcon message="No contacts yet" description="Add at least one name to see them in the alert preview." />
              ) : (
                <ul className="m-0 list-none space-y-2 p-0">
                  {contacts.map((c) => (
                    <li
                      key={c.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <div className="font-medium text-slate-900">{c.name}</div>
                        {c.phone ? <div className="text-xs text-slate-500">{c.phone}</div> : null}
                      </div>
                      <Button
                        type="text"
                        danger
                        icon={<DeleteOutlined />}
                        aria-label={`Remove ${c.name}`}
                        onClick={() => removeContact(c.id)}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </Space>
          </Card>
        </Col>
      </Row>

      <AlertDispatchModal
        open={alertOpen}
        timerMessage={alertMessage}
        contacts={contacts}
        onClose={() => setAlertOpen(false)}
      />
    </>
  )
}
