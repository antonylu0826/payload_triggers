import type { CollectionConfig } from 'payload'

export const Customers: CollectionConfig = {
    slug: 'customers',
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['customerCode', 'name', 'contactPerson', 'phone', 'isActive'],
    },
    fields: [
        {
            name: 'customerCode',
            type: 'text',
            unique: true,
            label: '客戶編號',
            admin: {
                readOnly: true,
                description: '系統自動生成',
            },
        },
        {
            name: 'name',
            type: 'text',
            required: true,
            label: '客戶名稱',
        },
        {
            name: 'contactPerson',
            type: 'text',
            label: '聯絡人',
        },
        {
            name: 'phone',
            type: 'text',
            label: '電話',
        },
        {
            name: 'email',
            type: 'email',
            label: '電子郵件',
        },
        {
            name: 'address',
            type: 'textarea',
            label: '地址',
        },
        {
            name: 'taxId',
            type: 'text',
            label: '統一編號',
        },
        {
            name: 'notes',
            type: 'textarea',
            label: '備註',
        },
        {
            name: 'isActive',
            type: 'checkbox',
            defaultValue: true,
            label: '是否啟用',
        },
        {
            name: 'createdBy',
            type: 'relationship',
            relationTo: 'users',
            label: '建立者',
            admin: {
                readOnly: true,
            },
        },
    ],
    hooks: {
        beforeChange: [
            async ({ data, req, operation }) => {
                // 自動設定建立者
                if (operation === 'create') {
                    if (req.user) {
                        data.createdBy = req.user.id
                    }
                    // 生成客戶編號
                    if (!data.customerCode) {
                        // 查詢最後一個客戶編號
                        const { docs } = await req.payload.find({
                            collection: 'customers',
                            sort: '-customerCode',
                            limit: 1,
                        })

                        let nextNumber = 1
                        if (docs.length > 0 && docs[0].customerCode) {
                            const lastCode = docs[0].customerCode
                            const match = lastCode.match(/CUS-(\d+)/)
                            if (match) {
                                nextNumber = parseInt(match[1]) + 1
                            }
                        }

                        data.customerCode = `CUS-${String(nextNumber).padStart(4, '0')}`
                    }
                }
                return data
            },
        ],
    },
    access: {
        // Admin 和 Manager 可以建立
        create: ({ req: { user } }) => {
            return ['admin', 'manager', 'staff'].includes(user?.role)
        },
        // Admin, Manager, Staff 可以讀取
        read: ({ req: { user } }) => {
            return ['admin', 'manager', 'staff', 'viewer'].includes(user?.role)
        },
        // Admin 和 Manager 可以更新
        update: ({ req: { user } }) => {
            return ['admin', 'manager', 'staff'].includes(user?.role)
        },
        // 只有 Admin 可以刪除
        delete: ({ req: { user } }) => {
            return user?.role === 'admin'
        },
    },
}
