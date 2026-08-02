/**
 * Service worker cho PWA vocab — phan xu ly thong bao nhac on tap.
 *
 * Dat file nay o GOC cua site (vd https://hungnt-ds.github.io/sw.js) hoac goc cua thu muc app,
 * vi service worker chi kiem soat duoc cac duong dan tu vi tri cua no tro xuong.
 *
 * Neu du an da co service worker (Vite PWA, Workbox...), chi can copy 2 handler
 * `push` va `notificationclick` ben duoi vao file do.
 */

// Server day thong bao toi -> hien len man hinh dien thoai (ke ca khi app dang dong).
self.addEventListener("push", (event) => {
	// Payload do vocab-api gui: { title, body, url, count, tag }
	let data = {};
	try {
		data = event.data ? event.data.json() : {};
	} catch {
		data = { title: "Nhắc ôn tập", body: event.data ? event.data.text() : "" };
	}

	const title = data.title || "Đến giờ ôn tập rồi!";
	const options = {
		body: data.body || "",
		icon: "/icons/icon-192.png", // doi theo icon that cua app
		badge: "/icons/badge-72.png", // anh don sac hien tren thanh trang thai Android
		tag: data.tag || "vocab-reminder", // cung tag -> thong bao moi THAY THE cai cu
		renotify: true,
		data: { url: data.url || "/" },
	};

	// waitUntil giu service worker song den khi thong bao hien xong
	event.waitUntil(
		(async () => {
			await self.registration.showNotification(title, options);
			// Hien so tren icon app (Android/Chrome; iOS bo qua khong loi)
			if (navigator.setAppBadge && typeof data.count === "number") {
				try {
					data.count > 0 ? await navigator.setAppBadge(data.count) : await navigator.clearAppBadge();
				} catch {
					/* trinh duyet khong ho tro — bo qua */
				}
			}
		})(),
	);
});

// Bam vao thong bao -> mo tab app dang co, hoac mo tab moi neu chua co.
self.addEventListener("notificationclick", (event) => {
	event.notification.close();
	const targetUrl = (event.notification.data && event.notification.data.url) || "/";

	event.waitUntil(
		(async () => {
			const clientList = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
			for (const client of clientList) {
				if ("focus" in client) {
					if (client.url !== targetUrl && "navigate" in client) await client.navigate(targetUrl);
					return client.focus();
				}
			}
			if (self.clients.openWindow) return self.clients.openWindow(targetUrl);
		})(),
	);
});
