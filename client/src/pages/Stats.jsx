import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { 
  Users, 
  MessageSquare, 
  Eye, 
  TrendingUp, 
  HelpCircle,
  CheckCircle,
  ChevronLeft,
  RefreshCw
} from 'lucide-react'
import { statsApi, activityApi } from '../api'

function Stats() {
  const navigate = useNavigate()
  const [activities, setActivities] = useState([])
  const [selectedActivity, setSelectedActivity] = useState(null)
  const [stats, setStats] = useState(null)
  const [unanswered, setUnanswered] = useState([])
  const [loading, setLoading] = useState(true)
  const [resolving, setResolving] = useState(null)

  useEffect(() => {
    loadActivities()
  }, [])

  useEffect(() => {
    if (selectedActivity) {
      loadStats()
    }
  }, [selectedActivity])

  const loadActivities = async () => {
    try {
      const res = await activityApi.getAll()
      setActivities(res)
      if (res.length > 0) {
        setSelectedActivity(res[0])
      }
    } catch (error) {
      console.error('加载活动失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const loadStats = async () => {
    if (!selectedActivity) return
    
    setLoading(true)
    try {
      const [statsRes, unansweredRes] = await Promise.all([
        statsApi.getActivityStats(selectedActivity.id),
        statsApi.getUnanswered(selectedActivity.id)
      ])
      setStats(statsRes)
      setUnanswered(unansweredRes)
    } catch (error) {
      console.error('加载统计失败:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleResolve = async (id) => {
    setResolving(id)
    try {
      await statsApi.resolveUnanswered(id)
      setUnanswered(unanswered.filter(q => q.id !== id))
      // 更新统计
      if (stats) {
        setStats({ ...stats, unanswered_count: stats.unanswered_count - 1 })
      }
    } catch (error) {
      alert('标记失败: ' + (error.error || error.message))
    } finally {
      setResolving(null)
    }
  }

  if (loading && !stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6 fade-in">
      {/* 活动选择 */}
      <div className="bg-white rounded-xl card-shadow p-4">
        <div className="flex items-center gap-4">
          <label className="font-medium">选择活动：</label>
          <select
            value={selectedActivity?.id || ''}
            onChange={(e) => {
              const activity = activities.find(a => a.id === e.target.value)
              setSelectedActivity(activity)
            }}
            className="flex-1 max-w-xs input-box"
          >
            {activities.map(activity => (
              <option key={activity.id} value={activity.id}>
                {activity.name}
              </option>
            ))}
          </select>
          <button
            onClick={loadStats}
            className="btn-secondary flex items-center gap-2"
          >
            <RefreshCw size={18} />
            刷新
          </button>
        </div>
      </div>

      {selectedActivity && stats && (
        <>
          {/* 统计卡片 */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl p-6 card-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-sm">总访问量</div>
                  <div className="text-3xl font-bold mt-1">{stats.total.total_pv?.toLocaleString() || 0}</div>
                </div>
                <div className="p-3 bg-blue-50 rounded-full">
                  <Eye className="text-blue-600" size={24} />
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                今日: {stats.today.pv}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 card-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-sm">独立访客</div>
                  <div className="text-3xl font-bold mt-1">{stats.total.total_uv?.toLocaleString() || 0}</div>
                </div>
                <div className="p-3 bg-green-50 rounded-full">
                  <Users className="text-green-600" size={24} />
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                今日: {stats.today.uv}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 card-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-sm">对话次数</div>
                  <div className="text-3xl font-bold mt-1">{stats.total.total_chats?.toLocaleString() || 0}</div>
                </div>
                <div className="p-3 bg-purple-50 rounded-full">
                  <MessageSquare className="text-purple-600" size={24} />
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                今日: {stats.today.chat_count}
              </div>
            </div>

            <div className="bg-white rounded-xl p-6 card-shadow">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-gray-500 text-sm">未解答问题</div>
                  <div className="text-3xl font-bold mt-1 text-red-600">{stats.unanswered_count}</div>
                </div>
                <div className="p-3 bg-red-50 rounded-full">
                  <HelpCircle className="text-red-600" size={24} />
                </div>
              </div>
              <div className="text-sm text-gray-500 mt-2">
                需要补充 FAQ
              </div>
            </div>
          </div>

          {/* 访问趋势 */}
          <div className="bg-white rounded-xl card-shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <TrendingUp size={20} className="text-indigo-600" />
              访问趋势（最近7天）
            </h3>
            {stats.trend && stats.trend.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-gray-500 text-sm">
                      <th className="pb-3">日期</th>
                      <th className="pb-3">访问量</th>
                      <th className="pb-3">访客数</th>
                      <th className="pb-3">对话次数</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {stats.trend.map((item, index) => (
                      <tr key={index}>
                        <td className="py-3">{item.date}</td>
                        <td className="py-3 font-medium">{item.pv}</td>
                        <td className="py-3">{item.uv}</td>
                        <td className="py-3">{item.chat_count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                暂无数据
              </div>
            )}
          </div>

          {/* 热门问题 */}
          <div className="bg-white rounded-xl card-shadow p-6">
            <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <HelpCircle size={20} className="text-yellow-500" />
              热门问题 Top 10
            </h3>
            {stats.hot_questions && stats.hot_questions.length > 0 ? (
              <div className="space-y-2">
                {stats.hot_questions.map((item, index) => (
                  <div 
                    key={index}
                    className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                        index < 3 ? 'bg-yellow-100 text-yellow-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {index + 1}
                      </span>
                      <span className="text-gray-800">{item.question}</span>
                    </div>
                    <span className="text-gray-500 text-sm">{item.total_count} 次</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                暂无数据
              </div>
            )}
          </div>

          {/* 未解答问题 */}
          <div className="bg-white rounded-xl card-shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <HelpCircle size={20} className="text-red-500" />
                未解答问题 ({stats.unanswered_count})
              </h3>
              <button
                onClick={() => navigate(`/admin/activities/edit/${selectedActivity.id}`)}
                className="btn-secondary text-sm"
              >
                补充 FAQ
              </button>
            </div>
            
            {unanswered.length > 0 ? (
              <div className="space-y-3">
                {unanswered.map((item) => (
                  <div 
                    key={item.id}
                    className="flex items-start justify-between p-4 bg-red-50 rounded-lg border border-red-100"
                  >
                    <div className="flex-1">
                      <div className="text-gray-800">{item.question}</div>
                      <div className="text-sm text-gray-500 mt-1">
                        来自会话 {item.session_id?.substring(0, 8)}... | {item.created_at}
                      </div>
                    </div>
                    <button
                      onClick={() => handleResolve(item.id)}
                      disabled={resolving === item.id}
                      className="ml-4 flex items-center gap-1 text-green-600 hover:bg-green-100 px-3 py-1 rounded-full text-sm transition-colors disabled:opacity-50"
                    >
                      <CheckCircle size={16} />
                      {resolving === item.id ? '处理中...' : '已解决'}
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🎉</div>
                <div className="text-gray-600">太棒了！暂无未解答问题</div>
              </div>
            )}
          </div>
        </>
      )}

      {!selectedActivity && (
        <div className="bg-white rounded-xl p-8 text-center">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2">暂无活动数据</h2>
          <p className="text-gray-500 mb-4">创建活动后即可查看统计数据</p>
          <button
            onClick={() => navigate('/admin/activities/new')}
            className="btn-primary"
          >
            创建活动
          </button>
        </div>
      )}
    </div>
  )
}

export default Stats
