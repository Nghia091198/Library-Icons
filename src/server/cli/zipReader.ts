import { inflateRawSync } from 'node:zlib';

const END_OF_CENTRAL_DIRECTORY = 0x06054b50;
const CENTRAL_DIRECTORY_ENTRY = 0x02014b50;
const END_RECORD_MIN_SIZE = 22;
const MAX_ARCHIVE_COMMENT = 0xffff;
const COMPRESSION_STORED = 0;
const COMPRESSION_DEFLATE = 8;

export type ZipEntries = Map<string, () => Buffer>;

function findEndRecord(archive: Buffer): number {
  const lowest = Math.max(0, archive.length - END_RECORD_MIN_SIZE - MAX_ARCHIVE_COMMENT);
  for (let offset = archive.length - END_RECORD_MIN_SIZE; offset >= lowest; offset -= 1) {
    if (archive.readUInt32LE(offset) === END_OF_CENTRAL_DIRECTORY) return offset;
  }
  throw new Error('Not a zip archive (end of central directory not found)');
}

// Đọc zip thường (không ZIP64): đủ cho file export dưới 65.535 mục và 4 GB.
export function readZipEntries(archive: Buffer): ZipEntries {
  const endRecord = findEndRecord(archive);
  const entryCount = archive.readUInt16LE(endRecord + 10);
  let offset = archive.readUInt32LE(endRecord + 16);
  const entries: ZipEntries = new Map();

  for (let index = 0; index < entryCount; index += 1) {
    if (archive.readUInt32LE(offset) !== CENTRAL_DIRECTORY_ENTRY) throw new Error(`Corrupt central directory at ${offset}`);
    const method = archive.readUInt16LE(offset + 10);
    const compressedSize = archive.readUInt32LE(offset + 20);
    const nameLength = archive.readUInt16LE(offset + 28);
    const extraLength = archive.readUInt16LE(offset + 30);
    const commentLength = archive.readUInt16LE(offset + 32);
    const localHeader = archive.readUInt32LE(offset + 42);
    const name = archive.toString('utf8', offset + 46, offset + 46 + nameLength);

    entries.set(name, () => {
      const dataStart = localHeader + 30 + archive.readUInt16LE(localHeader + 26) + archive.readUInt16LE(localHeader + 28);
      const data = archive.subarray(dataStart, dataStart + compressedSize);
      if (method === COMPRESSION_STORED) return data;
      if (method === COMPRESSION_DEFLATE) return inflateRawSync(data);
      throw new Error(`Unsupported compression method ${method} for ${name}`);
    });
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return entries;
}
