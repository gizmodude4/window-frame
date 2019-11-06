class AudioEffectCreator {
    static createEffect(effect) {
        switch(effect.type) {
            case 'lpf':
                return new Pizzicato.Effects.LowPassFilter(effect.config);
            case 'hpf':
                return new Pizzicato.Effects.HighPassFilter(effect.config);
            case 'reverb':
                return new Pizzicato.Effects.Reverb(effect.config);
            default:
                throw 'Unknown effect type ' + effect.type; 
        }
    }
}
export default AudioEffectCreator;