import js from '@eslint/js';
import tseslint from '@typescript-eslint/eslint-plugin';
import tsparser from '@typescript-eslint/parser';
import globals from 'globals';

export default [
  {
    ignores: ['node_modules', '.next', 'dist', 'build', 'public'],
  },

  js.configs.recommended,

  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: {
      parser: tsparser,
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      '@typescript-eslint': tseslint,
    },
    rules: {
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'error',
      'no-empty': 'off',
      'no-self-assign': 'off',
      'no-redeclare': 'off',
      'no-undef': 'off',
      'no-async-promise-executor': 'off',
    },
  },
];
