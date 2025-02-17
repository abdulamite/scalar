<script setup lang="ts">
import ImportCurlModal from '@/components/ImportCurl/ImportCurlModal.vue'
import ViewLayout from '@/components/ViewLayout/ViewLayout.vue'
import ViewLayoutContent from '@/components/ViewLayout/ViewLayoutContent.vue'
import { ERRORS } from '@/libs'
import { importCurlCommand } from '@/libs/importers/curl'
import { createRequestOperation } from '@/libs/send-request'
import { useWorkspace } from '@/store'
import { useActiveEntities } from '@/store/active-entities'
import RequestSection from '@/views/Request/RequestSection/RequestSection.vue'
import RequestSubpageHeader from '@/views/Request/RequestSubpageHeader.vue'
import ResponseSection from '@/views/Request/ResponseSection/ResponseSection.vue'
import { useOpenApiWatcher } from '@/views/Request/hooks/useOpenApiWatcher'
import type { RequestPayload } from '@scalar/oas-utils/entities/spec'
import { safeJSON } from '@scalar/object-utils/parse'
import { useBreakpoints } from '@scalar/use-hooks/useBreakpoints'
import { useToasts } from '@scalar/use-toasts'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import RequestSidebar from './RequestSidebar.vue'

defineEmits<{
  (e: 'newTab', item: { name: string; uid: string }): void
}>()

const workspaceContext = useWorkspace()
const { toast } = useToasts()
const {
  activeCollection,
  activeExample,
  activeEnvironment,
  activeRequest,
  activeWorkspace,
  activeServer,
} = useActiveEntities()
const {
  cookies,
  isReadOnly,
  modalState,
  requestHistory,
  securitySchemes,
  requestMutators,
  serverMutators,
  servers,
  events,
} = workspaceContext

const showSideBar = ref(!isReadOnly)
const requestAbortController = ref<AbortController>()
const parsedCurl = ref<RequestPayload>()
const selectedServerUid = ref('')
const router = useRouter()

const activeHistoryEntry = computed(() =>
  requestHistory.findLast((r) => r.request.uid === activeExample.value?.uid),
)

/** Show / hide the sidebar when we resize the screen */
const { mediaQueries } = useBreakpoints()
watch(mediaQueries.md, (isMedium) => (showSideBar.value = isMedium))

/**
 * Selected scheme UIDs
 *
 * In the modal we use collection.selectedSecuritySchemes and in the
 * standalone client we use request.selectedSecuritySchemeUids
 *
 * These are centralized here so they can be drilled down AND used in send-request
 */
const selectedSecuritySchemeUids = computed(
  () =>
    (isReadOnly
      ? activeCollection.value?.selectedSecuritySchemeUids
      : activeRequest.value?.selectedSecuritySchemeUids) ?? [],
)

/**
 * Execute the request
 * called from the send button as well as keyboard shortcuts
 */
const executeRequest = async () => {
  if (!activeRequest.value || !activeExample.value || !activeCollection.value)
    return

  // Parse the environment string
  const e = safeJSON.parse(activeEnvironment.value?.value || '{}')
  if (e.error) console.error('INVALID ENVIRONMENT!')
  const environment =
    e.error || typeof e.data !== 'object' ? {} : (e.data ?? {})

  const globalCookies = activeWorkspace.value.cookies.map((c) => cookies[c])

  const [error, requestOperation] = createRequestOperation({
    request: activeRequest.value,
    example: activeExample.value,
    selectedSecuritySchemeUids: selectedSecuritySchemeUids.value,
    proxy: activeWorkspace.value.proxyUrl ?? '',
    environment,
    globalCookies,
    status: events.requestStatus,
    securitySchemes: securitySchemes,
    server: activeServer.value,
  })

  // Error from createRequestOperation
  if (error) {
    toast(error.message, 'error')
    return
  }

  requestAbortController.value = requestOperation.controller
  const [sendRequestError, result] = await requestOperation.sendRequest()

  // Send error toast
  if (sendRequestError) toast(sendRequestError.message, 'error')
  else requestHistory.push(result)
}

/** Cancel a live request */
const cancelRequest = async () =>
  requestAbortController.value?.abort(ERRORS.REQUEST_ABORTED)

onMounted(() => {
  events.executeRequest.on(executeRequest)
  events.cancelRequest.on(cancelRequest)
})

useOpenApiWatcher()

/**
 * Need to manually remove listener on unmount due to vueuse memory leak
 *
 * @see https://github.com/vueuse/vueuse/issues/3498#issuecomment-2055546566
 */
onBeforeUnmount(() => events.executeRequest.off(executeRequest))

function createRequestFromCurl({ requestName }: { requestName: string }) {
  if (!parsedCurl.value) return

  if (parsedCurl.value.servers) {
    // Find existing server to avoid duplication
    const existingServer = Object.values(servers).find(
      (s) => s.url === parsedCurl?.value?.servers?.[0],
    )
    if (existingServer) {
      selectedServerUid.value = existingServer.uid
    } else {
      selectedServerUid.value = serverMutators.add(
        { url: parsedCurl.value.servers[0] },
        activeWorkspace.value.collections[0],
      ).uid
    }
  }

  const newRequest = requestMutators.add(
    {
      summary: requestName,
      path: parsedCurl?.value?.path,
      method: parsedCurl?.value?.method,
      parameters: parsedCurl?.value?.parameters,
      selectedServerUid: selectedServerUid.value,
      requestBody: parsedCurl?.value?.requestBody,
    },
    activeWorkspace.value.collections[0],
  )

  if (newRequest) {
    router.push(
      `/workspace/${activeWorkspace.value.uid}/request/${newRequest.uid}`,
    )
  }
  modalState.hide()
}

function handleCurlImport(curl: string) {
  parsedCurl.value = importCurlCommand(curl)
  modalState.show()
}
</script>
<template>
  <div
    class="flex flex-1 flex-col pt-0 h-full bg-b-1 relative overflow-hidden"
    :class="{
      '!mr-0 !mb-0 !border-0': isReadOnly,
    }">
    <RequestSubpageHeader
      v-model="showSideBar"
      :isReadonly="isReadOnly"
      @hideModal="() => modalState.hide()"
      @importCurl="handleCurlImport" />
    <ViewLayout>
      <RequestSidebar
        :isReadonly="isReadOnly"
        :showSidebar="showSideBar"
        @newTab="$emit('newTab', $event)"
        @update:showSidebar="(show) => (showSideBar = show)" />
      <!-- TODO possible loading state -->
      <ViewLayoutContent
        v-if="activeExample"
        class="flex-1"
        :class="[showSideBar ? 'sidebar-active-hide-layout' : '']">
        <RequestSection
          :selectedSecuritySchemeUids="selectedSecuritySchemeUids" />
        <ResponseSection :response="activeHistoryEntry?.response" />
      </ViewLayoutContent>
    </ViewLayout>
  </div>
  <ImportCurlModal
    v-if="parsedCurl"
    :parsedCurl="parsedCurl"
    :state="modalState"
    @close="modalState.hide()"
    @importCurl="createRequestFromCurl" />
</template>
<style scoped>
.request-text-color-text {
  color: var(--scalar-color-1);
  background: linear-gradient(
    var(--scalar-background-1),
    var(--scalar-background-3)
  );
  box-shadow: 0 0 0 1px var(--scalar-border-color);
}
@media screen and (max-width: 800px) {
  .sidebar-active-hide-layout {
    display: none;
  }
  .sidebar-active-width {
    width: 100%;
  }
}
</style>
