import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { 
  Save, 
  Upload, 
  Plus, 
  Trash2, 
  Edit3, 
  ChevronLeft,
  FileText,
  X,
  Link as LinkIcon
} from 'lucide-react'
import { activityApi } from '../api'

function ActivityForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const fileInputRef = useRef(null)
  const isEdit = !!id

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [faqFile, setFaqFile] = useState(null)

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    start_time: '',
    end_time: '',
    location: '',
    hotline: '',
    status: 'active'
  })

  const [faqs, setFaqs] = useState([])
  const [editingFaq, setEditingFaq] = useState(null)
  const [showFaqForm, setShowFaqForm] = useState(false)
  const [faqForm, setFaqForm] = useState({ question: '', answer: '', category: '' })

  const [linkCopied, setLinkCopied] = useState(false)

  useEffect(() => {
    if (id) {
      loadData()
    }
  }, [id])

  const loadData = async () => {
    setLoading(true)
    try {
      const [activityRes, faqsRes] = await Promise.all([
        activityApi.getById(id),
        activityApi.getFaqs(id)
      ])
      setFormData(activityRes)
      setFaqs(faqsRes)
    } catch (error) {
      alert('加载活动失败: ' + (error.error || error.message))
      navigate('/admin/activities')
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleFileChange = (e) => {
    const file = e.target.files[0]
    if (file) {
      setFaqFile(file)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('请输入活动名称')
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await activityApi.update(id, formData)
        navigate('/admin/activities')
      } else {
        await activityApi.create(formData, faqFile)
        navigate('/admin/activities')
      }
    } catch (error) {
      alert('保存失败: ' + (error.error || error.message))
    } finally {
      setSaving(false)
    }
  }

  const handleUploadFaq = async () => {
    if (!faqFile) {
      alert('请先选择文件')
      return
    }

    setUploading(true)
    try {
      const res = await activityApi.uploadFaq(id, faqFile)
      alert(res.message)
      setFaqFile(null)
      // 重新加载 FAQ
      const faqsRes = await activityApi.getFaqs(id)
      setFaqs(faqsRes)
    } catch (error) {
      alert('上传失败: ' + (error.error || error.message))
    } finally {
      setUploading(false)
    }
  }

  const handleAddFaq = async () => {
    if (!faqForm.question.trim() || !faqForm.answer.trim()) {
      alert('问题和答案不能为空')
      return
    }

    try {
      await activityApi.addFaq(id, faqForm)
      const faqsRes = await activityApi.getFaqs(id)
      setFaqs(faqsRes)
      setFaqForm({ question: '', answer: '', category: '' })
      setShowFaqForm(false)
    } catch (error) {
      alert('添加失败: ' + (error.error || error.message))
    }
  }

  const handleUpdateFaq = async () => {
    if (!editingFaq.question.trim() || !editingFaq.answer.trim()) {
      alert('问题和答案不能为空')
      return
    }

    try {
      await activityApi.updateFaq(editingFaq.id, editingFaq)
      const faqsRes = await activityApi.getFaqs(id)
      setFaqs(faqsRes)
      setEditingFaq(null)
    } catch (error) {
      alert('更新失败: ' + (error.error || error.message))
    }
  }

  const handleDeleteFaq = async (faqId) => {
    if (!confirm('确定要删除这条问答吗？')) return

    try {
      await activityApi.deleteFaq(faqId)
      setFaqs(faqs.filter(f => f.id !== faqId))
    } catch (error) {
      alert('删除失败: ' + (error.error || error.message))
    }
  }

  const handleClearFaqs = async () => {
    if (!confirm('确定要清空所有问答吗？此操作不可恢复！')) return

    try {
      await activityApi.clearFaqs(id)
      setFaqs([])
    } catch (error) {
      alert('清空失败: ' + (error.error || error.message))
    }
  }

  const handleCopyLink = () => {
    const link = `${window.location.origin}/chat/${id}`
    navigator.clipboard.writeText(link)
    setLinkCopied(true)
    setTimeout(() => setLinkCopied(false), 2000)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">加载中...</div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 fade-in">
      {/* 返回按钮 */}
      <button
        onClick={() => navigate('/admin/activities')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-800"
      >
        <ChevronLeft size={20} />
        返回列表
      </button>

      {/* 活动信息表单 */}
      <form onSubmit={handleSubmit} className="bg-white rounded-xl card-shadow p-6 space-y-6">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">{isEdit ? '编辑活动' : '创建活动'}</h2>
          {isEdit && (
            <button
              type="button"
              onClick={handleCopyLink}
              className="btn-secondary flex items-center gap-2"
            >
              <LinkIcon size={18} />
              {linkCopied ? '已复制' : '复制链接'}
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动名称 <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full input-box"
              placeholder="请输入活动名称"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动描述
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full input-box min-h-[80px]"
              placeholder="请输入活动描述"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              开始时间
            </label>
            <input
              type="text"
              name="start_time"
              value={formData.start_time}
              onChange={handleChange}
              className="w-full input-box"
              placeholder="如：2026-01-04 00:00:00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              结束时间
            </label>
            <input
              type="text"
              name="end_time"
              value={formData.end_time}
              onChange={handleChange}
              className="w-full input-box"
              placeholder="如：2026-01-15 18:00:00"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              活动地点
            </label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              className="w-full input-box"
              placeholder="请输入活动地点"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              咨询热线
            </label>
            <input
              type="text"
              name="hotline"
              value={formData.hotline}
              onChange={handleChange}
              className="w-full input-box"
              placeholder="请输入咨询热线"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              状态
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full input-box"
            >
              <option value="active">进行中</option>
              <option value="inactive">已结束</option>
            </select>
          </div>
        </div>

        <div className="flex items-center gap-4 pt-4">
          <button
            type="submit"
            disabled={saving}
            className="btn-primary flex items-center gap-2"
          >
            <Save size={18} />
            {saving ? '保存中...' : '保存'}
          </button>
          {!isEdit && faqFile && (
            <span className="text-sm text-gray-500">
              已选择文件: {faqFile.name}
            </span>
          )}
        </div>
      </form>

      {/* FAQ 管理（仅编辑模式） */}
      {isEdit && (
        <div className="bg-white rounded-xl card-shadow p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold">问答库 ({faqs.length} 条)</h3>
            <div className="flex items-center gap-2">
              {faqs.length > 0 && (
                <button
                  onClick={handleClearFaqs}
                  className="btn-secondary text-red-600 border-red-200 hover:bg-red-50"
                >
                  清空全部
                </button>
              )}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="btn-secondary flex items-center gap-2"
              >
                <Upload size={18} />
                上传 FAQ
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.doc,.pdf,.txt"
                onChange={handleFileChange}
                className="hidden"
              />
              <button
                onClick={() => setShowFaqForm(true)}
                className="btn-primary flex items-center gap-2"
              >
                <Plus size={18} />
                添加问答
              </button>
            </div>
          </div>

          {/* 上传文件提示 */}
          {faqFile && (
            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg">
              <div className="flex items-center gap-2">
                <FileText size={18} className="text-blue-600" />
                <span>{faqFile.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleUploadFaq}
                  disabled={uploading}
                  className="btn-primary text-sm py-1 px-3"
                >
                  {uploading ? '上传中...' : '确认上传'}
                </button>
                <button
                  onClick={() => setFaqFile(null)}
                  className="text-gray-500 hover:text-red-600"
                >
                  <X size={18} />
                </button>
              </div>
            </div>
          )}

          {/* FAQ 列表 */}
          {faqs.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无问答，点击上方按钮添加或上传
            </div>
          ) : (
            <div className="space-y-2">
              {faqs.map((faq, index) => (
                <div key={faq.id} className="border rounded-lg p-3 hover:bg-gray-50">
                  {editingFaq?.id === faq.id ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editingFaq.question}
                        onChange={(e) => setEditingFaq({ ...editingFaq, question: e.target.value })}
                        className="w-full input-box text-sm"
                        placeholder="问题"
                      />
                      <textarea
                        value={editingFaq.answer}
                        onChange={(e) => setEditingFaq({ ...editingFaq, answer: e.target.value })}
                        className="w-full input-box text-sm min-h-[60px]"
                        placeholder="答案"
                      />
                      <div className="flex items-center gap-2">
                        <button onClick={handleUpdateFaq} className="btn-primary text-sm py-1 px-3">
                          保存
                        </button>
                        <button onClick={() => setEditingFaq(null)} className="btn-secondary text-sm py-1 px-3">
                          取消
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="font-medium text-sm">
                          Q{index + 1}: {faq.question}
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          A: {faq.answer.substring(0, 100)}{faq.answer.length > 100 ? '...' : ''}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 ml-4">
                        <button
                          onClick={() => setEditingFaq(faq)}
                          className="p-1 text-gray-500 hover:text-blue-600"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => handleDeleteFaq(faq.id)}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 添加问答弹窗 */}
          {showFaqForm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-xl p-6 w-full max-w-lg space-y-4">
                <h3 className="text-lg font-semibold">添加问答</h3>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">问题</label>
                  <input
                    type="text"
                    value={faqForm.question}
                    onChange={(e) => setFaqForm({ ...faqForm, question: e.target.value })}
                    className="w-full input-box"
                    placeholder="请输入问题"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">答案</label>
                  <textarea
                    value={faqForm.answer}
                    onChange={(e) => setFaqForm({ ...faqForm, answer: e.target.value })}
                    className="w-full input-box min-h-[100px]"
                    placeholder="请输入答案"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">分类（可选）</label>
                  <input
                    type="text"
                    value={faqForm.category}
                    onChange={(e) => setFaqForm({ ...faqForm, category: e.target.value })}
                    className="w-full input-box"
                    placeholder="如：报名、参赛、奖项"
                  />
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowFaqForm(false)} className="btn-secondary">
                    取消
                  </button>
                  <button onClick={handleAddFaq} className="btn-primary">
                    添加
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export default ActivityForm
