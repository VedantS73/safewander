import { Card, Col, Row, Segmented, Space, Tag, Timeline, Typography } from 'antd'

export function RoutesPage() {
  return (
    <Row gutter={[16, 16]}>
      <Col span={24}>
        <Card title="Route Optimization" className="card-dark">
          <Space direction="vertical" className="w-full">
            <Segmented
              block
              options={['Safest Route', 'Fastest Route', 'Balanced Route']}
              defaultValue="Safest Route"
            />
            <Typography.Text className="!text-slate-600">
              Powered by Mapbox risk-weighted routing.
            </Typography.Text>
            <Timeline
              items={[
                { color: 'green', children: 'Start: Hotel A' },
                { color: 'blue', children: 'Route segment: Low risk street' },
                { color: 'red', children: 'High-risk segment avoided' },
                { color: 'green', children: 'Destination: Northside Station' },
              ]}
            />
            <Tag color="green">Estimated safe ETA: 18 mins</Tag>
          </Space>
        </Card>
      </Col>
    </Row>
  )
}
