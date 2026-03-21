import { Button, Card, Spin, Typography } from 'antd'
import {
  BellOutlined,
  LeftOutlined,
  LinkOutlined,
  RightOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import type { CrimeRecentAlert } from '../../../types/crimeEvents'

function formatWhen(createdAt: string): string {
  try {
    const d = new Date(createdAt)
    if (Number.isNaN(d.getTime())) return ''
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
  } catch {
    return ''
  }
}

type Props = {
  isMobile: boolean
  open: boolean
  onToggle: () => void
  /** Crime / news rows from `crime_events` (last 24h by ingestion time) */
  alerts: CrimeRecentAlert[]
  loading: boolean
  error: string | null
}

export function AlertsSidebar({ isMobile, open, onToggle, alerts, loading, error }: Props) {
  if (!open) {
    return (
      <div className="explore-alerts-fab">
        <Button
          type="default"
          shape="default"
          size="large"
          className="!rounded-xl !border-slate-200 !bg-white !text-slate-700 shadow-md"
          icon={<LeftOutlined />}
          onClick={onToggle}
          aria-label="Open alerts"
        />
      </div>
    )
  }

  return (
    <div
      className={`explore-alerts-panel pointer-events-auto z-20 flex h-full min-h-0 flex-col border-l border-slate-200 bg-white/95 shadow-lg backdrop-blur-sm transition-[width] duration-200 ease-out ${
        isMobile ? 'explore-alerts-panel--mobile w-full border-l-0' : 'w-[min(100vw-3rem,20rem)]'
      }`}
    >
      <div className="flex shrink-0 items-center justify-between gap-1 border-b border-slate-100 px-2 py-2">
        <>
          <span className="flex items-center gap-1.5 pl-1 text-xs font-semibold uppercase tracking-wide text-slate-600">
            <BellOutlined />
            Live alerts
          </span>
          <Button type="text" size="small" icon={<RightOutlined />} onClick={onToggle} aria-label="Close alerts" />
        </>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 py-2">
        <Typography.Text type="secondary" className="mb-2 block px-1 text-[11px]">
          Crime & news from the last 24 hours (by ingest time)
        </Typography.Text>

        {loading ? (
          <div className="flex justify-center py-8">
            <Spin size="small" />
          </div>
        ) : error ? (
          <Card size="small" className="border-red-200 bg-red-50/80">
            <Typography.Text type="danger" className="!text-xs">
              {error}
            </Typography.Text>
          </Card>
        ) : alerts.length === 0 ? (
          <Card size="small" className="border-slate-200">
            <Typography.Paragraph type="secondary" className="!mb-0 !text-xs">
              No events in the last 24 hours. Data comes from your <code className="text-[10px]">crime_events</code>{' '}
              table (n8n ingest).
            </Typography.Paragraph>
          </Card>
        ) : (
          <div className="flex flex-col gap-2">
            {alerts.map((a) => (
              <Card key={a.id} size="small" className="border-amber-200 bg-amber-50/80">
                <div className="flex items-start gap-2">
                  <WarningOutlined className="mt-0.5 shrink-0 text-amber-600" />
                  <div className="min-w-0 flex-1">
                    <Typography.Text strong className="!block !text-sm leading-snug">
                      {a.original_title}
                    </Typography.Text>
                    <Typography.Paragraph type="secondary" className="!mb-1 !mt-1 !text-xs">
                      <span className="font-medium text-slate-700">{a.crime_type}</span>
                      {a.location ? ` · ${a.location}` : null}
                    </Typography.Paragraph>
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[10px] text-slate-500">
                      {a.crime_date ? <span>Reported {a.crime_date}</span> : null}
                      {a.crime_time ? <span>{a.crime_time}</span> : null}
                      {formatWhen(a.created_at) ? <span>Added {formatWhen(a.created_at)}</span> : null}
                    </div>
                    {a.original_link ? (
                      <a
                        href={a.original_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-0.5 text-xs font-medium text-violet-700 hover:underline"
                      >
                        <LinkOutlined />
                        Open source
                      </a>
                    ) : null}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
