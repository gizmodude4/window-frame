'use strict';
 
 class AudioManager {
     constructor(audioEffectCreator) {
         this.audioEffectCreator = audioEffectCreator;
         this.currentlyPlayingAudio = {};
     }
 
     playAudio(audioDefinition, initialEffects, volumeOverride, onEndCb, finishedCb) {
         var self = this;
         try {
             getAudio(audioDefinition, initialEffects, audio => {
                 if (volumeOverride) {
                     audio.volume = 0;
                 }
                 audio.play();
                 self.currentlyPlayingAudio[audioDefinition.getLink()] = audio;
                 audio.on("end", () => audio.disconnect());
                 if (onEndCb) {
                     audio.on('end', onEndCb);
                 }
                 if (finishedCb) {
                     finishedCb();
                 }
             });
         } catch(e) {
             console.log("Error playing song " + audioDefinition.getLink() + ". Skipping...")
             console.log(e.message);
             if (finishedCb) {
                 finishedCb();
             }
             onEndCb();
         }
     }
 
     stopAllPlayingAudio(cb) {
         var self = this;
         Object.keys(self.currentlyPlayingAudio).forEach(audioLink => {
             var audio = self.currentlyPlayingAudio[audioLink];
             audio.off('end');
             audio.on("end", () => audio.disconnect());
             audio.stop();
         });
         self.currentlyPlayingAudio = {};
         if (cb) {
             cb();
         }
     }
 
     setCurrentlyPlayingVolume(audioLink, volume) {
         if (audioLink in this.currentlyPlayingAudio) {
             this.currentlyPlayingAudio[audioLink].volume = volume;
         }
     }
 }
 
 function getAudio(audio, initialEffects, cb) {
     var newAudio = new Pizzicato.Sound({ 
         source: 'file',
         options: { 
             path: audio.getLink(), 
             volume: audio.getVolume()/100,
             release: audio.getFadeDuration()/1000,
             attack: audio.getFadeDuration()/1000,
             loop: audio.getLoop()
         }
         }, function (err) {
             if (err) {
                 throw err;
             }
             audio.getAudioEffects().forEach(effect => {
                 newAudio.addEffect(effect);
             });
             if (initialEffects && initialEffects.length > 0) {
                 initialEffects.forEach(effect => newAudio.addEffect(effect));
             }
             cb(newAudio);
         });
 }
 
 export default AudioManager;