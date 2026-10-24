import { inflateSync } from 'fflate';
import { MAX_METADATA_BYTES } from './module-metadata';

const MAX_FALLBACK_BYTES = 32 * 1024 * 1024;
interface ZipEntry { name: string; size: number; compressed: number; method: number; offset: number; crc: number; }
export type RangeReader = (range: string, limit: number) => Promise<{ bytes: Uint8Array; partial: boolean }>;
const view = (b: Uint8Array) => new DataView(b.buffer, b.byteOffset, b.byteLength);
const decode = (b: Uint8Array) => new TextDecoder('utf-8', { fatal: true }).decode(b);

/** Reads the central directory and selected entries only; dataset CSVs are never inflated. */
export class ModuleArchive {
  private constructor(private reader: RangeReader, private tail: Uint8Array, private tailStart: number, readonly entries: ZipEntry[]) {}
  static async open(reader: RangeReader): Promise<ModuleArchive> {
    const response = await reader('bytes=-65557', MAX_FALLBACK_BYTES);
    const bytes = response.bytes, data = view(bytes);
    let end = -1;
    for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65557); i--)
      if (data.getUint32(i, true) === 0x06054b50 && i + 22 + data.getUint16(i + 20, true) === bytes.length) { end = i; break; }
    if (end < 0) throw new Error('Module download is not a supported ZIP archive.');
    const count = data.getUint16(end + 10, true), length = data.getUint32(end + 12, true), offset = data.getUint32(end + 16, true);
    if (data.getUint32(end + 4, true) !== 0 || count === 0xffff || offset === 0xffffffff || length === 0xffffffff)
      throw new Error('Multi-volume and ZIP64 module archives need a registry metadata endpoint.');
    if (length > MAX_METADATA_BYTES || count > 10000) throw new Error('Module ZIP directory exceeds the metadata size limit.');
    const tailStart = response.partial ? offset + length - end : 0;
    if (tailStart < 0 || offset + length !== tailStart + end) throw new Error('Module ZIP directory is inconsistent.');
    const directory = offset >= tailStart ? bytes.subarray(offset - tailStart, offset - tailStart + length)
      : (await reader(`bytes=${offset}-${offset + length - 1}`, MAX_METADATA_BYTES)).bytes;
    if (directory.length !== length) throw new Error('Registry did not return the requested ZIP directory.');
    const d = view(directory), entries: ZipEntry[] = [];
    let position = 0;
    for (let i = 0; i < count; i++) {
      if (position + 46 > directory.length || d.getUint32(position, true) !== 0x02014b50) throw new Error('Module ZIP directory is malformed.');
      const nameLength = d.getUint16(position + 28, true), extra = d.getUint16(position + 30, true), comment = d.getUint16(position + 32, true);
      if (position + 46 + nameLength + extra + comment > directory.length) throw new Error('Module ZIP entry is truncated.');
      if (d.getUint16(position + 8, true) & 1) throw new Error('Encrypted module archives cannot supply metadata.');
      entries.push({ name: decode(directory.subarray(position + 46, position + 46 + nameLength)), method: d.getUint16(position + 10, true),
        crc: d.getUint32(position + 16, true), compressed: d.getUint32(position + 20, true), size: d.getUint32(position + 24, true), offset: d.getUint32(position + 42, true) });
      position += 46 + nameLength + extra + comment;
    }
    return new ModuleArchive(reader, bytes, tailStart, entries);
  }
  private async range(start: number, size: number): Promise<Uint8Array> {
    if (start >= this.tailStart && start + size <= this.tailStart + this.tail.length) return this.tail.subarray(start - this.tailStart, start - this.tailStart + size);
    const result = await this.reader(`bytes=${start}-${start + size - 1}`, Math.max(size, MAX_METADATA_BYTES));
    if (!result.partial || result.bytes.length !== size) throw new Error('Registry did not honor the requested module byte range.');
    return result.bytes;
  }
  async text(name: string): Promise<string> {
    const matches = this.entries.filter(e => e.name === name);
    if (matches.length !== 1) throw new Error(`Module package is missing an unambiguous ${name}.`);
    const entry = matches[0];
    if (entry.size > MAX_METADATA_BYTES || entry.compressed > MAX_METADATA_BYTES) throw new Error(`${name} exceeds the metadata size limit.`);
    const header = view(await this.range(entry.offset, 30));
    if (header.getUint32(0, true) !== 0x04034b50) throw new Error('Module ZIP file header is malformed.');
    const start = entry.offset + 30 + header.getUint16(26, true) + header.getUint16(28, true);
    const compressed = await this.range(start, entry.compressed);
    const content = entry.method === 0 ? compressed : entry.method === 8 ? inflateSync(compressed, { out: new Uint8Array(entry.size) }) : null;
    if (!content || content.length !== entry.size) throw new Error('Module metadata uses unsupported or invalid ZIP compression.');
    let crc = 0xffffffff;
    for (const byte of content) { crc ^= byte; for (let i = 0; i < 8; i++) crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0); }
    if (((crc ^ 0xffffffff) >>> 0) !== entry.crc) throw new Error('Module metadata failed its ZIP integrity check.');
    return decode(content);
  }
  manifestName(): string {
    const matches = this.entries.filter(e => /(^|\/)config\.ya?ml$/i.test(e.name) && !e.name.startsWith('__MACOSX/'));
    if (matches.length !== 1) throw new Error('Module archive must contain exactly one config.yaml or config.yml.');
    return matches[0].name;
  }
}

/** Bound streamed responses even when a server ignores Range and sends the entire dataset. */
export async function readModuleRange(url: string, token: string, range: string, limit: number, signal: AbortSignal): Promise<{ bytes: Uint8Array; partial: boolean }> {
  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}`, Range: range }, signal });
  if (!response.ok) throw new Error(response.status === 401 ? 'Registry session expired. Reconnect to retry this module.'
    : response.status === 403 ? 'Registry denied access to this module version (HTTP 403). Its package metadata could not be inspected.'
    : `Module download failed (HTTP ${response.status}).`);
  const stream = response.body?.getReader();
  if (!stream) throw new Error('Module download has no readable content.');
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const next = await stream.read();
      if (next.done) break;
      size += next.value.length;
      if (size > limit) throw new Error('Registry does not support small metadata downloads for this package. A manifest endpoint is required.');
      chunks.push(next.value);
    }
  } finally { await stream.cancel(); }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
  return { bytes, partial: response.status === 206 };
}
