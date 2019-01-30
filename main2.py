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


def load_animation_from_path(path, size_x, size_y):
    images = []
    for file_name in os.listdir(path):
        image = pygletpygame.image.load(path + os.sep + file_name).convert()
        image = pygame.transform.scale(image, (screen_info.current_w, screen_info.current_h))
        images.append(image)
    return images


def main():
    glEnable(GL_TEXTURE_2D)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST)
    window = pyglet.window.Window(fullscreen=True)
    
    animation = pyglet.resource.animation('assets/landscape.gif')
    bin = pyglet.image.atlas.TextureBin()
    animation.add_to_texture_bin(bin)
    sprite = pyglet.sprite.Sprite(animation)
    (size_x, size_y) = window.get_size()
    sprite.scale_x = size_x/float(sprite.width)
    sprite.scale_y = size_y/float(sprite.height)
    play(load_song('assets/songs/OOT_AdultLink_Scream1.wav'))

    @window.event
    def on_draw():
        sprite.draw()
    pyglet.app.run()

main()