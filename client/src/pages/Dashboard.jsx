import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { Plus, Users, MessageSquare, AlertCircle } from 'lucide-react'
import { statsApi, activityApi } from '../api'

function Dashboard() {
  const [overview, setOverview] = useState(null)
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      const [overviewRes, activitiesRes] = await Promise.all([
        statsApi.getOverview(),
        activityApi.getAll()
      ])
      setOverview(overviewRes)
      setActivities(activitiesRes)
    } catch (error) {
      console.error('加载数据失败:', error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  const stats = [
    { 
      label: '今日访问', 
      value: overview?.today?.pv || 0,
      icon: Users,
      color: 'text-blue-600',
      bg: 'bg-blue-50'
    },
    { 
      label: '今日对话', 
      value: overview?.today?.chat_count || 0,
      icon: MessageSquare,
      color: 'text-green-600',
      bg: 'bg-green-50'
    },
    { 
      label: '待处理问题', 
      value: overview?.activities?.reduce((sum, a) => sum + a.unanswered_count, 0) || 0,
      icon: AlertCircle,
      color: 'text-red-600',
      bg: 'bg-red-50'
    }
  ]

  return (
    <div className="space-y-6 fade-in">
      {/* 统计卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {stats.map((stat, index) => (
          <div key={index} className="bg-white rounded-xl p-6 card-shadow">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-gray-500 text-sm">{stat.label}</div>
                <div className="text-3xl font-bold mt-1">{stat.value.toLocaleString()}</div>
              </div>
              <div className={`p-3 rounded-full ${stat.bg}`}>
                <stat.icon className={stat.color} size={24} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 活动列表 */}
      <div className="bg-white rounded-xl card-shadow">
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-lg font-semibold">我的活动</h2>
          <Link to="/admin/activities/new" className="btn-primary flex items-center gap-2">
            <Plus size={18} />
            新建活动
          </Link>
        </div>

        {activities.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <div className="text-5xl mb-4">📭</div>
            <p>还没有活动，点击上方按钮创建第一个活动吧</p>
          </div>
        ) : (
          <div className="divide-y">
            {activities.map(activity => (
              <div key={activity.id} className="p-4 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-medium text-lg">{activity.name}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        activity.status === 'active' 
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      }`}>
                        {activity.status === 'active' ? '进行中' : '已结束'}
                      </span>
                    </div>
                    {activity.description && (
                      <p className="text-gray-500 text-sm mt-1">{activity.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                      {activity.start_time && (
                        <span>🕐 {activity.start_time} ~ {activity.end_time}</span>
                      )}
                      {activity.location && (
                        <span>📍 {activity.location}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="text-center">
                      <div className="font-semibold">{activity.faq_count}</div>
                      <div className="text-gray-500">问答</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold">{activity.session_count}</div>
                      <div className="text-gray-500">会话</div>
                    </div>
                    <div className="text-center">
                      <div className="font-semibold text-red-600">{activity.unanswered_count}</div>
                      <div className="text-gray-500">待处理</div>
                    </div>
                    <Link
                      to={`/admin/activities/edit/${activity.id}`}
                      className="btn-secondary text-sm"
                    >
                      管理
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default Dashboard
