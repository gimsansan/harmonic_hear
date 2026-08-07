/**
 * 촉각 피드백 (P4-5)
 *
 * 청각 보조 기기 사용자 대상 앱이라 진동 피드백의 가치가 큽니다.
 * 설정에서 끌 수 있으며, 꺼져 있으면 아무 일도 하지 않습니다.
 *
 * 실패해도 앱 동작에 영향이 없어야 하므로 모든 호출은 예외를 삼킵니다.
 */

import * as Haptics from 'expo-haptics';

let enabled = true;

/** 설정값을 반영합니다. (앱 시작·설정 변경 시 호출) */
export function setHapticsEnabled(value: boolean): void {
  enabled = value;
}

export function getHapticsEnabled(): boolean {
  return enabled;
}

function safe(run: () => Promise<unknown>): void {
  if (!enabled) return;
  run().catch(() => {
    // 햅틱 미지원 기기 등 — 무시
  });
}

/** 정답 */
export function hapticSuccess(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success));
}

/** 오답 */
export function hapticError(): void {
  safe(() => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error));
}

/** 소리 재생 시작 등 가벼운 알림 */
export function hapticTap(): void {
  safe(() => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light));
}
