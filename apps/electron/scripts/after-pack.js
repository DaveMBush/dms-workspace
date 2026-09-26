const fs = require('fs');
const path = require('path');

// electron-builder's extraResources copy (copyDir) hardcodes an exclusion for any
// root-level `node_modules` directory, so the server runtime's node_modules staged by
// `pnpm install --prod` + prepare-server-runtime.js is silently dropped from resources.
// The server bundle resolves its dependencies at runtime via normal Node resolution, so
// without this hook the packaged app cannot load fastify/@fastify/static/prisma and all
// static files 404. This afterPack hook copies the staged node_modules into the unpacked
// resources dir after packing (before AppImage/deb are built), bypassing that filter.
module.exports = async function copyServerNodeModules(context) {
    const appOutDir = context.appOutDir;
    if (!appOutDir || !fs.existsSync(appOutDir)) {
        return;
    }

    // extraResources `to: apps/server` resolves to <resources>/apps/server.
    const resourcesPath = path.join(appOutDir, 'resources');
    const serverRuntimeRoot = path.resolve(__dirname, '../../../dist/apps/server');
    const sourceNodeModules = path.join(serverRuntimeRoot, 'node_modules');
    const targetNodeModules = path.join(resourcesPath, 'apps', 'server', 'node_modules');

    if (!fs.existsSync(sourceNodeModules)) {
        console.warn(
            `[after-pack] server node_modules not found at ${sourceNodeModules}; skipping copy. ` +
                'Run the electron build:linux target (which stages it) before packaging.',
        );
        return;
    }

    fs.rmSync(targetNodeModules, { recursive: true, force: true });
    fs.cpSync(sourceNodeModules, targetNodeModules, {
        recursive: true,
        dereference: false, // preserve pnpm symlinks (.pnpm store + top-level links)
    });

    console.log(
        `[after-pack] copied server node_modules -> ${targetNodeModules}`,
    );
};
