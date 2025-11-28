import { User as PayloadUser } from 'payload'

// 定義擴展的 User 類型
export interface CustomUser {
    id: string
    email: string
    name?: string
    role?: 'admin' | 'manager' | 'staff' | 'viewer'
    isActive?: boolean
    collection?: string
}
