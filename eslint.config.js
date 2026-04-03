import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        window: 'readonly',
        document: 'readonly',
        navigator: 'readonly',
        history: 'readonly',
        location: 'readonly',
        sessionStorage: 'readonly',
        indexedDB: 'readonly',
        URL: 'readonly',
        ImageData: 'readonly',
        Worker: 'readonly',
        requestAnimationFrame: 'readonly',
        setTimeout: 'readonly',
        clearInterval: 'readonly',
        setInterval: 'readonly',
        console: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
      'no-console': 'warn',
      'eqeqeq': ['error', 'always'],
      'curly': ['error', 'all'],
      'no-var': 'error',
      'prefer-const': 'error',
    },
  },
  {
    // Relax rules for worker (self global) and test files
    files: ['src/worker/**/*.js', 'src/**/*.test.js'],
    languageOptions: {
      globals: { self: 'readonly' },
    },
    rules: {
      'no-console': 'off',
    },
  },
];
