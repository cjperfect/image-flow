export interface CompressionResult {
  blob: Blob;
  originalSize: number;
  compressedSize: number;
  compressionCount: number | null;
}

export async function compressImage(file: File): Promise<CompressionResult> {
  const storeResponse = await fetch("/api/tinypng/backend/opt/store", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/octet-stream",
    },
    body: file,
  });
  if (!storeResponse.ok) {
    throw await toTinyPngError(storeResponse);
  }

  const input = await storeResponse.json() as { key?: string };
  if (!input.key) {
    throw new Error("TinyPNG 没有返回上传文件 key");
  }

  const processResponse = await fetch("/api/tinypng/backend/opt/process", {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      key: input.key,
      originalType: file.type,
      originalSize: file.size,
    }),
  });
  if (!processResponse.ok) {
    throw await toTinyPngError(processResponse);
  }

  const output = await processResponse.json() as { url?: string };
  if (!output.url) {
    throw new Error("TinyPNG 没有返回压缩文件地址");
  }

  const outputPath = new URL(output.url).pathname;
  const outputResponse = await fetch(`/api/tinypng${outputPath}`);
  if (!outputResponse.ok) {
    throw await toTinyPngError(outputResponse);
  }

  const blob = await outputResponse.blob();
  return {
    blob,
    originalSize: file.size,
    compressedSize: blob.size,
    compressionCount: null,
  };
}

async function toTinyPngError(response: Response): Promise<Error> {
  try {
    const data = await response.json() as { message?: string; error?: string };
    return new Error(data.message || data.error || `TinyPNG 请求失败 (${response.status})`);
  } catch {
    return new Error(`TinyPNG 请求失败 (${response.status})`);
  }
}
