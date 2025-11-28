import type { CollectionConfig } from 'payload'

export const Products: CollectionConfig = {
    slug: 'products',
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['productCode', 'name', 'category', 'price', 'stock', 'isActive'],
    },
    fields: [
        {
            name: 'productCode',
            type: 'text',
            required: true,
            unique: true,
            label: '商品編號',
        },
        {
            name: 'name',
            type: 'text',
            required: true,
            label: '商品名稱',
        },
        {
            name: 'description',
            type: 'textarea',
            label: '商品描述',
        },
        {
            name: 'category',
            type: 'select',
            label: '分類',
            options: [
                {
                    label: '電子產品',
                    value: 'electronics',
                },
                {
                    label: '服裝',
                    value: 'clothing',
                },
                {
                    label: '食品',
                    value: 'food',
                },
                {
                    label: '家居用品',
                    value: 'home',
                },
                {
                    label: '其他',
                    value: 'other',
                },
            ],
        },
        {
            name: 'price',
            type: 'number',
            required: true,
            min: 0,
            label: '單價',
        },
        {
            name: 'cost',
            type: 'number',
            min: 0,
            label: '成本',
            admin: {
                description: '進貨成本',
            },
        },
        {
            name: 'unit',
            type: 'select',
            label: '單位',
            defaultValue: 'pcs',
            options: [
                {
                    label: '個',
                    value: 'pcs',
                },
                {
                    label: '件',
                    value: 'items',
                },
                {
                    label: '公斤',
                    value: 'kg',
                },
                {
                    label: '公升',
                    value: 'liter',
                },
                {
                    label: '盒',
                    value: 'box',
                },
                {
                    label: '包',
                    value: 'pack',
                },
            ],
        },
        {
            name: 'stock',
            type: 'number',
            required: true,
            defaultValue: 0,
            min: 0,
            label: '庫存數量',
        },
        {
            name: 'minStock',
            type: 'number',
            defaultValue: 10,
            min: 0,
            label: '最低庫存警示',
            admin: {
                description: '當庫存低於此數值時會顯示警示',
            },
        },
        {
            name: 'image',
            type: 'upload',
            relationTo: 'media',
            label: '商品圖片',
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
                if (operation === 'create' && req.user) {
                    data.createdBy = req.user.id
                }
                return data
            },
        ],
    },
    access: {
        // Admin, Manager, Staff 可以建立
        create: ({ req: { user } }) => {
            return ['admin', 'manager', 'staff'].includes(user?.role)
        },
        // 所有角色都可以讀取
        read: ({ req: { user } }) => {
            return ['admin', 'manager', 'staff', 'viewer'].includes(user?.role)
        },
        // Admin, Manager, Staff 可以更新
        update: ({ req: { user } }) => {
            return ['admin', 'manager', 'staff'].includes(user?.role)
        },
        // 只有 Admin 可以刪除
        delete: ({ req: { user } }) => {
            return user?.role === 'admin'
        },
    },
}
