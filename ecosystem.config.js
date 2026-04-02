module.exports = {
  apps: [
    {
      name: 'bankai-tcms',
      script: 'node_modules/next/dist/bin/next',
      args: 'start -p 4201',
      cwd: 'e:/AI Agent/BankaiProd/bankai-app',
      env: {
        NODE_ENV: 'production'
      }
    }
  ]
};
