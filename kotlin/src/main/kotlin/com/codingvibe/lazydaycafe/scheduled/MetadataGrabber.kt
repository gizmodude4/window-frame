package com.codingvibe.lazydaycafe.scheduled

import com.codingvibe.lazydaycafe.external.icecast.StatsClient
import com.codingvibe.lazydaycafe.external.icecast.StatusJsonStatsResponse
import com.codingvibe.lazydaycafe.model.Spot
import com.codingvibe.lazydaycafe.service.StreamMetadataUpdate
import com.codingvibe.lazydaycafe.service.WebsocketEventService
import kotlinx.coroutines.runBlocking
import org.springframework.scheduling.annotation.Scheduled
import retrofit2.HttpException
import java.util.logging.Logger

class MetadataGrabber(
    private val metadataCache: MutableMap<String, String?>,
    private val streamToStatsClients: Map<String, StatsClient>,
    private val allSpots: List<Spot>,
    private val websocketEventService: WebsocketEventService
) {
    private val logger = Logger.getLogger(this::class.java.name)

    @Scheduled(fixedDelay = 1000)
    fun updateStreamMetadata() {
        runBlocking {
            allSpots.flatMap { it.scenes}.map { it.stream.url}
                .forEach {
                    streamToStatsClients[it]?.let { client ->
                        try {
                            val curStats = client.getStats()
                            val title = getTitle(curStats)
                            if (metadataCache[it] != title) {
                                logger.info("Updating metadata for $it to $title")
                                metadataCache[it] = title
                                // TODO: When credits become non-mysterious, use add them here.
                                websocketEventService.sendMetadataUpdate(it, title, null)
                            }
                        } catch (exc: HttpException) {
                            logger.warning("Unable to get stats update for $it.")
                            logger.warning(exc.message)
                        }
                    }
                }
        }
    }

    fun getMetadata(streamUrl: String): StreamMetadataUpdate? {
        val streamTitle = metadataCache[streamUrl]
        if (!streamTitle.isNullOrEmpty()) {
            return StreamMetadataUpdate(streamTitle, null)
        }
        return null
    }

    private fun getTitle(statsResponse: Any?): String? {
        return when (statsResponse) {
            is StatusJsonStatsResponse -> statsResponse.iceStats.source?.title
            is String -> statsResponse.substringAfterLast(',').substringBefore("</body>").trim()
            else -> null
        }
    }
}