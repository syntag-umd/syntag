import turboPlugin from 'eslint-plugin-turbo';

export default {
  name: 'eslint-config-turbo (recreated flat)',

  plugins: {
    turbo: { rules: turboPlugin.rules },
  },

  rules: {
    'turbo/no-undeclared-env-vars': 'error',
  },
}
