let currentTab = "body";
let currentHeaderTab = "preset";
let lastResponse = null;
let isResizing = false;
let startX = 0;
let startWidths = [];

// Initialize resizable panels
function initResizers() {
	const resizers = document.querySelectorAll(".resizer");
	const panels = document.querySelectorAll(".panel");

	resizers.forEach((resizer, index) => {
		resizer.addEventListener("mousedown", (e) => {
			isResizing = true;
			startX = e.clientX;
			startWidths = Array.from(panels).map(
				(panel) => panel.getBoundingClientRect().width
			);
			document.body.style.cursor = "col-resize";
			document.body.style.userSelect = "none";
		});
	});

	document.addEventListener("mousemove", (e) => {
		if (!isResizing) return;

		const deltaX = e.clientX - startX;
		const container = document.querySelector(".main");
		const containerWidth = container.getBoundingClientRect().width;

		// Simple 3-panel resize logic
		const leftPanel = panels[0];
		const middlePanel = panels[1];
		const rightPanel = panels[2];

		const leftWidth = Math.max(
			250,
			Math.min(containerWidth * 0.6, startWidths[0] + deltaX)
		);
		const rightWidth = Math.max(300, startWidths[2] - deltaX);
		const middleWidth = containerWidth - leftWidth - rightWidth - 16; // Account for gaps

		if (middleWidth > 200) {
			leftPanel.style.flex = `0 0 ${leftWidth}px`;
			middlePanel.style.flex = `0 0 ${middleWidth}px`;
			rightPanel.style.flex = `0 0 ${rightWidth}px`;
		}
	});

	document.addEventListener("mouseup", () => {
		if (isResizing) {
			isResizing = false;
			document.body.style.cursor = "";
			document.body.style.userSelect = "";
		}
	});
}

// Keyboard shortcuts
document.addEventListener("keydown", (e) => {
	// Ctrl+Enter: Send request
	if (e.ctrlKey && e.key === "Enter") {
		e.preventDefault();
		sendRequest();
	}
	// Ctrl+L: Focus URL
	else if (e.ctrlKey && e.key === "l") {
		e.preventDefault();
		document.getElementById("url").focus();
		document.getElementById("url").select();
	}
	// Ctrl+B: Focus body
	else if (e.ctrlKey && e.key === "b") {
		e.preventDefault();
		document.getElementById("body").focus();
	}
	// Ctrl+H: Add custom header
	else if (e.ctrlKey && e.key === "h") {
		e.preventDefault();
		showHeaderTab(
			document.querySelector(".header-tab:nth-child(2)"),
			"custom"
		);
		addCustomHeader();
	}
	// Ctrl+Shift+C: Clear all headers
	else if (e.ctrlKey && e.shiftKey && e.key === "C") {
		e.preventDefault();
		clearAllHeaders();
	}
	// ?: Show shortcuts
	else if (e.key === "?" && !e.ctrlKey && !e.shiftKey && !e.altKey) {
		e.preventDefault();
		toggleShortcuts();
	}
});

function toggleShortcuts() {
	const shortcuts = document.getElementById("shortcuts");
	shortcuts.classList.toggle("show");
	setTimeout(() => {
		if (shortcuts.classList.contains("show")) {
			shortcuts.classList.remove("show");
		}
	}, 3000);
}

// Header tab switching
function showHeaderTab(tab, type) {
	document
		.querySelectorAll(".header-tab")
		.forEach((t) => t.classList.remove("active"));
	document
		.querySelectorAll(".headers-panel-content")
		.forEach((p) => p.classList.remove("active"));

	tab.classList.add("active");
	document.getElementById(type + "-panel").classList.add("active");
	currentHeaderTab = type;
}

// Custom headers
function addCustomHeader() {
	const container = document.getElementById("custom-headers-container");
	const headerDiv = document.createElement("div");
	headerDiv.className = "custom-header";
	headerDiv.innerHTML = `
                <input type="text" placeholder="Header Name" onkeydown="if(event.key==='Tab'){event.preventDefault();this.nextElementSibling.focus()}">
                <input type="text" placeholder="Header Value" onkeydown="if(event.key==='Enter'){addCustomHeader()}">
                <button class="remove-btn" onclick="removeCustomHeader(this)" title="Remove header">×</button>
            `;
	container.appendChild(headerDiv);

	// Focus the first input
	headerDiv.querySelector("input").focus();
}

function removeCustomHeader(btn) {
	btn.parentElement.remove();
}

// Preset header management
document.querySelectorAll(".header-checkbox").forEach((checkbox) => {
	checkbox.addEventListener("change", (e) => {
		const input = e.target.parentElement.querySelector(".header-value");
		input.disabled = !e.target.checked;
		if (e.target.checked) {
			input.focus();
			input.select();
		}
	});
});

document.querySelectorAll(".header-name").forEach((label) => {
	label.addEventListener("click", (e) => {
		const checkbox = document.getElementById(e.target.getAttribute("for"));
		checkbox.checked = !checkbox.checked;
		checkbox.dispatchEvent(new Event("change"));
	});
});

function toggleCategory(category) {
	const categories = {
		common: ["user-agent", "accept", "content-type", "referer"],
		auth: ["authorization", "x-api-key", "cookie"],
		security: [
			"x-forwarded-for",
			"x-real-ip",
			"x-originating-ip",
			"x-requested-with",
		],
		bypass: ["origin", "host", "x-admin", "x-debug"],
	};

	const headers = categories[category];
	if (!headers) return;

	const allChecked = headers.every((id) => {
		const el = document.getElementById(id);
		return el && el.checked;
	});

	headers.forEach((id) => {
		const checkbox = document.getElementById(id);
		if (checkbox) {
			checkbox.checked = !allChecked;
			checkbox.dispatchEvent(new Event("change"));
		}
	});
}

function clearAllHeaders() {
	document.querySelectorAll(".header-checkbox").forEach((checkbox) => {
		checkbox.checked = false;
		checkbox.dispatchEvent(new Event("change"));
	});

	// Clear custom headers
	document.getElementById("custom-headers-container").innerHTML = "";
}

function showTab(tab, type) {
	document
		.querySelectorAll(".tab")
		.forEach((t) => t.classList.remove("active"));
	tab.classList.add("active");
	currentTab = type;
	updateResponseDisplay();
}

async function sendRequest() {
	const method = document.getElementById("method").value;
	const url = document.getElementById("url").value.trim();
	const body = document.getElementById("body").value;
	const statusEl = document.getElementById("status");
	const sendBtn = document.querySelector(".send-btn");

	if (!url) {
		statusEl.textContent = "Error: URL is required";
		statusEl.style.color = "#f85149";
		return;
	}

	const headers = {};

	// Collect preset headers
	document
		.querySelectorAll(".header-checkbox:checked")
		.forEach((checkbox) => {
			const input = checkbox.parentElement.querySelector(".header-value");
			const headerName = input.getAttribute("data-header");
			const headerValue = input.value.trim();
			if (headerName && headerValue) {
				headers[headerName] = headerValue;
			}
		});

	// Collect custom headers
	document.querySelectorAll(".custom-header").forEach((row) => {
		const inputs = row.querySelectorAll("input");
		const name = inputs[0].value.trim();
		const value = inputs[1].value.trim();
		if (name && value) {
			headers[name] = value;
		}
	});

	statusEl.textContent = "Sending request...";
	statusEl.style.color = "#d29922";
	statusEl.classList.add("sending");
	sendBtn.textContent = "Sending...";
	sendBtn.disabled = true;

	const startTime = Date.now();
	try {
		const options = {
			method,
			headers,
			mode: "cors",
		};

		if (body && ["POST", "PUT", "PATCH"].includes(method)) {
			options.body = body;
		}

		const response = await fetch(url, options);
		const responseText = await response.text();
		const duration = Date.now() - startTime;

		lastResponse = {
			status: response.status,
			statusText: response.statusText,
			headers: Object.fromEntries(response.headers.entries()),
			body: responseText,
			duration,
			url,
			method,
			requestHeaders: headers,
			timestamp: new Date().toISOString(),
		};

		statusEl.textContent = `${response.status} ${response.statusText} • ${duration}ms • ${responseText.length} bytes`;
		statusEl.style.color = response.status >= 400 ? "#f85149" : "#238636";
		updateResponseDisplay();
	} catch (error) {
		const duration = Date.now() - startTime;
		statusEl.textContent = `Error: ${error.message}`;
		statusEl.style.color = "#f85149";

		lastResponse = {
			status: 0,
			statusText: "Network Error",
			headers: {},
			body: error.message,
			duration,
			url,
			method,
			requestHeaders: headers,
			timestamp: new Date().toISOString(),
		};
		updateResponseDisplay();
	} finally {
		statusEl.classList.remove("sending");
		sendBtn.textContent = "Send";
		sendBtn.disabled = false;
	}
}

function updateResponseDisplay() {
	if (!lastResponse) return;

	const content = document.getElementById("response-content");
	const statusClass =
		lastResponse.status >= 500
			? "status-500"
			: lastResponse.status >= 400
			? "status-400"
			: "status-200";

	switch (currentTab) {
		case "body":
			let bodyContent = lastResponse.body;
			let contentType = "";

			try {
				const parsed = JSON.parse(bodyContent);
				bodyContent = JSON.stringify(parsed, null, 2);
				contentType = " (JSON)";
			} catch {
				try {
					// Try to detect XML
					if (bodyContent.trim().startsWith("<")) {
						contentType = " (XML/HTML)";
					}
				} catch {}
			}

			content.innerHTML = `
                        <div class="response-status ${statusClass}">
                            ${lastResponse.status} ${lastResponse.statusText} • ${lastResponse.duration}ms • ${lastResponse.body.length} bytes${contentType}
                        </div>
                        <pre>${bodyContent}</pre>
                    `;
			break;

		case "headers":
			content.innerHTML = `
                        <div class="response-status ${statusClass}">
                            ${lastResponse.status} ${
				lastResponse.statusText
			} • ${Object.keys(lastResponse.headers).length} headers
                        </div>
                        ${Object.entries(lastResponse.headers)
							.map(
								([k, v]) =>
									`<div class="header-line"><span class="header-name-resp">${k}:</span> ${v}</div>`
							)
							.join("")}
                    `;
			break;

		case "raw":
			const rawResponse =
				`${lastResponse.method} ${lastResponse.url}\n` +
				Object.entries(lastResponse.requestHeaders)
					.map(([k, v]) => `${k}: ${v}`)
					.join("\n") +
				"\n\n" +
				`HTTP/1.1 ${lastResponse.status} ${lastResponse.statusText}\n` +
				Object.entries(lastResponse.headers)
					.map(([k, v]) => `${k}: ${v}`)
					.join("\n") +
				"\n\n" +
				lastResponse.body;

			content.innerHTML = `<pre>${rawResponse}</pre>`;
			break;

		case "timeline":
			content.innerHTML = `
                        <div class="response-status ${statusClass}">
                            Request Timeline
                        </div>
                        <div class="header-line">🕐 <span class="header-name-resp">Timestamp:</span> ${new Date(
							lastResponse.timestamp
						).toLocaleString()}</div>
                        <div class="header-line">🚀 <span class="header-name-resp">Method:</span> ${
							lastResponse.method
						}</div>
                        <div class="header-line">🔗 <span class="header-name-resp">URL:</span> ${
							lastResponse.url
						}</div>
                        <div class="header-line">⏱️ <span class="header-name-resp">Duration:</span> ${
							lastResponse.duration
						}ms</div>
                        <div class="header-line">📊 <span class="header-name-resp">Status:</span> ${
							lastResponse.status
						} ${lastResponse.statusText}</div>
                        <div class="header-line">📏 <span class="header-name-resp">Response Size:</span> ${
							lastResponse.body.length
						} bytes</div>
                        <div class="header-line">📋 <span class="header-name-resp">Request Headers:</span> ${
							Object.keys(lastResponse.requestHeaders).length
						}</div>
                        <div class="header-line">📥 <span class="header-name-resp">Response Headers:</span> ${
							Object.keys(lastResponse.headers).length
						}</div>
                    `;
			break;
	}
}

// Method change handler
document.getElementById("method").addEventListener("change", (e) => {
	const method = e.target.value;
	const contentTypeCheckbox = document.getElementById("content-type");
	const acceptCheckbox = document.getElementById("accept");

	if (["POST", "PUT", "PATCH"].includes(method)) {
		contentTypeCheckbox.checked = true;
		acceptCheckbox.checked = true;
		contentTypeCheckbox.dispatchEvent(new Event("change"));
		acceptCheckbox.dispatchEvent(new Event("change"));

		// Focus body for data methods
		setTimeout(() => document.getElementById("body").focus(), 100);
	}
});

// Auto-save feature (in memory only)
function autoSave() {
	const state = {
		method: document.getElementById("method").value,
		url: document.getElementById("url").value,
		body: document.getElementById("body").value,
		presetHeaders: {},
		customHeaders: [],
	};

	// Save preset headers
	document.querySelectorAll(".header-checkbox").forEach((checkbox) => {
		const input = checkbox.parentElement.querySelector(".header-value");
		const headerName = input.getAttribute("data-header");
		state.presetHeaders[headerName] = {
			checked: checkbox.checked,
			value: input.value,
		};
	});

	// Save custom headers
	document.querySelectorAll(".custom-header").forEach((row) => {
		const inputs = row.querySelectorAll("input");
		state.customHeaders.push({
			name: inputs[0].value,
			value: inputs[1].value,
		});
	});

	// Store in memory (since localStorage isn't available)
	window.currentState = state;
}

// Auto-save every 2 seconds
setInterval(autoSave, 2000);

// Initialize everything
document.addEventListener("DOMContentLoaded", () => {
	initResizers();

	// Show shortcuts hint
	setTimeout(() => {
		toggleShortcuts();
	}, 1000);
});

// Focus URL input on load
window.addEventListener("load", () => {
	document.getElementById("url").focus();
});
