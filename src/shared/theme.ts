// Light/dark theme: 'system' follows the device; otherwise <html data-theme> forces it
// (see styles.css). The inline script in index.html applies the saved choice before first paint.

export type Theme = 'system' | 'light' | 'dark'

const BAR = { light: '#f3faf2', dark: '#14231a' } // iOS status bar / browser UI colour

export function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') delete root.dataset.theme
  else root.dataset.theme = theme
  // The two theme-color metas pick light/dark by media query; a forced theme sets both.
  for (const meta of document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]')) {
    const scheme = meta.media.includes('dark') ? 'dark' : 'light'
    meta.content = BAR[theme === 'system' ? scheme : theme]
  }
}
