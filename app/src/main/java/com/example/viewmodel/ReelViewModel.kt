package com.example.viewmodel

import android.app.Application
import androidx.lifecycle.AndroidViewModel
import androidx.lifecycle.viewModelScope
import com.example.data.api.GeminiRetrofitClient
import com.example.data.api.YouTubeRetrofitClient
import com.example.data.api.PineconeClient
import com.example.data.api.PineconeResult
import com.example.data.database.AppDatabase
import com.example.data.database.ReelReport
import com.example.data.database.ClaimVerification
import com.example.data.database.AlternativeProduct
import com.example.data.database.ProductDeal
import com.squareup.moshi.Moshi
import com.squareup.moshi.JsonClass
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.SharingStarted
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.stateIn
import kotlinx.coroutines.launch
import java.util.UUID

// State of the verification flow
sealed class VerificationState {
    object Idle : VerificationState()
    object ExtractingMetadata : VerificationState()
    data class MetadataExtracted(
        val caption: String,
        val hashtags: List<String>,
        val frameOcr: String,
        val frameDescriptions: List<String>,
        val thumbnailUrl: String,
        val influencerName: String
    ) : VerificationState()
    object DetectingProduct : VerificationState()
    data class ProductConfirmation(
        val productName: String,
        val brand: String,
        val modelNumber: String,
        val confidenceScore: Int,
        val alternatives: List<AlternativeCandidate>,
        val originalMetadata: MetadataExtracted
    ) : VerificationState()
    object AnalyzingReviews : VerificationState()
    data class Completed(val report: ReelReport, val pineconeMsg: String) : VerificationState()
    data class Error(val message: String) : VerificationState()
}

@JsonClass(generateAdapter = true)
data class ScrapedMetadata(
    val caption: String,
    val hashtags: List<String>,
    val frameOcr: String,
    val frameDescriptions: List<String>,
    val thumbnailUrl: String,
    val influencerName: String
)

@JsonClass(generateAdapter = true)
data class DetectedProductJson(
    val productName: String,
    val brand: String,
    val modelNumber: String,
    val confidenceScore: Int,
    val alternativeMatches: List<AlternativeCandidate>?
)

@JsonClass(generateAdapter = true)
data class AlternativeCandidate(
    val name: String,
    val probability: Int
)

@JsonClass(generateAdapter = true)
data class FullReportJson(
    val detectedProduct: String,
    val brand: String,
    val modelNumber: String?,
    val confidenceScore: Int,
    val reelRealityScore: Int,
    val productTrustScore: Int,
    val influencerName: String,
    val influencerTrustScore: Int,
    val influencerReviewedCount: Int,
    val influencerAccurateCount: Int,
    val strengths: List<String>,
    val weaknesses: List<String>,
    val claims: List<ClaimVerification>,
    val scamAlerts: List<String>,
    val communityScore: Double,
    val amazonRating: Double,
    val redditSentiment: Double,
    val youtubeSentiment: Double,
    val alternatives: List<AlternativeProduct>,
    val deals: List<ProductDeal>
)

class ReelViewModel(application: Application) : AndroidViewModel(application) {
    private val db = AppDatabase.getDatabase(application)
    private val dao = db.reelReportDao()

    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()

    // Expose screenshot base64 override from the JavaScript interface
    var screenshotBase64Override: String? = null

    // Holds current execution states
    val verificationState = MutableStateFlow<VerificationState>(VerificationState.Idle)

    // Log tracking for developer analytics/transparency
    val systemLogs = MutableStateFlow<List<String>>(listOf("System Initialized.", "Ready for assessment."))

    // Read list of all cached verified reports
    val cachedReports: StateFlow<List<ReelReport>> = dao.getAllReports()
        .stateIn(
            scope = viewModelScope,
            started = SharingStarted.WhileSubscribed(5000),
            initialValue = emptyList()
        )

    fun addLog(msg: String) {
        systemLogs.value = systemLogs.value + "[INFO] $msg"
    }

    // Pipeline Trigger
    fun verifyReel(url: String, screenshotUri: String? = null) {
        if (url.isBlank()) {
            verificationState.value = VerificationState.Error("Instagram Reel URL cannot be blank!")
            return
        }

        viewModelScope.launch {
            try {
                addLog("Starting scraper simulation for: $url")
                verificationState.value = VerificationState.ExtractingMetadata

                // 1. Simulate Scraper through Gemini
                var metadata = runScraperSimulation(url)
                if (metadata == null) {
                    if (!screenshotUri.isNullOrBlank()) {
                        addLog("Reel extraction failed. Falling back to Screenshot OCR + Gemini Vision...")
                        metadata = runScreenshotVisionAnalysis(screenshotUri)
                    }
                } else {
                    // Enrich caption or OCR if screenshot is present
                    if (!screenshotUri.isNullOrBlank()) {
                        addLog("Enriched scraped info with Screenshot Visual Analysis...")
                        val screenData = runScreenshotVisionAnalysis(screenshotUri)
                        if (screenData != null) {
                            metadata = metadata.copy(
                                caption = metadata.caption + " | Screenshot Details: " + screenData.caption,
                                frameOcr = metadata.frameOcr + "\n" + screenData.frameOcr,
                                frameDescriptions = metadata.frameDescriptions + screenData.frameDescriptions,
                                influencerName = if (metadata.influencerName == "@TechTalk") screenData.influencerName else metadata.influencerName
                            )
                        }
                    }
                }

                if (metadata == null) {
                    verificationState.value = VerificationState.Error("Failed to extract video content. Provide a valid link or upload a screenshot to try again.")
                    return@launch
                }

                addLog("Successfully extracted captions, hashtags, and frame snapshots.")
                verificationState.value = VerificationState.MetadataExtracted(
                    metadata.caption, metadata.hashtags, metadata.frameOcr, metadata.frameDescriptions, metadata.thumbnailUrl, metadata.influencerName
                )

                // 2. Perform product detection
                verificationState.value = VerificationState.DetectingProduct
                addLog("Analyzing extracted visual layout and caption details through Tesseract simulation...")
                val detectionResult = detectProductFromMetadata(metadata)

                if (detectionResult == null) {
                    verificationState.value = VerificationState.Error("No products detected in layout analysis.")
                    return@launch
                }

                addLog("Detected product: ${detectionResult.productName} by ${detectionResult.brand} (${detectionResult.confidenceScore}% confidence)")

                // 3. Confidence gating (If below 85%, ask for confirmation)
                if (detectionResult.confidenceScore < 85) {
                    addLog("Low confidence (${detectionResult.confidenceScore}%). Halting for User product confirmation.")
                    verificationState.value = VerificationState.ProductConfirmation(
                        productName = detectionResult.productName,
                        brand = detectionResult.brand,
                        modelNumber = detectionResult.modelNumber,
                        confidenceScore = detectionResult.confidenceScore,
                        alternatives = detectionResult.alternativeMatches ?: emptyList(),
                        originalMetadata = VerificationState.MetadataExtracted(
                            metadata.caption, metadata.hashtags, metadata.frameOcr, metadata.frameDescriptions, metadata.thumbnailUrl, metadata.influencerName
                        )
                    )
                } else {
                    // Automate proceeding
                    addLog("High confidence verified. Triggering review analysis...")
                    runFullReviewAssessment(
                        productName = detectionResult.productName,
                        brand = detectionResult.brand,
                        modelNumber = detectionResult.modelNumber,
                        metadata = VerificationState.MetadataExtracted(
                            metadata.caption, metadata.hashtags, metadata.frameOcr, metadata.frameDescriptions, metadata.thumbnailUrl, metadata.influencerName
                        ),
                        url = url
                    )
                }

            } catch (e: Exception) {
                e.printStackTrace()
                verificationState.value = VerificationState.Error("An error occurred: ${e.localizedMessage}")
            }
        }
    }

    // User confirmed product details override or selected an alternative
    fun confirmProductAndProceed(
        productName: String,
        brand: String,
        modelNumber: String,
        metadata: VerificationState.MetadataExtracted,
        url: String
    ) {
        viewModelScope.launch {
            addLog("Product confirmed by user: $productName. Continuing assessment.")
            runFullReviewAssessment(productName, brand, modelNumber, metadata, url)
        }
    }

    private suspend fun runScreenshotVisionAnalysis(screenshotUri: String): ScrapedMetadata? {
        addLog("Converting uploaded screenshot for Gemini Vision OCR payload...")
        val base64 = if (!screenshotBase64Override.isNullOrBlank()) {
            screenshotBase64Override
        } else {
            uriToCompressedBase64(getApplication(), screenshotUri)
        }
        if (base64 == null) {
            addLog("Failed to read action screenshot file. Operating on simulated vision metadata.")
            return null
        }
        
        addLog("Querying Gemini Vision model for OCR, overlay labels, and product visuals...")
        val systemPrompt = """
            You are a fallback OCR and Gemini Vision parser for ReelTruth, a premium influencer evaluation engine.
            Analyze the provided smartphone screenshot.
            Identify text overlay (OCR), product visuals, caption traces, and influencer profiles.
            
            Return a compact, valid, parsable JSON matching this schema:
            {
              "caption": "Reconstructed caption details, including hashtags and promotions visible in the screenshot",
              "hashtags": ["list", "of", "inferred", "tags"],
              "frameOcr": "Text captured or read via OCR from any parts of the image (e.g., subtitles, overlay text, descriptions)",
              "frameDescriptions": ["Visual description of the frame: describe products, colors, logos, and actions visible"],
              "thumbnailUrl": "https://images.unsplash.com/photo-1546868871-7041f2a55e12?auto=format",
              "influencerName": "@DetectedInfluencer"
            }
        """.trimIndent()
        
        val response = GeminiRetrofitClient.callGeminiWithImage(
            systemPrompt = systemPrompt,
            userPrompt = "Analyze this screenshot image and output the product parameters details in exact compliant JSON format.",
            base64Image = base64,
            jsonMode = true
        ) ?: return null
        
        return try {
            val scrubbed = cleanJson(response)
            moshi.adapter(ScrapedMetadata::class.java).fromJson(scrubbed)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun uriToCompressedBase64(context: android.content.Context, uriString: String): String? {
        return try {
            val uri = android.net.Uri.parse(uriString)
            val inputStream = context.contentResolver.openInputStream(uri) ?: return null
            val bitmap = android.graphics.BitmapFactory.decodeStream(inputStream)
            inputStream.close()
            if (bitmap == null) return null
            
            val maxDim = 1024
            val scaledBitmap = if (bitmap.width > maxDim || bitmap.height > maxDim) {
                val ratio = bitmap.width.toFloat() / bitmap.height.toFloat()
                val (w, h) = if (ratio > 1) {
                    Pair(maxDim, (maxDim / ratio).toInt())
                } else {
                    Pair((maxDim * ratio).toInt(), maxDim)
                }
                android.graphics.Bitmap.createScaledBitmap(bitmap, w, h, true)
            } else {
                bitmap
            }
            
            val outputStream = java.io.ByteArrayOutputStream()
            scaledBitmap.compress(android.graphics.Bitmap.CompressFormat.JPEG, 80, outputStream)
            val bytes = outputStream.toByteArray()
            android.util.Base64.encodeToString(bytes, android.util.Base64.NO_WRAP)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private suspend fun runScraperSimulation(url: String): ScrapedMetadata? {
        if (url.contains("fail", ignoreCase = true) || url.contains("error", ignoreCase = true) || url.contains("failed", ignoreCase = true)) {
            addLog("Simulating a reel extraction failure for test URL.")
            return null
        }
        val systemPrompt = """
            You are an advanced Instagram Reel Scraper simulator. 
            Given an Instagram Reel URL, you must simulate scraping and extracting its metadata.
            If the URL or domain suggests a specific product (e.g. boat, realme, portronics, apple, sony, noise, earbuds, keyboard), tailor the extracted metadata specifically to that product.
            Otherwise, randomly choose one of several realistic Indian/Global tech/lifestyle products to simulate (e.g. Boat Airdopes 311, Portronics Conch Theta C, Realme Buds T110, Noise Buds VS104, Sony WH-1000XM5, Xiaomi Pad 6) so the app has variety.

            Return a compact, valid, parsable JSON matching this schema with no markdown codeblocks:
            {
              "caption": "Scraped Insta caption",
              "hashtags": ["list", "of", "tags"],
              "frameOcr": "Text captured via Tesseract OCR from video frames: e.g. text overlayed with product model reviews",
              "frameDescriptions": ["Snap 1 description", "Snap 2 description"],
              "thumbnailUrl": "A realistic unsplash placeholder image URL or illustrative product image URL",
              "influencerName": "@TechTalk"
            }
        """.trimIndent()

        val response = GeminiRetrofitClient.callGemini(
            systemPrompt = systemPrompt,
            userPrompt = "Generate scraped metadata JSON for the Instagram reel: $url",
            jsonMode = true
        ) ?: return null

        return try {
            val scrubbed = cleanJson(response)
            moshi.adapter(ScrapedMetadata::class.java).fromJson(scrubbed)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private suspend fun detectProductFromMetadata(metadata: ScrapedMetadata): DetectedProductJson? {
        val systemPrompt = """
            You are an expert product detection AI engine.
            You will process extracted Instagram Reel metadata (OCR text, Caption, Hashtags, and Scene descriptions).
            Identify the primary product being promoted in the video.

            Return a valid, parsable JSON matching this schema:
            {
              "productName": "Detected Product Name",
              "brand": "Detected Brand Name",
              "modelNumber": "Detected Model Number",
              "confidenceScore": 92,
              "alternativeMatches": [
                {"name": "Alternative Match Product 1", "probability": 5},
                {"name": "Alternative Match Product 2", "probability": 3}
              ]
            }
            Note: confidenceScore must be an integer (0 to 100). If you are fairly certain, give > 85. If you are uncertain or the OCR is messy, give < 85 (e.g., 75) so the user gets prompted to confirm it!
        """.trimIndent()

        val prompt = "Caption: ${metadata.caption}\nHashtags: ${metadata.hashtags}\nOCR Text: ${metadata.frameOcr}\nScene: ${metadata.frameDescriptions.joinToString("; ")}"

        val response = GeminiRetrofitClient.callGemini(
            systemPrompt = systemPrompt,
            userPrompt = prompt,
            jsonMode = true
        ) ?: return null

        return try {
            val scrubbed = cleanJson(response)
            moshi.adapter(DetectedProductJson::class.java).fromJson(scrubbed)
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private suspend fun runFullReviewAssessment(
        productName: String,
        brand: String,
        modelNumber: String?,
        metadata: VerificationState.MetadataExtracted,
        url: String
    ) {
        try {
            verificationState.value = VerificationState.AnalyzingReviews
            addLog("Fetching YouTube video reviews for: $brand $productName...")

            // Run real search query
            val ytVideos = YouTubeRetrofitClient.searchReviews(productName, brand)
            addLog("Found ${ytVideos.size} relevant product videos on YouTube.")

            val youtubeContextText = if (ytVideos.isNotEmpty()) {
                ytVideos.joinToString("\n\n") {
                    "Video Title: ${it.snippet?.title}\nDescription: ${it.snippet?.description}\nChannel: ${it.snippet?.channelTitle}"
                }
            } else {
                "No videos found. Use typical online reviews from websites."
            }

            addLog("Compiling and generating detailed Trust Report & Reality scoring via Gemini API...")

            val systemPrompt = """
                You are an expert review aggregator, AI trust evaluator, and fact checker.
                Create an extensive trust evaluation for the product '$productName' by brand '$brand' based on reviews.
                
                Compare influencer statements from:
                Caption: ${metadata.caption}
                Frame OCR Claim text: ${metadata.frameOcr}

                Against YouTube Real Community feedback:
                $youtubeContextText

                Evaluate:
                1. Product Trust Score (0-100) based on review sentiment.
                2. Reel Reality Score (0-100) based on how matching the influencer claims are with real user reports.
                3. Strengths and Weaknesses of the product (3-5 items each).
                4. AI Fact Check: Match typical claims (e.g. '100% waterproof', 'Best ANC') against user reviews. Mark any misleading elements.
                5. Scam Alert System: Unearth issues like fake ratings, high return rates, suspicious pricing, or misleading warranties.
                6. Community Verdict: Amazon rating, Reddit sentiment, YouTube sentiment (all on a 5.0 scale), and calculate an overall community score.
                7. Influencer Trust Score: Check the influencer's credibility of this reel.
                8. Alternative Recommendations: 2 better alternatives.
                9. Store Price Comparison: Realistic listings for stores (Amazon, Flipkart, AJIO, Croma, etc.) including price in INR and direct links. Mark exactly one cheapest.

                Return a valid, parsable JSON matching this schema:
                {
                  "detectedProduct": "$productName",
                  "brand": "$brand",
                  "modelNumber": "${modelNumber ?: ""}",
                  "confidenceScore": 95,
                  "reelRealityScore": 58,
                  "productTrustScore": 82,
                  "influencerName": "${metadata.influencerName}",
                  "influencerTrustScore": 76,
                  "influencerReviewedCount": 50,
                  "influencerAccurateCount": 38,
                  "strengths": ["string", "string"],
                  "weaknesses": ["string", "string"],
                  "claims": [
                    {"claim": "Claim text", "reality": "Real experience feedback", "isMisleading": true}
                  ],
                  "scamAlerts": ["Alert 1", "Alert 2"],
                  "communityScore": 4.1,
                  "amazonRating": 4.2,
                  "redditSentiment": 3.6,
                  "youtubeSentiment": 3.9,
                  "alternatives": [
                    {"name": "Alternative Name", "score": 88, "price": "₹1,299"}
                  ],
                  "deals": [
                    {"store": "Amazon", "price": "₹999", "url": "https://amazon.in", "isCheapest": true},
                    {"store": "Flipkart", "price": "₹1,099", "url": "https://flipkart.com", "isCheapest": false}
                  ]
                }
            """.trimIndent()

            val reportResponse = GeminiRetrofitClient.callGemini(
                systemPrompt = systemPrompt,
                userPrompt = "Generate detailed evaluation report for the product",
                jsonMode = true
            )

            if (reportResponse == null) {
                verificationState.value = VerificationState.Error("Failed to compile trust evaluation.")
                return
            }

            val scrubbedReport = cleanJson(reportResponse)
            val parsedReport = moshi.adapter(FullReportJson::class.java).fromJson(scrubbedReport)

            if (parsedReport == null) {
                verificationState.value = VerificationState.Error("Format mismatch in review parsing.")
                return
            }

            // Create Room database model
            val finalReport = ReelReport(
                id = url, // Use URL as the unique report ID
                reelUrl = url,
                detectedProduct = parsedReport.detectedProduct,
                brand = parsedReport.brand,
                model = parsedReport.modelNumber ?: "",
                confidenceScore = parsedReport.confidenceScore,
                reelRealityScore = parsedReport.reelRealityScore,
                productTrustScore = parsedReport.productTrustScore,
                influencerName = parsedReport.influencerName.ifEmpty { metadata.influencerName },
                influencerTrustScore = parsedReport.influencerTrustScore,
                influencerReviewedCount = parsedReport.influencerReviewedCount,
                influencerAccurateCount = parsedReport.influencerAccurateCount,
                strengths = parsedReport.strengths,
                weaknesses = parsedReport.weaknesses,
                claims = parsedReport.claims,
                scamAlerts = parsedReport.scamAlerts,
                communityScore = parsedReport.communityScore,
                amazonRating = parsedReport.amazonRating,
                redditSentiment = parsedReport.redditSentiment,
                youtubeSentiment = parsedReport.youtubeSentiment,
                alternatives = parsedReport.alternatives,
                deals = parsedReport.deals,
                timestamp = System.currentTimeMillis()
            )

            // Step 4: Bypass Pinecone Vector Database per requirements
            addLog("Bypassing Pinecone Vector Database (Local-Only analysis enabled)...")
            var pineconeMsg = "Offline-Local Cache Saved"
            try {
                // Return immediate skipped result or handle safely
                val pineconeResult = PineconeClient.storeAnalysisInPinecone(
                    reportId = java.util.UUID.randomUUID().toString(),
                    textToEmbed = "Product: ${finalReport.brand} ${finalReport.detectedProduct}.",
                    metadata = emptyMap()
                )
                if (pineconeResult is PineconeResult.Skipped) {
                    addLog("Pinecone Sync: Skipped (Local-Only Mode Active)")
                }
            } catch (t: Throwable) {
                // Log warning only, never block pipeline or show "Pipeline Interrupted"
                android.util.Log.w("ReelViewModel", "Pinecone warning: Vector database bypass", t)
                addLog("Pinecone Bypass: Processing locally...")
            }

            // Step 5: Save in Room local cache database
            dao.insertReport(finalReport)
            addLog("Report successfully written to Room storage cache model.")

            // Complete!
            verificationState.value = VerificationState.Completed(finalReport, pineconeMsg)
            addLog("Pipeline completed successfully! Dashboard rendered.")

        } catch (e: Exception) {
            e.printStackTrace()
            verificationState.value = VerificationState.Error("Failed assessing reviews: ${e.localizedMessage}")
        }
    }

    fun resetState() {
        verificationState.value = VerificationState.Idle
    }

    fun deleteReport(url: String) {
        viewModelScope.launch {
            dao.deleteReportById(url)
            addLog("Removed report for: $url")
        }
    }

    private fun cleanJson(json: String): String {
        var raw = json.trim()
        if (raw.startsWith("```json")) {
            raw = raw.removePrefix("```json")
        }
        if (raw.startsWith("```")) {
            raw = raw.removePrefix("```")
        }
        if (raw.endsWith("```")) {
            raw = raw.removeSuffix("```")
        }
        return raw.trim()
    }
}
