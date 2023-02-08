package com.codingvibe.lazydaycafe.controller

import com.codingvibe.lazydaycafe.service.IPLatLon
import com.codingvibe.lazydaycafe.service.IPtoGeoService
import org.springframework.web.bind.annotation.*
import javax.servlet.http.HttpServletRequest


@RestController
@RequestMapping("/api/v1")
class IpToGeoController(
    private val iPtoGeoService: IPtoGeoService
) {
    @GetMapping("/location")
    @CrossOrigin("http://localhost:8000", "https://lazyday.cafe")
    fun getGeoFromIP(request: HttpServletRequest): IPLatLon? {
        val ip = request.getHeader("X-FORWARDED-FOR") ?: request.remoteAddr
        return iPtoGeoService.getLocationDataFromIP(ip)
    }
}