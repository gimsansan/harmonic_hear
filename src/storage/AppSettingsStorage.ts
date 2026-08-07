/**
 * 앱 설정 저장소 (AsyncStorage 기반)
 *
 * 훈련 세션 데이터(TrainingStorage)와 분리하여
 * 사용자 설정만 읽고 씁니다.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ReferencePitchPreset } from '../constants/theme';
import { REFERENCE_PRESETS } from '../constants/theme';

const STORAGE_KEYS = {
  REFERENCE_PITCH_PRESET: '@harmonitune/reference_pitch_preset',
  HAPTICS_ENABLED: '@harmonitune/haptics_enabled',
  ONBOARDING_DONE: '@harmonitune/onboarding_done',
} as const;

const DEFAULT_PRESET: ReferencePitchPreset = 'standard';

const VALID_PRESETS = new Set<string>(
  Object.keys(REFERENCE_PRESETS) as ReferencePitchPreset[],
);

function isValidPreset(value: string | null): value is ReferencePitchPreset {
  return value !== null && VALID_PRESETS.has(value);
}

export class AppSettingsStorage {
  /**
   * 기준 음고 프리셋을 조회합니다. 없거나 잘못된 값이면 standard.
   */
  static async getReferencePitchPreset(): Promise<ReferencePitchPreset> {
    try {
      const raw = await AsyncStorage.getItem(
        STORAGE_KEYS.REFERENCE_PITCH_PRESET,
      );
      if (isValidPreset(raw)) return raw;
      return DEFAULT_PRESET;
    } catch (e) {
      console.error('[AppSettingsStorage] 기준 음고 조회 실패:', e);
      return DEFAULT_PRESET;
    }
  }

  /**
   * 기준 음고 프리셋을 저장합니다.
   */
  static async setReferencePitchPreset(
    preset: ReferencePitchPreset,
  ): Promise<void> {
    try {
      await AsyncStorage.setItem(
        STORAGE_KEYS.REFERENCE_PITCH_PRESET,
        preset,
      );
    } catch (e) {
      console.error('[AppSettingsStorage] 기준 음고 저장 실패:', e);
    }
  }

  /** 햅틱(진동) 사용 여부. 기본 켜짐. */
  static async getHapticsEnabled(): Promise<boolean> {
    try {
      const raw = await AsyncStorage.getItem(STORAGE_KEYS.HAPTICS_ENABLED);
      return raw === null ? true : raw === 'true';
    } catch {
      return true;
    }
  }

  static async setHapticsEnabled(value: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.HAPTICS_ENABLED, String(value));
    } catch (e) {
      console.error('[AppSettingsStorage] 햅틱 설정 저장 실패:', e);
    }
  }

  /** 첫 실행 안내(볼륨 맞추기)를 마쳤는지. */
  static async getOnboardingDone(): Promise<boolean> {
    try {
      return (await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_DONE)) === 'true';
    } catch {
      return false;
    }
  }

  static async setOnboardingDone(value: boolean): Promise<void> {
    try {
      await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_DONE, String(value));
    } catch (e) {
      console.error('[AppSettingsStorage] 온보딩 상태 저장 실패:', e);
    }
  }
}
