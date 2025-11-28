import type { Payload } from 'payload'

/**
 * 動態 Hook 註冊系統
 */

export interface Trigger {
    id: string
    name: string
    enabled: boolean
    targetCollection: string
    hookType: string
    webhookUrl: string
    httpMethod: string
    headers?: Record<string, string>
    condition?: string
    timeout?: number
    retryCount?: number
}

// 全域變數儲存當前載入的觸發器
let currentTriggers: Trigger[] = []
let payloadInstance: Payload | null = null

/**
 * 重新載入所有觸發器
 */
export async function reloadTriggers(payload?: Payload): Promise<void> {
    // 如果提供了 payload 參數,使用它並更新全域實例
    if (payload) {
        payloadInstance = payload
    }

    if (!payloadInstance) {
        console.error('[Dynamic Hooks] Payload 實例未初始化')
        return
    }

    try {


        // 載入所有已啟用的觸發器
        const triggers = await loadTriggers(payloadInstance)
        currentTriggers = triggers



        // 列出每個觸發器的詳細資訊
        for (const trigger of triggers) {

        }
    } catch (error) {
        console.error('[Dynamic Hooks] 重新載入觸發器失敗:', error)
    }
}

/**
 * 取得當前載入的觸發器
 */
export function getCurrentTriggers(): Trigger[] {
    return currentTriggers
}

/**
 * 從資料庫載入所有已啟用的觸發器
 */
async function loadTriggers(payload: Payload): Promise<Trigger[]> {
    try {
        const { docs } = await payload.find({
            collection: 'triggers' as const,
            where: {
                enabled: {
                    equals: true,
                },
            },
            limit: 1000,
        })

        return docs.map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            enabled: doc.enabled,
            targetCollection: doc.targetCollection,
            hookType: doc.hookType,
            webhookUrl: doc.webhookUrl,
            httpMethod: doc.httpMethod,
            headers: doc.headers,
            condition: doc.condition,
            timeout: doc.timeout,
            retryCount: doc.retryCount,
        }))
    } catch (error) {

        return []
    }
}
