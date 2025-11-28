import type { CollectionConfig } from 'payload'
import { getCurrentTriggers } from './registerDynamicHooks'
import { executeWebhook, evaluateCondition } from './triggerEngine'

/**
 * 為 collections 添加動態觸發器 hooks
 */
export function addDynamicTriggersToCollections(
    collections: CollectionConfig[]
): CollectionConfig[] {


    return collections.map((collection) => {
        const hooks = { ...collection.hooks }

        // 為每個 hook 類型添加動態處理函數
        const hookTypes = ['beforeChange', 'afterChange', 'beforeDelete', 'afterDelete', 'beforeRead', 'afterRead']

        for (const hookType of hookTypes) {
            const existingHooks = (hooks as any)[hookType] || []
            const dynamicHook = createDynamicHook(hookType, collection.slug)

                // 將動態 hook 添加到現有 hooks 之後
                ; (hooks as any)[hookType] = [...existingHooks, dynamicHook]
        }

        return {
            ...collection,
            hooks,
        }
    })
}

/**
 * 建立動態 hook 函數
 */
function createDynamicHook(hookType: string, collectionSlug: string) {
    return async (args: any) => {
        try {


            const { req, operation } = args
            let data = args.data
            let originalDoc = args.originalDoc

            // 標準化參數: 不同 hook 類型的參數名稱不同
            // afterChange: doc, previousDoc
            // afterDelete: doc
            // afterRead: doc
            if (hookType === 'afterChange') {
                data = args.doc
                originalDoc = args.previousDoc
            } else if (hookType === 'afterDelete' || hookType === 'afterRead') {
                data = args.doc
            }

            // 從當前載入的觸發器中篩選符合的觸發器
            const currentTriggers = getCurrentTriggers()
            const relevantTriggers = currentTriggers.filter(
                (trigger) =>
                    trigger.targetCollection === collectionSlug &&
                    trigger.hookType === hookType
            )



            if (relevantTriggers.length === 0) {
                // 沒有相關觸發器,不做任何修改

                return undefined // 返回 undefined 表示不修改數據
            }

            // 準備執行上下文
            const context = {
                data,
                originalDoc,
                user: req?.user,
                operation,
                collection: collectionSlug,
            }

            // 執行所有符合條件的觸發器
            for (const trigger of relevantTriggers) {


                // 檢查條件
                if (trigger.condition) {
                    const conditionMet = evaluateCondition(trigger.condition, context)

                    if (!conditionMet) {
                        console.log(`[Dynamic Hooks] 觸發器 "${trigger.name}" 條件不符, 跳過執行`)
                        continue
                    }
                }

                // 執行 webhook (非同步,不阻塞主流程)
                executeWebhook({
                    triggerId: trigger.id,
                    triggerName: trigger.name,
                    webhookUrl: trigger.webhookUrl,
                    httpMethod: trigger.httpMethod,
                    headers: trigger.headers,
                    timeout: trigger.timeout,
                    retryCount: trigger.retryCount,
                    eventData: {
                        hookType,
                        collection: collectionSlug,
                        operation,
                        data,
                        originalDoc,
                        user: req?.user
                            ? {
                                id: req.user.id,
                                email: req.user.email,
                                role: req.user.role,
                            }
                            : undefined,
                    },
                }).catch((error) => {
                    // 捕獲錯誤但不拋出,避免影響主流程
                    console.error(`[Dynamic Hooks] 觸發器 "${trigger.name}" 執行失敗:`, error)
                })
            }

            // 不修改數據,返回 undefined
            return undefined
        } catch (error) {
            // 捕獲所有錯誤,避免中斷請求
            console.error(`[Dynamic Hooks] ✗ Hook 執行錯誤 (${collectionSlug}.${hookType}):`, error)

            // 返回 undefined,不修改數據
            return undefined
        }
    }
}
