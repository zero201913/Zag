export interface AudioTags {
  title?: string;
  artist?: string;
  album?: string;
  picture?: File;
}

function syncSafe(data: Uint8Array, offset: number) {
  return (
    ((data[offset] & 0x7f) << 21) |
    ((data[offset + 1] & 0x7f) << 14) |
    ((data[offset + 2] & 0x7f) << 7) |
    (data[offset + 3] & 0x7f)
  );
}

function readU32(data: Uint8Array, offset: number) {
  return (
    (data[offset] << 24) |
    (data[offset + 1] << 16) |
    (data[offset + 2] << 8) |
    data[offset + 3]
  );
}

function ascii(data: Uint8Array, offset: number, length: number) {
  let value = "";
  for (let i = 0; i < length; i += 1) value += String.fromCharCode(data[offset + i]);
  return value;
}

function deUnsync(data: Uint8Array) {
  const output = new Uint8Array(data.length);
  let length = 0;
  for (let i = 0; i < data.length; i += 1) {
    output[length++] = data[i];
    if (data[i] === 0xff && data[i + 1] === 0x00) i += 1;
  }
  return output.subarray(0, length);
}

function decodeText(frame: Uint8Array) {
  if (frame.length <= 1) return "";
  const encoding = frame[0];
  const body = frame.subarray(1);
  let label = "iso-8859-1";
  if (encoding === 1) label = "utf-16";
  else if (encoding === 2) label = "utf-16be";
  else if (encoding === 3) label = "utf-8";

  try {
    return new TextDecoder(label)
      .decode(body)
      .replace(/^\uFEFF/, "")
      .replace(/\0+$/g, "")
      .trim();
  } catch {
    return "";
  }
}

function extractPicture(frame: Uint8Array): File | undefined {
  let start = -1;
  let mime = "";
  let extension = "";

  for (let i = 0; i < frame.length - 3; i += 1) {
    if (frame[i] === 0xff && frame[i + 1] === 0xd8 && frame[i + 2] === 0xff) {
      start = i;
      mime = "image/jpeg";
      extension = "jpg";
      break;
    }
    if (
      frame[i] === 0x89 &&
      frame[i + 1] === 0x50 &&
      frame[i + 2] === 0x4e &&
      frame[i + 3] === 0x47
    ) {
      start = i;
      mime = "image/png";
      extension = "png";
      break;
    }
    if (
      frame[i] === 0x47 &&
      frame[i + 1] === 0x49 &&
      frame[i + 2] === 0x46 &&
      frame[i + 3] === 0x38
    ) {
      start = i;
      mime = "image/gif";
      extension = "gif";
      break;
    }
    if (
      frame[i] === 0x52 &&
      frame[i + 1] === 0x49 &&
      frame[i + 2] === 0x46 &&
      frame[i + 3] === 0x46 &&
      frame[i + 8] === 0x57 &&
      frame[i + 9] === 0x45 &&
      frame[i + 10] === 0x42 &&
      frame[i + 11] === 0x50
    ) {
      start = i;
      mime = "image/webp";
      extension = "webp";
      break;
    }
  }

  if (start === -1) return undefined;
  return new File([frame.slice(start)], `cover.${extension}`, { type: mime });
}

function parseId3(data: Uint8Array): AudioTags {
  if (
    data.length < 10 ||
    data[0] !== 0x49 ||
    data[1] !== 0x44 ||
    data[2] !== 0x33
  ) {
    return {};
  }

  const major = data[3];
  if (major < 2 || major > 4) return {};
  const flags = data[5];
  const tagSize = syncSafe(data, 6);
  let end = Math.min(data.length, 10 + tagSize);
  let body = data.subarray(10, end);
  if (flags & 0x80) body = deUnsync(body);

  let position = 0;
  if (flags & 0x40) {
    if (major === 3 && body.length >= 4) {
      position = 4 + readU32(body, 0);
    } else if (major === 4 && body.length >= 4) {
      position = syncSafe(body, 0);
    }
    if (position < 0 || position >= body.length) position = 0;
  }

  const tags: AudioTags = {};

  while (position + (major === 2 ? 6 : 10) <= body.length) {
    let id: string;
    let size: number;
    let headerSize: number;

    if (major === 2) {
      id = ascii(body, position, 3);
      size =
        (body[position + 3] << 16) |
        (body[position + 4] << 8) |
        body[position + 5];
      headerSize = 6;
    } else {
      id = ascii(body, position, 4);
      size =
        major === 4
          ? syncSafe(body, position + 4)
          : readU32(body, position + 4);
      headerSize = 10;
    }

    if (!/^[A-Z0-9]{3,4}$/.test(id) || size <= 0) break;
    const frameStart = position + headerSize;
    const frameEnd = Math.min(frameStart + size, body.length);
    if (frameEnd <= frameStart) break;
    const frame = body.subarray(frameStart, frameEnd);

    if (id === "TIT2" || id === "TT2") tags.title = decodeText(frame);
    else if (id === "TPE1" || id === "TP1") tags.artist = decodeText(frame);
    else if (id === "TALB" || id === "TAL") tags.album = decodeText(frame);
    else if (id === "APIC" || id === "PIC") tags.picture = extractPicture(frame);

    position = frameEnd;
  }

  return tags;
}

/** 从本地 MP3 文件读取 ID3 标题、艺术家、专辑与内嵌封面。 */
export async function extractAudioTags(file: File): Promise<AudioTags> {
  try {
    const buffer = await file.slice(0, 12 * 1024 * 1024).arrayBuffer();
    return parseId3(new Uint8Array(buffer));
  } catch {
    return {};
  }
}

/** 从已经在 R2 的音频地址读取前几 MB，用于给旧歌曲补封面。 */
export async function extractAudioTagsFromUrl(
  url: string,
  maxBytes = 4 * 1024 * 1024,
): Promise<AudioTags> {
  try {
    const response = await fetch(url, {
      headers: { Range: `bytes=0-${maxBytes - 1}` },
    });
    if (!response.ok) return {};
    const buffer = await response.arrayBuffer();
    return parseId3(new Uint8Array(buffer));
  } catch {
    return {};
  }
}