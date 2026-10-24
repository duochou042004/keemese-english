import js from '@eslint/js'
import { defineConfig } from 'eslint/config'
import jsxA11y from 'eslint-plugin-jsx-a11y'
import reactHooks from 'eslint-plugin-react-hooks'
import globals from 'globals'
import tseslint from 'typescript-eslint'

export default defineConfig(
  {
    ignores: [
      'dist',
      'playwright-report',
      'test-results',
      'src/routeTree.gen.ts',
      'src/api/schema.d.ts',
    ],
  },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  {
    languageOptions: {
      globals: globals.browser,
      parserOptions: {
        projectService: { allowDefaultProject: ['eslint.config.js', 'e2e/reset.mjs'] },
        tsconfigRootDir: import.meta.dirname,
      },
    },
  },
  { files: ['eslint.config.js'], extends: [tseslint.configs.disableTypeChecked] },
  {
    files: ['e2e/reset.mjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: { globals: globals.node },
  },
  reactHooks.configs.flat.recommended,
  jsxA11y.flatConfigs.recommended,
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXAttribute[name.name='dangerouslySetInnerHTML']",
          message: 'Render rich content only through the RichText component (OD-05).',
        },
      ],
      // TanStack Router redirects and notFound are thrown objects by design.
      '@typescript-eslint/only-throw-error': [
        'error',
        { allow: [{ from: 'package', package: '@tanstack/router-core', name: 'Redirect' }] },
      ],
    },
  },
)
