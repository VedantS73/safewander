import type { ReactNode } from 'react'
import { Button, Card, Spin, Switch, Typography } from 'antd'
import {
  CameraOutlined,
  FileTextOutlined,
  HeatMapOutlined,
  MedicineBoxOutlined,
  SafetyOutlined,
} from '@ant-design/icons'
import type { LayerToggles } from './ExploreMapCanvas'

type Props = {
  layers: LayerToggles
  onChange: (next: LayerToggles) => void
  placesLoading?: boolean
  placesError?: string | null
  nearbyCount?: number
  crimeLoading?: boolean
  crimeError?: string | null
  crimeCount?: number
}

export function SafeHavenLayerFilters({
  layers,
  onChange,
  placesLoading = false,
  placesError = null,
  nearbyCount = 0,
  crimeLoading = false,
  crimeError = null,
  crimeCount = 0,
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

  const loadingAny = placesLoading || crimeLoading

  return (
    <Card size="small" className="explore-float-card shadow-md" styles={{ body: { padding: 10 } }}>
      <Typography.Text className="!text-xs font-semibold uppercase tracking-wide text-slate-500">
        Map layers
      </Typography.Text>

      <div className="mt-1 flex flex-col gap-1 text-[11px] text-slate-500">
        {loadingAny ? (
          <span className="flex items-center gap-2">
            <Spin size="small" />
            <span>Loading nearby data…</span>
          </span>
        ) : (
          <>
            {placesError ? (
              <span className="text-amber-700">Places: {placesError}</span>
            ) : (
              <span>
                Safe havens: {nearbyCount} in range — tap an icon for details
              </span>
            )}
            {crimeError ? (
              <span className="text-amber-700">News: {crimeError}</span>
            ) : (
              <span>
                Crime data: {crimeCount} in range — red heat from events; green near safe havens
              </span>
            )}
          </>
        )}
      </div>

      {/* Featured: crime density heatmap — distinct from other toggles */}
      <div
        className={`mt-3 rounded-xl border-2 px-2.5 py-2 transition-all ${
          layers.heatmap
            ? 'border-rose-500 bg-gradient-to-br from-emerald-50 via-amber-50/80 to-rose-50 shadow-md ring-2 ring-rose-200/70'
            : 'border-slate-200 bg-slate-50/80'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <span className="flex items-center gap-2 text-sm font-semibold text-slate-900">
              <HeatMapOutlined
                className={`shrink-0 ${layers.heatmap ? 'text-rose-600' : 'text-slate-500'}`}
              />
              <span className="text-amber-700">Heatmap</span>
            </span>
            <Typography.Text type="secondary" className="!mt-1 !block !text-[10px] leading-snug">
            </Typography.Text>
          </div>
          <Switch
            size="small"
            checked={layers.heatmap}
            onChange={(checked) => onChange({ ...layers, heatmap: checked })}
            className={layers.heatmap ? '[&_.ant-switch-checked]:!bg-rose-600' : ''}
          />
        </div>
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
        <Button
          size="small"
          className={
            layers.heatmap
              ? '!border-rose-500 !bg-gradient-to-r !from-emerald-600 !to-rose-600 !text-white hover:!from-emerald-500 hover:!to-rose-500'
              : ''
          }
          type={layers.heatmap ? 'primary' : 'default'}
          icon={<HeatMapOutlined />}
          onClick={() => toggle('heatmap')}
        >
          Heatmap
        </Button>
        <Button
          size="small"
          type={layers.crimeNews ? 'primary' : 'default'}
          icon={<FileTextOutlined />}
          onClick={() => toggle('crimeNews')}
        >
          News
        </Button>
      </div>

      <div className="mt-2 hidden divide-y divide-slate-100 sm:block">
        {row('Police stations', <SafetyOutlined />, 'police')}
        {row('Hospitals', <MedicineBoxOutlined />, 'hospitals')}
        {row('Cameras', <CameraOutlined />, 'cameras')}
        {row('News & incidents', <FileTextOutlined />, 'crimeNews')}
      </div>

      <Typography.Paragraph type="secondary" className="!mb-0 !mt-2 !hidden !text-[11px] sm:!block">
        Heatmap layers: green from nearby safe havens (toggle Police / Hospital / Camera), red from crime_events.
        Purple pins are optional news markers.
      </Typography.Paragraph>
    </Card>
  )
}
