package com.codingvibe.lazydaycafe.external.icecast

interface StatsClient {
    suspend fun getStats(): Any?
}