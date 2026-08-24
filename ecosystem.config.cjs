module.exports = {
    apps: [
        {
            name: 'anneng-shop',
            cwd: __dirname,
            script: 'node_modules/next/dist/bin/next',
            args: 'start -p 3000 -H 127.0.0.1',
            exec_mode: 'fork',
            instances: 1,
            autorestart: true,
            max_memory_restart: '512M',
            env: {
                NODE_ENV: 'production',
                PORT: '3000',
                HOSTNAME: '127.0.0.1',
            },
        },
    ],
};
