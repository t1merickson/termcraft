/**
 * Video to ASCII Tab
 */

import * as VideoToAscii from '../engines/video-to-ascii.js';
import { showToast, copyToClipboard, toggleHTML } from '../utils.js';

const template = `
<div class="mx-auto max-w-[900px]">
    <h1 class="mb-3 text-[40px] font-semibold leading-[48px] text-gray-1000">Video to ASCII</h1>
    <p class="mb-8 text-xl leading-[30px] text-gray-900">Convert video or webcam to real-time ASCII art</p>

    <!-- Source selection -->
    <div class="mb-6 flex flex-wrap items-center gap-3">
        <div class="upload-area flex h-11 cursor-pointer items-center gap-2 rounded-md border border-dashed border-gray-500 bg-background-200 px-4 text-sm text-gray-900 transition-colors hover:border-gray-700 hover:bg-gray-100" id="video-upload-area">
            <svg class="size-4 shrink-0" viewBox="0 0 16 16" fill="none">
                <path d="M2 10v3a1 1 0 001 1h10a1 1 0 001-1v-3M8 2v8M5 5l3-3 3 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <span id="video-upload-label">Upload video</span>
            <input type="file" id="video-file-input" accept="video/*" class="hidden">
        </div>
        <button class="flex h-11 cursor-pointer items-center gap-2 rounded-md border border-gray-400 bg-transparent px-4 text-sm text-gray-1000 transition-colors hover:bg-gray-100" id="video-webcam-btn">
            <svg class="size-4 shrink-0" viewBox="0 0 16 16" fill="none">
                <rect x="1" y="3" width="10" height="10" rx="1.5" stroke="currentColor" stroke-width="1.5"/>
                <path d="M11 6.5l3.5-2v7l-3.5-2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            Webcam
        </button>
        <select id="video-camera-select" class="hidden h-11 rounded-md border border-gray-400 bg-background-100 px-3 text-sm text-gray-1000 outline-none">
        </select>
    </div>

    <!-- Options -->
    <div class="mb-5 flex flex-col gap-4 rounded-md border border-gray-400 bg-background-200 p-5">
        <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col gap-1.5">
                <label class="text-xs text-gray-900">Max Width</label>
                <input type="number" id="video-opt-width" value="80" min="20" max="300"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-col gap-1.5">
                <label class="text-xs text-gray-900">Max Height</label>
                <input type="number" id="video-opt-height" value="40" min="10" max="150"
                    class="h-10 w-full rounded-sm border border-gray-400 bg-background-100 px-3 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="video-opt-fps" class="text-xs text-gray-900">FPS</label>
                <div class="flex h-10 items-center gap-2">
                    <input type="range" id="video-opt-fps" min="5" max="30" value="15" class="flex-1">
                    <span class="w-6 text-center font-mono text-xs text-gray-900" id="video-fps-val">15</span>
                </div>
            </div>
        </div>
        <div class="grid grid-cols-3 gap-4">
            <div class="flex flex-col gap-1.5">
                <label for="video-opt-mode" class="text-xs text-gray-900">Mode</label>
                <div class="relative">
                    <select id="video-opt-mode"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="brightness">Brightness</option>
                        <option value="shape">Shape-Aware</option>
                    </select>
                    <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-900" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="video-opt-charset" class="text-xs text-gray-900">Charset</label>
                <div class="relative">
                    <select id="video-opt-charset"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="standard">Standard</option>
                        <option value="detailed">Detailed</option>
                        <option value="blocks">Blocks</option>
                        <option value="simple">Simple</option>
                        <option value="extended">Extended</option>
                    </select>
                    <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-900" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
            <div class="flex flex-col gap-1.5">
                <label for="video-opt-color" class="text-xs text-gray-900">Color</label>
                <div class="relative">
                    <select id="video-opt-color"
                        class="h-10 w-full cursor-pointer appearance-none rounded-sm border border-gray-400 bg-background-100 px-3 pr-8 font-sans text-sm text-gray-1000 outline-none transition-[border-color,box-shadow] focus:border-blue-700 focus:shadow-focus-ring">
                        <option value="none">None</option>
                        <option value="256">ANSI 256</option>
                        <option value="24bit">24-bit</option>
                    </select>
                    <svg class="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-gray-900" viewBox="0 0 16 16" fill="none">
                        <path d="M4 6l4 4 4-4" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                </div>
            </div>
        </div>
        <div class="flex items-center gap-6">
            ${toggleHTML('video-opt-invert', 'Invert')}
            ${toggleHTML('video-opt-greyscale', 'Greyscale')}
        </div>
        <!-- Shape controls -->
        <div class="grid grid-cols-2 gap-4" id="video-shape-controls" style="display: none;">
            <div class="flex flex-col gap-1.5">
                <label for="video-opt-contrast" class="text-xs text-gray-900">Contrast</label>
                <div class="flex h-10 items-center gap-2">
                    <input type="range" id="video-opt-contrast" min="10" max="40" value="20" class="flex-1">
                    <span class="w-8 text-center font-mono text-xs text-gray-900" id="video-contrast-val">2.0</span>
                </div>
            </div>
            <div class="flex h-10 items-center self-end">
                ${toggleHTML('video-opt-directional', 'Directional Contrast', { labelSize: 'xs' })}
            </div>
        </div>
    </div>

    <!-- Hidden video element -->
    <video id="video-source" class="hidden" muted playsinline></video>

    <!-- Terminal preview -->
    <div class="ansi-terminal mb-4 overflow-auto rounded-md border border-gray-400 bg-[#0a0a0a] p-4 font-mono text-[10px] leading-none text-gray-300 no-wrap" id="video-terminal"
        style="min-height: 200px; --preview-font-size: 10px; --preview-line-height: 1.0; --preview-letter-spacing: 0px;">
        <div class="flex h-[200px] items-center justify-center text-sm text-gray-600" id="video-placeholder">
            Upload a video or start webcam to begin
        </div>
    </div>

    <!-- Controls bar -->
    <div class="flex items-center justify-between">
        <div class="flex items-center gap-3">
            <button class="flex h-9 cursor-pointer items-center gap-1.5 rounded-sm border border-gray-400 bg-transparent px-4 text-xs text-gray-1000 transition-colors hover:bg-gray-100 disabled:cursor-default disabled:opacity-40" id="video-play-pause" disabled>
                <span id="video-play-icon">▶</span> <span id="video-play-label">Play</span>
            </button>
            <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-100 disabled:cursor-default disabled:opacity-40" id="video-stop" disabled>
                Stop
            </button>
            <span class="font-mono text-xs text-gray-600" id="video-fps-display">0 fps</span>
            <span class="font-mono text-xs text-amber-500 hidden" id="video-reduce-warning">auto-reduced</span>
        </div>
        <div class="flex gap-2">
            <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500 disabled:cursor-default disabled:opacity-40" id="video-copy-text" disabled>Copy Text</button>
            <button class="flex h-9 cursor-pointer items-center rounded-sm border border-gray-400 bg-transparent px-3 text-xs text-gray-1000 transition-colors hover:bg-gray-200 hover:border-gray-500 disabled:cursor-default disabled:opacity-40" id="video-copy-ansi" disabled>Copy ANSI</button>
        </div>
    </div>
</div>
`;

let videoCtrl = null;

export function init(container) {
    container.innerHTML = template;

    const videoUploadArea = container.querySelector('#video-upload-area');
    const videoFileInput = container.querySelector('#video-file-input');
    const videoUploadLabel = container.querySelector('#video-upload-label');
    const videoWebcamBtn = container.querySelector('#video-webcam-btn');
    const videoCameraSelect = container.querySelector('#video-camera-select');
    const videoOptFps = container.querySelector('#video-opt-fps');
    const videoFpsVal = container.querySelector('#video-fps-val');
    const videoOptMode = container.querySelector('#video-opt-mode');
    const videoShapeControls = container.querySelector('#video-shape-controls');
    const videoOptContrast = container.querySelector('#video-opt-contrast');
    const videoContrastVal = container.querySelector('#video-contrast-val');
    const videoPlayPause = container.querySelector('#video-play-pause');
    const videoPlayIcon = container.querySelector('#video-play-icon');
    const videoPlayLabel = container.querySelector('#video-play-label');
    const videoStopBtn = container.querySelector('#video-stop');
    const videoFpsDisplay = container.querySelector('#video-fps-display');
    const videoReduceWarning = container.querySelector('#video-reduce-warning');

    function getVideoOptions() {
        return {
            maxWidth: parseInt(container.querySelector('#video-opt-width').value) || 80,
            maxHeight: parseInt(container.querySelector('#video-opt-height').value) || 40,
            charset: container.querySelector('#video-opt-charset').value,
            colorMode: container.querySelector('#video-opt-color').value,
            invert: container.querySelector('#video-opt-invert').checked,
            greyscale: container.querySelector('#video-opt-greyscale').checked,
            mode: videoOptMode.value,
            contrastExponent: parseInt(videoOptContrast.value) / 10,
            directionalContrast: container.querySelector('#video-opt-directional').checked
        };
    }

    function ensureVideoCtrl() {
        if (!videoCtrl) {
            videoCtrl = VideoToAscii.create({
                video: container.querySelector('#video-source'),
                terminal: container.querySelector('#video-terminal'),
                getOptions: getVideoOptions,
                onFps(fps) {
                    videoFpsDisplay.textContent = fps + ' fps';
                    const factor = videoCtrl.getAutoReduceFactor();
                    videoReduceWarning.classList.toggle('hidden', factor <= 1);
                }
            });
        }
        return videoCtrl;
    }

    function enableVideoControls() {
        videoPlayPause.disabled = false;
        videoStopBtn.disabled = false;
        container.querySelector('#video-copy-text').disabled = false;
        container.querySelector('#video-copy-ansi').disabled = false;
    }

    function resetVideoUI() {
        videoPlayPause.disabled = true;
        videoStopBtn.disabled = true;
        container.querySelector('#video-copy-text').disabled = true;
        container.querySelector('#video-copy-ansi').disabled = true;
        videoPlayIcon.textContent = '▶';
        videoPlayLabel.textContent = 'Play';
        videoFpsDisplay.textContent = '0 fps';
        videoReduceWarning.classList.add('hidden');
        videoUploadLabel.textContent = 'Upload video';
        container.querySelector('#video-placeholder').style.display = '';
    }

    videoUploadArea.addEventListener('click', () => videoFileInput.click());
    videoFileInput.addEventListener('change', async () => {
        const file = videoFileInput.files[0];
        if (!file) return;
        const ctrl = ensureVideoCtrl();
        ctrl.stop();
        try {
            await ctrl.loadFile(file);
            videoUploadLabel.textContent = file.name;
            container.querySelector('#video-placeholder').style.display = 'none';
            enableVideoControls();
            ctrl.play();
            videoPlayIcon.textContent = '⏸';
            videoPlayLabel.textContent = 'Pause';
        } catch (err) {
            console.error('Video load error:', err);
            showToast('Failed to load video');
        }
    });

    videoWebcamBtn.addEventListener('click', async () => {
        const ctrl = ensureVideoCtrl();

        const video = container.querySelector('#video-source');
        if (video.srcObject) {
            ctrl.stop();
            resetVideoUI();
            videoCameraSelect.classList.add('hidden');
            return;
        }

        try {
            await ctrl.startWebcam();
            container.querySelector('#video-placeholder').style.display = 'none';
            enableVideoControls();
            ctrl.play();
            videoPlayIcon.textContent = '⏸';
            videoPlayLabel.textContent = 'Pause';

            const cameras = await ctrl.listCameras();
            if (cameras.length > 1) {
                videoCameraSelect.innerHTML = '';
                cameras.forEach(cam => {
                    const opt = document.createElement('option');
                    opt.value = cam.deviceId;
                    opt.textContent = cam.label || `Camera ${videoCameraSelect.options.length + 1}`;
                    videoCameraSelect.appendChild(opt);
                });
                videoCameraSelect.classList.remove('hidden');
            }
        } catch (err) {
            console.error('Webcam error:', err);
            showToast('Could not access webcam');
        }
    });

    videoCameraSelect.addEventListener('change', async () => {
        if (!videoCtrl) return;
        videoCtrl.stopWebcam();
        try {
            await videoCtrl.startWebcam(videoCameraSelect.value);
            videoCtrl.play();
        } catch (err) {
            console.error('Camera switch error:', err);
            showToast('Failed to switch camera');
        }
    });

    videoPlayPause.addEventListener('click', () => {
        if (!videoCtrl) return;
        if (videoCtrl.isRunning()) {
            videoCtrl.pause();
            videoPlayIcon.textContent = '▶';
            videoPlayLabel.textContent = 'Play';
        } else {
            videoCtrl.play();
            videoPlayIcon.textContent = '⏸';
            videoPlayLabel.textContent = 'Pause';
        }
    });

    videoStopBtn.addEventListener('click', () => {
        if (!videoCtrl) return;
        videoCtrl.stop();
        resetVideoUI();
        videoCameraSelect.classList.add('hidden');
    });

    videoOptFps.addEventListener('input', () => {
        videoFpsVal.textContent = videoOptFps.value;
        if (videoCtrl) videoCtrl.setTargetFps(parseInt(videoOptFps.value));
    });

    videoOptMode.addEventListener('change', () => {
        videoShapeControls.style.display = videoOptMode.value === 'shape' ? '' : 'none';
    });

    videoOptContrast.addEventListener('input', () => {
        videoContrastVal.textContent = (parseInt(videoOptContrast.value) / 10).toFixed(1);
    });

    container.querySelector('#video-copy-text').addEventListener('click', async () => {
        if (!videoCtrl) return;
        const text = videoCtrl.getLastPlainText();
        if (text) {
            await copyToClipboard(text);
            showToast('ASCII frame copied!');
        }
    });

    container.querySelector('#video-copy-ansi').addEventListener('click', async () => {
        if (!videoCtrl) return;
        const ansi = videoCtrl.getLastAnsi();
        if (ansi) {
            await copyToClipboard(ansi);
            showToast('ANSI frame copied!');
        }
    });
}

export function pause() {
    if (videoCtrl && videoCtrl.isRunning()) {
        videoCtrl.pause();
    }
}

export function isInitialized() {
    return videoCtrl !== null;
}
