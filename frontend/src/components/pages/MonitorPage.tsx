import { Alert, Badge, Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'

export function MonitorPage() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={14}>
        <Card title="Live Alerts Monitor" className="card-dark" extra={<Badge status="processing" text="Streaming" />}>
          <Space orientation="vertical" className="w-full">
            <Alert
              type="warning"
              showIcon
              title="High theft activity reported nearby"
              description="Official source update from 10 mins ago."
            />
            <Alert
              type="info"
              showIcon
              title="Avoid 3rd Street after 10 PM"
              description="Police bulletin and local reports."
            />
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={10}>
        <Card title="Check-In Timer" className="card-dark">
          <Space orientation="vertical" className="w-full">
            <Typography.Text className="!text-slate-600">
              User safety ping before escalation.
            </Typography.Text>
            <Progress percent={86} status="active" />
            <Tag color="gold">Escalates to Circle of Trust in 60 seconds</Tag>
          </Space>
        </Card>
      </Col>
    </Row>
  )
}
