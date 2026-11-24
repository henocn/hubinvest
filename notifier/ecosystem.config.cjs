// PM2 : un seul exemplaire suffit (la file accepte plusieurs exemplaires sans doublon, grâce à SKIP LOCKED).
module.exports = {
  apps: [
    {
      name: 'hubinvest-notifier',
      script: 'src/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      max_memory_restart: '200M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
