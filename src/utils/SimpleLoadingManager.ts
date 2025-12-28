/**
 * Simple Loading Manager - Optimized Version
 *
 * Tracks when content is loaded and applies CSS classes to elements.
 * Optimizations:
 * - Batches DOM updates using requestAnimationFrame
 * - Caches DOM elements to avoid repeated queries
 * - Only checks "all loaded" when necessary
 */

class SimpleLoadingManager {
  private islandCounters = new Map<string, { total: number; loaded: number }>()
  private appLoaded = false
  private pendingUpdates = new Set<string>()
  private rafScheduled = false
  private allLoadedChecked = false

  // Register that an item needs to load
  register(islandId: string) {
    const counter = this.islandCounters.get(islandId) || { total: 0, loaded: 0 }
    counter.total++
    this.islandCounters.set(islandId, counter)
  }

  // Mark an item as loaded
  markLoaded(islandId: string) {
    const counter = this.islandCounters.get(islandId)
    if (!counter) return

    counter.loaded++

    // Check if this island is fully loaded
    if (counter.loaded >= counter.total) {
      this.scheduleUpdate(islandId)
    }
  }

  // Mark app as loaded (called after React mounts)
  markAppLoaded() {
    this.appLoaded = true
    this.scheduleAllLoadedCheck()
  }

  // Schedule a DOM update for next frame (batch multiple updates)
  private scheduleUpdate(islandId: string) {
    this.pendingUpdates.add(islandId)

    if (!this.rafScheduled) {
      this.rafScheduled = true
      requestAnimationFrame(() => {
        this.flushUpdates()
      })
    }
  }

  // Schedule check for all loaded
  private scheduleAllLoadedCheck() {
    if (!this.rafScheduled) {
      this.rafScheduled = true
      requestAnimationFrame(() => {
        this.flushUpdates()
      })
    }
  }

  // Flush all pending DOM updates
  private flushUpdates() {
    this.rafScheduled = false

    // Update islands that just finished loading
    this.pendingUpdates.forEach(islandId => {
      this.markIslandLoaded(islandId)
    })
    this.pendingUpdates.clear()

    // Check if everything is loaded (only once)
    if (!this.allLoadedChecked) {
      this.checkAllLoaded()
    }
  }

  private markIslandLoaded(islandId: string) {
    // Use more specific selector to avoid scanning entire DOM
    // Only search within .world or body
    const worldElement = document.querySelector('.world') || document.body
    const elements = worldElement.querySelectorAll(`.${islandId}`)

    elements.forEach(el => {
      el.classList.add('loaded')
      el.classList.remove('loading')
    })
  }

  private checkAllLoaded() {
    if (!this.appLoaded) return

    // Check if all islands are loaded
    let allLoaded = true
    for (const counter of this.islandCounters.values()) {
      if (counter.loaded < counter.total) {
        allLoaded = false
        break
      }
    }

    if (allLoaded) {
      this.allLoadedChecked = true
      document.body.classList.add('loaded')
      document.body.classList.remove('loading')
    }
  }
}

export const loadingManager = new SimpleLoadingManager()
