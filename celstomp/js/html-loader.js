(function () {
    'use strict';

    const partScripts = [
        './parts/header.js',
        './parts/stage.js',
        './parts/sidepanel.js',
        './parts/timeline.js',
        './parts/modals.js'
    ];

    const appScripts = [
        './js/menu-wires.js',
        './js/mobile-native-zoom-guard.js',
        './js/mount-island-dock.js',
        './js/ui-components.js',
        './js/omggif.js',
        './celstomp-imgseq.js',
        './celstomp-autosave.js',
        './celstomp-app.js'
    ];

    function loadScript(src) {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = src;
            script.onload = () => resolve();
            script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
            document.body.appendChild(script);
        });
    }

    async function boot() {
        try {
            for (const src of partScripts) {
                await loadScript(src);
            }
            for (const src of appScripts) {
                await loadScript(src);
            }

            console.log('[celstomp] All parts and scripts loaded via JS injection.');

        } catch (err) {
            console.error('[celstomp] Boot error:', err);
            alert('Error loading application: ' + err.message);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot);
    } else {
        boot();
    }

})();
