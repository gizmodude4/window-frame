package com.codingvibe.lazydaycafe.config

import com.codingvibe.lazydaycafe.external.chillhop.ChillhopClient
import com.codingvibe.lazydaycafe.external.liquidsoap.LiquidsoapClient
import com.fasterxml.jackson.databind.ObjectMapper
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment
import retrofit2.Retrofit
import retrofit2.converter.jackson.JacksonConverterFactory

@Configuration
open class ChillhopConfig {
    @Bean
    @ConditionalOnProperty(
        prefix = "chillhop",
        name = ["apiUrl"]
    )
    open fun chillhopClient(objectMapper: ObjectMapper, env: Environment): ChillhopClient {
        val chillhopApi = env.getRequiredProperty("chillhop.apiUrl")
        val retrofit =  Retrofit.Builder().baseUrl(chillhopApi)
            .addConverterFactory(JacksonConverterFactory.create(objectMapper))
            .build()
        return retrofit.create(ChillhopClient::class.java)
    }
}