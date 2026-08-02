// ============================================================
// Bật/tắt nhắc ôn tập bằng Web Push.
// Dựa theo samples/pwa/push-client.js của vocab-api, nhưng dùng
// API base + key từ vocabApi (panel Cài đặt API) thay vì hardcode.
//
// Yêu cầu: site chạy HTTPS (GitHub Pages có sẵn) và service worker
// đã đăng ký (vite-plugin-pwa lo phần này).
// iPhone/iPad: người dùng PHẢI "Thêm vào MH chính" rồi mở từ icon đó.
// ============================================================

import {
  getVapidPublicKey,
  subscribePush,
  unsubscribePush,
  type PushDevice,
} from '@/services/vocabApi';

export type ReminderState = 'unsupported' | 'needs-install' | 'denied' | 'on' | 'off';

export function isPushSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    'serviceWorker' in navigator &&
    typeof window !== 'undefined' &&
    'PushManager' in window &&
    'Notification' in window
  );
}

/**
 * iOS chỉ cho phép thông báo khi app đã được thêm vào màn hình chính.
 * Dùng để hiện hướng dẫn thay vì báo lỗi cụt ngủn.
 */
export function needsInstallOnIos(): boolean {
  if (typeof navigator === 'undefined') return false;
  const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isStandalone =
    (navigator as Navigator & { standalone?: boolean }).standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches;
  return isIos && !isStandalone;
}

export async function getReminderState(): Promise<ReminderState> {
  if (!isPushSupported()) return 'unsupported';
  if (needsInstallOnIos()) return 'needs-install';
  if (Notification.permission === 'denied') return 'denied';
  const reg = await navigator.serviceWorker.ready;
  const sub = await reg.pushManager.getSubscription();
  return sub ? 'on' : 'off';
}

/** Trả về mảng gắn với ArrayBuffer thật — applicationServerKey không nhận SharedArrayBuffer. */
function base64UrlToUint8Array(base64Url: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64Url.length % 4)) % 4);
  const base64 = (base64Url + padding).replace(/-/g, '+').replace(/_/g, '/');
  const raw = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
  return bytes;
}

/** Tên thiết bị mặc định, gọn hơn cả chuỗi userAgent. */
function defaultLabel(): string {
  const ua = navigator.userAgent;
  const os = /iPhone|iPad|iPod/.test(ua)
    ? 'iOS'
    : /Android/.test(ua)
      ? 'Android'
      : /Windows/.test(ua)
        ? 'Windows'
        : /Macintosh/.test(ua)
          ? 'macOS'
          : 'Thiết bị';
  const browser = /Edg\//.test(ua)
    ? 'Edge'
    : /Chrome\//.test(ua)
      ? 'Chrome'
      : /Firefox\//.test(ua)
        ? 'Firefox'
        : /Safari\//.test(ua)
          ? 'Safari'
          : '';
  return browser ? `${os} · ${browser}` : os;
}

/**
 * Bật nhắc nhở. PHẢI gọi từ một sự kiện bấm của người dùng
 * (trình duyệt chặn nếu gọi tự động).
 */
export async function enableReminders(label?: string): Promise<PushDevice> {
  if (!isPushSupported()) throw new Error('Trình duyệt không hỗ trợ thông báo đẩy.');
  if (needsInstallOnIos()) {
    throw new Error('Trên iPhone: bấm Chia sẻ → "Thêm vào MH chính", mở app từ icon đó rồi bật lại.');
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') throw new Error('Bạn đã từ chối quyền thông báo.');

  const reg = await navigator.serviceWorker.ready;
  const publicKey = await getVapidPublicKey();

  // Đã có subscription cũ thì dùng lại, chưa có thì tạo mới.
  const subscription =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({
      userVisibleOnly: true, // bắt buộc: mọi push đều phải hiện thông báo
      applicationServerKey: base64UrlToUint8Array(publicKey),
    }));

  const json = subscription.toJSON() as { endpoint: string; keys: { p256dh: string; auth: string } };
  return subscribePush(json, label?.trim() || defaultLabel());
}

/** Tắt nhắc nhở: gỡ ở trình duyệt và xóa trên server. */
export async function disableReminders(): Promise<void> {
  const reg = await navigator.serviceWorker.ready;
  const subscription = await reg.pushManager.getSubscription();
  if (!subscription) return;
  const { endpoint } = subscription.toJSON() as { endpoint: string };
  await subscription.unsubscribe();
  await unsubscribePush(endpoint);
  const nav = navigator as Navigator & { clearAppBadge?: () => Promise<void> };
  if (nav.clearAppBadge) await nav.clearAppBadge().catch(() => {});
}
