package com.example.data.database

import android.content.Context
import androidx.room.*
import kotlinx.coroutines.flow.Flow

@Dao
interface ReelReportDao {
    @Query("SELECT * FROM reel_reports ORDER BY timestamp DESC")
    fun getAllReports(): Flow<List<ReelReport>>

    @Query("SELECT * FROM reel_reports WHERE id = :id")
    suspend fun getReportById(id: String): ReelReport?

    @Insert(onConflict = OnConflictStrategy.REPLACE)
    suspend fun insertReport(report: ReelReport)

    @Query("DELETE FROM reel_reports WHERE id = :id")
    suspend fun deleteReportById(id: String)

    @Query("DELETE FROM reel_reports")
    suspend fun clearAll()
}

@Database(entities = [ReelReport::class], version = 1, exportSchema = false)
@TypeConverters(DatabaseConverters::class)
abstract class AppDatabase : RoomDatabase() {
    abstract fun reelReportDao(): ReelReportDao

    companion object {
        @Volatile
        private var INSTANCE: AppDatabase? = null

        fun getDatabase(context: Context): AppDatabase {
            return INSTANCE ?: synchronized(this) {
                val instance = Room.databaseBuilder(
                    context.applicationContext,
                    AppDatabase::class.java,
                    "reeltruth_database"
                )
                .fallbackToDestructiveMigration()
                .build()
                INSTANCE = instance
                instance
            }
        }
    }
}
