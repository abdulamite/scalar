<script setup lang="ts">
import { OpenApiClientButton } from '@/components'
import AddressBar from '@/components/AddressBar/AddressBar.vue'
import EnvironmentSelector from '@/components/EnvironmentSelector/EnvironmentSelector.vue'
import SidebarToggle from '@/components/Sidebar/SidebarToggle.vue'
import { useLayout } from '@/hooks'
import { useActiveEntities } from '@/store/active-entities'
import { ScalarIcon } from '@scalar/components'

import { WorkspaceDropdown } from './components'

defineProps<{
  modelValue: boolean
  isReadonly: boolean
}>()

defineEmits<{
  (e: 'update:modelValue', v: boolean): void
  (e: 'hideModal'): void
  (e: 'importCurl', value: string): void
}>()

const { activeCollection } = useActiveEntities()
const { layout } = useLayout()
</script>
<template>
  <div
    class="lg:min-h-header flex items-center w-full justify-center p-2 pt-2 lg:pt-1 lg:p-1 flex-wrap t-app__top-container border-b-1/2">
    <div
      class="flex flex-row items-center gap-1 lg:px-1 lg:mb-0 lg:mb-0 mb-2 lg:flex-1 w-6/12">
      <SidebarToggle
        class="gitbook-hidden"
        :class="[
          'xl:hidden',
          { 'xl:!flex': !modelValue },
          { '!flex': layout === 'modal' },
        ]"
        :modelValue="modelValue"
        @update:modelValue="$emit('update:modelValue', $event)" />
      <WorkspaceDropdown v-if="!isReadonly" />
      <a
        class="text-c-2 text-sm font-medium gitbook-show ml-.5 hover:text-c-1 border p-1 rounded hover:bg-b-3"
        href="https://scalar.com/"
        target="_blank">
        Powered by Scalar.com
      </a>
    </div>
    <AddressBar @importCurl="$emit('importCurl', $event)" />
    <div
      class="flex flex-row items-center gap-1 lg:px-2.5 lg:mb-0 mb-2 lg:flex-1 justify-end w-6/12">
      <EnvironmentSelector v-if="!isReadonly" />

      <OpenApiClientButton
        v-if="isReadonly && activeCollection?.documentUrl"
        buttonSource="modal"
        class="gitbook-hidden !w-fit lg:-mr-1"
        :integration="activeCollection?.integration"
        :url="activeCollection?.documentUrl" />
      <!-- TODO: There should be an `ìsModal` flag instead -->
      <button
        v-if="isReadonly"
        class="app-exit-button p-2 rounded-full fixed right-2 top-2 gitbook-hidden"
        type="button"
        @click="$emit('hideModal')">
        <ScalarIcon
          icon="Close"
          size="lg"
          thickness="2" />
        <span class="sr-only">Close Client</span>
      </button>
      <!-- TODO: temporary solution: 2nd button (not fixed position) for our friends at GitBook -->
      <button
        v-if="isReadonly"
        class="text-c-1 hover:bg-b-2 active:text-c-1 p-2 rounded -mr-1.5 gitbook-show"
        type="button"
        @click="$emit('hideModal')">
        <ScalarIcon
          icon="Close"
          size="md"
          thickness="1.75" />
        <span class="sr-only">Close Client</span>
      </button>
    </div>
  </div>
</template>
<style scoped>
.gitbook-show {
  display: none;
}
.app-exit-button {
  color: white;
  background: rgba(0, 0, 0, 0.1);
}
.app-exit-button:hover {
  background: rgba(255, 255, 255, 0.1);
}
</style>
