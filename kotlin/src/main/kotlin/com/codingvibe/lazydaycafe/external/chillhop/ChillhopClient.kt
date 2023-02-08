package com.codingvibe.lazydaycafe.external.chillhop

import com.fasterxml.jackson.annotation.JsonAlias
import retrofit2.Response
import retrofit2.http.POST
import retrofit2.http.Path
import java.time.Instant

interface ChillhopClient {
    @POST("radio/api/playlist/{playlistId}")
    suspend fun getCurrentPlaylistTracks(@Path("playlistId") playlistId: String): List<ChillhopTrack>?
}

data class ChillhopTrack (
    val img: String,
    val title: String,
    val artists: String,
    val featured: String?,
    val likes: String,
    val releaseTime: Instant,
    val releaseDateText: String,
    val fileID: String,
    val startTime: Instant,
    @JsonAlias("date_to")
    val dateTo: Instant,
    val duration: Double,
    @JsonAlias("track_id")
    val trackId: String,
    val isrc: String,
    val label: String
)