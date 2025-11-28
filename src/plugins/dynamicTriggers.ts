import type { Config } from 'payload'

/**
 * Dynamic Triggers Plugin
 */
export const dynamicTriggersPlugin = () => (incomingConfig: Config): Config => {


    return {
        ...incomingConfig,
        onInit: async (payload) => {


            try {
                // 呼叫原始的 onInit (如果有的話)
                if (incomingConfig.onInit) {

                    await incomingConfig.onInit(payload)
                }



                // 載入並顯示觸發器 - 傳入 payload 實例
                const { reloadTriggers } = await import('../lib/registerDynamicHooks')

                await reloadTriggers(payload)

            } catch (error) {
                console.error('[Dynamic Triggers] ✗ onInit 執行失敗:', error)
            }
        },
    }
}
