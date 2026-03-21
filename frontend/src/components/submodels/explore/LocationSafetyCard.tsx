import { Card, Spin, Tag, Typography } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'
import { getSafetyLevel, getSafetyLevelColor } from '../../../lib/safetyLabels'

type Props = {
  address: string | null
  addressLoading: boolean
  coordsLoading: boolean
  geoError: string | null
  safetyScore: number
}

export function LocationSafetyCard({
  address,
  addressLoading,
  coordsLoading,
  geoError,
  safetyScore,
}: Props) {
  const level = getSafetyLevel(safetyScore)
  const levelColor = getSafetyLevelColor(level)

  return (
    <Card
      size="small"
      className="explore-float-card shadow-md"
      styles={{ body: { padding: 10 } }}
    >
      <Typography.Text type="secondary" className="!text-[11px] font-medium uppercase tracking-wide sm:!text-xs">
        Current location <span className="text-green-600">(live)</span>
      </Typography.Text>
      <div className="mt-1.5 flex items-start gap-1.5 sm:mt-2 sm:gap-2">
        <EnvironmentOutlined className="mt-0.5 text-xs text-slate-400 sm:text-sm" />
        <div className="min-w-0 flex-1">
          {geoError ? (
            <Typography.Text type="danger" className="!text-xs sm:!text-sm">
              {geoError}
            </Typography.Text>
          ) : coordsLoading ? (
            <Spin size="small" />
          ) : addressLoading ? (
            <Typography.Text className="!text-xs text-slate-500 sm:!text-sm">Looking up address...</Typography.Text>
          ) : (
            <Typography.Text className="!text-xs font-medium text-slate-800 sm:!text-sm">
              {address ?? 'Move the map or enable location to see your area.'}
            </Typography.Text>
          )}
        </div>
      </div>
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 border-t border-slate-100 pt-2.5 sm:mt-3 sm:gap-2 sm:pt-3">
        <span className="text-2xl font-semibold tabular-nums text-slate-900 sm:text-3xl">{safetyScore}</span>
        <Typography.Text type="secondary" className="!text-[11px] sm:!text-xs">
          / 100
        </Typography.Text>
        <Tag color={levelColor} className="!m-0 !ml-0.5 !text-[10px] sm:!ml-1 sm:!text-xs">
          {level}
        </Tag>
      </div>
    </Card>
  )
}
