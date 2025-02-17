<script setup lang="ts">
import DeleteSidebarListElement from '@/components/Sidebar/Actions/DeleteSidebarListElement.vue'
import EditSidebarListCollection from '@/components/Sidebar/Actions/EditSidebarListCollection.vue'
import EditSidebarListElement from '@/components/Sidebar/Actions/EditSidebarListElement.vue'
import { PathId } from '@/router'
import { useWorkspace } from '@/store'
import { useActiveEntities } from '@/store/active-entities'
import { createInitialRequest } from '@/store/requests'
import type { SidebarMenuItem } from '@/views/Request/types'
import {
  ScalarDropdown,
  ScalarDropdownItem,
  ScalarIcon,
  ScalarModal,
  useModal,
} from '@scalar/components'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

const props = defineProps<{ menuItem: SidebarMenuItem }>()

const emit = defineEmits<{
  (e: 'closeMenu'): []
  (e: 'toggleWatchMode', item: SidebarMenuItem['item']): void
  (e: 'clearDrafts'): void
}>()

const { replace } = useRouter()
const {
  activeWorkspace,
  activeRouterParams,
  activeWorkspaceCollections,
  activeWorkspaceRequests,
} = useActiveEntities()
const { events, requestMutators } = useWorkspace()

const editModal = useModal()
const deleteModal = useModal()
const clearDraftsModal = useModal()

/** Add example */
const handleAddExample = () =>
  events.commandPalette.emit({
    commandName: 'Add Example',
    metaData: {
      itemUid: props.menuItem.item?.entity.uid,
    },
  })

const handleEdit = (newName: string, newIcon?: string) => {
  props.menuItem.item?.edit(newName, newIcon)
  editModal.hide()
}

/** Delete with redirect for both requests and requestExamples */
const handleItemDelete = () => {
  props.menuItem.item?.delete()

  if (!activeWorkspaceRequests.value.length) {
    const { request } = createInitialRequest()
    const draftCollection = activeWorkspaceCollections.value.find(
      (collection) => collection.info?.title === 'Drafts',
    )

    if (draftCollection) {
      requestMutators.add(request, draftCollection.uid)
      replace(`/workspace/${activeWorkspace.value.uid}/request/${request.uid}`)
    }
  }

  if (
    activeRouterParams.value[PathId.Request] === props.menuItem.item?.entity.uid
  )
    replace(`/workspace/${activeWorkspace.value.uid}/request/default`)

  if (
    activeRouterParams.value[PathId.Examples] ===
    props.menuItem.item?.entity.uid
  )
    replace(`/workspace/${activeWorkspace.value}/request/default`)

  if (activeWorkspaceCollections.value[0]) {
    const firstRequest = activeWorkspaceCollections.value[0].requests[0]
    replace(`/workspace/${activeWorkspace.value.uid}/request/${firstRequest}`)
  }

  deleteModal.hide()
}

// Manually focus the popup - not pretty but it works
const menuRef = ref<typeof ScalarDropdown | null>(null)
watch([() => props.menuItem.open, menuRef], async ([open]) => {
  if (open && menuRef.value?.$parent?.$el) menuRef.value.$parent.$el.focus()
})

// Close menu on click because headless doesn't seem to work
const globalClickListener = () => props.menuItem.open && emit('closeMenu')
onMounted(() => window.addEventListener('click', globalClickListener))
onBeforeUnmount(() => window.removeEventListener('click', globalClickListener))

const toggleWatchMode = () => {
  emit('toggleWatchMode', props.menuItem.item)
}

const handleClearDrafts = () => {
  emit('clearDrafts')
  clearDraftsModal.hide()
}

const isDraftsMenuItem = computed(() => {
  return props.menuItem.item?.title === 'Drafts'
})
</script>

<template>
  <ScalarDropdown
    v-if="menuItem.targetRef && menuItem.open"
    static
    :targetRef="menuItem.targetRef"
    teleport
    @keydown.escape="$emit('closeMenu')">
    <template #items>
      <!-- Add example -->
      <ScalarDropdownItem
        v-if="menuItem.item?.entity.type === 'request'"
        class="flex gap-2"
        @click="handleAddExample">
        <ScalarIcon
          class="inline-flex"
          icon="Example"
          size="md"
          thickness="1.5" />
        <span>Add Example</span>
      </ScalarDropdownItem>

      <!-- Rename -->
      <ScalarDropdownItem
        v-if="!isDraftsMenuItem"
        ref="menuRef"
        class="flex gap-2"
        @click="editModal.show()">
        <ScalarIcon
          class="inline-flex"
          icon="Edit"
          size="md"
          thickness="1.5" />
        <span>
          <template v-if="menuItem.item?.entity.type === 'collection'">
            Edit
          </template>
          <template v-else> Rename </template>
        </span>
      </ScalarDropdownItem>

      <!-- Duplicate -->
      <!-- <ScalarDropdownItem
        class="flex !gap-2"
        @click="handleItemDuplicate">
        <ScalarIcon
          class="inline-flex"
          thickness="1.5"
          icon="Duplicate"
          size="sm" />
        <span>Duplicate</span>
      </ScalarDropdownItem>
      <ScalarDropdownDivider /> -->

      <!-- Watch -->
      <ScalarDropdownItem
        v-if="menuItem.item?.documentUrl"
        ref="menuRef"
        class="flex gap-2"
        @click="toggleWatchMode">
        <ScalarIcon
          class="inline-flex"
          :icon="menuItem.item?.watchMode ? 'Unwatch' : 'Watch'"
          size="md"
          thickness="1.5" />
        <span>
          {{
            menuItem.item?.watchMode
              ? 'Disable Watch Mode'
              : 'Enable Watch Mode'
          }}
        </span>
      </ScalarDropdownItem>

      <!-- Delete -->
      <ScalarDropdownItem
        v-if="!isDraftsMenuItem"
        class="flex gap-2"
        @click="deleteModal.show()">
        <ScalarIcon
          class="inline-flex"
          icon="Delete"
          size="md"
          thickness="1.5" />
        <span>Delete</span>
      </ScalarDropdownItem>

      <!-- Clear Drafts -->
      <ScalarDropdownItem
        v-if="isDraftsMenuItem"
        class="flex gap-2"
        @click="clearDraftsModal.show()">
        <ScalarIcon
          class="inline-flex"
          icon="Delete"
          size="md"
          thickness="1.5" />
        <span>Clear Drafts</span>
      </ScalarDropdownItem>
    </template>
  </ScalarDropdown>

  <!-- Modals -->
  <ScalarModal
    :size="'xxs'"
    :state="deleteModal"
    :title="`Delete ${menuItem.item?.resourceTitle}`">
    <DeleteSidebarListElement
      :variableName="menuItem.item?.title ?? ''"
      :warningMessage="menuItem.item?.warning"
      @close="deleteModal.hide()"
      @delete="handleItemDelete" />
  </ScalarModal>
  <ScalarModal
    :size="'xxs'"
    :state="editModal"
    :title="`Edit ${menuItem.item?.resourceTitle}`">
    <EditSidebarListCollection
      v-if="menuItem.item?.resourceTitle === 'Collection'"
      :icon="menuItem.item?.icon || 'interface-content-folder'"
      :name="menuItem.item?.title"
      @close="editModal.hide()"
      @edit="handleEdit" />
    <EditSidebarListElement
      v-else
      :name="menuItem.item?.title ?? ''"
      @close="editModal.hide()"
      @edit="handleEdit" />
  </ScalarModal>
  <ScalarModal
    :size="'xxs'"
    :state="clearDraftsModal"
    :title="'Clear Drafts'">
    <DeleteSidebarListElement
      :variableName="'All Drafts'"
      :warningMessage="'This action will clear all drafts. This cannot be undone.'"
      @close="clearDraftsModal.hide()"
      @delete="handleClearDrafts" />
  </ScalarModal>
</template>
<style scoped>
.ellipsis-position {
  transform: translate3d(calc(-100% - 4.5px), 0, 0);
}
</style>
