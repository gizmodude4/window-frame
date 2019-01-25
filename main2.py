import os
import pyglet
import pydub
import threading

from pyglet.gl import *
from pydub.playback import play


def load_images(path, duration):
    images = []
    files = os.listdir(path)
    frame_duration = duration / float(len(files))
    for file_name in files:
        frame = pyglet.image.AnimationFrame(path + os.sep + file_name, frame_duration)
        images.append(frame)
    return images


def load_song(path):
    audio = pydub.AudioSegment.from_file(path)
    audio.fade_out(3000)
    return audio


def main():
    glEnable(GL_TEXTURE_2D)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST)
    window = pyglet.window.Window(fullscreen=True)
    sprite = pyglet.sprite.Sprite(pyglet.resource.animation('assets/landscape.gif'))
    (size_x, size_y) = window.get_size()
    sprite.scale_x = size_x/float(sprite.width)
    sprite.scale_y = size_y/float(sprite.height)
    play(load_song('assets/songs/OOT_AdultLink_Scream1.wav'))

    @window.event
    def on_draw():
        window.clear()
        sprite.draw()
    pyglet.app.run()

main()