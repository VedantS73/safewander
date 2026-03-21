import type { ReactNode } from 'react'
import { Button, Card, Switch, Typography } from 'antd'
import { CameraOutlined, MedicineBoxOutlined, SafetyOutlined } from '@ant-design/icons'
import type { LayerToggles } from './ExploreMapCanvas'

type Props = {
  layers: LayerToggles
  onChange: (next: LayerToggles) => void
}

export function SafeHavenLayerFilters({ layers, onChange }: Props) {
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

      <Typography.Paragraph type="secondary" className="!mb-0 !mt-2 !hidden !text-[11px] sm:!block">
        Toggles show demo points near your position on the map.
      </Typography.Paragraph>
    </Card>
  )
}
