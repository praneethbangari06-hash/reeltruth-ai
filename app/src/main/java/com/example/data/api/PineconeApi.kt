package com.example.data.api

import com.example.BuildConfig
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.OkHttpClient
import okhttp3.Request
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.IOException
import java.util.concurrent.TimeUnit

@JsonClass(generateAdapter = true)
data class PineconeVector(
    val id: String,
    val values: List<Float>,
    val metadata: Map<String, String>? = null
)

@JsonClass(generateAdapter = true)
data class PineconeUpsertRequest(
    val vectors: List<PineconeVector>,
    val namespace: String? = "reeltruth"
)

object PineconeClient {
    private val moshi = Moshi.Builder().add(KotlinJsonAdapterFactory()).build()
    private val client = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    suspend fun storeAnalysisInPinecone(
        reportId: String,
        textToEmbed: String,
        metadata: Map<String, String>
    ): PineconeResult {
        // Pinecone integration has been removed/disabled per project requirements.
        // Returning Skipped so that processing is 100% local only.
        return PineconeResult.Skipped("Vector DB disabled. Analysis is processed locally using Gemini + YouTube.")
    }

    private fun getGeminiTextEmbedding(text: String, apiKey: String): List<Float>? {
        // Standard embedding call
        val url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-2-preview:embedContent?key=$apiKey"
        
        val jsonPayload = """
            {
              "content": {
                "parts": [
                  {
                    "text": ${Moshi.Builder().build().adapter(String::class.java).toJson(text)}
                  }
                ]
              }
            }
        """.trimIndent()
        
        val body = jsonPayload.toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url(url)
            .post(body)
            .build()

        return try {
            client.newCall(request).execute().use { response ->
                if (response.isSuccessful) {
                    val responseBody = response.body?.string() ?: return null
                    parseEmbeddingFromResponse(responseBody)
                } else {
                    null
                }
            }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }

    private fun parseEmbeddingFromResponse(jsonResponse: String): List<Float>? {
        return try {
            val element = moshi.adapter(Map::class.java).fromJson(jsonResponse) as? Map<*, *>
            val embedding = element?.get("embedding") as? Map<*, *>
            val values = embedding?.get("values") as? List<*>
            values?.map { (it as Number).toFloat() }
        } catch (e: Exception) {
            e.printStackTrace()
            null
        }
    }
}

sealed class PineconeResult {
    data class Success(val message: String) : PineconeResult()
    data class Error(val error: String) : PineconeResult()
    data class Skipped(val reason: String) : PineconeResult()
}
