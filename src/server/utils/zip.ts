import zlib from "zlib";

export interface ZipFileEntry {
  name: string;
  content: Buffer;
  date?: Date;
}

/**
 * Creates a valid, standard ZIP archive (PK\x03\x04) in memory.
 * Uses STORE method (0) with UTF-8 filename encoding flags.
 * Compatible with Windows Explorer, macOS Archive Utility, iOS, Android, and Linux unzip.
 */
export function createZipArchive(files: ZipFileEntry[]): Buffer {
  const parts: Buffer[] = [];
  const cdEntries: Buffer[] = [];
  let offset = 0;

  const defaultDate = new Date();

  for (const file of files) {
    const filenameBuf = Buffer.from(file.name, "utf-8");
    const content = Buffer.isBuffer(file.content) ? file.content : Buffer.from(file.content);
    const crc = zlib.crc32(content);
    const size = content.length;

    const fileDate = file.date || defaultDate;
    const time =
      (fileDate.getHours() << 11) |
      (fileDate.getMinutes() << 5) |
      Math.floor(fileDate.getSeconds() / 2);
    const date =
      ((fileDate.getFullYear() - 1980) << 9) |
      ((fileDate.getMonth() + 1) << 5) |
      fileDate.getDate();

    // General purpose bit flag: bit 11 (0x0800) indicates filename is UTF-8
    const flag = 0x0800;

    // 1. Local file header (30 bytes + filename)
    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local header signature
    localHeader.writeUInt16LE(20, 4); // Version needed to extract: 2.0
    localHeader.writeUInt16LE(flag, 6); // UTF-8 filename flag
    localHeader.writeUInt16LE(0, 8); // Compression: 0 (Stored)
    localHeader.writeUInt16LE(time, 10);
    localHeader.writeUInt16LE(date, 12);
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(size, 18); // Compressed size
    localHeader.writeUInt32LE(size, 22); // Uncompressed size
    localHeader.writeUInt16LE(filenameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // Extra field length

    const localEntryOffset = offset;
    parts.push(localHeader, filenameBuf, content);
    offset += localHeader.length + filenameBuf.length + content.length;

    // 2. Central directory file header (46 bytes + filename)
    const cdHeader = Buffer.alloc(46);
    cdHeader.writeUInt32LE(0x02014b50, 0); // CD header signature
    cdHeader.writeUInt16LE(20, 4); // Made by: 2.0
    cdHeader.writeUInt16LE(20, 6); // Needed to extract: 2.0
    cdHeader.writeUInt16LE(flag, 8); // UTF-8 filename flag
    cdHeader.writeUInt16LE(0, 10); // Compression: 0 (Stored)
    cdHeader.writeUInt16LE(time, 12);
    cdHeader.writeUInt16LE(date, 14);
    cdHeader.writeUInt32LE(crc, 16);
    cdHeader.writeUInt32LE(size, 20); // Compressed size
    cdHeader.writeUInt32LE(size, 24); // Uncompressed size
    cdHeader.writeUInt16LE(filenameBuf.length, 28);
    cdHeader.writeUInt16LE(0, 30); // Extra field length
    cdHeader.writeUInt16LE(0, 32); // Comment length
    cdHeader.writeUInt16LE(0, 34); // Disk number start
    cdHeader.writeUInt16LE(0, 36); // Internal file attributes
    cdHeader.writeUInt32LE(0, 38); // External file attributes
    cdHeader.writeUInt32LE(localEntryOffset, 42); // Offset of local header

    cdEntries.push(cdHeader, filenameBuf);
  }

  // Append all Central Directory records
  const cdOffset = offset;
  let cdSize = 0;
  for (const b of cdEntries) {
    cdSize += b.length;
    parts.push(b);
  }

  // 3. End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // EOCD signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk where CD starts
  eocd.writeUInt16LE(files.length, 8); // Number of CD records on disk
  eocd.writeUInt16LE(files.length, 10); // Total CD records
  eocd.writeUInt32LE(cdSize, 12); // Size of central directory
  eocd.writeUInt32LE(cdOffset, 16); // Start offset of CD
  eocd.writeUInt16LE(0, 20); // Comment length

  parts.push(eocd);

  return Buffer.concat(parts);
}
