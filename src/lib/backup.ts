// Export / import all local data (profiles, progress, favorites, settings) as a JSON file.
// There is no cloud sync, and iOS may evict web storage, so this is the user's safety net.
import { z } from 'zod'
import { db, type Favorite, type Profile, type Progress } from './db'
import { useSettings } from './settings'

const BackupSchema = z.object({
  app: z.literal('bean-english'),
  version: z.literal(1),
  exportedAt: z.string(),
  profiles: z.array(z.object({ id: z.number(), name: z.string(), color: z.string(), createdAt: z.number() })),
  progress: z.array(
    z.object({
      profileId: z.number(),
      phraseId: z.string(),
      topicId: z.string(),
      parentLearned: z.boolean(),
      childSaid: z.boolean(),
      updatedAt: z.number(),
    }),
  ),
  favorites: z.array(z.object({ profileId: z.number(), phraseId: z.string(), topicId: z.string(), createdAt: z.number() })),
  settings: z.object({ lang: z.enum(['vi', 'en']), showIpa: z.boolean(), activeProfileId: z.number().nullable() }).partial(),
})
export type Backup = z.infer<typeof BackupSchema>

export async function createBackup(): Promise<Backup> {
  const { lang, showIpa, activeProfileId } = useSettings.getState()
  return {
    app: 'bean-english',
    version: 1,
    exportedAt: new Date().toISOString(),
    profiles: await db.profiles.toArray(),
    progress: await db.progress.toArray(),
    favorites: await db.favorites.toArray(),
    settings: { lang, showIpa, activeProfileId },
  }
}

/** Save the backup: share sheet on iOS (Save to Files / AirDrop / Zalo…), download elsewhere. */
export async function exportBackup() {
  const data = await createBackup()
  const name = `bean-english-${data.exportedAt.slice(0, 10)}.json`
  const file = new File([JSON.stringify(data, null, 1)], name, { type: 'application/json' })
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: name })
      return
    } catch (e) {
      if ((e as Error).name === 'AbortError') return
    }
  }
  const url = URL.createObjectURL(file)
  const a = Object.assign(document.createElement('a'), { href: url, download: name })
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export async function parseBackup(file: File): Promise<Backup> {
  return BackupSchema.parse(JSON.parse(await file.text()))
}

/** Replace all local data with the backup. */
export async function restoreBackup(data: Backup) {
  await db.transaction('rw', db.profiles, db.progress, db.favorites, async () => {
    await Promise.all([db.profiles.clear(), db.progress.clear(), db.favorites.clear()])
    await db.profiles.bulkPut(data.profiles as Profile[])
    await db.progress.bulkPut(data.progress as Progress[])
    await db.favorites.bulkPut(data.favorites as Favorite[])
  })
  useSettings.getState().set(data.settings)
}
