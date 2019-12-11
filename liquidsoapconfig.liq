#Settings
set("server.telnet", true)
set("server.telnet.port", 1234)
set("harbor.bind_addr","127.0.0.1")
# Music playlists
music1 = playlist(mode="randomize",reload=1,reload_mode="rounds","C:/Users/Window/window-frame/chillmusicplaylist.m3u")
# If something goes wrong, we'll play this
security = single("C:/Users/Window/window-frame/site/assets/songs/danimal.mp3")
# Start building the feed with music
radio = random([music1])
radio = crossfade(duration=5.0,fade_out=3.,fade_in=3., smart=true, conservative=true, radio)
# Add the security, requests and smart crossfade
radio = fallback(track_sensitive = false,
    [fallback([request.queue(id="request"), radio]),security])
# Add a skip command for the music stream
server.register(
    usage="skip",
    description="Skip the current song.",
    "skip",
    fun(_) -> begin source.skip(radio) "Done!" end
)
# Harbor get metadata
meta = ref []

# Update current metadata
# converted in UTF8
def update_meta(m) =
  m = metadata.export(m)
  recode = string.recode(out_enc="UTF-8")
  def f(x) =
    (recode(fst(x)),recode(snd(x)))
  end
  meta := list.map(f,m)
end

# Apply update_metadata
# every time we see a new
# metadata
radio = on_metadata(update_meta,radio)

# Return the json content
# of meta
def get_meta(~protocol,~data,~headers,uri) =
  m = !meta
  http_response(
    protocol=protocol,
    code=200,
    headers=[("Content-Type","application/json; charset=utf-8")],
    data=json_of(m)
  )
end

# Register get_meta at port 700
harbor.http.register(port=8005,method="GET","/getmeta",get_meta)

def skip_song(~protocol,~data,~headers,uri) =
  source.skip(radio)
  http_response(
    protocol=protocol,
    code=200,
    headers=[("Content-Type","application/json; charset=utf-8")],
    data="done"
  )
end

# Harbor HTTP skip function
harbor.http.register(port=8005,method="PUT","/skip",skip_song)

# Stream it out
output.icecast(%mp3.vbr,
    host = "localhost", port = 8002,
    password = "n3Y4HVm0z9N", mount = "/stream",
    name="myStation Music Service", description="This is the myStation
    music stream. Add some information about your station's automated
    programming.",
    radio)