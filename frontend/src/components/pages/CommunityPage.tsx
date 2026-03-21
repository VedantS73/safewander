import { Card, Col, Progress, Row, Space, Tag, Typography } from 'antd'

export function CommunityPage() {
  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} lg={12}>
        <Card title="Community Safety Layer" className="card-dark h-full">
          <Space direction="vertical">
            <Typography.Paragraph>
              Community sentiment from travelers who recently passed through the area.
            </Typography.Paragraph>
            <Progress percent={81} status="active" />
            <Tag color="cyan">Most users felt safe in this corridor</Tag>
          </Space>
        </Card>
      </Col>
      <Col xs={24} lg={12}>
        <Card title="Nearby Safe Havens" className="card-dark h-full">
          <Space direction="vertical">
            <Tag color="blue">2 Police Stations</Tag>
            <Tag color="purple">4 Hospitals</Tag>
            <Tag color="gold">7 Open Public Spaces</Tag>
          </Space>
        </Card>
      </Col>
    </Row>
  )
}
