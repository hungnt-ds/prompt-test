/**
 * Phần xử lý thông báo đẩy của service worker.
 *
 * File này được nạp vào sw.js do vite-plugin-pwa sinh ra (workbox.importScripts),
 * nên mọi đường dẫn tương đối bên dưới tính từ scope của app (vd /prompt-test/).
 */

/** Đường dẫn server gửi về có thể là "/", "/#/review" hoặc URL đầy đủ. */
function resolveAppUrl(raw) {
  const scope = self.registration.scope;
  if (!raw || raw === "/") return scope;
  if (/^https?:\/\//i.test(raw)) return raw;
  return new URL(String(raw).replace(/^\/+/, ""), scope).href;
}

// Server đẩy thông báo tới -> hiện lên màn hình (kể cả khi app đang đóng).
self.addEventListener("push", event => {
  // Payload do vocab-api gửi: { title, body, url, count, tag }
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch {
    data = { title: "Nhắc ôn tập", body: event.data ? event.data.text() : "" };
  }

  const title = data.title || "Đến giờ ôn tập rồi!";
  const options = {
    body: data.body || "",
    icon: new URL("pwa-192x192.png", self.registration.scope).href,
    badge: new URL("pwa-192x192.png", self.registration.scope).href,
    tag: data.tag || "vocab-reminder", // cùng tag -> thông báo mới THAY THẾ cái cũ
    renotify: true,
    data: { url: resolveAppUrl(data.url) },
  };

  // waitUntil giữ service worker sống đến khi thông báo hiện xong
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, options);
      // Hiện số trên icon app (Android/Chrome; iOS bỏ qua không lỗi)
      if (self.navigator && self.navigator.setAppBadge && typeof data.count === "number") {
        try {
          if (data.count > 0) await self.navigator.setAppBadge(data.count);
          else await self.navigator.clearAppBadge();
        } catch {
          /* trình duyệt không hỗ trợ — bỏ qua */
        }
      }
    })()
  );
});

// Bấm vào thông báo -> mở tab app đang có, hoặc mở tab mới nếu chưa có.
self.addEventListener("notificationclick", event => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || self.registration.scope;

  event.waitUntil(
    (async () => {
      const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of clientList) {
        if ("focus" in client) {
          if (client.url !== targetUrl && "navigate" in client) {
            try {
              await client.navigate(targetUrl);
            } catch {
              /* điều hướng bị chặn — cứ focus tab đang có */
            }
          }
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
    })()
  );
});
