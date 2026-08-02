/**
 * Code phia app (FE) de bat/tat nhac on tap.
 * Dung duoc voi React/Vue/vanilla — chi can goi cac ham export ben duoi.
 *
 * Yeu cau:
 *   - Site chay HTTPS (GitHub Pages co san).
 *   - Da dang ky service worker (xem service-worker.js cung thu muc).
 *   - iPhone/iPad: nguoi dung PHAI "Thêm vào MH chính" truoc, mo tu icon do roi moi bat duoc.
 */

const API_BASE = "https://vocab-api.nguyentanhung2003.workers.dev";
const API_KEY = "<API_KEY>"; // lay tu bien moi truong cua FE, dung hardcode khi len that

async function api(path, options = {}) {
	const res = await fetch(`${API_BASE}${path}`, {
		...options,
		headers: {
			Authorization: `Bearer ${API_KEY}`,
			"Content-Type": "application/json",
			...(options.headers || {}),
		},
	});
	const body = await res.json();
	if (!res.ok) throw new Error(body.message || `Loi ${res.status}`);
	return body.data; // envelope { code, message, data }
}

/** Trinh duyet co ho tro thong bao day khong. */
export function isPushSupported() {
	return "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

/**
 * iOS chi cho phep thong bao khi app da duoc them vao man hinh chinh.
 * Dung de hien huong dan "Bấm Chia sẻ → Thêm vào MH chính" thay vi bao loi cut ngui.
 */
export function needsInstallOnIos() {
	const isIos = /iPad|iPhone|iPod/.test(navigator.userAgent);
	const isStandalone =
		window.navigator.standalone === true ||
		window.matchMedia("(display-mode: standalone)").matches;
	return isIos && !isStandalone;
}

/** Trang thai hien tai: "unsupported" | "needs-install" | "denied" | "on" | "off" */
export async function getReminderState() {
	if (!isPushSupported()) return "unsupported";
	if (needsInstallOnIos()) return "needs-install";
	if (Notification.permission === "denied") return "denied";
	const reg = await navigator.serviceWorker.ready;
	const sub = await reg.pushManager.getSubscription();
	return sub ? "on" : "off";
}

function base64UrlToUint8Array(base64Url) {
	const padding = "=".repeat((4 - (base64Url.length % 4)) % 4);
	const base64 = (base64Url + padding).replace(/-/g, "+").replace(/_/g, "/");
	const raw = atob(base64);
	return Uint8Array.from([...raw].map((ch) => ch.charCodeAt(0)));
}

/**
 * Bat nhac nho. Goi TU MOT SU KIEN BAM CUA NGUOI DUNG (trinh duyet chan neu goi tu dong).
 * Tra ve thiet bi da dang ky.
 */
export async function enableReminders(label) {
	if (!isPushSupported()) throw new Error("Trình duyệt không hỗ trợ thông báo đẩy");
	if (needsInstallOnIos()) {
		throw new Error('Trên iPhone: bấm Chia sẻ → "Thêm vào MH chính", mở app từ icon đó rồi bật lại');
	}

	const permission = await Notification.requestPermission();
	if (permission !== "granted") throw new Error("Bạn đã từ chối quyền thông báo");

	const reg = await navigator.serviceWorker.ready;
	const { publicKey } = await api("/api/push/vapid-public-key");

	// Da co subscription cu thi dung lai, chua co thi tao moi
	const subscription =
		(await reg.pushManager.getSubscription()) ??
		(await reg.pushManager.subscribe({
			userVisibleOnly: true, // bat buoc: moi push deu phai hien thong bao
			applicationServerKey: base64UrlToUint8Array(publicKey),
		}));

	return api("/api/push/subscribe", {
		method: "POST",
		body: JSON.stringify({
			...subscription.toJSON(), // { endpoint, keys: { p256dh, auth } }
			label: label || navigator.userAgent.slice(0, 60),
		}),
	});
}

/** Tat nhac nho: go o trinh duyet va xoa tren server. */
export async function disableReminders() {
	const reg = await navigator.serviceWorker.ready;
	const subscription = await reg.pushManager.getSubscription();
	if (!subscription) return;
	const { endpoint } = subscription.toJSON();
	await subscription.unsubscribe();
	await api("/api/push/unsubscribe", { method: "POST", body: JSON.stringify({ endpoint }) });
	if (navigator.clearAppBadge) await navigator.clearAppBadge().catch(() => {});
}

/** Gui thong bao thu de nguoi dung thay ngay la da hoat dong. */
export function sendTestNotification() {
	return api("/api/push/test", { method: "POST" });
}

/* ---------------------------------------------------------------------------
   Vi du gan vao mot nut:

   import { getReminderState, enableReminders, disableReminders } from "./push-client.js";

   // Dang ky service worker mot lan khi app khoi dong:
   navigator.serviceWorker.register("/sw.js");

   const btn = document.querySelector("#toggle-reminders");
   btn.addEventListener("click", async () => {
     const state = await getReminderState();
     try {
       if (state === "on") { await disableReminders(); btn.textContent = "Bật nhắc nhở"; }
       else { await enableReminders("Điện thoại của tôi"); btn.textContent = "Tắt nhắc nhở"; }
     } catch (err) {
       alert(err.message);
     }
   });
--------------------------------------------------------------------------- */
