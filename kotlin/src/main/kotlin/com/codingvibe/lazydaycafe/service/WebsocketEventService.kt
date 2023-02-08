package com.codingvibe.lazydaycafe.service

import org.springframework.messaging.simp.SimpMessagingTemplate
import org.springframework.stereotype.Component

@Component
class WebsocketEventService (
    private val simpleMessagingTemplate: SimpMessagingTemplate
) {
    fun sendMetadataUpdate(streamUrl: String, title: String?, creditLink: String?) {
        simpleMessagingTemplate.convertAndSend("/topic/${streamUrl}/metadata", StreamMetadataUpdate(title, creditLink))
    }
}

data class StreamMetadataUpdate(
    val title: String?,
    val creditLink: String?,
)