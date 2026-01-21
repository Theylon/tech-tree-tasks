import { create } from 'zustand'

interface Filters {
  owner: 'all' | 'me' | 'other' | 'unassigned'
  status: 'all' | 'locked' | 'unlocked' | 'in_progress' | 'completed'
  branch: 'all' | string
}

interface TechTreeState {
  // Selection
  selectedNodeId: string | null
  setSelectedNode: (id: string | null) => void

  // Viewport (for React Flow)
  viewport: { x: number; y: number; zoom: number }
  setViewport: (viewport: { x: number; y: number; zoom: number }) => void

  // Filters
  filters: Filters
  setFilter: <K extends keyof Filters>(key: K, value: Filters[K]) => void
  resetFilters: () => void

  // UI State
  isDetailPanelOpen: boolean
  setDetailPanelOpen: (open: boolean) => void
  isCreateModalOpen: boolean
  setCreateModalOpen: (open: boolean) => void

  // Connecting mode (for creating dependencies)
  isConnecting: boolean
  connectingFromId: string | null
  startConnecting: (nodeId: string) => void
  cancelConnecting: () => void
}

const defaultFilters: Filters = {
  owner: 'all',
  status: 'all',
  branch: 'all',
}

export const useTechTreeStore = create<TechTreeState>((set) => ({
  // Selection
  selectedNodeId: null,
  setSelectedNode: (id) =>
    set({ selectedNodeId: id, isDetailPanelOpen: !!id }),

  // Viewport
  viewport: { x: 0, y: 0, zoom: 1 },
  setViewport: (viewport) => set({ viewport }),

  // Filters
  filters: defaultFilters,
  setFilter: (key, value) =>
    set((state) => ({
      filters: { ...state.filters, [key]: value },
    })),
  resetFilters: () => set({ filters: defaultFilters }),

  // UI State
  isDetailPanelOpen: false,
  setDetailPanelOpen: (open) => set({ isDetailPanelOpen: open }),
  isCreateModalOpen: false,
  setCreateModalOpen: (open) => set({ isCreateModalOpen: open }),

  // Connecting mode
  isConnecting: false,
  connectingFromId: null,
  startConnecting: (nodeId) =>
    set({ isConnecting: true, connectingFromId: nodeId }),
  cancelConnecting: () =>
    set({ isConnecting: false, connectingFromId: null }),
}))
