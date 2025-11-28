import type { Payload } from 'payload'

/**
 * 觸發器執行引擎
 * 負責呼叫 webhook 並處理錯誤與重試邏輯
 */

export interface TriggerExecutionContext {
    triggerId: string
    triggerName: string
    webhookUrl: string
    httpMethod: string
    headers?: Record<string, string>
    timeout?: number
    retryCount?: number
    eventData: any
}

interface WebhookPayload {
    trigger: {
        id: string
        name: string
        hookType: string
        targetCollection: string
    }
    event: {
        operation: string
        collection: string
        timestamp: string
    }
    data: any
    originalDoc?: any
    user?: {
        id: string
        email: string
        role: string
    }
}

/**
 * 執行 webhook 呼叫
 */
export async function executeWebhook(context: TriggerExecutionContext): Promise<void> {
    const { webhookUrl, httpMethod, headers, timeout, retryCount, eventData } = context



    // 準備 webhook payload


    const serializedData = serializeData(eventData.data)


    const payload: WebhookPayload = {
        trigger: {
            id: context.triggerId,
            name: context.triggerName,
            hookType: eventData.hookType || 'unknown',
            targetCollection: eventData.collection || 'unknown',
        },
        event: {
            operation: eventData.operation || 'unknown',
            collection: eventData.collection || 'unknown',
            timestamp: new Date().toISOString(),
        },
        data: serializedData,
        originalDoc: eventData.originalDoc ? serializeData(eventData.originalDoc) : undefined,
        user: eventData.user
            ? {
                id: eventData.user.id,
                email: eventData.user.email,
                role: eventData.user.role,
            }
            : undefined,
    }



    // 執行 webhook 呼叫(包含重試邏輯)
    const maxAttempts = (retryCount || 0) + 1
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {

            await callWebhook(webhookUrl, httpMethod, payload, headers, timeout)

            // 成功則返回
            return
        } catch (error) {
            lastError = error as Error
            console.error(
                `[Trigger Engine] ✗ Webhook 呼叫失敗 (嘗試 ${attempt}/${maxAttempts}):`,
                error
            )

            // 如果還有重試次數,等待後重試
            if (attempt < maxAttempts) {
                // 指數退避: 1秒, 2秒, 4秒...
                const delay = Math.pow(2, attempt - 1) * 1000

                await sleep(delay)
            }
        }
    }

    // 所有重試都失敗
    console.error(
        `[Trigger Engine] ✗✗✗ Webhook 呼叫最終失敗 (${context.triggerName}):`,
        lastError
    )
    // 不拋出錯誤,避免中斷主流程
}

/**
 * 實際呼叫 webhook
 */
async function callWebhook(
    url: string,
    method: string,
    payload: WebhookPayload,
    headers?: Record<string, string>,
    timeout: number = 5000
): Promise<void> {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    try {
        const requestHeaders: Record<string, string> = {
            'Content-Type': 'application/json',
            ...headers,
        }

        const options: RequestInit = {
            method: method,
            headers: requestHeaders,
            signal: controller.signal,
        }

        // GET 方法不需要 body
        if (method !== 'GET') {
            const bodyString = JSON.stringify(payload)

            options.body = bodyString
        }

        const response = await fetch(url, options)

        if (!response.ok) {
            throw new Error(
                `Webhook 回應失敗: ${response.status} ${response.statusText}`
            )
        }


    } finally {
        clearTimeout(timeoutId)
    }
}

/**
 * 序列化資料,移除循環引用和不可序列化的內容
 */
function serializeData(data: any): any {
    if (!data) return data

    try {
        // 使用 JSON.stringify/parse 來深度複製並移除不可序列化的內容
        return JSON.parse(JSON.stringify(data))
    } catch (error) {
        console.error('[Trigger Engine] 資料序列化失敗:', error)
        return {}
    }
}

/**
 * 延遲函數
 */
function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * 檢查觸發條件
 * @param condition JavaScript 表達式字串
 * @param context 執行上下文 (包含 data, originalDoc 等)
 * @returns 是否符合條件
 */
export function evaluateCondition(condition: string, context: any): boolean {
    if (!condition || condition.trim() === '') {
        return true // 沒有條件則總是執行
    }

    try {
        // 使用 Function 建構子建立條件判斷函數
        // 注意: 這裡只用於簡單的條件判斷,不執行複雜的代碼
        const func = new Function('data', 'originalDoc', 'user', `return ${condition}`)
        const result = func(context.data, context.originalDoc, context.user)

        // Debug logging to file
        try {
            const fs = require('fs');
            const path = require('path');
            const logPath = path.join(process.cwd(), 'trigger_debug.log');
            const logEntry = `[${new Date().toISOString()}] Condition: "${condition}" | Result: ${result} | DataStatus: ${context.data?.status}\n`;
            fs.appendFileSync(logPath, logEntry);
        } catch (e) {
            // ignore file write error
        }

        console.log(`[Trigger Engine] 條件評估: "${condition}"`, {
            dataStatus: context.data?.status,
            result
        })
        return result
    } catch (error) {
        console.error('[Trigger Engine] 條件判斷執行失敗:', error)
        return false // 條件判斷失敗則不執行
    }
}
