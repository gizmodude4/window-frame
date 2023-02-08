package com.codingvibe.lazydaycafe.controller

import com.codingvibe.lazydaycafe.model.Scene
import com.codingvibe.lazydaycafe.model.Spot
import com.codingvibe.lazydaycafe.scheduled.MetadataGrabber
import com.codingvibe.lazydaycafe.service.StreamMetadataUpdate
import org.springframework.web.bind.annotation.*


@RestController
@RequestMapping("/api/v1")
class SpotsController(
    private val allSpots: List<Spot>,
    private val metadataGrabber: MetadataGrabber
) {
    @GetMapping("/spots")
    @CrossOrigin("http://localhost:8000", "https://lazyday.cafe")
    fun getAllSpots(): List<Spot> {
        return allSpots
    }

    @GetMapping("/spots/{id}")
    @CrossOrigin("http://localhost:8000", "https://lazyday.cafe")
    fun getSpot(@PathVariable id: String): Spot? {
        return allSpots.firstOrNull { it.id == id }
    }

    @GetMapping("/spots/{id}/scenes")
    @CrossOrigin("http://localhost:8000", "https://lazyday.cafe")
    fun getScenes(@PathVariable id: String): List<Scene>? {
        return allSpots.firstOrNull { it.id == id }?.scenes
    }

    @GetMapping("/spots/{id}/scenes/{sceneId}")
    @CrossOrigin("http://localhost:8000", "https://lazyday.cafe")
    fun getScene(@PathVariable id: String, @PathVariable sceneId: String): Scene? {
        return allSpots.firstOrNull { it.id == id }?.scenes?.firstOrNull { it.id == sceneId }
    }

    @GetMapping("/spots/{id}/scenes/{sceneId}/metadata")
    @CrossOrigin("http://localhost:8000", "https://lazyday.cafe")
    fun getMetadata(@PathVariable id: String, @PathVariable sceneId: String): StreamMetadataUpdate? {
        return allSpots.firstOrNull { it.id == id }
            ?.scenes?.firstOrNull{ it.id == sceneId }
            ?.stream?.url?.let {
                metadataGrabber.getMetadata(it)
            }
    }
}