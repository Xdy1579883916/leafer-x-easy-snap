import { defineBuildConfig } from 'unbuild'

export default defineBuildConfig({
  entries: [
    'src/index',
  ],
  declaration: 'node16',
  clean: true,
  externals: [
    '@leafer-ui/interface',
    '@leafer-in/interface',
    '@leafer-in/editor',
    '@leafer-ui/core',
  ],
  failOnWarn: false,
  rollup: {
    esbuild: {
      tsconfigRaw: {
        compilerOptions: {
          experimentalDecorators: true,
        },
      },
    },
    inlineDependencies: [
      '@antfu/utils',
    ],
  },
})
