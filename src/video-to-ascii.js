/**
 * Video to ASCII Converter
 *
 * Converts video frames (file or webcam) to ASCII art in real-time
 * using the same engine as Image to ASCII.
 *
 * Requires: image-to-ascii.js
 */

(function(root) {
    'use strict';

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
    function create(opts) {
        const { video, terminal, getOptions, onFps } = opts;

        let running = false;
        let rafId = null;
        let targetFps = 15;
        let lastFrameTime = 0;
        let frameCount = 0;
        let fpsTimer = 0;
        let actualFps = 0;
        let lastResult = null;

        // Offscreen canvas for capturing video frames
        const offscreen = document.createElement('canvas');
        const offCtx = offscreen.getContext('2d', { willReadFrequently: true });

        // Auto-reduce state
        let autoReduceFactor = 1;
        let consecutiveSlow = 0;
        const SLOW_THRESHOLD = 3; // frames before reducing

        /**
         * Load a video from a File object.
         */
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

        /**
         * Start webcam capture.
         */
        async function startWebcam(deviceId) {
            const constraints = {
                video: deviceId ? { deviceId: { exact: deviceId } } : true,
                audio: false
            };
            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            video.srcObject = stream;
            await video.play();
        }

        /**
         * Stop webcam stream.
         */
        function stopWebcam() {
            if (video.srcObject) {
                video.srcObject.getTracks().forEach(t => t.stop());
                video.srcObject = null;
            }
        }

        /**
         * List available video input devices.
         */
        async function listCameras() {
            const devices = await navigator.mediaDevices.enumerateDevices();
            return devices.filter(d => d.kind === 'videoinput');
        }

        /**
         * Render a single frame.
         */
        function renderFrame() {
            if (video.videoWidth === 0 || video.videoHeight === 0) return;

            const options = getOptions();

            // Apply auto-reduce factor
            if (autoReduceFactor > 1) {
                options.maxWidth = Math.max(20, Math.floor(options.maxWidth / autoReduceFactor));
                options.maxHeight = Math.max(10, Math.floor(options.maxHeight / autoReduceFactor));
            }

            // Draw video frame to offscreen canvas at video's native resolution
            offscreen.width = video.videoWidth;
            offscreen.height = video.videoHeight;
            offCtx.drawImage(video, 0, 0);

            // Create an ImageData-backed "image" by wrapping the video element
            // ImageToAscii.processImage accepts an image-like object with width/height
            // that can be drawn to canvas via drawImage.
            const t0 = performance.now();
            const result = root.ImageToAscii.processImage(video, options);
            const elapsed = performance.now() - t0;

            lastResult = result;
            terminal.innerHTML = `<code>${result.html}</code>`;

            // Auto-reduce: if frame processing exceeds frame budget, scale down
            const frameBudget = 1000 / targetFps;
            if (elapsed > frameBudget * 1.5) {
                consecutiveSlow++;
                if (consecutiveSlow >= SLOW_THRESHOLD && autoReduceFactor < 4) {
                    autoReduceFactor++;
                    consecutiveSlow = 0;
                }
            } else {
                consecutiveSlow = 0;
                // Gradually recover if we have headroom
                if (elapsed < frameBudget * 0.5 && autoReduceFactor > 1) {
                    autoReduceFactor--;
                }
            }
        }

        /**
         * Animation loop.
         */
        function loop(timestamp) {
            if (!running) return;
            rafId = requestAnimationFrame(loop);

            // FPS tracking
            if (timestamp - fpsTimer >= 1000) {
                actualFps = frameCount;
                frameCount = 0;
                fpsTimer = timestamp;
                if (onFps) onFps(actualFps);
            }

            // Frame rate limiting
            const interval = 1000 / targetFps;
            if (timestamp - lastFrameTime < interval) return;
            lastFrameTime = timestamp;

            renderFrame();
            frameCount++;
        }

        /**
         * Start playback / rendering.
         */
        function play() {
            if (running) return;
            running = true;
            autoReduceFactor = 1;
            consecutiveSlow = 0;
            lastFrameTime = 0;
            frameCount = 0;
            fpsTimer = 0;

            // Start video playback if it's a file (not webcam)
            if (!video.srcObject && video.src) {
                video.play();
            }
            rafId = requestAnimationFrame(loop);
        }

        /**
         * Pause playback.
         */
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

        /**
         * Stop and clean up.
         */
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

        /**
         * Get the last rendered frame's ANSI output.
         */
        function getLastAnsi() {
            return lastResult ? lastResult.ansi : '';
        }

        /**
         * Get the last rendered frame's plain text (strip ANSI codes).
         */
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

    // Export
    const API = Object.freeze({ create });

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = API;
    } else {
        root.VideoToAscii = API;
    }

})(typeof window !== 'undefined' ? window : global);
