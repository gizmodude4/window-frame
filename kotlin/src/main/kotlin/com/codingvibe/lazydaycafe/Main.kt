package com.codingvibe.lazydaycafe

import org.springframework.boot.autoconfigure.SpringBootApplication
import org.springframework.boot.runApplication

@SpringBootApplication
open class Main

fun main(args: Array<String>) {
    try {
        runApplication<Main>(*args)
    } catch (e: Exception) {
        e.printStackTrace();
    }
}
