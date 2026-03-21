import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Plus, Edit, Trash2, Copy, ExternalLink, MoreVertical } from 'lucide-react'
import { activityApi } from '../api'

function ActivityList() {
  const [activities, setActivities] = useState([])
  const [loading, setLoading] = useState(true)
  const navigate = useNavigate()

  useEffect(() => {
    loadActivities()
  }, [])

  const loadActivities = async () => {
    try {
      const res = await activityApi.getAll()
      setActivities(res)
    } catch (error) {
      console.error('加载活动失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id, name) => {
    if (!confirm(`确定要删除活动「${name}」吗？此操作不可恢复！`)) {
      return
    }

    try {
      await activityApi.delete(id)
      setActivities(activities.filter(a => a.id !== id))
    } catch (error) {
      alert('删除失败: ' + (error.error || error.message))
    }
  }

  const handleCopyLink = (id) => {
    const link = `${window.location.origin}/chat/${id}`
    navigator.clipboard.writeText(link)
    alert('链接已复制到剪贴板！')
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-4 fade-in">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">活动列表</h2>
        <Link to="/admin/activities/new" className="btn-primary flex items-center gap-2">
          <Plus size={18} />
          新建活动
        </Link>
      </div>

      {activities.length === 0 ? (
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">📭</div>
          <p className="text-gray-500 mb-4">还没有活动</p>
          <Link to="/admin/activities/new" className="btn-primary">
            创建第一个活动
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl card-shadow overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left p-4 font-medium text-gray-600">活动名称</th>
                <th className="text-left p-4 font-medium text-gray-600">状态</th>
                <th className="text-center p-4 font-medium text-gray-600">问答数</th>
                <th className="text-center p-4 font-medium text-gray-600">会话数</th>
                <th className="text-center p-4 font-medium text-gray-600">待处理</th>
                <th className="text-right p-4 font-medium text-gray-600">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {activities.map(activity => (
                <tr key={activity.id} className="hover:bg-gray-50">
                  <td className="p-4">
                    <div>
                      <div className="font-medium">{activity.name}</div>
                      {activity.location && (
                        <div className="text-sm text-gray-500">📍 {activity.location}</div>
                      )}
                    </div>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      activity.status === 'active' 
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-600'
                    }`}>
                      {activity.status === 'active' ? '进行中' : '已结束'}
                    </span>
                  </td>
                  <td className="p-4 text-center">{activity.faq_count}</td>
                  <td className="p-4 text-center">{activity.session_count}</td>
                  <td className="p-4 text-center">
                    {activity.unanswered_count > 0 ? (
                      <span className="text-red-600 font-medium">{activity.unanswered_count}</span>
                    ) : (
                      <span className="text-gray-400">0</span>
                    )}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleCopyLink(activity.id)}
                        className="p-2 text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="复制链接"
                      >
                        <Copy size={18} />
                      </button>
                      <a
                        href={`/chat/${activity.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 text-gray-500 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        title="预览"
                      >
                        <ExternalLink size={18} />
                      </a>
                      <Link
                        to={`/admin/activities/edit/${activity.id}`}
                        className="p-2 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="编辑"
                      >
                        <Edit size={18} />
                      </Link>
                      <button
                        onClick={() => handleDelete(activity.id, activity.name)}
                        className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        title="删除"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ActivityList
