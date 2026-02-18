/**
 * Shared utilities: toast, clipboard, image loading
 */

const toast = document.getElementById('toast');

export function showToast(message) {
    toast.textContent = message;
    toast.classList.add('visible');
    setTimeout(() => toast.classList.remove('visible'), 2000);
}

export async function copyToClipboard(text) {
    try {
        await navigator.clipboard.writeText(text);
    } catch {
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
    }
}

export function loadImage(src) {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error('Failed to load image'));
        img.src = src;
    });
}

export function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
}

/**
 * Return HTML for a toggle switch (Geist-style).
 * @param {string} id       – checkbox element id
 * @param {string} label    – visible label text
 * @param {object} [opts]
 * @param {boolean} [opts.checked] – initial state (default false)
 * @param {'sm'|'md'} [opts.size]  – 'sm' = 18px track, 'md' = 22px track (default 'md')
 * @param {'sm'|'base'} [opts.labelSize] – label font size (default 'sm' = text-sm)
 */
export function toggleHTML(id, label, opts = {}) {
    const checked = opts.checked ? ' checked' : '';
    if (opts.size === 'sm') {
        return `<div class="flex items-center gap-1.5">
                <label class="relative inline-block h-[18px] w-8 cursor-pointer">
                    <input type="checkbox" id="${id}"${checked} class="peer absolute h-0 w-0 opacity-0">
                    <span class="absolute inset-0 rounded-full bg-gray-400 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-[14px] after:w-[14px] after:rounded-full after:bg-white after:transition-transform peer-checked:bg-blue-700 peer-checked:after:translate-x-[14px]"></span>
                </label>
                <span class="text-xs text-gray-1000">${label}</span>
            </div>`;
    }
    const labelCls = opts.labelSize === 'xs' ? 'text-xs' : 'text-sm';
    return `<div class="flex items-center gap-2.5">
                <label class="relative inline-block h-[22px] w-10 cursor-pointer">
                    <input type="checkbox" id="${id}"${checked} class="peer absolute h-0 w-0 opacity-0">
                    <span class="absolute inset-0 rounded-full bg-gray-400 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-[18px] after:w-[18px] after:rounded-full after:bg-white after:transition-transform peer-checked:bg-blue-700 peer-checked:after:translate-x-[18px]"></span>
                </label>
                <span class="${labelCls} text-gray-1000">${label}</span>
            </div>`;
}

/**
 * Return HTML for a Geist-style Note component.
 * @param {string} content – inner HTML (may contain links, etc.)
 * @param {object} [opts]
 * @param {'sm'|'md'|'lg'} [opts.size] – 'sm' | 'md' (default) | 'lg'
 */
export function noteHTML(content, opts = {}) {
    const size = opts.size || 'md';
    const sizeStyles = {
        sm: 'min-h-[34px] px-2 py-1.5 text-[13px] leading-[19.5px]',
        md: 'min-h-[40px] px-3 py-2 text-sm leading-[21px]',
        lg: 'min-h-[48px] px-3 py-[11px] text-base leading-6',
    };
    return `<div class="flex items-center gap-3 rounded-sm border border-gray-400 text-gray-900 ${sizeStyles[size]}">
        <svg class="size-4 shrink-0" viewBox="0 0 16 16" width="16" height="16" fill="currentColor">
            <path fill-rule="evenodd" clip-rule="evenodd" d="M8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5ZM8 16C12.4183 16 16 12.4183 16 8C16 3.58172 12.4183 0 8 0C3.58172 0 0 3.58172 0 8C0 12.4183 3.58172 16 8 16ZM6.25 7H7H7.74999C8.30227 7 8.74999 7.44772 8.74999 8V11.5V12.25H7.24999V11.5V8.5H7H6.25V7ZM8 6C8.55229 6 9 5.55228 9 5C9 4.44772 8.55229 4 8 4C7.44772 4 7 4.44772 7 5C7 5.55228 7.44772 6 8 6Z"/>
        </svg>
        <span>${content}</span>
    </div>`;
}

export function escapeForPrintf(ansi) {
    return ansi
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\x1b/g, '\\033');
}
