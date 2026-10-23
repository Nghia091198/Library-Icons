import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import globals from 'globals';
import tseslint from 'typescript-eslint';

function forbidImports(patterns, message) {
  return { 'no-restricted-imports': ['error', { patterns: [{ group: patterns, message }] }] };
}

export default tseslint.config(
  { ignores: ['dist', 'coverage', 'node_modules'] },
  js.configs.recommended,
  ...tseslint.configs.strict,
  {
    rules: {
      '@typescript-eslint/no-explicit-any': 'error',
      'no-console': 'error',
    },
  },
  {
    files: ['src/client/**/*.{ts,tsx}'],
    languageOptions: { globals: globals.browser },
    plugins: { 'react-hooks': reactHooks },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...forbidImports(['@/server', '@/server/**', '**/server/**'], 'client/ không được import server/.'),
    },
  },
  {
    files: ['src/server/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: forbidImports(['@/client', '@/client/**', '**/client/**'], 'server/ không được import client/.'),
  },
  {
    files: ['src/shared/**/*.ts'],
    rules: forbidImports(
      ['@/client', '@/client/**', '@/server', '@/server/**', 'node:*'],
      'shared/ chỉ được import shared/ — không client, server hay Node API.',
    ),
  },
  {
    files: ['tests/**/*.ts', '*.config.{ts,js}'],
    languageOptions: { globals: globals.node },
  },
  {
    files: ['scripts/**/*.{js,mjs}', 'src/server/cli/**/*.ts'],
    languageOptions: { globals: globals.node },
    rules: { 'no-console': 'off' },
  },
);
