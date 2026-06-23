package com.example.data.api

import com.example.BuildConfig
import com.squareup.moshi.JsonClass
import com.squareup.moshi.Moshi
import com.squareup.moshi.kotlin.reflect.KotlinJsonAdapterFactory
import okhttp3.OkHttpClient
import retrofit2.Retrofit
import retrofit2.converter.moshi.MoshiConverterFactory
import retrofit2.http.GET
import retrofit2.http.Query
import java.util.concurrent.TimeUnit

// --- YouTube Request / Response Data Classes ---

@JsonClass(generateAdapter = true)
data class YouTubeSearchResponse(
    val items: List<YouTubeSearchResultItem>?
)

@JsonClass(generateAdapter = true)
data class YouTubeSearchResultItem(
    val id: YouTubeResourceId?,
    val snippet: YouTubeSearchSnippet?
)

@JsonClass(generateAdapter = true)
data class YouTubeResourceId(
    val videoId: String?
)

@JsonClass(generateAdapter = true)
data class YouTubeSearchSnippet(
    val title: String,
    val description: String,
    val channelTitle: String,
    val thumbnails: YouTubeThumbnails?
)

@JsonClass(generateAdapter = true)
data class YouTubeThumbnails(
    val medium: YouTubeThumbnailItem?
)

@JsonClass(generateAdapter = true)
data class YouTubeThumbnailItem(
    val url: String
)

// --- Retrofit Interface ---

interface YouTubeApiService {
    @GET("youtube/v3/search")
    suspend fun searchVideos(
        @Query("part") part: String = "snippet",
        @Query("q") query: String,
        @Query("maxResults") maxResults: Int = 6,
        @Query("type") type: String = "video",
        @Query("key") apiKey: String
    ): YouTubeSearchResponse
}

object YouTubeRetrofitClient {
    private const val BASE_URL = "https://www.googleapis.com/"

    private val moshi: Moshi = Moshi.Builder()
        .add(KotlinJsonAdapterFactory())
        .build()

    private val okHttpClient = OkHttpClient.Builder()
        .connectTimeout(15, TimeUnit.SECONDS)
        .readTimeout(15, TimeUnit.SECONDS)
        .build()

    val service: YouTubeApiService by lazy {
        Retrofit.Builder()
            .baseUrl(BASE_URL)
            .client(okHttpClient)
            .addConverterFactory(MoshiConverterFactory.create(moshi))
            .build()
            .create(YouTubeApiService::class.java)
    }

    suspend fun searchReviews(productName: String, brand: String): List<YouTubeSearchResultItem> {
        val apiKey = BuildConfig.YOUTUBE_API_KEY
        if (apiKey.isEmpty() || apiKey == "MY_YOUTUBE_API_KEY") {
            return emptyList()
        }

        val query = "$brand $productName review"
        return try {
            val response = service.searchVideos(query = query, apiKey = apiKey)
            response.items ?: emptyList()
        } catch (e: Exception) {
            e.printStackTrace()
            emptyList()
        }
    }
}
