import type { PayloadHandler } from 'payload'

export const reloadTriggersHandler: PayloadHandler = async (req, res) => {
    try {
        const { reloadTriggers } = await import('../lib/registerDynamicHooks')
        await reloadTriggers(req.payload)

        const { getCurrentTriggers } = await import('../lib/registerDynamicHooks')
        const triggers = getCurrentTriggers()

        res.status(200).json({
            success: true,
            message: '觸發器已重新載入',
            triggersCount: triggers.length,
            triggers: triggers.map(t => ({
                name: t.name,
                targetCollection: t.targetCollection,
                hookType: t.hookType,
            })),
        })
    } catch (error: any) {
        res.status(500).json({
            success: false,
            error: error.message,
        })
    }
}
