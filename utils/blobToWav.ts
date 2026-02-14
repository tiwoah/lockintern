export async function blobToWavFile(blob: Blob, filename = "recording.wav") {
  const arrayBuffer = await blob.arrayBuffer();

  const audioCtx = new (
    window.AudioContext || (window as any).webkitAudioContext
  )();
  const audioBuffer = await audioCtx.decodeAudioData(
    arrayBuffer.slice(0) as ArrayBuffer,
  );

  const wavArrayBuffer = encodeWav(audioBuffer);
  audioCtx.close();

  return new File([wavArrayBuffer], filename, { type: "audio/wav" });
}

function encodeWav(audioBuffer: AudioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const format = 1; // PCM
  const bitDepth = 16;

  const samples = interleave(audioBuffer);
  const blockAlign = (numChannels * bitDepth) / 8;
  const byteRate = sampleRate * blockAlign;
  const dataSize = samples.length * 2; // 16-bit

  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  writeString(view, 0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(view, 8, "WAVE");

  writeString(view, 12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, format, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitDepth, true);

  writeString(view, 36, "data");
  view.setUint32(40, dataSize, true);

  floatTo16BitPCM(view, 44, samples);

  return buffer;
}

function interleave(audioBuffer: AudioBuffer) {
  const numChannels = audioBuffer.numberOfChannels;
  const length = audioBuffer.length;
  const result = new Float32Array(length * numChannels);

  const channels = Array.from({ length: numChannels }, (_, i) =>
    audioBuffer.getChannelData(i),
  );

  let idx = 0;
  for (let i = 0; i < length; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      result[idx++] = channels[ch][i];
    }
  }
  return result;
}

function floatTo16BitPCM(view: DataView, offset: number, input: Float32Array) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

function writeString(view: DataView, offset: number, str: string) {
  for (let i = 0; i < str.length; i++)
    view.setUint8(offset + i, str.charCodeAt(i));
}
