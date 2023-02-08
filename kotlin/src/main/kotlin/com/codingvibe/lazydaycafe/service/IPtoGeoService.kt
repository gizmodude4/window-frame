package com.codingvibe.lazydaycafe.service

import com.maxmind.geoip2.DatabaseReader
import com.maxmind.geoip2.exception.GeoIp2Exception
import org.springframework.stereotype.Component
import java.io.IOException
import java.net.InetAddress
import java.net.UnknownHostException
import java.util.logging.Logger

@Component
class IPtoGeoService (
    private val geoDb: DatabaseReader
) {
    private val logger = Logger.getLogger(this::class.java.name)

    fun getLocationDataFromIP(ip: String): IPLatLon? {
        try {
            val ipAddress = InetAddress.getByName(ip)
            val response = geoDb.city(ipAddress)
            return IPLatLon(response.location.latitude, response.location.longitude)
        } catch (uhe: UnknownHostException) {
            logger.warning("Unable to get InetAddress from $ip")
        } catch (geoExcept: GeoIp2Exception) {
            logger.warning("Error looking up info for $ip")
            logger.warning(geoExcept.message)
        } catch (ioe: IOException) {
            logger.warning("Something went terribly wrong looking up the IP")
            logger.warning(ioe.message)
        }
        return null
    }
}

data class IPLatLon (
    val lat: Double,
    val lon: Double,
)