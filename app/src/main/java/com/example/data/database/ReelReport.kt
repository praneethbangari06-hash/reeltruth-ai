package com.example.data.database

import androidx.room.Entity
import androidx.room.PrimaryKey
import androidx.room.TypeConverter
import com.squareup.moshi.Moshi
import com.squareup.moshi.Types

@Entity(tableName = "reel_reports")
data class ReelReport(
    @PrimaryKey val id: String, // reelUrl as primary key or uuid
    val reelUrl: String,
    val detectedProduct: String,
    val brand: String,
    val model: String,
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
    val deals: List<ProductDeal>,
    val timestamp: Long = System.currentTimeMillis()
)

data class ClaimVerification(
    val claim: String,
    val reality: String,
    val isMisleading: Boolean
)

data class AlternativeProduct(
    val name: String,
    val score: Int,
    val price: String
)

data class ProductDeal(
    val store: String,
    val price: String,
    val url: String,
    val isCheapest: Boolean
)

class DatabaseConverters {
    private val moshi = Moshi.Builder().build()

    @TypeConverter
    fun fromStringList(value: List<String>?): String? {
        val type = Types.newParameterizedType(List::class.java, String::class.java)
        return moshi.adapter<List<String>>(type).toJson(value ?: emptyList())
    }

    @TypeConverter
    fun toStringList(value: String?): List<String>? {
        val type = Types.newParameterizedType(List::class.java, String::class.java)
        return value?.let { moshi.adapter<List<String>>(type).fromJson(it) } ?: emptyList()
    }

    @TypeConverter
    fun fromClaimList(value: List<ClaimVerification>?): String? {
        val type = Types.newParameterizedType(List::class.java, ClaimVerification::class.java)
        return moshi.adapter<List<ClaimVerification>>(type).toJson(value ?: emptyList())
    }

    @TypeConverter
    fun toClaimList(value: String?): List<ClaimVerification>? {
        val type = Types.newParameterizedType(List::class.java, ClaimVerification::class.java)
        return value?.let { moshi.adapter<List<ClaimVerification>>(type).fromJson(it) } ?: emptyList()
    }

    @TypeConverter
    fun fromAlternativeList(value: List<AlternativeProduct>?): String? {
        val type = Types.newParameterizedType(List::class.java, AlternativeProduct::class.java)
        return moshi.adapter<List<AlternativeProduct>>(type).toJson(value ?: emptyList())
    }

    @TypeConverter
    fun toAlternativeList(value: String?): List<AlternativeProduct>? {
        val type = Types.newParameterizedType(List::class.java, AlternativeProduct::class.java)
        return value?.let { moshi.adapter<List<AlternativeProduct>>(type).fromJson(it) } ?: emptyList()
    }

    @TypeConverter
    fun fromDealList(value: List<ProductDeal>?): String? {
        val type = Types.newParameterizedType(List::class.java, ProductDeal::class.java)
        return moshi.adapter<List<ProductDeal>>(type).toJson(value ?: emptyList())
    }

    @TypeConverter
    fun toDealList(value: String?): List<ProductDeal>? {
        val type = Types.newParameterizedType(List::class.java, ProductDeal::class.java)
        return value?.let { moshi.adapter<List<ProductDeal>>(type).fromJson(it) } ?: emptyList()
    }
}
