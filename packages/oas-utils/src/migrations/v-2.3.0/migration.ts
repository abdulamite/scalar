import type { v_2_2_0 } from '@/migrations/v-2.2.0/types.generated'

import type { v_2_3_0 } from './types.generated'

/** V-2.2.0 to V-2.3.0 migration */
export const migrate_v_2_3_0 = (
  data: v_2_2_0.DataRecord,
): v_2_3_0.DataRecord => {
  console.info('Performing data migration v-2.2.0 to v-2.3.0')

  const workspaces = Object.values(data.workspaces).reduce<
    v_2_3_0.DataRecord['workspaces']
  >((prev, w) => {
    prev[w.uid] = {
      ...w,
      environments: Object.keys(w.environments).reduce(
        (envRecord, envUid) => {
          envRecord[envUid] = ''
          return envRecord
        },
        {} as Record<string, string>,
      ),
    }
    return prev
  }, {})

  return {
    ...data,
    workspaces,
  } satisfies v_2_3_0.DataRecord
}
