module.exports = {
  env: {
    jest: true,
  },
  extends: [
    'plugin:vue/vue3-recommended',
    '@vue/airbnb',
  ],
  plugins: [
    'jest',
  ],
  root: true,
  rules: {
    'import/no-cycle': [0],
    'max-len': ['error', { code: 120, ignorePattern: 'd="([\\s\\S]*?)"' }],
    'no-async-promise-executor': [0],
    'no-unused-expressions': ['error', { allowShortCircuit: true, allowTernary: true }],
    'no-underscore-dangle': [0],
    'vue/max-len': ['error', { code: 120, ignorePattern: 'd="([\\s\\S]*?)"' }],
    'vue/multi-word-component-names': [0],
  },
};
