package com.codingvibe.lazydaycafe.config

import org.springframework.context.annotation.Configuration
import org.springframework.messaging.simp.config.MessageBrokerRegistry
import org.springframework.web.socket.config.annotation.EnableWebSocketMessageBroker
import org.springframework.web.socket.config.annotation.StompEndpointRegistry
import org.springframework.web.socket.config.annotation.WebSocketMessageBrokerConfigurer

@Configuration
@EnableWebSocketMessageBroker
open class WebsocketConfig : WebSocketMessageBrokerConfigurer {
    override fun registerStompEndpoints(registry: StompEndpointRegistry) {
        registry.addEndpoint("/api/v1/notifications")
            .setAllowedOrigins("http://localhost:8000", "https://twitchoverlay.codingvibe.dev").withSockJS()
    }

    override fun configureMessageBroker(config: MessageBrokerRegistry){
        config.enableSimpleBroker("/topic")
    }
}