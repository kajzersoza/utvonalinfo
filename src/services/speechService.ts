import { VoiceOptions, RoadInfo, RoadHazard } from '../types';

class SpeechService {
  private synth: SpeechSynthesis | null = null;
  private voices: SpeechSynthesisVoice[] = [];
  private lastAnnouncedText = '';
  private lastAnnounceTime = 0;
  private warnedHazards = new Set<string>();

  constructor() {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
      this.loadVoices();
      if (this.synth.onvoiceschanged !== undefined) {
        this.synth.onvoiceschanged = () => this.loadVoices();
      }
    }
  }

  private loadVoices() {
    if (!this.synth) return;
    this.voices = this.synth.getVoices();
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.synth) return [];
    if (this.voices.length === 0) {
      this.voices = this.synth.getVoices();
    }
    return this.voices;
  }

  public getHungarianVoices(): SpeechSynthesisVoice[] {
    const all = this.getAvailableVoices();
    return all.filter((v) => v.lang.startsWith('hu'));
  }

  public speak(text: string, options: VoiceOptions) {
    if (!this.synth || !options.enabled || !text.trim()) return;

    // Prevent echoing identical phrase within 6 seconds
    const now = Date.now();
    if (text === this.lastAnnouncedText && now - this.lastAnnounceTime < 6000) {
      return;
    }

    this.synth.cancel(); // Stop any pending speech for immediate responsive driving prompts

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.volume = Math.max(0, Math.min(1, options.volume));
    utterance.rate = Math.max(0.7, Math.min(1.6, options.rate));
    utterance.pitch = Math.max(0.7, Math.min(1.4, options.pitch));

    // Prefer selected voice or Hungarian voice
    const voices = this.getAvailableVoices();
    let selected: SpeechSynthesisVoice | undefined;

    if (options.selectedVoiceURI) {
      selected = voices.find((v) => v.voiceURI === options.selectedVoiceURI);
    }
    if (!selected) {
      selected = voices.find((v) => v.lang.toLowerCase().startsWith('hu'));
    }
    if (selected) {
      utterance.voice = selected;
    }
    utterance.lang = selected?.lang || 'hu-HU';

    utterance.onend = () => {
      this.lastAnnouncedText = text;
      this.lastAnnounceTime = Date.now();
    };

    try {
      this.synth.speak(utterance);
    } catch {
      // Ignore audio synthesis errors on locked autoplay
    }
  }

  public stop() {
    if (this.synth) {
      this.synth.cancel();
    }
  }

  /**
   * Compose road speech text based on user's configuration
   */
  public buildRoadAnnouncementText(road: RoadInfo, options: VoiceOptions): string {
    const parts: string[] = [];

    // City
    if (options.announceCity && road.city) {
      parts.push(road.city);
    }

    // Street
    if (options.announceStreet && road.roadName) {
      parts.push(road.roadName);
    }

    // Road number
    if (options.announceRoadNumber && road.roadNumber) {
      parts.push(`${road.roadNumber}`);
    }

    // Lane info
    if (options.announceLaneInfo && road.lanes) {
      parts.push(`${road.lanes} sávos útszakasz`);
    }

    return parts.join(', ');
  }

  /**
   * Announces road update if significant fields have changed
   */
  public announceRoadUpdate(
    prev: RoadInfo | null,
    current: RoadInfo,
    options: VoiceOptions
  ) {
    if (!options.enabled) return;

    // Check if what the user chose to hear actually changed
    const hasCityChanged = options.announceCity && prev?.city !== current.city;
    const hasStreetChanged = options.announceStreet && prev?.roadName !== current.roadName;
    const hasNumberChanged = options.announceRoadNumber && prev?.roadNumber !== current.roadNumber;
    const hasLanesChanged = options.announceLaneInfo && prev?.lanes !== current.lanes;

    if (prev === null || hasCityChanged || hasStreetChanged || hasNumberChanged || hasLanesChanged) {
      const text = this.buildRoadAnnouncementText(current, options);
      if (text) {
        this.speak(text, options);
      }
    }
  }

  /**
   * Alert driver when approaching a registered hazard in their direction
   */
  public announceHazardAlert(hazard: RoadHazard, distanceMeters: number, options: VoiceOptions) {
    if (!options.enabled || !options.announceApproachingHazards) return;

    // Don't repeat the warning for the same hazard
    if (this.warnedHazards.has(hazard.id)) return;
    this.warnedHazards.add(hazard.id);

    // Keep cache size bounded
    if (this.warnedHazards.size > 100) {
      this.warnedHazards.clear();
    }

    const lateralText =
      hazard.lateralPosition === 'left'
        ? 'bal oldalon'
        : hazard.lateralPosition === 'right'
        ? 'jobb oldalon'
        : 'középen';

    const hazardName = getHazardNameHungarian(hazard.hazardType);
    const distText = Math.round(distanceMeters / 10) * 10;

    const message = `Figyelem! ${distText} méterre ${hazardName} a ${lateralText}!`;
    this.speak(message, options);
  }
}

export function getHazardNameHungarian(type: string): string {
  switch (type) {
    case 'pothole':
      return 'kátyú';
    case 'manhole':
      return 'csatornafedél';
    case 'rutting':
      return 'nyomvályú';
    case 'crack':
      return 'burkolati repedés';
    case 'subsidence':
      return 'úttestsüllyedés';
    case 'debris':
      return 'útakadály vagy törmelék';
    case 'speedbump':
      return 'egyenetlen fekvőrendőr';
    default:
      return 'úthiba';
  }
}

export const speechService = new SpeechService();
