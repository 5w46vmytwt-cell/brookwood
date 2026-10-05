// RIFF chunk parser for linear PCM, IEEE float, and their extensible forms.
export function wavMetadata(buffer) {
  if (buffer.toString('ascii', 0, 4) !== 'RIFF' || buffer.toString('ascii', 8, 12) !== 'WAVE') throw Error('Not RIFF WAVE');
  const limit = buffer.readUInt32LE(4) + 8;
  if (limit > buffer.length) throw Error('Truncated RIFF');
  let format, dataSize = 0;
  for (let pos = 12; pos + 8 <= limit;) {
    const id = buffer.toString('ascii', pos, pos + 4), size = buffer.readUInt32LE(pos + 4), start = pos + 8;
    if (start + size > limit) throw Error('Truncated WAV chunk');
    if (id === 'fmt ') {
      if (size < 16) throw Error('Short fmt chunk');
      format = { encoding: buffer.readUInt16LE(start), channels: buffer.readUInt16LE(start + 2), sampleRate: buffer.readUInt32LE(start + 4), byteRate: buffer.readUInt32LE(start + 8), blockAlign: buffer.readUInt16LE(start + 12), bits: buffer.readUInt16LE(start + 14) };
      if (format.encoding === 65534) {
        if (size < 40) throw Error('Short extensible fmt');
        format.encoding = buffer.readUInt16LE(start + 24);
      }
    }
    if (id === 'data') dataSize += size;
    pos = start + size + (size % 2);
  }
  if (!format || !dataSize || ![1,3].includes(format.encoding) || !format.blockAlign || format.byteRate !== format.sampleRate * format.blockAlign || dataSize % format.blockAlign) throw Error('Invalid or unsupported linear WAV');
  return { ...format, dataSize, durationMs: dataSize / format.byteRate * 1000 };
}
