import os
import pygame
import threading

FPS = 60
TRACK_ENDED_EVENT = pygame.USEREVENT + 1


def load_images(path, screen_info):
    images = []
    for file_name in os.listdir(path):
        image = pygame.image.load(path + os.sep + file_name).convert()
        image = pygame.transform.scale(image, (screen_info.current_w, screen_info.current_h))
        images.append(image)
    return images


def get_and_queue_next_song(songs):
    song = songs.pop()
    songs.insert(0, song)
    print "Song: %s, songs: [%s]" % (song, ", ".join(songs))
    return song


def set_up_playlist(path):
    songs = []
    for file_name in os.listdir(path):
        songs.append(path + os.sep + file_name)
    if len(songs) == 0:
        print "Unable to find music in directory..."
        return
    else:
      pygame.mixer.music.load(get_and_queue_next_song(songs))  # Get the first track from the playlist
      pygame.mixer.music.set_endevent(TRACK_ENDED_EVENT)  # Setup the end track event
    return songs


def get_center_square(sprites, screen_info):
    sprite = sprites[0]
    rect = sprite.get_rect()
    x = (screen_info.current_w * 0.5)
    y = (screen_info.current_h * 0.5)
    rect.center = (x, y)
    return rect


class AnimatedSprite(pygame.sprite.Sprite):

    def __init__(self, position, images):
        """
        Animated sprite object.

        Args:
            position: x, y coordinate on the screen to place the AnimatedSprite.
            images: Images to use in the animation.
        """
        super(AnimatedSprite, self).__init__()

        size = images[0].get_rect()

        self.rect = position
        self.images = images
        self.index = 0
        self.image = images[self.index]  # 'image' is the current image of the animation.

        self.animation_time = 0.1
        self.current_time = 0

    def update(self, dt):
        """
        Updates the image of Sprite approximately every 0.1 second.

        Args:
            dt: Time elapsed between each frame.
        """
        self.current_time += dt
        if self.current_time >= self.animation_time:
            self.current_time = 0
            self.index = (self.index + 1) % len(self.images)
            self.image = self.images[self.index]


def main():
  pygame.mixer.pre_init(44100, -16, 2, 2048)  # setup mixer to avoid sound lag
  pygame.init()
  pygame.mixer.init()
  WINDOW = pygame.display.set_mode((0, 0), pygame.FULLSCREEN)
  screen_info = pygame.display.Info()
  landscape_images = load_images('assets/landscape-frames/', screen_info)
  landscape = AnimatedSprite(position=get_center_square(landscape_images, screen_info), images=landscape_images)
  all_sprites = pygame.sprite.Group(landscape)  # Creates a sprite group and adds 'player' to it.
  WINDOW.fill((0, 0, 0))

  songs = set_up_playlist('assets/songs/')
  pygame.mixer.music.play()
  crashed = False

  clock = pygame.time.Clock()

  while not crashed:
      dt = clock.tick(FPS) / float(1000)  # Amount of seconds between each loop.
      for event in pygame.event.get():
          if event.type == pygame.QUIT:
              crashed = True
          if event.type == TRACK_ENDED_EVENT:    # A track has ended
              pygame.mixer.music.load(get_and_queue_next_song(songs))  # Queue the next one in the list
              timer = threading.Timer(3.0, pygame.mixer.music.play)
              timer.start()

      all_sprites.update(dt)  # Calls the 'update' method on all sprites in the list (currently just the player).

      WINDOW.fill((0, 0, 0))
      all_sprites.draw(WINDOW)
      pygame.display.update()

  pygame.quit()

main()