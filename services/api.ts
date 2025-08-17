import axios from "axios"

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/api",
  timeout: 10000,
  headers: {
    "Content-Type": "application/json",
  },
})

// Request interceptor for adding auth tokens
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem("authToken")
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => {
    return Promise.reject(error)
  },
)

// Response interceptor for handling errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem("authToken")
      window.location.href = "/login"
    }
    return Promise.reject(error)
  },
)

// API endpoints
export const reminderAPI = {
  // Get all reminders
  getReminders: async () => {
    const response = await api.get("/reminders")
    return response.data
  },

  // Get reminder by ID
  getReminder: async (id: number) => {
    const response = await api.get(`/reminders/${id}`)
    return response.data
  },

  // Create new reminder
  createReminder: async (reminder: any) => {
    const response = await api.post("/reminders", reminder)
    return response.data
  },

  // Update reminder
  updateReminder: async (id: number, reminder: any) => {
    const response = await api.put(`/reminders/${id}`, reminder)
    return response.data
  },

  // Delete reminder
  deleteReminder: async (id: number) => {
    const response = await api.delete(`/reminders/${id}`)
    return response.data
  },

  // Complete reminder
  completeReminder: async (id: number) => {
    const response = await api.patch(`/reminders/${id}/complete`)
    return response.data
  },

  // Snooze reminder
  snoozeReminder: async (id: number, minutes: number) => {
    const response = await api.patch(`/reminders/${id}/snooze`, { minutes })
    return response.data
  },
}

export default api
