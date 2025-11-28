import type { CollectionConfig } from 'payload'

export const Triggers: CollectionConfig = {
    slug: 'triggers',
    admin: {
        useAsTitle: 'name',
        defaultColumns: ['name', 'enabled', 'targetCollection', 'hookType', 'webhookUrl'],
        description: '設定資料觸發器,當指定的 collection 發生事件時自動呼叫 webhook',
    },
    fields: [
        {
            name: 'name',
            type: 'text',
            required: true,
            label: '觸發器名稱',
            admin: {
                description: '這個觸發器的名稱,例如:「訂單狀態變更通知」',
            },
        },
        {
            name: 'enabled',
            type: 'checkbox',
            defaultValue: true,
            label: '啟用',
            admin: {
                description: '關閉此選項可暫時停用此觸發器',
            },
        },
        {
            name: 'description',
            type: 'textarea',
            label: '描述',
            admin: {
                description: '說明此觸發器的用途',
            },
        },
        {
            name: 'targetCollection',
            type: 'select',
            required: true,
            label: '目標 Collection',
            options: [
                {
                    label: 'Orders (訂單)',
                    value: 'orders',
                },
                {
                    label: 'Products (商品)',
                    value: 'products',
                },
                {
                    label: 'Customers (客戶)',
                    value: 'customers',
                },
                {
                    label: 'Users (使用者)',
                    value: 'users',
                },
                {
                    label: 'Media (媒體)',
                    value: 'media',
                },
            ],
            admin: {
                description: '選擇要監聽的 collection',
            },
        },
        {
            name: 'hookType',
            type: 'select',
            required: true,
            label: 'Hook 類型',
            options: [
                {
                    label: 'Before Change (資料變更前)',
                    value: 'beforeChange',
                },
                {
                    label: 'After Change (資料變更後)',
                    value: 'afterChange',
                },
                {
                    label: 'Before Delete (刪除前)',
                    value: 'beforeDelete',
                },
                {
                    label: 'After Delete (刪除後)',
                    value: 'afterDelete',
                },
                {
                    label: 'Before Read (讀取前)',
                    value: 'beforeRead',
                },
                {
                    label: 'After Read (讀取後)',
                    value: 'afterRead',
                },
            ],
            admin: {
                description: '選擇要在哪個時機點觸發',
            },
        },
        {
            name: 'webhookUrl',
            type: 'text',
            required: true,
            label: 'Webhook URL',
            admin: {
                description: '當觸發器啟動時要呼叫的 HTTP 端點',
            },
        },
        {
            name: 'httpMethod',
            type: 'select',
            required: true,
            defaultValue: 'POST',
            label: 'HTTP 方法',
            options: [
                {
                    label: 'POST',
                    value: 'POST',
                },
                {
                    label: 'GET',
                    value: 'GET',
                },
                {
                    label: 'PUT',
                    value: 'PUT',
                },
                {
                    label: 'PATCH',
                    value: 'PATCH',
                },
            ],
        },
        {
            name: 'headers',
            type: 'json',
            label: 'HTTP Headers',
            admin: {
                description: '自訂 HTTP headers,JSON 格式,例如: {"Authorization": "Bearer token123"}',
            },
        },
        {
            name: 'condition',
            type: 'textarea',
            label: '執行條件 (選填)',
            admin: {
                description: '用 JavaScript 表達式定義觸發條件,例如: data.status === "confirmed"。留空則總是執行',
            },
        },
        {
            name: 'timeout',
            type: 'number',
            defaultValue: 5000,
            min: 1000,
            max: 60000,
            label: 'Timeout (毫秒)',
            admin: {
                description: 'Webhook 請求的超時時間,預設 5000ms (5秒)',
            },
        },
        {
            name: 'retryCount',
            type: 'number',
            defaultValue: 0,
            min: 0,
            max: 5,
            label: '失敗重試次數',
            admin: {
                description: 'Webhook 呼叫失敗時的重試次數,0 表示不重試',
            },
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
            async ({ data, req, operation }) => {
                // 自動設定建立者和更新者
                if (operation === 'create' && req.user) {
                    data.createdBy = req.user.id
                    data.updatedBy = req.user.id
                } else if (operation === 'update' && req.user) {
                    data.updatedBy = req.user.id
                }
                return data
            },
        ],
        afterChange: [
            async ({ req }) => {
                // 當觸發器建立或更新時,重新載入所有觸發器
                const { reloadTriggers } = await import('../lib/registerDynamicHooks')
                await reloadTriggers(req.payload)
            },
        ],
        afterDelete: [
            async ({ req }) => {
                // 當觸發器刪除時,重新載入所有觸發器
                const { reloadTriggers } = await import('../lib/registerDynamicHooks')
                await reloadTriggers(req.payload)
            },
        ],
    },
    access: {
        // Admin 和 Manager 可以建立
        create: ({ req: { user } }) => {
            if (!user?.role) return false
            return ['admin', 'manager'].includes(user.role)
        },
        // Admin 和 Manager 可以查看所有觸發器
        read: ({ req: { user } }) => {
            if (!user?.role) return false
            return ['admin', 'manager'].includes(user.role)
        },
        // Admin 和 Manager 可以更新
        update: ({ req: { user } }) => {
            if (!user?.role) return false
            return ['admin', 'manager'].includes(user.role)
        },
        // 只有 Admin 可以刪除
        delete: ({ req: { user } }) => {
            return user?.role === 'admin'
        },
    },
}
