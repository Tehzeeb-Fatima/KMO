export const CATEGORY_ICONS = {
  monitor: { label: "Monitor", paths: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>' },
  basket: { label: "Basket", paths: '<path d="M3 9h18l-2 11H5z"/><path d="M8 9l4-6 4 6"/>' },
  book: { label: "Book", paths: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5v14z"/>' },
  sparkles: { label: "Sparkles", paths: '<path d="M12 3l1.8 4.2L18 9l-4.2 1.8L12 15l-1.8-4.2L6 9l4.2-1.8z"/>' },
  house: { label: "House", paths: '<path d="M3 10.5L12 3l9 7.5V21H3z"/>' },
  gem: { label: "Gem", paths: '<polygon points="6 3 18 3 22 9 12 21 2 9"/>' },
  smile: { label: "Smile", paths: '<circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2M9 9h.01M15 9h.01"/>' },
  shirt: { label: "Shirt", paths: '<path d="M20 7l-4-3-4 2-4-2-4 3 2 4 2-1v10h8V10l2 1z"/>' },
  puzzle: { label: "Puzzle", paths: '<path d="M4 4h6v3a2 2 0 1 0 4 0V4h6v6h-3a2 2 0 1 0 0 4h3v6h-6v-3a2 2 0 1 0-4 0v3H4z"/>' },
  handbag: { label: "Handbag", paths: '<path d="M6 7h12l1 13H5z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>' },
  tag: { label: "Tag", paths: '<path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z"/><circle cx="7.5" cy="7.5" r="1.5"/>' },
} as const;

export type CategoryIconKey = keyof typeof CATEGORY_ICONS;
