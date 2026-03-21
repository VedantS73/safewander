import { Menu } from 'antd'
import {
  BranchesOutlined,
  CompassOutlined,
  EyeOutlined,
  MessageOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'

const items = [
  { key: '/explore', icon: <CompassOutlined />, label: 'Explore' },
  { key: '/assistant', icon: <MessageOutlined />, label: 'Assistant' },
  { key: '/routes', icon: <BranchesOutlined />, label: 'Routes' },
  { key: '/monitor', icon: <EyeOutlined />, label: 'Monitor' },
  { key: '/community', icon: <TeamOutlined />, label: 'Community' },
]

export function BottomNav() {
  const navigate = useNavigate()
  const location = useLocation()
  const selectedKey = items.some((item) => item.key === location.pathname)
    ? location.pathname
    : '/explore'

  return (
    <nav className="bottom-nav" aria-label="Main">
      <Menu
        mode="horizontal"
        disabledOverflow
        selectedKeys={[selectedKey]}
        onClick={({ key }) => navigate(key)}
        items={items}
      />
    </nav>
  )
}
