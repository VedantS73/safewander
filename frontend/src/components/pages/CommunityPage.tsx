import { EnvironmentOutlined, SendOutlined, SmileOutlined } from '@ant-design/icons'
import { Alert, Button, Card, Modal, Space, Typography, message } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { CommunityFeelingsMap } from '../community/CommunityFeelingsMap'
import { useGeolocation } from '../../hooks/useGeolocation'
import type { CommunityFeelingPoint } from '../../types/communityFeelings'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'
const MAPBOX_TOKEN = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN as string | undefined

/**
 * 1 = most positive (green) … 5 = most negative (red), stored for data viz.
 */
const FEELING_OPTIONS: {
  value: 1 | 2 | 3 | 4 | 5
  emoji: string
  short: string
  ring: string
  bg: string
}[] = [
  { value: 1, emoji: '😄', short: 'Great', ring: 'ring-emerald-400', bg: 'bg-emerald-500 hover:bg-emerald-600' },
  { value: 2, emoji: '🙂', short: 'Good', ring: 'ring-lime-400', bg: 'bg-lime-500 hover:bg-lime-600' },
  { value: 3, emoji: '😐', short: 'Okay', ring: 'ring-amber-400', bg: 'bg-amber-400 hover:bg-amber-500' },
  { value: 4, emoji: '🙁', short: 'Uneasy', ring: 'ring-orange-400', bg: 'bg-orange-500 hover:bg-orange-600' },
  { value: 5, emoji: '😣', short: 'Bad', ring: 'ring-red-500', bg: 'bg-red-600 hover:bg-red-700' },
]

function getCurrentPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported.'))
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: true,
      timeout: 20_000,
      maximumAge: 0,
    })
  })
}

async function fetchFeelings(): Promise<CommunityFeelingPoint[]> {
  const res = await fetch(`${API_BASE}/community-feelings?limit=5000`)
  if (!res.ok) {
    const text = await res.text()
    throw new Error(text || res.statusText)
  }
  const data = (await res.json()) as { feelings: CommunityFeelingPoint[] }
  return data.feelings ?? []
}

export function CommunityPage() {
  const { coords, error: geoError } = useGeolocation()
  const [open, setOpen] = useState(false)
  const [selected, setSelected] = useState<1 | 2 | 3 | 4 | 5 | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [feelings, setFeelings] = useState<CommunityFeelingPoint[]>([])
  const [feelingsLoading, setFeelingsLoading] = useState(true)
  const [feelingsError, setFeelingsError] = useState<string | null>(null)

  const loadFeelings = useCallback(async () => {
    setFeelingsError(null)
    setFeelingsLoading(true)
    try {
      const list = await fetchFeelings()
      setFeelings(list)
    } catch (e) {
      setFeelingsError(e instanceof Error ? e.message : 'Could not load feelings.')
    } finally {
      setFeelingsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadFeelings()
  }, [loadFeelings])

  const onSubmit = useCallback(async () => {
    if (selected == null) {
      message.warning('Pick how you felt first.')
      return
    }
    setSubmitting(true)
    try {
      const pos = await getCurrentPosition()
      const res = await fetch(`${API_BASE}/community-feelings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          latitude: pos.coords.latitude,
          longitude: pos.coords.longitude,
          feeling: selected,
        }),
      })
      if (!res.ok) {
        const text = await res.text()
        throw new Error(text || res.statusText)
      }
      message.success('Thanks — your check-in was saved for the community map.')
      setOpen(false)
      setSelected(null)
      void loadFeelings()
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      message.error(
        msg.includes('denied') || msg.includes('Permission')
          ? 'Location access is needed to pin this feeling. Allow location and try again.'
          : msg,
      )
    } finally {
      setSubmitting(false)
    }
  }, [selected, loadFeelings])

  return (
    <div className="community-page flex min-h-0 flex-1 flex-col px-4 pb-4 pt-2 lg:px-6">
      <div className="flex min-h-0 flex-1 flex-col gap-4 lg:flex-row lg:gap-4">
        {/* 40% — Community Safety Layer */}
        <div className="community-page__left flex w-full min-w-0 flex-col lg:flex-[0_0_40%]">
          <Card title="Community Safety Layer" className="card-dark flex min-h-0 flex-1 flex-col">
            <Space orientation="vertical" size="middle" className="w-full">
              <Typography.Paragraph className="!mb-0">
                Community sentiment from travelers who recently passed through the area.
              </Typography.Paragraph>
              <Button
                type="primary"
                size="large"
                icon={<SmileOutlined />}
                onClick={() => setOpen(true)}
                className="!h-auto !py-3 !px-6 !text-base"
              >
                How did you feel here?
              </Button>
              <Typography.Text type="secondary" className="!text-xs">
                Uses your current location when you submit (for future heatmaps and trends).
              </Typography.Text>
              {geoError ? (
                <Typography.Text type="warning" className="!text-xs">
                  Location: {geoError} (map may not center on you.)
                </Typography.Text>
              ) : null}
            </Space>
          </Card>
        </div>

        {/* 60% — map */}
        <div className="community-page__right flex min-h-0 min-w-0 flex-col lg:flex-[0_0_60%]">
          <Card
            title="Community feelings map"
            className="card-dark flex min-h-0 flex-1 flex-col [&_.ant-card-body]:flex [&_.ant-card-body]:min-h-0 [&_.ant-card-body]:flex-1 [&_.ant-card-body]:flex-col [&_.ant-card-body]:!p-0"
          >
            {feelingsLoading ? (
              <div className="flex min-h-[280px] flex-1 items-center justify-center text-slate-500 lg:min-h-0">
                Loading map data…
              </div>
            ) : feelingsError ? (
              <div className="flex min-h-[280px] flex-1 flex-col items-center justify-center gap-2 px-4 text-center lg:min-h-0">
                <Typography.Text type="danger">{feelingsError}</Typography.Text>
                <Button size="small" onClick={() => void loadFeelings()}>
                  Retry
                </Button>
              </div>
            ) : (
              <div className="community-page__map-host min-h-[280px] flex-1 lg:min-h-0">
                <CommunityFeelingsMap
                  accessToken={MAPBOX_TOKEN}
                  feelings={feelings}
                  userLng={coords?.longitude ?? null}
                  userLat={coords?.latitude ?? null}
                />
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal
        title={
          <span className="flex items-center gap-2">
            <EnvironmentOutlined />
            How did you feel here?
          </span>
        }
        open={open}
        onCancel={() => {
          if (!submitting) {
            setOpen(false)
            setSelected(null)
          }
        }}
        footer={[
          <Button key="cancel" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>,
          <Button
            key="submit"
            type="primary"
            icon={<SendOutlined />}
            loading={submitting}
            disabled={selected == null}
            onClick={() => void onSubmit()}
          >
            Submit
          </Button>,
        ]}
        destroyOnHidden
        width={480}
      >
        <Alert
          type="info"
          showIcon
          className="!mb-4"
          message="From green (great) to red (unsafe)"
          description="We save your feeling as a number 1–5 with this spot’s coordinates for analytics."
        />
        <div className="flex flex-wrap justify-center gap-3 sm:justify-between">
          {FEELING_OPTIONS.map((opt) => {
            const isSel = selected === opt.value
            return (
              <button
                key={opt.value}
                type="button"
                disabled={submitting}
                onClick={() => setSelected(opt.value)}
                className={[
                  'flex h-24 w-[4.5rem] shrink-0 flex-col items-center justify-center rounded-xl text-white shadow-md transition',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  opt.bg,
                  isSel ? `ring-4 ring-offset-2 ${opt.ring}` : 'ring-0',
                  submitting ? 'opacity-60' : '',
                ].join(' ')}
                aria-pressed={isSel}
                aria-label={`${opt.short}, feeling ${opt.value} of 5`}
              >
                <span className="text-3xl leading-none" aria-hidden>
                  {opt.emoji}
                </span>
                <span className="mt-1 text-[10px] font-semibold uppercase tracking-wide">{opt.short}</span>
                <span className="text-[10px] opacity-90">{opt.value}/5</span>
              </button>
            )
          })}
        </div>
      </Modal>
    </div>
  )
}
