package com.codingvibe.lazydaycafe.external.icecast

import retrofit2.http.GET

interface SevenHtmlStatsClient : StatsClient {
    @GET("7.html")
    override suspend fun getStats(): String
}