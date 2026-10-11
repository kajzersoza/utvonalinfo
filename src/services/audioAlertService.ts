import { HazardType, Severity, OSMFeatureType, SoundAlertOptions, RoadHazard } from '../types';

class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private lastAlertTime = 0;
  private lastAlertKey = '';

  private getContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Play a pure synthesized tone with envelope
   */
  private playTone(
    freq: number,
    durationMs: number,
    volume: number = 0.5,
    type: OscillatorType = 'sine',
    delayMs: number = 0
  ) {
    const ctx = this.getContext();
    if (!ctx) return;

    const startTime = ctx.currentTime + delayMs / 1000;
    const duration = durationMs / 1000;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);

    // Smooth envelope: quick attack and exponential decay to prevent clicks
    gain.gain.setValueAtTime(0.0001, startTime);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.01, volume), startTime + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.05);
  }

  /**
   * Play chimes according to severity level:
   * Level 1 (low): 1 soft tone
   * Level 2 (medium): 2 distinct beeps
   * Level 3 (high): 3 alert pulses
   * Level 4 (critical): 4 rapid urgent warning siren beeps
   */
  public playSeverityChime(severity: Severity, options: SoundAlertOptions) {
    if (!options.enabled) return;
    const vol = Math.max(0.1, Math.min(1.0, options.volume || 0.8));

    switch (severity) {
      case 'low': // 1. fokozat: 1 lágy jelzés
        this.playTone(587.33, 140, vol * 0.7, 'sine', 0); // D5
        break;

      case 'medium': // 2. fokozat: 2 határozott jelzés
        this.playTone(659.25, 90, vol * 0.8, 'sine', 0); // E5
        this.playTone(783.99, 110, vol * 0.85, 'sine', 120); // G5
        break;

      case 'high': // 3. fokozat: 3 sürgős pittyenés
        this.playTone(880.0, 75, vol * 0.9, 'triangle', 0); // A5
        this.playTone(880.0, 75, vol * 0.9, 'triangle', 100);
        this.playTone(1046.5, 110, vol * 0.95, 'triangle', 200); // C6
        break;

      case 'critical': // 4. fokozat: 4 gyors magas riasztó jelzés
        this.playTone(1174.66, 65, vol, 'triangle', 0); // D6
        this.playTone(987.77, 65, vol, 'triangle', 85); // B5
        this.playTone(1174.66, 65, vol, 'triangle', 170); // D6
        this.playTone(1318.51, 100, vol, 'sawtooth', 255); // E6
        break;
    }
  }

  /**
   * Play distinctive sound chimes according to defect type:
   */
  public playTypeChime(type: HazardType | OSMFeatureType, options: SoundAlertOptions) {
    if (!options.enabled) return;
    const vol = Math.max(0.1, Math.min(1.0, options.volume || 0.8));

    switch (type) {
      case 'pothole': // Kátyú: Mély döccenő hangjelzés (frequency drop)
        this.playTone(330, 80, vol * 0.9, 'triangle', 0);
        this.playTone(196, 140, vol * 0.85, 'sine', 90);
        break;

      case 'manhole': // Csatornafedél: Fémes kattanás / csengés
        this.playTone(880, 50, vol * 0.7, 'square', 0);
        this.playTone(1320, 90, vol * 0.6, 'sine', 60);
        break;

      case 'rutting': // Nyomvályú: Hullámzó kettős hang
        this.playTone(440, 100, vol * 0.8, 'sine', 0);
        this.playTone(523, 100, vol * 0.8, 'sine', 110);
        break;

      case 'speedbump': // Fekvőrendőr: Lassításra intő szinusz
        this.playTone(520, 80, vol * 0.8, 'sine', 0);
        this.playTone(392, 120, vol * 0.75, 'sine', 90);
        break;

      case 'railway': // Vasúti átjáró: Fénysorompó kettős csengő
        this.playTone(1174.66, 90, vol * 0.85, 'sine', 0); // D6
        this.playTone(1760.0, 90, vol * 0.85, 'sine', 130); // A6
        this.playTone(1174.66, 90, vol * 0.85, 'sine', 260); // D6
        break;

      case 'crossing': // Gyalogátkelőhely (Zebra): Lágy kétharmóniás szignál
        this.playTone(523.25, 110, vol * 0.7, 'sine', 0); // C5
        this.playTone(659.25, 130, vol * 0.75, 'sine', 120); // E5
        break;

      case 'traffic_signals': // Jelzőlámpa: Figyelmeztető szignál
        this.playTone(698.46, 80, vol * 0.8, 'sine', 0); // F5
        this.playTone(880.0, 100, vol * 0.8, 'sine', 90); // A5
        break;

      case 'traffic_sign': // Tábla: Tiszta pittyenés
        this.playTone(783.99, 100, vol * 0.75, 'sine', 0); // G5
        break;

      case 'crack': // Repedés: Éles, száraz kettős kattanás
        this.playTone(1100, 40, vol * 0.8, 'square', 0);
        this.playTone(1450, 50, vol * 0.75, 'square', 55);
        break;

      case 'subsidence': // Úttestsüllyedés / letörés: Csúszó, mélyülő hullám
        this.playTone(480, 70, vol * 0.85, 'triangle', 0);
        this.playTone(280, 110, vol * 0.8, 'sine', 75);
        this.playTone(180, 140, vol * 0.75, 'sine', 170);
        break;

      case 'debris': // Akadály / Törmelék: Határozott kettős vészjelzés
        this.playTone(880, 70, vol * 0.85, 'sawtooth', 0);
        this.playTone(1050, 90, vol * 0.85, 'triangle', 85);
        break;

      case 'other': // Egyéb hiba: Figyelmeztető impulzus
        this.playTone(740, 80, vol * 0.75, 'sine', 0);
        this.playTone(880, 90, vol * 0.75, 'sine', 95);
        break;

      default:
        this.playTone(880, 80, vol * 0.85, 'sawtooth', 0);
        this.playTone(1050, 100, vol * 0.85, 'triangle', 90);
        break;
    }
  }

  /**
   * Main audio handler for an approaching road hazard
   */
  public triggerHazardAudio(hazard: RoadHazard, options: SoundAlertOptions) {
    if (!options.enabled || options.alertMode === 'voice_only') return;

    // Prevent audio flood if same hazard triggered in last 4 seconds
    const now = Date.now();
    const key = `hz-${hazard.id}`;
    if (this.lastAlertKey === key && now - this.lastAlertTime < 4000) {
      return;
    }
    this.lastAlertKey = key;
    this.lastAlertTime = now;

    // If playTypeChimes is enabled, play type-specific sound
    if (options.playTypeChimes) {
      this.playTypeChime(hazard.hazardType, options);
    }

    // If playSeverityChimes is enabled, play severity pulse sequence (1, 2, 3, 4 beeps)
    if (options.playSeverityChimes) {
      const delay = options.playTypeChimes ? 250 : 0;
      setTimeout(() => {
        this.playSeverityChime(hazard.severity, options);
      }, delay);
    }
  }

  /**
   * Main audio handler for an approaching OSM feature (zebra, railway, etc.)
   */
  public triggerFeatureAudio(type: OSMFeatureType, options: SoundAlertOptions) {
    if (!options.enabled || options.alertMode === 'voice_only') return;

    const now = Date.now();
    const key = `osm-${type}`;
    if (this.lastAlertKey === key && now - this.lastAlertTime < 5000) {
      return;
    }
    this.lastAlertKey = key;
    this.lastAlertTime = now;

    this.playTypeChime(type, options);
  }
}

export const audioAlertService = new AudioAlertService();
