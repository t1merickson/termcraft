import { useState, useCallback, useRef, type DragEvent, type ChangeEvent } from "react";

interface UploadState {
  file: File | null;
  dataUrl: string | null;
  image: HTMLImageElement | null;
  isDragging: boolean;
}

function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Failed to read file"));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Failed to load image"));
    img.src = src;
  });
}

export function useImageUpload() {
  const [state, setState] = useState<UploadState>({
    file: null,
    dataUrl: null,
    image: null,
    isDragging: false,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = useCallback(async (file: File) => {
    const dataUrl = await readFileAsDataURL(file);
    const image = await loadImage(dataUrl);
    setState({ file, dataUrl, image, isDragging: false });
    return image;
  }, []);

  const loadFromUrl = useCallback(
    async (src: string, name?: string) => {
      const response = await fetch(src);
      if (!response.ok) {
        throw new Error(`Failed to load image: ${response.status}`);
      }
      const blob = await response.blob();
      const sourceName = decodeURIComponent(
        src.split("/").pop()?.split("?")[0] || "sample.png",
      );
      const normalizedName = name?.replace(/\s+/g, "-").toLowerCase();
      const fileName = normalizedName
        ? /\.[a-z0-9]+$/i.test(normalizedName)
          ? normalizedName
          : `${normalizedName}.png`
        : sourceName;
      const file = new File([blob], fileName, { type: blob.type || "image/png" });
      return processFile(file);
    },
    [processFile],
  );

  const onDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    setState((s) => ({ ...s, isDragging: true }));
  }, []);

  const onDragLeave = useCallback(() => {
    setState((s) => ({ ...s, isDragging: false }));
  }, []);

  const onDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      setState((s) => ({ ...s, isDragging: false }));
      const file = e.dataTransfer.files[0];
      if (file && file.type.startsWith("image/")) {
        processFile(file);
      }
    },
    [processFile],
  );

  const onFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    ...state,
    fileInputRef,
    processFile,
    loadFromUrl,
    openFilePicker,
    onDragOver,
    onDragLeave,
    onDrop,
    onFileChange,
    reloadImage: loadImage,
  };
}
