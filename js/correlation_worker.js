// self.onmessage = function(event)
// {
// 	var timeseries = event.data.timeseries;
// 	var test_frequencies = event.data.test_frequencies;
// 	var sample_rate = event.data.sample_rate;
// 	var amplitudes = compute_correlations(timeseries, test_frequencies, sample_rate);
// 	self.postMessage({ "timeseries": timeseries, "frequency_amplitudes": amplitudes });
// };

// function compute_correlations(timeseries, test_frequencies, sample_rate)
// {
// 	// 2pi * frequency gives the appropriate period to sine.
// 	// timeseries index / sample_rate gives the appropriate time coordinate.
// 	var scale_factor = 2 * Math.PI / sample_rate;
// 	var amplitudes = test_frequencies.map
// 	(
// 		function(f)
// 		{
// 			var frequency = f.frequency;

// 			// Represent a complex number as a length-2 array [ real, imaginary ].
// 			var accumulator = [ 0, 0 ];
// 			for (var t = 0; t < timeseries.length; t++)
// 			{
// 				accumulator[0] += timeseries[t] * Math.cos(scale_factor * frequency * t);
// 				accumulator[1] += timeseries[t] * Math.sin(scale_factor * frequency * t);
// 			}

// 			return accumulator;
// 		}
// 	);

// 	return amplitudes;
// }

// self.onmessage = function(event)
// {
// 	var timeseries = event.data.timeseries;
// 	var test_frequencies = event.data.test_frequencies;
// 	var sample_rate = event.data.sample_rate;
// 	var amplitudes = compute_correlations(timeseries, test_frequencies, sample_rate);
// 	self.postMessage({ "timeseries": timeseries, "frequency_amplitudes": amplitudes });
// };

// function compute_correlations(timeseries, test_frequencies, sample_rate)
// {
// 	// 2pi * frequency gives the appropriate period to sine.
// 	// timeseries index / sample_rate gives the appropriate time coordinate.
// 	var scale_factor = 2 * Math.PI / sample_rate;
// 	var amplitudes = test_frequencies.map
// 	(
// 		function(f)
// 		{
// 			// This line is the only change. It now correctly handles an array of numbers.
// 			var frequency = f;

// 			// Represent a complex number as a length-2 array [ real, imaginary ].
// 			var accumulator = [ 0, 0 ];
// 			for (var t = 0; t < timeseries.length; t++)
// 			{
// 				accumulator[0] += timeseries[t] * Math.cos(scale_factor * frequency * t);
// 				accumulator[1] += timeseries[t] * Math.sin(scale_factor * frequency * t);
// 			}

// 			return accumulator;
// 		}
// 	);

// 	return amplitudes;
// }

// correlation_worker.js - Updated with McLeod Pitch Method (MPM)

// This function is the entry point for the worker
self.onmessage = function(event) {
  const { audioBuffer, sampleRate } = event.data;
  const frequency = getPitch(audioBuffer, sampleRate);
  self.postMessage({ frequency });
};

/**
 * The McLeod Pitch Method (MPM)
 * This algorithm is designed for accurate real-time pitch detection.
 * @param {Float32Array} audioBuffer The audio buffer to analyze.
 * @param {number} sampleRate The sample rate of the audio.
 * @returns {number} The detected frequency in Hz, or -1 if no clear pitch is found.
 */
function getPitch(audioBuffer, sampleRate) {
  const SAMPLES_TO_ANALYZE = audioBuffer.length;
  const correlationBuffer = new Float32Array(SAMPLES_TO_ANALYZE);

  // 1. Autocorrelation
  for (let tau = 0; tau < SAMPLES_TO_ANALYZE; tau++) {
    let sum = 0;
    for (let i = 0; i < SAMPLES_TO_ANALYZE - tau; i++) {
      sum += audioBuffer[i] * audioBuffer[i + tau];
    }
    correlationBuffer[tau] = sum;
  }

  // 2. Normalized Square Difference Function (NSDF)
  // This is a more robust way to find periodicity than raw autocorrelation.
  let m = new Float32Array(SAMPLES_TO_ANALYZE);
  for (let tau = 0; tau < SAMPLES_TO_ANALYZE; tau++) {
      let acf = 0;
      let divisor = 0;
      for (let i = 0; i < SAMPLES_TO_ANALYZE - tau; i++) {
          acf += audioBuffer[i] * audioBuffer[i + tau];
          divisor += audioBuffer[i] * audioBuffer[i] + audioBuffer[i + tau] * audioBuffer[i + tau];
      }
      m[tau] = 2 * acf / divisor;
  }

  // 3. Find the key maximum in the NSDF. This corresponds to the pitch period.
  let peakIndex = -1;
  let maxVal = -1;
  for (let i = 1; i < m.length; i++) {
    if (m[i] > m[i - 1] && m[i] > m[i + 1] && m[i] > maxVal) {
        maxVal = m[i];
        peakIndex = i;
    }
  }

  // No clear peak found, likely noise or silence.
  if (peakIndex === -1 || maxVal < 0.93) { // Confidence threshold
    return -1;
  }
  
  // 4. Parabolic Interpolation for greater accuracy.
  // This step refines the peak location to get a more precise period.
  const peak = m[peakIndex];
  const prev = m[peakIndex - 1];
  const next = m[peakIndex + 1];
  const refinedIndex = peakIndex + (next - prev) / (2 * (2 * peak - next - prev));
  
  return sampleRate / refinedIndex;
}