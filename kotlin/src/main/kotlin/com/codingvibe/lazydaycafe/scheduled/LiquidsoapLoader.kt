package com.codingvibe.lazydaycafe.scheduled

import com.codingvibe.lazydaycafe.external.chillhop.ChillhopClient
import com.codingvibe.lazydaycafe.external.liquidsoap.LiquidsoapClient
import com.google.common.cache.Cache
import kotlinx.coroutines.delay
import kotlinx.coroutines.isActive
import kotlinx.coroutines.runBlocking
import org.springframework.scheduling.annotation.Scheduled
import org.springframework.stereotype.Component
import java.time.Instant
import java.util.logging.Level
import java.util.logging.Logger
import kotlin.coroutines.coroutineContext

class LiquidsoapLoader(
    private val liquidsoapClient: LiquidsoapClient,
    private val chillhopClient: ChillhopClient,
    private val artistCache: Cache<String, Instant>,
    private val baseChillhopMusicUrl: String,
    private val playlistId: String,
) {
    private val logger = Logger.getLogger(this::class.java.name)

    @Scheduled(fixedDelay = 30000)
    fun updateFromChillhop() {
        runBlocking {
            chillhopClient.getCurrentPlaylistTracks(playlistId)
                ?.filter { artistCache.getIfPresent(it.trackId) == null }
                ?.forEach {
                    artistCache.put(it.trackId, it.startTime)
                    val featured = if (!it.featured.isNullOrEmpty()) " ft. ${it.featured}" else ""
                    val trackInfo = "annotate:title=\"${it.title}\",artist=\"${it.artists}${featured}\":${baseChillhopMusicUrl}${it.fileID}"
                    logger.log(Level.INFO, "Adding track to liquidsoap $trackInfo")
                    liquidsoapClient.addTrack(trackInfo)
                }
        }
    }
}