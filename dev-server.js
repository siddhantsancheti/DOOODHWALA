#!/usr/bin/env node
/**
 * Dual Server Launcher for DOOODHWALA Development
 * Starts both Backend (port 5001) and Frontend (port 5174)
 */

const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

const APP_DIR = 'c:\\Users\\siddh\\OneDrive\\Desktop\\DOOODHWALA - Copy';
const NODE_PATH = 'C:\\Program Files\\nodejs\\node.exe';

// Environment setup
const env = {
    ...process.env,
    NODE_ENV: 'development',
    JWT_SECRET: 'dev-secret-key',
    RAZORPAY_KEY_ID: 'rzp_test_dev',
    STRIPE_SECRET_KEY: 'sk_test_dev',
    PATH: `C:\\Program Files\\nodejs;${process.env.PATH}`
};

console.log('🚀 Starting DOOODHWALA Dev Servers\n');
console.log('📦 App directory:', APP_DIR);
console.log('🔧 Node.js:', NODE_PATH);
console.log('🌍 Environment: development\n');

// Start Backend
console.log('⏳ Starting Backend Server (port 5001)...');
const backend = spawn(NODE_PATH, [
    'node_modules\\tsx\\dist\\cli.js',
    'server\\index.ts'
], {
    cwd: APP_DIR,
    env: env,
    stdio: 'inherit',
    shell: true
});

backend.on('error', (err) => {
    console.error('❌ Backend error:', err.message);
    process.exit(1);
});

// Start Frontend after a delay
const frontendDelay = 4000;
console.log(`⏳ Frontend will start in ${frontendDelay / 1000} seconds...\n`);

setTimeout(() => {
    console.log('⏳ Starting Frontend Dev Server (port 5174)...\n');
    const frontend = spawn(NODE_PATH, [
        'node_modules\\vite\\bin\\vite.js'
    ], {
        cwd: APP_DIR,
        env: env,
        stdio: 'inherit',
        shell: true
    });

    frontend.on('error', (err) => {
        console.error('❌ Frontend error:', err.message);
    });
}, frontendDelay);

// Handle termination
process.on('SIGINT', () => {
    console.log('\n\n⛔ Shutting down servers...');
    backend.kill();
    process.exit(0);
});
