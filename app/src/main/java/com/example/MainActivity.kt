package com.example

import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebSettings
import android.webkit.WebView
import android.webkit.WebViewClient
import android.webkit.WebChromeClient
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.activity.viewModels
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.material3.Surface
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.viewinterop.AndroidView
import com.example.data.database.ReelReport
import com.example.ui.theme.MyApplicationTheme
import com.example.viewmodel.AlternativeCandidate
import com.example.viewmodel.ReelViewModel
import com.example.viewmodel.VerificationState
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory

class MainActivity : ComponentActivity() {
    private val viewModel: ReelViewModel by viewModels()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        enableEdgeToEdge()
        setContent {
            MyApplicationTheme {
                Surface(
                    modifier = Modifier.fillMaxSize(),
                    color = Color(0xFF070510)
                ) {
                    AndroidView(
                        factory = { context ->
                            WebView(context).apply {
                                layoutParams = android.view.ViewGroup.LayoutParams(
                                    android.view.ViewGroup.LayoutParams.MATCH_PARENT,
                                    android.view.ViewGroup.LayoutParams.MATCH_PARENT
                                )
                                settings.apply {
                                    javaScriptEnabled = true
                                    domStorageEnabled = true
                                    databaseEnabled = true
                                    allowFileAccess = true
                                    allowContentAccess = true
                                    mixedContentMode = WebSettings.MIXED_CONTENT_COMPATIBILITY_MODE
                                }
                                webViewClient = WebViewClient()
                                webChromeClient = WebChromeClient()
                                addJavascriptInterface(WebInterface(this@MainActivity, viewModel), "ReelTruthAndroid")
                                loadUrl("file:///android_asset/www/index.html")
                            }
                        },
                        modifier = Modifier.fillMaxSize()
                    )
                }
            }
        }
    }
}

class WebInterface(private val activity: MainActivity, private val viewModel: ReelViewModel) {
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

    @JavascriptInterface
    fun startAnalysis(url: String, base64Image: String?) {
        activity.runOnUiThread {
            viewModel.screenshotBase64Override = if (base64Image.isNullOrBlank()) null else base64Image
            viewModel.verifyReel(url)
        }
    }

    @JavascriptInterface
    fun confirmProduct(productName: String, brand: String, modelNumber: String, originalMetadataJson: String, url: String) {
        activity.runOnUiThread {
            try {
                val metadataAdapter = moshi.adapter(VerificationState.MetadataExtracted::class.java)
                val metadata = metadataAdapter.fromJson(originalMetadataJson)
                if (metadata != null) {
                    viewModel.confirmProductAndProceed(productName, brand, modelNumber, metadata, url)
                }
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
    }

    @JavascriptInterface
    fun resetToIdle() {
        activity.runOnUiThread {
            viewModel.resetState()
        }
    }

    @JavascriptInterface
    fun deleteReport(url: String) {
        activity.runOnUiThread {
            viewModel.deleteReport(url)
        }
    }

    @JavascriptInterface
    fun getReportsJson(): String {
        try {
            val listType = com.squareup.moshi.Types.newParameterizedType(List::class.java, ReelReport::class.java)
            val adapter = moshi.adapter<List<ReelReport>>(listType)
            return adapter.toJson(viewModel.cachedReports.value)
        } catch (e: Exception) {
            e.printStackTrace()
            return "[]"
        }
    }

    @JavascriptInterface
    fun getStateJson(): String {
        try {
            val state = viewModel.verificationState.value
            val sb = java.lang.StringBuilder()
            sb.append("{")
            
            // Log strings
            val logsJson = viewModel.systemLogs.value.joinToString(prefix = "[", postfix = "]", separator = ",") { 
                "\"" + it.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", "\\n").replace("\r", "") + "\"" 
            }
            sb.append("\"logs\":").append(logsJson).append(",")

            when (state) {
                is VerificationState.Idle -> {
                    sb.append("\"status\":\"Idle\"")
                }
                is VerificationState.ExtractingMetadata -> {
                    sb.append("\"status\":\"ExtractingMetadata\"")
                }
                is VerificationState.MetadataExtracted -> {
                    sb.append("\"status\":\"MetadataExtracted\",")
                    sb.append("\"caption\":\"").append(escapeJs(state.caption)).append("\",")
                    sb.append("\"thumbnailUrl\":\"").append(escapeJs(state.thumbnailUrl)).append("\",")
                    sb.append("\"influencerName\":\"").append(escapeJs(state.influencerName)).append("\",")
                    sb.append("\"frameOcr\":\"").append(escapeJs(state.frameOcr)).append("\"")
                }
                is VerificationState.DetectingProduct -> {
                    sb.append("\"status\":\"DetectingProduct\"")
                }
                is VerificationState.ProductConfirmation -> {
                    sb.append("\"status\":\"ProductConfirmation\",")
                    sb.append("\"productName\":\"").append(escapeJs(state.productName)).append("\",")
                    sb.append("\"brand\":\"").append(escapeJs(state.brand)).append("\",")
                    sb.append("\"modelNumber\":\"").append(escapeJs(state.modelNumber)).append("\",")
                    sb.append("\"confidenceScore\":").append(state.confidenceScore).append(",")
                    
                    val listType = com.squareup.moshi.Types.newParameterizedType(List::class.java, AlternativeCandidate::class.java)
                    val altJson = moshi.adapter<List<AlternativeCandidate>>(listType).toJson(state.alternatives)
                    sb.append("\"alternatives\":").append(altJson).append(",")
                    
                    val metadataJson = moshi.adapter(VerificationState.MetadataExtracted::class.java).toJson(state.originalMetadata)
                    sb.append("\"originalMetadata\":").append(metadataJson)
                }
                is VerificationState.AnalyzingReviews -> {
                    sb.append("\"status\":\"AnalyzingReviews\"")
                }
                is VerificationState.Completed -> {
                    sb.append("\"status\":\"Completed\",")
                    val reportJson = moshi.adapter(ReelReport::class.java).toJson(state.report)
                    sb.append("\"report\":").append(reportJson).append(",")
                    sb.append("\"pineconeMsg\":\"").append(escapeJs(state.pineconeMsg)).append("\"")
                }
                is VerificationState.Error -> {
                    sb.append("\"status\":\"Error\",")
                    sb.append("\"message\":\"").append(escapeJs(state.message)).append("\"")
                }
            }
            sb.append("}")
            return sb.toString()
        } catch (e: Exception) {
            e.printStackTrace()
            return "{\"status\":\"Error\",\"message\":\"Failed to serialize state\"}"
        }
    }

    private fun escapeJs(s: String?): String {
        if (s == null) return ""
        return s.replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r")
    }
}
