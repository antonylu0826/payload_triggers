import type { CollectionConfig } from 'payload'

export const Users: CollectionConfig = {
  slug: 'users',
  admin: {
    useAsTitle: 'email',
  },
  auth: true,
  fields: [
    {
      name: 'name',
      type: 'text',
      required: true,
      label: '姓名',
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'viewer',
      label: '角色',
      options: [
        {
          label: '管理員',
          value: 'admin',
        },
        {
          label: '經理',
          value: 'manager',
        },
        {
          label: '員工',
          value: 'staff',
        },
        {
          label: '檢視者',
          value: 'viewer',
        },
      ],
      access: {
        // 只有管理員可以設定角色
        update: ({ req: { user } }) => {
          return user?.role === 'admin'
        },
      },
    },
    {
      name: 'isActive',
      type: 'checkbox',
      defaultValue: true,
      label: '是否啟用',
      admin: {
        description: '停用的用戶無法登入系統',
      },
    },
  ],
  access: {
    // 只有管理員可以建立新用戶
    create: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
    // 管理員可以查看所有用戶,其他人只能查看自己
    read: ({ req: { user } }) => {
      if (user?.role === 'admin') {
        return true
      }
      return {
        id: {
          equals: user?.id,
        },
      }
    },
    // 管理員可以更新所有用戶,其他人只能更新自己
    update: ({ req: { user } }) => {
      if (user?.role === 'admin') {
        return true
      }
      return {
        id: {
          equals: user?.id,
        },
      }
    },
    // 只有管理員可以刪除用戶
    delete: ({ req: { user } }) => {
      return user?.role === 'admin'
    },
  },
}
