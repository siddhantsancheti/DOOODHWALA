// Quick server startup test
const cp = require('child_process');
const path = require('path');
const fs = require('fs');

// Change to app directory
process.chdir('c:\\Users\\siddh\\OneDrive\\Desktop\\DOOODHWALA - Copy');

// Set environment
process.env.NODE_ENV = 'development';
process.env.JWT_SECRET = 'test-secret';

console.log('Working directory:', process.cwd());
console.log('NODE_ENV:', process.env.NODE_ENV);

// Try to require dotenv and load .env
try {
    require('dotenv').config();
    console.log('✓ Loaded .env file');
} catch (e) {
    console.log('! Could not load dotenv');
}

// Try to import and start the server directly
try {
    console.log('\n📦 Loading server modules...');
    
    // First check if files exist
    const serverFile = './server/index.ts';
    if (fs.existsSync(serverFile)) {
        console.log('✓ server/index.ts found');
    }
    
    // Start backend with tsx
    console.log('\n🚀 Starting backend server...');
    const backend = cp.spawn('node', [
        'node_modules/tsx/dist/cli.js',
        'server/index.ts'
    ], {
        stdio: ['ignore', 'pipe', 'pipe'],
        detached: false
    });

    let startupDone = false;
    
    backend.stdout.on('data', (buf) => {
        const msg = buf.toString();
        process.stdout.write('[BACKEND] ' + msg);
        if (msg.includes('serving on port')) {
            if (!startupDone) {
                startupDone = true;
                console.log('\n✓ Backend started!');
                setTimeout(startFrontend, 2000);
            }
        }
    });

    backend.stderr.on('data', (buf) => {
        process.stderr.write('[BACKEND ERROR] ' + buf.toString());
    });

    function startFrontend() {
        console.log('\n🚀 Starting frontend server...');
        const frontend = cp.spawn('node', [
            'node_modules/vite/bin/vite.js'
        ], {
            stdio: ['ignore', 'pipe', 'pipe'],
            detached: false
        });

        frontend.stdout.on('data', (buf) => {
            process.stdout.write('[FRONTEND] ' + buf.toString());
        });

        frontend.stderr.on('data', (buf) => {
            process.stderr.write('[FRONTEND ERROR] ' + buf.toString());
        });
    }

} catch (e) {
    console.error('Error:', e.message);
    console.error(e.stack);
}
