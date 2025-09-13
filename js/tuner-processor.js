// tuner-processor.js

class TunerProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufferSize = 4096;
    this._buffer = new Float32Array(this._bufferSize);
    this._bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    const channelData = input[0];

    // If the input buffer is empty, do nothing
    if (!channelData) {
      return true;
    }

    // Copy data from the input buffer to our internal buffer
    for (let i = 0; i < channelData.length; i++) {
      this._buffer[this._bufferIndex++] = channelData[i];

      // When our buffer is full, send it to the main thread
      if (this._bufferIndex === this._bufferSize) {
        this.port.postMessage(this._buffer);
        this._bufferIndex = 0; // Reset buffer index
      }
    }

    return true; // Keep the processor alive
  }
}

registerProcessor('tuner-processor', TunerProcessor);