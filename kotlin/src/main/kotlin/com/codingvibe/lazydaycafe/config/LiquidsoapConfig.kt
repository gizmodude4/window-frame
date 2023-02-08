package com.codingvibe.lazydaycafe.config

import com.codingvibe.lazydaycafe.external.chillhop.ChillhopClient
import com.codingvibe.lazydaycafe.external.liquidsoap.LiquidsoapClient
import com.codingvibe.lazydaycafe.scheduled.LiquidsoapLoader
import com.fasterxml.jackson.databind.ObjectMapper
import com.google.common.cache.Cache
import com.google.common.cache.CacheBuilder
import okhttp3.OkHttpClient
import org.springframework.beans.factory.annotation.Qualifier
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Conditional
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import org.springframework.scheduling.annotation.EnableScheduling
import retrofit2.Retrofit
import retrofit2.converter.jackson.JacksonConverterFactory
import retrofit2.converter.scalars.ScalarsConverterFactory
import java.time.Duration
import java.time.Instant
import java.util.concurrent.TimeUnit
import java.util.logging.Logger

@EnableScheduling
@Configuration
open class LiquidsoapConfig {
    @Bean
    open fun liquidsoapClient(env: Environment, objectMapper: ObjectMapper): LiquidsoapClient {
        val liquidsoapUrl = env.getRequiredProperty("liquidsoap.baseUrl")
        val client = OkHttpClient.Builder()
            .callTimeout(Duration.ofSeconds(30))
            .readTimeout(Duration.ofSeconds(30))
            .writeTimeout(Duration.ofSeconds(30))
            .connectTimeout(Duration.ofSeconds(30))
            .build()
        val retrofit =  Retrofit.Builder()
            .baseUrl(liquidsoapUrl)
            .client(client)
            .addConverterFactory(ScalarsConverterFactory.create())
            .build()
        return retrofit.create(LiquidsoapClient::class.java)
    }

    @Bean
    @ConditionalOnProperty(
        prefix = "chillhop",
        name = ["apiUrl"]
    )
    open fun liquidsoapLoader(
        env: Environment,
        liquidsoapClient: LiquidsoapClient,
        chillhopClient: ChillhopClient,
        @Qualifier("chillhopPlaylistId") playlistId: String,
    ): LiquidsoapLoader {
        val artistCache: Cache<String, Instant> = CacheBuilder.newBuilder()
            .expireAfterWrite(10*60, TimeUnit.SECONDS)
            .maximumSize(30)
            .build()
        val chillhopMusicUrl = env.getRequiredProperty("chillhop.musicUrl")
        return LiquidsoapLoader(liquidsoapClient, chillhopClient, artistCache, chillhopMusicUrl, playlistId)
    }

    @Bean("chillhopPlaylistId")
    open fun chillhopPlaylistId(env: Environment): String {
        return env.getRequiredProperty("chillhop.playlistId")
    }
}