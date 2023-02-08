package com.codingvibe.lazydaycafe.config

import com.codingvibe.lazydaycafe.external.icecast.SevenHtmlStatsClient
import com.codingvibe.lazydaycafe.external.icecast.StatsClient
import com.codingvibe.lazydaycafe.external.icecast.StatusJsonStatsClient
import com.codingvibe.lazydaycafe.model.Spot
import com.codingvibe.lazydaycafe.scheduled.MetadataGrabber
import com.codingvibe.lazydaycafe.service.WebsocketEventService
import com.fasterxml.jackson.databind.DeserializationFeature
import com.fasterxml.jackson.databind.ObjectMapper
import com.fasterxml.jackson.databind.SerializationFeature
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule
import com.fasterxml.jackson.module.kotlin.KotlinModule
import com.fasterxml.jackson.module.paramnames.ParameterNamesModule
import org.springframework.beans.factory.annotation.Autowired
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.web.servlet.config.annotation.EnableWebMvc
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer
import retrofit2.Retrofit
import retrofit2.converter.jackson.JacksonConverterFactory
import retrofit2.converter.scalars.ScalarsConverterFactory
import java.nio.file.Files
import java.nio.file.Paths


@Configuration
@EnableWebMvc
open class LazyDayCafeConfig : WebMvcConfigurer {
    @Autowired
    private val env: Environment? = null

    @Bean
    open fun getSpots(objectMapper: ObjectMapper): List<Spot> {
        val projectDirAbsolutePath = Paths.get("").toAbsolutePath().toString()
        val resourcesPath = Paths.get(projectDirAbsolutePath, "/src/main/resources/spots")
        return Files.walk(resourcesPath)
            .filter { item -> Files.isRegularFile(item) }
            .map { it.toFile() }
            .map { objectMapper.readValue(it, Spot::class.java)}
            .toList()
    }

    @Bean
    open fun objectMapper(): ObjectMapper {
        return ObjectMapper()
            .registerModule(KotlinModule.Builder().build())
            .registerModule(JavaTimeModule())
            .registerModule(ParameterNamesModule())
            .disable(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES)
            .enable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS)
    }

    @Bean
    open fun webSocketEventService(simpleMessagingTemplate: SimpMessagingTemplate): WebsocketEventService {
        return WebsocketEventService(simpleMessagingTemplate)
    }

    @Bean
    open fun streamToStatsClient(env:Environment, objectMapper: ObjectMapper, allSpots: List<Spot>): Map<String, StatsClient> {
        val streamToStatsClient: MutableMap<String, StatsClient> = mutableMapOf()

        allSpots.flatMap { it.scenes}.map { it.stream.url}.forEach {
            val statsUrl = env.getProperty("statsUrl.${it}.url")
            val statsMethod = env.getProperty("statsUrl.${it}.method") ?: "status-json"
            if (!statsUrl.isNullOrEmpty()) {
                val converter = when (statsMethod) {
                    "status-json" -> JacksonConverterFactory.create(objectMapper)
                    "seven-html" -> ScalarsConverterFactory.create()
                    else -> null
                }
                val retrofit = Retrofit.Builder()
                    .baseUrl(statsUrl)
                    .addConverterFactory(converter)
                    .build()
                val retrofitClient = when (statsMethod) {
                    "status-json" -> retrofit.create(StatusJsonStatsClient::class.java)
                    "seven-html" -> retrofit.create(SevenHtmlStatsClient::class.java)
                    else -> null
                }
                if (retrofitClient != null) {
                    streamToStatsClient[it] = retrofitClient
                }
            }
        }
        return streamToStatsClient
    }

    @Bean
    open fun metadataGrabber(
        env: Environment,
        streamToStatsClient: Map<String, StatsClient>,
        allSpots: List<Spot>,
        websocketEventService: WebsocketEventService,
    ): MetadataGrabber {
        val metadataCache: MutableMap<String, String?> = mutableMapOf()
        return MetadataGrabber(metadataCache, streamToStatsClient, allSpots, websocketEventService)
    }
}