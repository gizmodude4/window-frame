package com.codingvibe.lazydaycafe.external.liquidsoap

import retrofit2.Response
import retrofit2.http.Body
import retrofit2.http.POST

interface LiquidsoapClient {
    @POST("track")
    suspend fun addTrack(@Body trackInfo: String): Response<String?>
}