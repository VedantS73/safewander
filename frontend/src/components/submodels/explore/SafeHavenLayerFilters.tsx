import type { ReactNode } from 'react'
import { Button, Card, Spin, Switch, Typography } from 'antd'
import { CameraOutlined, MedicineBoxOutlined, SafetyOutlined } from '@ant-design/icons'
import type { LayerToggles } from './ExploreMapCanvas'

type Props = {
  layers: LayerToggles
  onChange: (next: LayerToggles) => void
  placesLoading?: boolean
  placesError?: string | null
  nearbyCount?: number
}

export function SafeHavenLayerFilters({
  layers,
  onChange,
  placesLoading = false,
  placesError = null,
  nearbyCount = 0,
}: Props) {
  const toggle = (key: keyof LayerToggles) => onChange({ ...layers, [key]: !layers[key] })

  const row = (label: string, icon: ReactNode, key: keyof LayerToggles) => (
    <div className="flex items-center justify-between gap-3 py-1.5">
      <span className="flex items-center gap-2 text-sm text-slate-700">
        <span className="text-slate-400">{icon}</span>
        {label}
      </span>
      <Switch
        size="small"
        checked={layers[key]}
        onChange={(checked) => onChange({ ...layers, [key]: checked })}
      />
    </div>
  )

  return (
    <Card size="small" className="explore-float-card shadow-md" styles={{ body: { padding: 10 } }}>
      <Typography.Text className="!text-xs font-semibold uppercase tracking-wide text-slate-500">
        Safe haven layers
      </Typography.Text>

      <div className="mt-1 flex items-center gap-2 text-[11px] text-slate-500">
        {placesLoading ? (
          <>
            <Spin size="small" />
            <span>Loading nearby places…</span>
          </>
        ) : placesError ? (
          <span className="text-amber-700">{placesError}</span>
        ) : (
          <span>
            {nearbyCount} place{nearbyCount === 1 ? '' : 's'} in range — tap a dot for details
          </span>
        )}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5 sm:hidden">
        <Button
          size="small"
          type={layers.police ? 'primary' : 'default'}
          icon={<SafetyOutlined />}
          onClick={() => toggle('police')}
        >
          Police
        </Button>
        <Button
          size="small"
          type={layers.hospitals ? 'primary' : 'default'}
          icon={<MedicineBoxOutlined />}
          onClick={() => toggle('hospitals')}
        >
          Hospital
        </Button>
        <Button
          size="small"
          type={layers.cameras ? 'primary' : 'default'}
          icon={<CameraOutlined />}
          onClick={() => toggle('cameras')}
        >
          Camera
        </Button>
      </div>

      <div className="mt-2 hidden divide-y divide-slate-100 sm:block">
        {row('Police stations', <SafetyOutlined />, 'police')}
        {row('Hospitals', <MedicineBoxOutlined />, 'hospitals')}
        {row('Cameras', <CameraOutlined />, 'cameras')}
      </div>
    </Card>
  )
}
