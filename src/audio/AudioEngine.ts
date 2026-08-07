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
   * 여러 톤을 **하나의 오디오 클럭 기준점**에 맞춰 한 번에 예약합니다.
   *
   * 톤마다 `playTone`을 따로 부르면 호출 시점의 `currentTime`이 각각 달라지고,
   * 그 사이에 낀 JS 타이머·마이크로태스크 지연이 자극 간 간격(ISI)에 섞입니다.
   * Android에서 JS 스레드가 바쁘면 수십 ms까지 흔들릴 수 있고,
   * 흔들린 간격은 음고 대신 **시간 단서**로 작동할 수 있습니다.
   *
   * 간격의 정확도가 중요한 자극 제시에는 반드시 이 메서드를 쓰십시오.
   *
   * @param tones - `offset`은 시퀀스 시작점 기준 상대 시각 (초)
   * @param mode - 'wave' (순수 파형) | 'voice' (포먼트 합성)
   * @returns 예약에 성공했는지
   */
  async playSequence(
    tones: readonly { freq: number; offset: number; duration: number }[],
    mode: SoundMode,
  ): Promise<boolean> {
    const ready = await this.ensureRunning();
    if (!ready || !this.ctx) {
      return false;
    }

    const ctx = this.ctx;
    // 기준점을 한 번만 읽는다 — 이 값이 시퀀스 전체의 시간 원점이 된다
    const base = ctx.currentTime;

    for (const tone of tones) {
      const startTime = base + tone.offset;
      if (mode === 'wave') {
        this.playSineTone(ctx, tone.freq, startTime, tone.duration);
      } else {
        this.playVoiceTone(ctx, tone.freq, startTime, tone.duration);
      }
    }

    return true;
  }

  /**
   * 지정된 주파수·모드로 톤 하나를 재생합니다.
   *
   * 여러 톤의 **간격**이 중요하면 `playSequence`를 쓰십시오.
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
    await this.playSequence([{ freq, offset: startTimeOffset, duration }], mode);
  }

  /**
   * Attack → Sustain → Release 엔벨로프의 구간 경계를 계산합니다.
   *
   * `releaseStart` 앵커가 없으면 Attack 종료 시점부터 Release 목표 시점까지
   * 램프가 이어져 톤 전체가 감쇠합니다. 서스테인 구간을 보장하기 위한 계산입니다.
   */
  private envelopeTimes(
    startTime: number,
    duration: number,
  ): { attackEnd: number; releaseStart: number; end: number } {
    const end = startTime + duration;
    const attackEnd = Math.min(startTime + AUDIO.ATTACK_TIME, end);
    // duration이 Attack+Release보다 짧아도 순서가 뒤집히지 않도록 보정
    const releaseStart = Math.max(attackEnd, end - AUDIO.RELEASE_TIME);

    return { attackEnd, releaseStart, end };
  }

  /**
   * 순수 Sine 파형 톤 (§4.1)
   *
   * 오디오 그래프: OscillatorNode('sine') → GainNode → destination
   * Envelope: Attack → Sustain → Release (클릭/팝 방지 + 지속 길이 보장)
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

    const { attackEnd, releaseStart, end } = this.envelopeTimes(
      startTime,
      duration,
    );
    const peak = AUDIO.PEAK_GAIN_WAVE;

    // Attack
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(peak, attackEnd);
    // Sustain — Release 시작점을 앵커로 고정해야 이 구간이 평탄하게 유지됨
    gain.gain.setValueAtTime(peak, releaseStart);
    // Release
    gain.gain.exponentialRampToValueAtTime(0.001, end);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(end);
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

    const { releaseStart, end } = this.envelopeTimes(startTime, duration);
    const peak = AUDIO.PEAK_GAIN_VOICE;
    // voice 모드는 sine보다 완만한 Attack(0.1s) 사용
    const attackEnd = Math.min(startTime + 0.1, releaseStart);

    // Envelope: Attack → Sustain → Release (linearRamp)
    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.linearRampToValueAtTime(peak, attackEnd);
    gain.gain.setValueAtTime(peak, releaseStart);
    gain.gain.linearRampToValueAtTime(0.001, end);

    // 오디오 그래프 연결
    osc.connect(filter1);
    osc.connect(filter2);
    filter1.connect(gain);
    filter2.connect(gain);
    gain.connect(ctx.destination);

    osc.start(startTime);
    osc.stop(end);
  }
}
