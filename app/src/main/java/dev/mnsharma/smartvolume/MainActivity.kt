package dev.mnsharma.smartvolume

import android.Manifest
import android.content.Context
import android.content.pm.PackageManager
import android.media.AudioFormat
import android.media.AudioManager
import android.media.AudioRecord
import android.media.MediaRecorder
import android.os.Bundle
import android.widget.Toast
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.padding
import androidx.compose.material3.Button
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.Text
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.Composable
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.getValue
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.core.app.ActivityCompat
import androidx.compose.runtime.rememberCoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.log10
import kotlin.math.sqrt

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SmartVolumeApp(this)
        }
    }
}

@Composable
fun SmartVolumeApp(context: Context) {
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    var noiseLevel by remember { mutableDoubleStateOf(0.0) }
    var suggestedVolume by remember { mutableIntStateOf(50) }
    var userVolume by remember { mutableIntStateOf(50) }
    var recordingDuration by remember { mutableIntStateOf(10) } // default: 10 seconds
    var isAnalyzing by remember { mutableStateOf(false) }

    val coroutineScope = rememberCoroutineScope()

    // Permission launcher to request RECORD_AUDIO permission
    val requestPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            coroutineScope.launch {
                isAnalyzing = true
                try {
                    val decibels = analyzeNoise(context, recordingDuration)
                    noiseLevel = decibels
                    suggestedVolume = determineVolumeLevel(decibels)
                    userVolume = suggestedVolume
                } catch (e: SecurityException) {
                    Toast.makeText(context, "Permission error: ${e.message}", Toast.LENGTH_SHORT).show()
                } finally {
                    isAnalyzing = false
                }
            }
        } else {
            Toast.makeText(context, "Permission denied!", Toast.LENGTH_SHORT).show()
        }
    }

    Scaffold { innerPadding ->
        Column(
            modifier = Modifier
                .padding(innerPadding)
                .padding(16.dp)
                .fillMaxWidth(),
            verticalArrangement = Arrangement.spacedBy(16.dp),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Text(
                text = "Ambient Noise: ${"%.1f".format(noiseLevel)} dB",
                style = MaterialTheme.typography.headlineLarge
            )
            Text("Suggested Volume: $suggestedVolume%")

            // Show progress bar during analysis
            if (isAnalyzing) {
                LinearProgressIndicator(modifier = Modifier.fillMaxWidth())
            }

            // Slider for user to adjust volume
            Slider(
                value = userVolume.toFloat(),
                onValueChange = { userVolume = it.toInt() },
                valueRange = 0f..100f,
                modifier = Modifier.fillMaxWidth()
            )

            // Slider for selecting recording duration (in seconds)
            Text("Recording Duration: $recordingDuration seconds")
            Slider(
                value = recordingDuration.toFloat(),
                onValueChange = { recordingDuration = it.toInt() },
                valueRange = 1f..30f,
                modifier = Modifier.fillMaxWidth()
            )

            Button(
                onClick = {
                    // Check for permission; if granted, analyze noise; else, request permission
                    if (ActivityCompat.checkSelfPermission(
                            context,
                            Manifest.permission.RECORD_AUDIO
                        ) == PackageManager.PERMISSION_GRANTED
                    ) {
                        coroutineScope.launch {
                            isAnalyzing = true
                            try {
                                val decibels = analyzeNoise(context, recordingDuration)
                                noiseLevel = decibels
                                suggestedVolume = determineVolumeLevel(decibels)
                                userVolume = suggestedVolume
                            } catch (e: SecurityException) {
                                Toast.makeText(context, "Permission error: ${e.message}", Toast.LENGTH_SHORT).show()
                            } finally {
                                isAnalyzing = false
                            }
                        }
                    } else {
                        requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                    }
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Analyze Noise")
            }

            Button(
                onClick = {
                    setDeviceVolume(audioManager, userVolume)
                    Toast.makeText(context, "Volume set to $userVolume%", Toast.LENGTH_SHORT).show()
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Confirm Volume")
            }

            // Reset button to allow re-analysis or clear previous results
            Button(
                onClick = {
                    noiseLevel = 0.0
                    suggestedVolume = 50
                    userVolume = 50
                },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text("Reset")
            }
        }
    }
}

/**
 * Records audio continuously for the specified duration (in seconds) and returns the calculated decibels.
 * The microphone is stopped and released immediately after recording.
 */
suspend fun analyzeNoise(context: Context, durationInSeconds: Int): Double = withContext(Dispatchers.IO) {
    if (ActivityCompat.checkSelfPermission(context, Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
        throw SecurityException("Record audio permission not granted")
    }
    val sampleRate = 44100
    val bufferSize = AudioRecord.getMinBufferSize(
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT
    )
    val audioRecord = AudioRecord(
        MediaRecorder.AudioSource.MIC,
        sampleRate,
        AudioFormat.CHANNEL_IN_MONO,
        AudioFormat.ENCODING_PCM_16BIT,
        bufferSize
    )
    val samples = mutableListOf<Short>()
    audioRecord.startRecording()
    val startTime = System.currentTimeMillis()
    val durationMillis = durationInSeconds * 1000L
    while (System.currentTimeMillis() - startTime < durationMillis) {
        val buffer = ShortArray(bufferSize)
        val readCount = audioRecord.read(buffer, 0, buffer.size)
        if (readCount > 0) {
            samples.addAll(buffer.take(readCount))
        }
    }
    audioRecord.stop()
    audioRecord.release()
    calculateDecibels(samples.toShortArray())
}

/** Computes decibels from the recorded audio samples. */
fun calculateDecibels(buffer: ShortArray): Double {
    var sum = 0.0
    for (sample in buffer) {
        sum += sample * sample
    }
    val rms = sqrt(sum / buffer.size)
    return 20 * log10(rms / Short.MAX_VALUE.toDouble())
}

/** Determines a suggested volume percentage based on the decibel level. */
fun determineVolumeLevel(decibels: Double): Int {
    // Define the expected ambient noise range (in dB)
    // Here, -40 dB represents very quiet, while -30 dB represents loud conditions.
    val dBMin = -40.0
    val dBMax = -30.0

    // Define the corresponding volume range (in percent)
    val minVolume = 20
    val maxVolume = 100

    // Normalize the measured dB value to a 0-1 scale.
    // For example, if decibels == -40, then normalized value is 0.
    // If decibels == -30, then normalized value is 1.
    val normalized = (decibels - dBMin) / (dBMax - dBMin)

    // Scale the normalized value to the desired volume range.
    // For a normalized value of 0, we get minVolume; for 1, we get maxVolume.
    val volume = normalized * (maxVolume - minVolume) + minVolume

    // Clamp the volume value to ensure it lies between minVolume and maxVolume.
    return volume.coerceIn(minVolume.toDouble(), maxVolume.toDouble()).toInt()
}

/** Sets the device volume based on the given percentage. */
fun setDeviceVolume(audioManager: AudioManager, volumePercent: Int) {
    val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    val newVolume = (volumePercent / 100.0 * maxVolume).toInt()
    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, newVolume, 0)
}

@Preview(showBackground = true)
@Composable
fun SmartVolumeAppPreview() {
    SmartVolumeApp(LocalContext.current)
}
