package com.codingvibe.lazydaycafe.external.icecast

import com.fasterxml.jackson.annotation.JsonAlias
import com.fasterxml.jackson.annotation.JsonFormat
import retrofit2.http.GET
import java.time.Instant

interface StatusJsonStatsClient : StatsClient {
    @GET("status-json.xsl")
    override suspend fun getStats(): StatusJsonStatsResponse
}

data class StatusJsonStatsResponse (
    @JsonAlias("icestats")
    val iceStats: IcecastStats
)

data class IcecastStats (
    val admin: String,
    val host: String,
    val location: String,
    @JsonAlias("server_id")
    val serverId: String,
    @JsonAlias("server_start_iso8601")
    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd'T'HH:mm:ssZ", timezone = "UTC")
    val serverStart: Instant,
    val source: IcecastSource?
)

data class IcecastSource (
    @JsonAlias("audio_info")
    val audioInfo: String,
    val channels: Long,
    val genre: String,
    @JsonAlias("listeners_peak")
    val listenersPeak: Long,
    val listeners: Long,
    @JsonAlias("listenurl")
    val listenUrl: String,
    @JsonAlias("samplerate")
    val sampleRate: Long,
    val title: String?
)