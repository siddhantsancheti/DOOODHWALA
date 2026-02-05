#!/usr/bin/env node

// Direct server starter script for development
require('dotenv').config();

const path = require('path');
process.chdir(path.join(__dirname));
process.env.NODE_ENV = 'development';

// Start backend server
console.log('Starting backend server...');
const child_process = require('child_process');

// Start backend in a separate process
const backendProcess = child_process.spawn('node', [
    './node_modules/tsx/dist/cli.js',
    'server/index.ts'
], {
    stdio: 'inherit',
    env: {
        ...process.env,
        NODE_ENV: 'development'
    }
});

backendProcess.on('error', (error) => {
    console.error('Backend error:', error);
});

// Start frontend after 3 seconds
setTimeout(() => {
    console.log('\nStarting frontend dev server...');
    const frontendProcess = child_process.spawn('node', [
        './node_modules/vite/bin/vite.js'
    ], {
        stdio: 'inherit',
        env: {
            ...process.env,
            NODE_ENV: 'development'
        }
    });

    frontendProcess.on('error', (error) => {
        console.error('Frontend error:', error);
    });
}, 3000);

// Handle termination
process.on('SIGINT', () => {
    console.log('\nShutting down servers...');
    backendProcess.kill();
    process.exit(0);
});
