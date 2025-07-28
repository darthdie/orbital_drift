import { readonly, ref, watch } from 'vue'
import { useMutationObserver } from '@vueuse/core'

export function useQuerySelector(selector, { root = document } = {}) {
  selector = ref(selector)
  root = ref(root)

  const result = ref(null)

  // Find first matching element inside a root element
  const findElement = root => root.querySelector(selector.value)

  // Check if a given element matches the selector
  const matches = element => element.matches(selector.value)

  // Check if a given element precedes the current result
  const precedes = otherElement =>
    Boolean(
      !result.value ||
        result.value.compareDocumentPosition(otherElement) &
          Node.DOCUMENT_POSITION_PRECEDING
    )

  // Reset the result whenever the selector or the root node changes
  watch(
    [selector, root],
    () => {
      result.value = findElement(root.value)
    },
    { immediate: true }
  )

  const observer = useMutationObserver(
    root,
    mutations => {
      for (const mutation of mutations) {
        if (mutation.type === 'childList') {
          // Handle removed elements
          if (result.value) {
            for (const removedNode of mutation.removedNodes) {
              if (removedNode.contains(result)) {
                // If element is removed, a new search is started to find the first matching element
                result.value = findElement(root.value)
                break
              }
            }
          }

          // Handle added elements
          for (const addedNode of mutation.addedNodes) {
            if (addedNode.nodeType !== Node.ELEMENT_NODE) continue

            // If we have an existing result and the newly added element is not preceding it, we can safely ignore it
            if (!precedes(addedNode)) continue

            // Check the added element itself
            if (matches(addedNode)) {
              result.value = addedNode
            } else {
              result.value = findElement(addedNode)
            }
          }
        } else if (mutation.type === 'attributes') {
          // Handle changed attributes
          if (result.value === mutation.target) {
            if (!matches(mutation.target)) {
              result.value = findElement(root.value)
            }
          } else if (matches(mutation.target) && precedes(mutation.target)) {
            result.value = mutation.target
          }
        }
      }
    },
    {
      childList: true,
      subtree: true,
      attributes: true
    }
  )

  return {
    stop: observer.stop,
    isSupported: observer.isSupported,
    element: readonly(result)
  }
}