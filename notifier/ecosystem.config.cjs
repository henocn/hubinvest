// PM2 : un seul exemplaire suffit (la file accepte plusieurs exemplaires sans doublon, grâce à SKIP LOCKED).
module.exports = {
  apps: [
    {
      name: 'hubinvest-notifier',
      script: 'src/index.js',
      cwd: __dirname,
      // Un seul processus, en mode fork comme les autres applications (instances seul ferait passer PM2 en cluster).
      exec_mode: 'fork',
      instances: 1,
      autorestart: true,
      max_memory_restart: '200M',
      env: { NODE_ENV: 'production' },
    },
  ],
};
