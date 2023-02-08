package com.codingvibe.lazydaycafe.controller

import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler
import org.springframework.web.server.ResponseStatusException

@ControllerAdvice
class ErrorHandlerController {
    @ExceptionHandler
    fun handleApiException(ex: ResponseStatusException): ResponseEntity<ErrorMessageModel> {
        val errorMessage = ErrorMessageModel(
            status = ex.rawStatusCode,
            message = ex.reason
        )
        return ResponseEntity(errorMessage, HttpStatus.BAD_REQUEST)
    }
}

class ErrorMessageModel(
    var status: Int? = null,
    var message: String? = null
)