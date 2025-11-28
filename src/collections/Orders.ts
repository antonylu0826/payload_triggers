import type { CollectionConfig } from 'payload'

export const Orders: CollectionConfig = {
    slug: 'orders',
    admin: {
        useAsTitle: 'orderNumber',
        defaultColumns: ['orderNumber', 'customer', 'orderDate', 'status', 'finalAmount'],
    },
    fields: [
        {
            name: 'orderNumber',
            type: 'text',
            unique: true,
            label: '訂單編號',
            admin: {
                readOnly: true,
                description: '系統自動生成,格式: ORD-YYYYMMDD-XXXX',
            },
        },
        {
            name: 'customer',
            type: 'relationship',
            relationTo: 'customers',
            required: true,
            label: '客戶',
        },
        {
            name: 'orderDate',
            type: 'date',
            required: true,
            defaultValue: () => new Date().toISOString(),
            label: '訂單日期',
        },
        {
            name: 'status',
            type: 'select',
            required: true,
            defaultValue: 'pending',
            label: '訂單狀態',
            options: [
                {
                    label: '待確認',
                    value: 'pending',
                },
                {
                    label: '已確認',
                    value: 'confirmed',
                },
                {
                    label: '處理中',
                    value: 'processing',
                },
                {
                    label: '已出貨',
                    value: 'shipped',
                },
                {
                    label: '已完成',
                    value: 'completed',
                },
                {
                    label: '已取消',
                    value: 'cancelled',
                },
            ],
        },
        {
            name: 'items',
            type: 'array',
            required: true,
            minRows: 1,
            label: '訂單項目',
            fields: [
                {
                    name: 'product',
                    type: 'relationship',
                    relationTo: 'products',
                    required: true,
                    label: '商品',
                },
                {
                    name: 'quantity',
                    type: 'number',
                    required: true,
                    min: 1,
                    defaultValue: 1,
                    label: '數量',
                },
                {
                    name: 'unitPrice',
                    type: 'number',
                    required: true,
                    min: 0,
                    label: '單價',
                    admin: {
                        description: '會自動帶入商品價格,也可手動修改',
                    },
                },
                {
                    name: 'subtotal',
                    type: 'number',
                    required: true,
                    min: 0,
                    label: '小計',
                    admin: {
                        readOnly: true,
                        description: '自動計算 = 數量 × 單價',
                    },
                },
                {
                    name: 'notes',
                    type: 'textarea',
                    label: '備註',
                },
            ],
        },
        {
            name: 'totalAmount',
            type: 'number',
            required: true,
            defaultValue: 0,
            min: 0,
            label: '總金額',
            admin: {
                readOnly: true,
                description: '自動計算所有項目小計總和',
            },
        },
        {
            name: 'discount',
            type: 'number',
            defaultValue: 0,
            min: 0,
            label: '折扣',
        },
        {
            name: 'finalAmount',
            type: 'number',
            required: true,
            defaultValue: 0,
            min: 0,
            label: '最終金額',
            admin: {
                readOnly: true,
                description: '自動計算 = 總金額 - 折扣',
            },
        },
        {
            name: 'notes',
            type: 'textarea',
            label: '備註',
        },
        {
            name: 'shippingAddress',
            type: 'textarea',
            label: '配送地址',
        },
        {
            name: 'paymentStatus',
            type: 'select',
            required: true,
            defaultValue: 'unpaid',
            label: '付款狀態',
            options: [
                {
                    label: '未付款',
                    value: 'unpaid',
                },
                {
                    label: '部分付款',
                    value: 'partial',
                },
                {
                    label: '已付款',
                    value: 'paid',
                },
            ],
        },
        {
            name: 'paymentMethod',
            type: 'select',
            label: '付款方式',
            options: [
                {
                    label: '現金',
                    value: 'cash',
                },
                {
                    label: '轉帳',
                    value: 'transfer',
                },
                {
                    label: '信用卡',
                    value: 'credit_card',
                },
                {
                    label: '其他',
                    value: 'other',
                },
            ],
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
        {
            name: 'updatedBy',
            type: 'relationship',
            relationTo: 'users',
            label: '最後更新者',
            admin: {
                readOnly: true,
            },
        },
    ],
    hooks: {
        beforeChange: [
            async ({ data, req, operation, originalDoc }) => {
                // 生成訂單編號
                if (operation === 'create' && !data.orderNumber) {
                    const now = new Date()
                    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '')

                    // 查詢今天的最後一個訂單編號
                    const { docs } = await req.payload.find({
                        collection: 'orders',
                        where: {
                            orderNumber: {
                                like: `ORD-${dateStr}`,
                            },
                        },
                        sort: '-orderNumber',
                        limit: 1,
                    })

                    let nextNumber = 1
                    if (docs.length > 0 && docs[0].orderNumber) {
                        const lastNumber = docs[0].orderNumber
                        const match = lastNumber.match(/-(\d+)$/)
                        if (match) {
                            nextNumber = parseInt(match[1]) + 1
                        }
                    }

                    data.orderNumber = `ORD-${dateStr}-${String(nextNumber).padStart(4, '0')}`
                }

                // 自動設定建立者和更新者
                if (operation === 'create' && req.user) {
                    data.createdBy = req.user.id
                    data.updatedBy = req.user.id
                } else if (operation === 'update' && req.user) {
                    data.updatedBy = req.user.id
                }

                // 計算每個項目的小計
                if (data.items && Array.isArray(data.items)) {
                    data.items = await Promise.all(
                        data.items.map(async (item: any) => {
                            // 如果沒有設定單價,從商品取得
                            if (!item.unitPrice && item.product) {
                                const productId = typeof item.product === 'string' ? item.product : item.product.id
                                const product = await req.payload.findByID({
                                    collection: 'products',
                                    id: productId,
                                })
                                item.unitPrice = product.price
                            }

                            // 計算小計
                            item.subtotal = (item.quantity || 0) * (item.unitPrice || 0)
                            return item
                        })
                    )

                    // 計算總金額
                    data.totalAmount = data.items.reduce((sum: number, item: any) => sum + (item.subtotal || 0), 0)

                    // 計算最終金額
                    data.finalAmount = data.totalAmount - (data.discount || 0)
                }

                // 當訂單狀態變更為 confirmed 時扣減庫存
                if (
                    operation === 'update' &&
                    data.status === 'confirmed' &&
                    originalDoc.status !== 'confirmed'
                ) {
                    for (const item of data.items) {
                        const productId = typeof item.product === 'string' ? item.product : item.product.id
                        const product = await req.payload.findByID({
                            collection: 'products',
                            id: productId,
                        })

                        // 扣減庫存
                        await req.payload.update({
                            collection: 'products',
                            id: productId,
                            data: {
                                stock: product.stock - item.quantity,
                            },
                        })
                    }
                }

                // 當訂單從 confirmed 取消時,恢復庫存
                if (
                    operation === 'update' &&
                    data.status === 'cancelled' &&
                    originalDoc.status === 'confirmed'
                ) {
                    for (const item of originalDoc.items) {
                        const productId = typeof item.product === 'string' ? item.product : item.product.id
                        const product = await req.payload.findByID({
                            collection: 'products',
                            id: productId,
                        })

                        // 恢復庫存
                        await req.payload.update({
                            collection: 'products',
                            id: productId,
                            data: {
                                stock: product.stock + item.quantity,
                            },
                        })
                    }
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
        // 根據角色控制讀取權限
        read: ({ req: { user } }) => {
            if (['admin', 'manager'].includes(user?.role)) {
                return true // 可以查看所有訂單
            }
            if (user?.role === 'staff') {
                // Staff 只能查看自己建立的訂單
                return {
                    createdBy: {
                        equals: user.id,
                    },
                }
            }
            if (user?.role === 'viewer') {
                return true // Viewer 可以查看所有訂單
            }
            return false
        },
        // 根據角色控制更新權限
        update: ({ req: { user } }) => {
            if (['admin', 'manager'].includes(user?.role)) {
                return true // 可以更新所有訂單
            }
            if (user?.role === 'staff') {
                // Staff 只能更新自己建立的訂單
                return {
                    createdBy: {
                        equals: user.id,
                    },
                }
            }
            return false
        },
        // 只有 Admin 可以刪除
        delete: ({ req: { user } }) => {
            return user?.role === 'admin'
        },
    },
}
