const paths: Record<string, string> = {
  fire: '<path d="M12 22c4 0 7-2.7 7-6.5 0-2.2-1-4.4-3.1-6.4.1 2.5-1.2 3.5-2 4-1-4.8-3.7-7.5-6.4-9.1.3 4.3-3.5 6.7-3.5 11.5C4 19.3 7.6 22 12 22Z"/><path d="M9.5 18.5c0-1.8 1.4-3 2.5-4.5 1 1.5 2.5 2.7 2.5 4.5"/>',
  spill: '<path d="m12 3 6.5 7.2a6 6 0 1 1-13 4.1C5.5 11.8 8 7.6 12 3Z"/><path d="M8 18c1.2.7 2.6 1 4 1"/>',
  animal: '<path d="M7 10 5 6 2 8l2 4v5h5l2-3h3l2 3h4v-6l-3-3-3 2H7Z"/><path d="M18 8V5M8 17v3m9-3v3"/>',
  'vehicle-stopped': '<path d="M5 17h14l-1-6-2-3H8l-2 3-1 6Z"/><circle cx="8" cy="17" r="2"/><circle cx="16" cy="17" r="2"/><path d="M9 12h6M12 2v4m0 16v-1"/>',
  collision: '<path d="M3 14h7l2-6 2 6h7M6 18h3m6 0h3"/><path d="m9 5 2 2m4-2-2 2"/>',
  systems: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6 1.7 1.7 0 0 0 10 3v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
  weather: '<path d="M7 18h10a4 4 0 0 0 .7-7.9A6 6 0 0 0 6.2 8.5 4.8 4.8 0 0 0 7 18Z"/><path d="m8 21 1-2m4 2 1-2"/>',
  security: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="M12 8v5m0 3h.01"/>',
  default: '<path d="M4 4h16v16H4z"/><path d="M8 8h8m-8 4h8m-8 4h5"/>'
};

export function icon(name: string, label = ''): string {
  const path = paths[name] ?? paths.default;
  return `<svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="square" stroke-linejoin="miter" role="img" aria-label="${label}">${path}</svg>`;
}
