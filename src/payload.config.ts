// storage-adapter-import-placeholder
import { mongooseAdapter } from '@payloadcms/db-mongodb'
import { payloadCloudPlugin } from '@payloadcms/payload-cloud'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Customers } from './collections/Customers'
import { Products } from './collections/Products'
import { Orders } from './collections/Orders'
import { Triggers } from './collections/Triggers'
import { dynamicTriggersPlugin } from './plugins/dynamicTriggers'
import { addDynamicTriggersToCollections } from './lib/addDynamicTriggers'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

// 為所有 collections 添加動態觸發器 hooks
const collectionsWithDynamicHooks = addDynamicTriggersToCollections([
  Users,
  Media,
  Customers,
  Products,
  Orders,
  Triggers,
])

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: collectionsWithDynamicHooks,
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: mongooseAdapter({
    url: process.env.DATABASE_URI || '',
  }),
  sharp,
  plugins: [
    payloadCloudPlugin(),
    dynamicTriggersPlugin(),
    // storage-adapter-placeholder
  ],
  endpoints: [
    {
      path: '/reload-triggers',
      method: 'post',
      handler: async (req) => {
        try {
          const { reloadTriggers, getCurrentTriggers } = await import('./lib/registerDynamicHooks')
          await reloadTriggers(req.payload)
          const triggers = getCurrentTriggers()

          return Response.json({
            success: true,
            count: triggers.length,
            triggers: triggers.map(t => ({
              name: t.name,
              targetCollection: t.targetCollection,
              hookType: t.hookType,
            }))
          })
        } catch (error: any) {
          return Response.json({ success: false, error: error.message }, { status: 500 })
        }
      },
    },
  ],
})
