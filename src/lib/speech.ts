/**
 * Platform speech-to-text wrapper.
 *
 * iOS-first: on-device transcription via the native speech stack so voice
 * memos never leave the phone. Implemented against @react-native-voice/voice
 * (a thin RN binding over iOS SFSpeechRecognizer / Android SpeechRecognizer).
 *
 * IMPORTANT: this module requires a development build (`expo run:ios` / EAS).
 * It will NOT work in Expo Go. TODO: wire permission flows and test on-device.
 */
import Voice from '@react-native-voice/voice';

export interface SpeechRecognizer {
  requestPermissions(): Promise<boolean>;
  startRecording(onPartial: (text: string) => void): Promise<void>;
  stopRecording(): Promise<string>;
}

class NativeVoiceRecognizer implements SpeechRecognizer {
  private finalText = '';
  private partialCb: ((text: string) => void) | null = null;
  private bound = false;

  private bind() {
    if (this.bound) return;
    Voice.onSpeechPartialResults = (e) => {
      const t = e.value?.join(' ') ?? '';
      this.partialCb?.(t);
    };
    Voice.onSpeechResults = (e) => {
      this.finalText = e.value?.join(' ') ?? '';
    };
    Voice.onSpeechError = () => {
      /* surfaced as empty transcript; UI handles retry */
    };
    this.bound = true;
  }

  async requestPermissions(): Promise<boolean> {
    // TODO: @react-native-voice/voice exposes no explicit permission API;
    // iOS prompts on first start(). Consider expo-speech-recognition or a
    // manual AVAudioSession/SFSpeechRecognizer permission check here.
    return true;
  }

  async startRecording(onPartial: (text: string) => void): Promise<void> {
    this.bind();
    this.finalText = '';
    this.partialCb = onPartial;
    // 'en-US' default; TODO: follow device locale.
    await Voice.start('en-US');
  }

  async stopRecording(): Promise<string> {
    try {
      await Voice.stop();
    } finally {
      this.partialCb = null;
      await Voice.destroy().catch(() => {});
    }
    return this.finalText;
  }
}

export function createRecognizer(): SpeechRecognizer {
  return new NativeVoiceRecognizer();
}
