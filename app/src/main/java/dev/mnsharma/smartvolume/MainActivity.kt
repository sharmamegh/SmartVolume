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
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.compose.setContent
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.Image
import androidx.compose.foundation.isSystemInDarkTheme
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.navigationBarsPadding
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.verticalScroll
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.LinearProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Slider
import androidx.compose.material3.SliderDefaults
import androidx.compose.material3.Surface
import androidx.compose.material3.Text
import androidx.compose.runtime.Composable
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableDoubleStateOf
import androidx.compose.runtime.mutableIntStateOf
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.res.painterResource
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.tooling.preview.Preview
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.core.app.ActivityCompat
import androidx.core.content.edit
import dev.mnsharma.smartvolume.ui.theme.SmartVolumeTheme
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlin.math.log10
import kotlin.math.sqrt

// -------------------- SharedPreferences Helpers --------------------
private const val PREFS_NAME = "SmartVolumePrefs"
private const val KEY_AMBIENT_LOGS = "ambient_noise_logs"

fun loadAmbientNoiseLogs(context: Context): MutableList<Double> {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val logsString = prefs.getString(KEY_AMBIENT_LOGS, "") ?: ""
    return if (logsString.isEmpty()) {
        mutableListOf()
    } else {
        logsString.split(",").mapNotNull { it.toDoubleOrNull() }.toMutableList()
    }
}

fun saveAmbientNoiseLogs(context: Context, logs: List<Double>) {
    val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
    val logsString = logs.joinToString(separator = ",")
    prefs.edit { putString(KEY_AMBIENT_LOGS, logsString) }
}

// -------------------- Volume Determination --------------------
fun determineVolumeLevel(context: Context, decibels: Double): Int {
    val ambientNoiseLogs = loadAmbientNoiseLogs(context)
    ambientNoiseLogs.add(decibels)
    saveAmbientNoiseLogs(context, ambientNoiseLogs)
    val defaultDMin = -40.0
    val defaultDMax = -20.0
    val dBMin = if (ambientNoiseLogs.size >= 10) ambientNoiseLogs.minOrNull() ?: defaultDMin else defaultDMin
    val dBMax = if (ambientNoiseLogs.size >= 10) ambientNoiseLogs.maxOrNull() ?: defaultDMax else defaultDMax
    val minVolume = 20
    val maxVolume = 100
    val effectiveDBMax = if (dBMax == dBMin) dBMin + 1 else dBMax
    val normalized = (decibels - dBMin) / (effectiveDBMax - dBMin)
    val volume = normalized * (maxVolume - minVolume) + minVolume
    return volume.coerceIn(minVolume.toDouble(), maxVolume.toDouble()).toInt()
}

// -------------------- Audio Analysis --------------------
fun calculateDecibels(buffer: ShortArray): Double {
    var sum = 0.0
    for (sample in buffer) {
        sum += sample * sample
    }
    val rms = sqrt(sum / buffer.size)
    return 20 * log10(rms / Short.MAX_VALUE.toDouble())
}

fun setDeviceVolume(audioManager: AudioManager, volumePercent: Int) {
    val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_MUSIC)
    val newVolume = (volumePercent / 100.0 * maxVolume).toInt()
    audioManager.setStreamVolume(AudioManager.STREAM_MUSIC, newVolume, 0)
}

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

// -------------------- Main Activity --------------------
class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            SmartVolumeTheme {
                SmartVolumeApp(this)
            }
        }
    }
}

// -------------------- App Header --------------------
@Composable
fun AppFooter() {
    Box(
        modifier = Modifier
            .fillMaxWidth()
            .navigationBarsPadding()
            .padding(8.dp),
        contentAlignment = Alignment.BottomCenter
    ) {
        Row(
            modifier = Modifier.fillMaxWidth(),
            horizontalArrangement = Arrangement.Center,
            verticalAlignment = Alignment.CenterVertically
        ) {
            Image(
                painter = painterResource(id = R.drawable.ic_launcher_foreground),
                contentDescription = "Smart Volume Logo",
                modifier = Modifier
                    .size(48.dp)
                    .clip(RoundedCornerShape(128.dp))
            )
            Spacer(modifier = Modifier.width(8.dp))
            Text(
                text = "Smart Volume",
                style = MaterialTheme.typography.bodyMedium.copy(
                    fontSize = 16.sp,
                    fontWeight = FontWeight.Bold
                )
            )
        }
    }
}

// -------------------- UI (Jetpack Compose) --------------------
@Composable
fun SmartVolumeApp(context: Context) {
    val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager
    var noiseLevel by rememberSaveable { mutableDoubleStateOf(0.0) }
    var suggestedVolume by rememberSaveable { mutableIntStateOf(50) }
    var userVolume by rememberSaveable { mutableIntStateOf(50) }
    var recordingDuration by rememberSaveable { mutableIntStateOf(10) }
    var isAnalyzing by rememberSaveable { mutableStateOf(false) }
    val coroutineScope = rememberCoroutineScope()

    // Dark mode: if dark, use bright yellow for controls; otherwise, default primary.
    val darkTheme = isSystemInDarkTheme()
    val controlColor = if (darkTheme) Color(0xFFFFD700) else MaterialTheme.colorScheme.primary

    val requestPermissionLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.RequestPermission()
    ) { isGranted ->
        if (isGranted) {
            coroutineScope.launch {
                isAnalyzing = true
                try {
                    val decibels = analyzeNoise(context, recordingDuration)
                    noiseLevel = decibels
                    suggestedVolume = determineVolumeLevel(context, decibels)
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

    Surface(
        modifier = Modifier.fillMaxSize(),
        color = MaterialTheme.colorScheme.background
    ) {
        Scaffold(
            bottomBar = { AppFooter() }
        ) { innerPadding ->
            Column(
                modifier = Modifier
                    .padding(innerPadding)
                    .padding(16.dp)
                    .fillMaxWidth()
                    .verticalScroll(rememberScrollState()),
                verticalArrangement = Arrangement.spacedBy(16.dp),
                horizontalAlignment = Alignment.CenterHorizontally
            ) {
                Text(
                    text = "Ambient Noise: ${"%.1f".format(noiseLevel)} dB",
                    style = MaterialTheme.typography.headlineLarge
                )
                Text("Suggested Volume: $suggestedVolume%")

                if (isAnalyzing) {
                    LinearProgressIndicator(
                        modifier = Modifier.fillMaxWidth(),
                        color = controlColor
                    )
                }

                Slider(
                    value = userVolume.toFloat(),
                    onValueChange = { userVolume = it.toInt() },
                    valueRange = 0f..100f,
                    modifier = Modifier.fillMaxWidth(),
                    colors = SliderDefaults.colors(
                        thumbColor = controlColor,
                        activeTrackColor = controlColor
                    )
                )

                Text("Recording Duration: $recordingDuration seconds")
                Slider(
                    value = recordingDuration.toFloat(),
                    onValueChange = { recordingDuration = it.toInt() },
                    valueRange = 1f..30f,
                    modifier = Modifier.fillMaxWidth(),
                    colors = SliderDefaults.colors(
                        thumbColor = controlColor,
                        activeTrackColor = controlColor
                    )
                )

                Button(
                    onClick = {
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
                                    suggestedVolume = determineVolumeLevel(context, decibels)
                                    userVolume = suggestedVolume
                                } catch (e: SecurityException) {
                                    Toast.makeText(
                                        context,
                                        "Permission error: ${e.message}",
                                        Toast.LENGTH_SHORT
                                    ).show()
                                } finally {
                                    isAnalyzing = false
                                }
                            }
                        } else {
                            requestPermissionLauncher.launch(Manifest.permission.RECORD_AUDIO)
                        }
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = controlColor)
                ) {
                    Text(
                        "Analyze Noise",
                        color = if (isSystemInDarkTheme()) Color.Black else Color.White
                    )
                }

                Button(
                    onClick = {
                        setDeviceVolume(audioManager, userVolume)
                        Toast.makeText(
                            context,
                            "Volume set to $userVolume%",
                            Toast.LENGTH_SHORT
                        ).show()
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = controlColor)
                ) {
                    Text(
                        "Confirm Volume",
                        color = if (isSystemInDarkTheme()) Color.Black else Color.White
                    )
                }

                Button(
                    onClick = {
                        noiseLevel = 0.0
                        suggestedVolume = 50
                        userVolume = 50
                    },
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = controlColor)
                ) {
                    Text(
                        "Reset",
                        color = if (isSystemInDarkTheme()) Color.Black else Color.White
                    )
                }
            }
        }
    }
}

@Preview(showBackground = true)
@Composable
fun SmartVolumeAppPreview() {
    SmartVolumeTheme {
        SmartVolumeApp(LocalContext.current)
    }
}
