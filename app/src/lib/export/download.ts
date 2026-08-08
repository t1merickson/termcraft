export function download(
  blob: Blob | string,
  filename: string,
  mime = "application/octet-stream",
): void {
  const value =
    typeof blob === "string" ? new Blob([blob], { type: mime }) : blob;
  const url = URL.createObjectURL(value);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.style.display = "none";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

export function timestampedName(base: string, ext: string): string {
  const now = new Date();
  const two = (value: number) => String(value).padStart(2, "0");
  const stamp = `${now.getFullYear()}${two(now.getMonth() + 1)}${two(now.getDate())}-${two(now.getHours())}${two(now.getMinutes())}`;
  return `${base}-${stamp}.${ext.replace(/^\./, "")}`;
}
