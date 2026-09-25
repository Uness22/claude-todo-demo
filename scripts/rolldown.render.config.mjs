// Rolldown config for the SSR render smoke test.
// Stubs Vite-only query imports (e.g. `?url`) so node bundling succeeds.
export default {
  input: 'scripts/render-smoke.tsx',
  output: { file: '/tmp/render-smoke.cjs', format: 'cjs', platform: 'node', codeSplitting: false },
  plugins: [
    {
      name: 'stub-vite-queries',
      resolveId(id) {
        if (/\?(url|worker|raw|inline)/.test(id)) return '\0' + id
        return null
      },
      load(id) {
        if (id.startsWith('\0')) return 'export default "/stub.js"'
        return null
      },
    },
  ],
}
