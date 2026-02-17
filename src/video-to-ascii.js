/**
 * Video to ASCII Converter
 *
 * Converts video frames (file or webcam) to ASCII art in real-time
 * using the same engine as Image to ASCII.
 */

import { processImage as processAscii } from './image-to-ascii.js';

/**
 * Create a video-to-ASCII controller.
 *
 * @param {object} opts
 * @param {HTMLVideoElement} opts.video - Hidden video element for playback
 * @param {HTMLElement} opts.terminal - Container to render ASCII frames
 * @param {function} opts.getOptions - Returns current processing options
 * @param {function} opts.onFps - Called with actual FPS each second
 * @returns {object} Controller API
 */
export function create(opts) {
    const { video, terminal, getOptions, onFps } = opts;

    let running = false;
    let rafId = null;
    let targetFps = 15;
    let lastFrameTime = 0;
    let frameCount = 0;
    let fpsTimer = 0;
    let actualFps = 0;
    let lastResult = null;

    const offscreen = document.createElement('canvas');
    const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

    let autoReduceFactor = 1;
    let consecutiveSlow = 0;
    const SLOW_THRESHOLD = 3;

    function loadFile(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            video.src = url;
            video.onloadeddata = () => {
                video.onloadeddata = null;
                video.onerror = null;
                resolve();
            };
            video.onerror = () => {
                video.onloadeddata = null;
                video.onerror = null;
                URL.revokeObjectURL(url);
                reject(new Error('Failed to load video'));
            };
        });
    }

    async function startWebcam(deviceId) {
        const constraints = {
            video: deviceId ? { deviceId: { exact: deviceId } } : true,
            audio: false
        };
        const stream = await navigator.mediaDevices.getUserMedia(constraints);
        video.srcObject = stream;
        await video.play();
    }

    function stopWebcam() {
        if (video.srcObject) {
            video.srcObject.getTracks().forEach(t => t.stop());
            video.srcObject = null;
        }
    }

    async function listCameras() {
        const devices = await navigator.mediaDevices.enumerateDevices();
        return devices.filter(d => d.kind === 'videoinput');
    }

    function renderFrame() {
        if (video.videoWidth === 0 || video.videoHeight === 0) return;

        const options = getOptions();

        if (autoReduceFactor > 1) {
            options.maxWidth = Math.max(20, Math.floor(options.maxWidth / autoReduceFactor));
            options.maxHeight = Math.max(10, Math.floor(options.maxHeight / autoReduceFactor));
        }

        offscreen.width = video.videoWidth;
        offscreen.height = video.videoHeight;
        offCtx.drawImage(video, 0, 0);

        const t0 = performance.now();
        const result = processAscii(video, options);
        const elapsed = performance.now() - t0;

        lastResult = result;
        terminal.innerHTML = `<code>${result.html}</code>`;

        const frameBudget = 1000 / targetFps;
        if (elapsed > frameBudget * 1.5) {
            consecutiveSlow++;
            if (consecutiveSlow >= SLOW_THRESHOLD && autoReduceFactor < 4) {
                autoReduceFactor++;
                consecutiveSlow = 0;
            }
        } else {
            consecutiveSlow = 0;
            if (elapsed < frameBudget * 0.5 && autoReduceFactor > 1) {
                autoReduceFactor--;
            }
        }
    }

    function loop(timestamp) {
        if (!running) return;
        rafId = requestAnimationFrame(loop);

        if (timestamp - fpsTimer >= 1000) {
            actualFps = frameCount;
            frameCount = 0;
            fpsTimer = timestamp;
            if (onFps) onFps(actualFps);
        }

        const interval = 1000 / targetFps;
        if (timestamp - lastFrameTime < interval) return;
        lastFrameTime = timestamp;

        renderFrame();
        frameCount++;
    }

    function play() {
        if (running) return;
        running = true;
        autoReduceFactor = 1;
        consecutiveSlow = 0;
        lastFrameTime = 0;
        frameCount = 0;
        fpsTimer = 0;

        if (!video.srcObject && video.src) {
            video.play();
        }
        rafId = requestAnimationFrame(loop);
    }

    function pause() {
        running = false;
        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = null;
        }
        if (!video.srcObject && video.src) {
            video.pause();
        }
    }

    function stop() {
        pause();
        stopWebcam();
        if (video.src && !video.srcObject) {
            URL.revokeObjectURL(video.src);
            video.src = '';
        }
        terminal.innerHTML = '';
        lastResult = null;
        autoReduceFactor = 1;
    }

    function getLastAnsi() {
        return lastResult ? lastResult.ansi : '';
    }

    function getLastPlainText() {
        if (!lastResult) return '';
        return lastResult.ansi.replace(/\x1b\[[0-9;]*m/g, '');
    }

    return {
        loadFile,
        startWebcam,
        stopWebcam,
        listCameras,
        play,
        pause,
        stop,
        renderFrame,
        getLastAnsi,
        getLastPlainText,
        isRunning() { return running; },
        setTargetFps(fps) { targetFps = Math.max(1, Math.min(30, fps)); },
        getAutoReduceFactor() { return autoReduceFactor; },
    };
}
