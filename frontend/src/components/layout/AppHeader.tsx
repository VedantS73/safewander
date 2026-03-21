import { Avatar, Button, Space, Tag, Typography } from 'antd'
import { PhoneOutlined, SafetyCertificateOutlined } from '@ant-design/icons'

export function AppHeader() {
  return (
    <div className="app-header flex items-center justify-between gap-2 border-b border-slate-200 bg-white px-4 py-2">
      <Space size={10}>
        <Avatar size="small" icon={<SafetyCertificateOutlined />} className="bg-green-500" />
        <div>
          <Typography.Title level={5} className="!m-0 !leading-tight !text-slate-900">
            SafeWander
          </Typography.Title>
          <Typography.Text className="hidden !text-xs !text-slate-500 md:block">
            Real-time Safety Intelligence for Travelers
          </Typography.Text>
        </div>
      </Space>
      <Space size={8}>
        <Tag color="green">Live Monitoring</Tag>
        <Button size="small" type="primary" icon={<PhoneOutlined />}>
          SOS
        </Button>
      </Space>
    </div>
  )
}
