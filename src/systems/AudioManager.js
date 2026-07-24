// ── Sistema central de audio (mejora A2 · hallazgos H04, H19, H20) ──
// Las escenas NO tocan `this.sound` directamente: todo pasa por aquí, para que
// volúmenes, fundidos y tolerancia a assets ausentes vivan en un único sitio.
//
// Es un singleton porque el SoundManager de Phaser es global al juego: la
// música sobrevive a los cambios de escena y así podemos encadenar fundidos
// entre ellas sin que la pista se corte de golpe.

// ── Volúmenes por categoría (0-1) ──
export const MUSIC_VOLUME = 0.45;
export const SFX_VOLUME   = 0.7;

// ── Duraciones de fundido (ms) ──
export const MUSIC_FADE_MS = 800; // fundido normal de música
export const SCENE_FADE_MS = 400; // fundido corto antes de cambiar de escena

// Anti-solapamiento: un mismo SFX no se relanza si han pasado menos de estos
// ms desde su último disparo (golpes encadenados, rebotes en el suelo, etc.).
export const SFX_THROTTLE_MS = 70;

// ── Umbrales de gameplay que disparan audio (los leen las escenas) ──
// Velocidad de caída mínima (px/s) para que el aterrizaje suene: evita el SFX
// en microbotes o al apoyarse sin haber caído de verdad.
export const LAND_MIN_FALL_SPEED = 220;
// Segundos restantes que disparan la alarma de tiempo en Nivel 2.
export const TIMER_WARNING_SECONDS = 10;

class AudioManager {
    constructor() {
        this.scene        = null;  // escena activa: aporta caché y tweens
        this.music        = null;  // objeto Sound de la pista actual
        this.musicKey     = null;
        this.pendingFades = [];    // fundidos en curso, por si muere la escena
        this.lastPlayed   = new Map(); // clave → timestamp del último disparo
        this.warned       = new Set(); // claves ya reportadas como ausentes
    }

    // ── Ciclo de vida ────────────────────────────────────────────────────

    // Cada escena se registra en su create(). Al cerrarse se desengancha sola.
    attach(scene) {
        this.scene = scene;
        scene.events.once('shutdown', () => this.detach(scene));
        scene.events.once('destroy',  () => this.detach(scene));
        return this;
    }

    detach(scene) {
        if (this.scene !== scene) return;
        // Los tweens mueren con la escena: si quedaba un fundido a medias lo
        // rematamos a mano para que la música no se quede a medio volumen
        // (o sonando para siempre, en el caso de un fundido de salida).
        const pending = this.pendingFades.slice();
        this.pendingFades = [];
        for (const fade of pending) fade.finish();
        this.scene = null;
    }

    // ── Utilidades ───────────────────────────────────────────────────────

    // Tolerancia a assets faltantes: nunca lanza, solo avisa una vez.
    has(key) {
        return !!this.scene && !!key && this.scene.cache.audio.exists(key);
    }

    warnMissing(key) {
        if (this.warned.has(key)) return;
        this.warned.add(key);
        console.warn(`[AudioManager] El audio '${key}' no está cargado; se omite.`);
    }

    // ── Efectos de sonido ────────────────────────────────────────────────

    // config admite, además de las opciones de Phaser:
    //   throttle → ms mínimos entre dos disparos de la misma clave
    //   fallback → clave alternativa si la principal no está cargada
    play(key, config = {}) {
        if (!this.scene) return false;

        const { throttle = SFX_THROTTLE_MS, fallback = null, ...soundConfig } = config;

        if (!this.has(key)) {
            this.warnMissing(key);
            if (fallback && fallback !== key) {
                return this.play(fallback, { ...config, fallback: null });
            }
            return false;
        }

        const now  = Date.now();
        const last = this.lastPlayed.get(key);
        if (last !== undefined && now - last < throttle) return false;
        this.lastPlayed.set(key, now);

        try {
            this.scene.sound.play(key, { volume: SFX_VOLUME, ...soundConfig });
            return true;
        } catch (error) {
            console.warn(`[AudioManager] No se pudo reproducir '${key}':`, error);
            return false;
        }
    }

    // ── Música ───────────────────────────────────────────────────────────

    playMusic(key, options = {}) {
        if (!this.scene) return null;

        const {
            fade    = MUSIC_FADE_MS,
            volume  = MUSIC_VOLUME,
            loop    = true,
            restart = false
        } = options;

        if (!this.has(key)) {
            this.warnMissing(key);
            return null;
        }

        // Si ya suena la misma pista no se reinicia: al volver al menú o al
        // pasar de nivel la música continúa en vez de saltar al segundo 0.
        if (!restart && this.music && this.musicKey === key && this.music.isPlaying) {
            return this.music;
        }

        if (this.music && this.music.isPlaying) {
            return this.crossfade(this.musicKey, key, fade, { volume, loop });
        }

        this.releaseMusic(this.music);
        return this.startMusic(key, volume, loop, fade);
    }

    stopMusic(options = {}) {
        const { fade = MUSIC_FADE_MS, onComplete = null } = options;
        const music = this.music;

        this.music    = null;
        this.musicKey = null;

        if (!music) {
            if (onComplete) onComplete();
            return;
        }

        if (!music.isPlaying) {
            if (onComplete) onComplete();
            return;
        }

        this.fadeTo(music, 0, fade, () => {
            this.silence(music);
            if (onComplete) onComplete();
        });
    }

    crossfade(fromKey, toKey, duration = MUSIC_FADE_MS, options = {}) {
        if (!this.scene) return null;

        if (!this.has(toKey)) {
            this.warnMissing(toKey);
            return null;
        }

        const outgoing = (this.music && (!fromKey || this.musicKey === fromKey))
            ? this.music
            : (fromKey ? this.scene.sound.get(fromKey) : null);

        if (outgoing) {
            if (this.music === outgoing) {
                this.music    = null;
                this.musicKey = null;
            }
            this.fadeTo(outgoing, 0, duration, () => this.silence(outgoing));
        }

        const { volume = MUSIC_VOLUME, loop = true } = options;
        return this.startMusic(toKey, volume, loop, duration);
    }

    // Fundido de salida y, cuando termina, cambio de escena. El fundido vive
    // en la escena que se va, así que el cambio debe ocurrir en su onComplete:
    // si arrancáramos la escena destino antes, el tween moriría a mitad.
    fadeOutAndSwitch(scene, targetKey, data = undefined, options = {}) {
        const { fade = SCENE_FADE_MS, onBeforeSwitch = null } = options;
        this.stopMusic({
            fade,
            onComplete: () => {
                if (onBeforeSwitch) onBeforeSwitch();
                scene.scene.start(targetKey, data);
            }
        });
    }

    // ── Interno ──────────────────────────────────────────────────────────

    startMusic(key, volume, loop, fade) {
        const manager = this.scene.sound;

        // Las pistas se REUTILIZAN por clave en vez de crearse y destruirse:
        // destruir un Sound mientras Phaser todavía actualiza su tween de
        // volumen revienta con "Cannot read properties of null (reading 'gain')",
        // porque el volumeNode ya no existe. Reutilizar también evita acumular
        // objetos Sound en el manager global escena tras escena.
        const sound = manager.get(key) || manager.add(key, { loop, volume: 0 });
        sound.setLoop(loop);
        sound.setVolume(0);

        this.music    = sound;
        this.musicKey = key;

        // Una pista sin loop (game over) deja de ser la pista actual al acabar.
        if (!loop) {
            sound.once('complete', () => this.releaseMusic(sound));
        }

        const begin = () => {
            if (this.music !== sound) return; // la pista cambió mientras tanto
            sound.play();
            this.fadeTo(sound, volume, fade);
        };

        // El navegador bloquea el audio hasta la primera interacción: si el
        // contexto sigue cerrado, esperamos al desbloqueo en vez de perder la
        // música silenciosamente.
        if (manager.locked) manager.once('unlocked', begin);
        else begin();

        return sound;
    }

    releaseMusic(sound) {
        if (!sound) return;
        this.silence(sound);
        if (this.music === sound) {
            this.music    = null;
            this.musicKey = null;
        }
    }

    // Detiene una pista dejándola lista para reutilizarse. Mata antes su tween
    // para que el gestor de tweens no vuelva a tocar el Sound tras pararlo.
    silence(sound) {
        if (!sound) return;
        if (this.scene) this.scene.tweens.killTweensOf(sound);
        sound.stop();
        sound.setVolume(0);
    }

    // Tween sobre la propiedad `volume` del Sound (H19).
    fadeTo(sound, target, duration, onDone = null) {
        if (!sound) {
            if (onDone) onDone();
            return;
        }

        const finish = () => {
            this.pendingFades = this.pendingFades.filter((f) => f.sound !== sound);
            sound.setVolume(target);
            if (onDone) onDone();
        };

        this.pendingFades = this.pendingFades.filter((f) => f.sound !== sound);

        if (!this.scene || duration <= 0) {
            finish();
            return;
        }

        this.scene.tweens.killTweensOf(sound);
        this.pendingFades.push({ sound, finish });
        this.scene.tweens.add({
            targets:    sound,
            volume:     target,
            duration,
            ease:       'Linear',
            onComplete: finish
        });
    }
}

export default new AudioManager();
