import { Button, Card, Typography } from 'antd'
import {
  BellOutlined,
  LeftOutlined,
  RightOutlined,
  TeamOutlined,
  WarningOutlined,
} from '@ant-design/icons'

const DUMMY_ALERTS = [
  {
    id: '1',
    title: 'Unusual crowd activity',
    body: 'Higher pedestrian density than usual on Main St. Last 12 min.',
    tone: 'warning' as const,
  },
  {
    id: '2',
    title: 'Trusted contact nearby',
    body: 'Alex is ~400m away and shared location in the last 5 min.',
    tone: 'info' as const,
  },
  {
    id: '3',
    title: 'Official bulletin',
    body: 'Transit police: extra patrols tonight near the station.',
    tone: 'default' as const,
  },
  {
    id: '4',
    title: 'Theft alert (area)',
    body: 'Pickpocket reports from local feed — keep bags closed.',
    tone: 'warning' as const,
  },
]

type Props = {
  isMobile: boolean
  open: boolean
  onToggle: () => void
}

export function AlertsSidebar({ isMobile, open, onToggle }: Props) {
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
        <div className="flex flex-col gap-2">
          {DUMMY_ALERTS.map((a) => (
            <Card
              key={a.id}
              size="small"
              className={
                a.tone === 'warning'
                  ? 'border-amber-200 bg-amber-50/80'
                  : a.tone === 'info'
                    ? 'border-blue-200 bg-blue-50/50'
                    : ''
              }
            >
              <div className="flex items-start gap-2">
                {a.tone === 'warning' ? (
                  <WarningOutlined className="mt-0.5 text-amber-600" />
                ) : a.tone === 'info' ? (
                  <TeamOutlined className="mt-0.5 text-blue-600" />
                ) : (
                  <BellOutlined className="mt-0.5 text-slate-400" />
                )}
                <div>
                  <Typography.Text strong className="!text-sm">
                    {a.title}
                  </Typography.Text>
                  <Typography.Paragraph type="secondary" className="!mb-0 !mt-1 !text-xs">
                    {a.body}
                  </Typography.Paragraph>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
