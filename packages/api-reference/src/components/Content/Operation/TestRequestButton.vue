<script setup lang="ts">
import { ScalarIcon } from '@scalar/components'
import type { TransformedOperation } from '@scalar/types/legacy'
import { inject } from 'vue'

import { useApiClient } from '../../../features/ApiClientModal'
import { HIDE_TEST_REQUEST_BUTTON_SYMBOL } from '../../../helpers'
import ScreenReader from '../../ScreenReader.vue'

defineProps<{
  operation: TransformedOperation
}>()

const getHideTestRequestButton = inject(HIDE_TEST_REQUEST_BUTTON_SYMBOL)
const { client } = useApiClient()
</script>
<template>
  <button
    v-if="getHideTestRequestButton?.() !== true"
    class="show-api-client-button"
    :method="operation.httpVerb"
    type="button"
    @click.stop="
      client?.open({
        path: operation.path,
        method: operation.httpVerb,
      })
    ">
    <ScalarIcon
      icon="Play"
      size="sm" />
    <span>Test Request</span>
    <ScreenReader>({{ operation.httpVerb }} {{ operation.path }})</ScreenReader>
  </button>
  <template v-else>&nbsp;</template>
</template>
<style scoped>
.show-api-client-button {
  appearance: none;
  border: none;
  padding: 4px 6px;
  white-space: nowrap;
  border-radius: var(--scalar-radius);
  display: flex;
  justify-content: center;
  align-items: center;
  font-weight: var(--scalar-semibold);
  font-size: var(--scalar-mini);
  color: var(--scalar-background-2);
  font-family: var(--scalar-font);
  background: var(--scalar-button-1);
  position: relative;
  cursor: pointer;
  box-sizing: border-box;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);

  outline-offset: 2px;
}
.show-api-client-button span,
.show-api-client-button svg {
  fill: currentColor;
  color: var(--scalar-button-1-color);
  z-index: 1;
}
.show-api-client-button:hover {
  background: var(--scalar-button-1-hover);
}
.show-api-client-button svg {
  margin-right: 4px;
}
</style>
