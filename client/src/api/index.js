import axios from 'axios'

const api = axios.create({
  baseURL: '/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json'
  }
})

// 请求拦截器
api.interceptors.request.use(
  config => {
    const token = localStorage.getItem('admin_token')
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  error => Promise.reject(error)
)

// 响应拦截器
api.interceptors.response.use(
  response => response.data,
  error => {
    if (error.response?.status === 401) {
      localStorage.removeItem('admin_token')
      window.location.href = '/admin'
    }
    return Promise.reject(error.response?.data || error)
  }
)

// 认证接口
export const authApi = {
  login: (username, password) => api.post('/auth/login', { username, password }),
  verify: () => api.get('/auth/verify'),
  changePassword: (username, oldPassword, newPassword) => 
    api.post('/auth/change-password', { username, oldPassword, newPassword })
}

// 活动接口
export const activityApi = {
  getAll: () => api.get('/activities'),
  getById: (id) => api.get(`/activities/${id}`),
  create: (data, file) => {
    const formData = new FormData()
    Object.keys(data).forEach(key => {
      if (data[key] !== undefined && data[key] !== null) {
        formData.append(key, data[key])
      }
    })
    if (file) {
      formData.append('faq_file', file)
    }
    return api.post('/activities', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  update: (id, data) => api.put(`/activities/${id}`, data),
  delete: (id) => api.delete(`/activities/${id}`),
  
  // FAQ 相关
  getFaqs: (id) => api.get(`/activities/${id}/faqs`),
  uploadFaq: (id, file) => {
    const formData = new FormData()
    formData.append('faq_file', file)
    return api.post(`/activities/${id}/faq/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  addFaq: (id, data) => api.post(`/activities/${id}/faqs`, data),
  updateFaq: (faqId, data) => api.put(`/activities/faqs/${faqId}`, data),
  deleteFaq: (faqId) => api.delete(`/activities/faqs/${faqId}`),
  clearFaqs: (id) => api.delete(`/activities/${id}/faqs`)
}

// 聊天接口
export const chatApi = {
  createSession: (activityId, visitorId) => 
    api.post('/chat/session', { activity_id: activityId, visitor_id: visitorId }),
  sendMessage: (sessionId, message) => 
    api.post('/chat/message', { session_id: sessionId, message }),
  getHistory: (sessionId, limit = 50, offset = 0) => 
    api.get(`/chat/history/${sessionId}?limit=${limit}&offset=${offset}`),
  clearHistory: (sessionId) => api.delete(`/chat/history/${sessionId}`),
  getActivity: (activityId) => api.get(`/chat/activity/${activityId}`)
}

// 统计接口
export const statsApi = {
  getActivityStats: (activityId) => api.get(`/stats/activity/${activityId}`),
  getOverview: () => api.get('/stats/overview'),
  getUnanswered: (activityId) => api.get(`/stats/unanswered/${activityId}`),
  resolveUnanswered: (id) => api.put(`/stats/unanswered/${id}/resolve`)
}

export default api
