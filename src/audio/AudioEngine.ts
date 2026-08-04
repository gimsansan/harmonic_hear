/**
 * 오디오 엔진 (§4.1, §4.4, §8)
 *
 * Web Audio API 규격(react-native-audio-api)을 사용한 소리 합성.
 * - Sine 모드: OscillatorNode('sine') — 순수 파형, 기초 훈련용
 * - Voice 모드: OscillatorNode('sawtooth') + BiquadFilterNode('bandpass') × 2 — 포먼트 합성 "아~"
 *
 * 패턴 실무성:
 * - OscillatorNode + GainNode Ramp Envelope: **표준·매우 흔한** Web Audio 패턴
 * - Bandpass 2개로 포먼트 모사: **실무에서는 드묾** (상용은 실녹음 샘플이 주류). 단순 근사.
 */

import { AudioContext } from 'react-native-audio-api';
import { AUDIO } from '../constants/theme';

export type SoundMode = 'wave' | 'voice';

export class AudioEngine {
  private ctx: AudioContext | null = null;

  /**
   * AudioContext를 초기화합니다.
   * 컴포넌트 마운트 시 호출하세요.
   */
  init(): void {
    if (!this.ctx) {
      this.ctx = new AudioContext();
    }
  }

  /**
   * AudioContext를 정리합니다.
   * 컴포넌트 언마운트 시 호출하세요.
   */
  dispose(): void {
    if (this.ctx) {
      this.ctx.close();
      this.ctx = null;
    }
  }

  /**
   * 현재 AudioContext의 currentTime을 반환합니다.
   */
  get currentTime(): number {
    return this.ctx?.currentTime ?? 0;
  }

  /**
   * suspended 상태면 resume합니다.
   * 마운트 시 만든 AudioContext는 사용자 제스처 전에 suspended일 수 있습니다.
   */
  async ensureRunning(): Promise<boolean> {
    if (!this.ctx) {
      this.init();
    }
    if (!this.ctx) {
      console.warn('[AudioEngine] AudioContext가 초기화되지 않았습니다.');
      return false;
    }

    if (this.ctx.state === 'closed') {
      console.warn('[AudioEngine] AudioContext가 이미 닫혔습니다.');
      return false;
    }

    if (this.ctx.state !== 'running') {
      try {
        await this.ctx.resume();
      } catch (error) {
        console.warn('[AudioEngine] AudioContext resume 실패:', error);
        return false;
      }
    }

    // closed는 위에서 이미 걸렀고, resume 실패도 false로 반환함
    return true;
  }

  /**
   * 지정된 주파수·모드로 톤을 재생합니다.
   *
   * @param freq - 재생할 주파수 (Hz)
   * @param startTimeOffset - 현재 시점 기준 오프셋 (초)
   * @param duration - 재생 길이 (초)
   * @param mode - 'wave' (순수 파형) | 'voice' (포먼트 합성)
   */
  async playTone(
    freq: number,
    startTimeOffset: number,
    duration: number,
    mode: SoundMode,
  ): Promise<void> {
    const ready = await this.ensureRunning();
    if (!ready || !this.ctx) {
      return;
    }

    const ctx = this.ctx;
    const now = ctx.currentTime + startTimeOffset;

    if (mode === 'wave') {
      this.playSineTone(ctx, freq, now, duration);
    } else {
      this.playVoiceTone(ctx, freq, now, duration);
    }
  }

  /**
   * 순수 Sine 파형 톤 (§4.1)
   *
   * 오디오 그래프: OscillatorNode('sine') → GainNode → destination
   * Envelope: exponentialRamp으로 Attack/Release 처리 (클릭/팝 방지)
   */
  private playSineTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, startTime);

    // Envelope: 부드러운 Attack/Release (클릭/팝 방지)
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(0.4, startTime + AUDIO.ATTACK_TIME);
    gain.gain.exponentialRampToValueAtTime(
      0.001,
      startTime + duration - AUDIO.RELEASE_TIME,
    );

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }

  /**
   * 포먼트 합성 "아~" 톤 (§4.4)
   *
   * 오디오 그래프:
   *   OscillatorNode('sawtooth') ─┬─ BiquadFilter(F1=800Hz) ─┬─ GainNode → destination
   *                                └─ BiquadFilter(F2=1200Hz) ─┘
   *
   * F0(기본 주파수)와 포먼트(F1, F2)가 독립 제어 가능.
   * 자연성은 낮지만(로봇 모음), 0Byte·완전 오프라인·실시간.
   */
  private playVoiceTone(
    ctx: AudioContext,
    freq: number,
    startTime: number,
    duration: number,
  ): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, startTime);

    // 포먼트 필터 F1 (800Hz)
    const filter1 = ctx.createBiquadFilter();
    filter1.type = 'bandpass';
    filter1.frequency.setValueAtTime(AUDIO.FORMANT_F1, startTime);
    filter1.Q.setValueAtTime(AUDIO.FORMANT_Q, startTime);

    // 포먼트 필터 F2 (1200Hz)
    const filter2 = ctx.createBiquadFilter();
    filter2.type = 'bandpass';
    filter2.frequency.setValueAtTime(AUDIO.FORMANT_F2, startTime);
    filter2.Q.setValueAtTime(AUDIO.FORMANT_Q, startTime);

    // Envelope: linearRamp으로 Attack/Release
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(0.3, startTime + 0.1);
    gain.gain.linearRampToValueAtTime(
      0.001,
      startTime + duration - AUDIO.RELEASE_TIME,
    );

    // 오디오 그래프 연결
    osc.connect(filter1);
    osc.connect(filter2);
    filter1.connect(gain);
    filter2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(startTime + duration);
  }
}
