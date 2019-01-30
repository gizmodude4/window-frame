#!/usr/bin/env python
import argparse
import errno
import json
import pydub
import pyglet
import sys
import threading

from pyglet.gl import *
from pydub.playback import play


class Window:
  def __init__(self, image, music):
    self.image = image
    self.music = music
    self.effects = []

  def add_effect(self, effect):
    self.effects.append(effect)


class Music:
  def __init__(self, songs, fade_in, fade_out):
    self.songs = songs
    self.fade_in = fade_in or 0
    self.fade_out = fade_out or 0


class Effect:
  def __init__(self, name, image, audio_path, audio_strength):
    self.name = name
    self.image = image
    self.audio_path = audio_path
    self.audio_strength = audio_strength


def parse_config(config_path):
  with open(config_path, 'r') as stream:
    config = json.load(stream)
    windows = []
    for window_config in config["windows"]:
      music_config = window_config['music']
      music = Music(music_config['songs'], music_config['fadeIn'], music_config['fadeOut'])
      window = Window(window_config['image'], music)
      for effect in window_config['effects']:
        effect = Effect(effect['name'], effect['image'],
                        effect['overlayAudio']['audio'],
                        effect['overlayAudio']['volume'])
        window.add_effect(effect)
      windows.append(window)
  return windows


def load_songs(music):
  playlist = pydub.AudioSegment.empty()
  for song in music.songs:
    audio = pydub.AudioSegment.from_file(song)
    if music.fade_in > 0:
      audio.fade_in(music.fade_in)
    if music.fade_out:
      audio.fade_in(music.fade_out)
    playlist += audio
  return playlist


def main():
    r""" This script runs the whole shebang."""
    parser = argparse.ArgumentParser()
    parser.add_argument("--config", required=True,
                        help="config file")
    glEnable(GL_TEXTURE_2D)
    glTexParameteri(GL_TEXTURE_2D, GL_TEXTURE_MAG_FILTER, GL_NEAREST)
    display = pyglet.window.Window(fullscreen=True)

    args = parser.parse_args()
    current_window_index = 0
    windows = parse_config(args.config)
    current_window = windows[current_window_index]
    
    animation = pyglet.resource.animation(current_window.image)
    bin = pyglet.image.atlas.TextureBin()
    animation.add_to_texture_bin(bin)
    sprite = pyglet.sprite.Sprite(animation)
    (size_x, size_y) = display.get_size()
    sprite.scale_x = size_x/float(sprite.width)
    sprite.scale_y = size_y/float(sprite.height)
    songs = load_songs(current_window.music)
    base_audio = threading.Thread(target=play, args=(songs,))
    base_audio.start()

    @display.event
    def on_draw():
      sprite.draw()
      if not base_audio.is_alive():
        base_audio.start()
    pyglet.app.run()

if __name__ == "__main__":
  try:
    main()
  except KeyboardInterrupt:
    # The user asked the program to exit
    sys.exit(1)
  except IOError, e:
    # When this program is used in a shell pipeline and an earlier program in
    # the pipeline is terminated, we'll receive an EPIPE error.  This is normal
    # and just an indication that we should exit after processing whatever
    # input we've received -- we don't consume standard input so we can just
    # exit cleanly in that case.
    if e.errno != errno.EPIPE:
      raise

    # We still exit with a non-zero exit code though in order to propagate the
    # error code of the earlier process that was terminated.
    sys.exit(1)
  sys.exit(0)