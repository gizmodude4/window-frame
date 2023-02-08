package com.codingvibe.lazydaycafe.config

import com.maxmind.geoip2.DatabaseReader
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration
import org.springframework.core.env.Environment

@Configuration
open class GeoLite2Config {
    @Bean
    open fun geoLite2DbReader(env: Environment): DatabaseReader {
        val db = GeoLite2Config::class.java.classLoader.getResourceAsStream("geolite2-dbs/gl2-city.mmdb")
        return DatabaseReader.Builder(db).build()
    }
}