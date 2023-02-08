package com.codingvibe.lazydaycafe.model

enum class SpotType {
    STATIC,
    DYNAMIC
}

data class Spot (
    val id: String,
    val type: SpotType,
    val scenes: List<Scene>
)

data class Scene (
    val id: String,
    val name: String,
    val image: String,
    val nightLights: String,
    val horizonY: Float,
    val animations: List<Animation>?,
    val stream: AudioStream,
    val sounds: List<Sound>
)


data class Animation (
    val spawnChance: Float,
    val backgroundChance: Float,
    val sizeMod: Float,
    val image: String,
    val movement: Movement
)

enum class Direction {
    LEFT,
    RIGHT
}

data class Movement (
    val duration: Long,
    val direction: Direction
)

data class AudioStream (
    val url: String,
    val volume: Long,
    val effects: List<AudioEffect>?
)

data class AudioEffect (
    val effectType: AudioEffectType,
    val config: Map<String, Any>
)

enum class AudioEffectType {
    LPF,
    HPF,
    REVERB
}

data class Sound(
    val url: String,
    val volume: Long,
    val loop: Boolean,
    val effects: List<AudioEffect>?
)