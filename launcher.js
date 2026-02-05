const { spawn } = require('child_process');
const path = require('path');

const dir = 'c:\\Users\\siddh\\OneDrive\\Desktop\\DOOODHWALA - Copy';
const nodeExe = 'C:\\Program Files\\nodejs\\node.exe';

console.log('Starting backend...');
const backend = spawn(nodeExe, [
    path.join(dir, 'node_modules', 'tsx', 'dist', 'cli.js'),
    'server/index.ts'
], {
    cwd: dir,
    env: {
        ...process.env,
        NODE_ENV: 'development',
        PATH: 'C:\\Program Files\\nodejs;' + process.env.PATH
    },
    stdio: 'pipe'
});

backend.stdout.on('data', (data) => {
    console.log(`[Backend] ${data}`);
});

backend.stderr.on('data', (data) => {
    console.error(`[Backend Error] ${data}`);
});

backend.on('error', (err) => {
    console.error(`Backend process error: ${err}`);
});

setTimeout(() => {
    console.log('\nStarting frontend...');
    const frontend = spawn(nodeExe, [
        path.join(dir, 'node_modules', 'vite', 'bin', 'vite.js')
    ], {
        cwd: dir,
        env: {
            ...process.env,
            NODE_ENV: 'development',
            PATH: 'C:\\Program Files\\nodejs;' + process.env.PATH
        },
        stdio: 'pipe'
    });

    frontend.stdout.on('data', (data) => {
        console.log(`[Frontend] ${data}`);
    });

    frontend.stderr.on('data', (data) => {
        console.error(`[Frontend Error] ${data}`);
    });

    frontend.on('error', (err) => {
        console.error(`Frontend process error: ${err}`);
    });
}, 3000);
