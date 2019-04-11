import * as mpd from "./lib/mpd.js";
import * as art from "./lib/art.js";
import * as html from "./lib/html.js";
import * as format from "./lib/format.js";
import * as pubsub from "./lib/pubsub.js";

const DELAY = 2000;
const DOM = {};

let current = {};
let node;
let idleTimeout = null;

function sync(data) {
	if ("volume" in data) { DOM.volume.value = data["volume"]; }

	// changed time
	let elapsed = Number(data["elapsed"] || 0);
	DOM.progress.value = elapsed;
	DOM.elapsed.textContent = format.time(elapsed);

	if (data["file"] != current["file"]) { // changed song
		if (data["file"]) { // playing at all?
			let duration = Number(data["duration"]);
			DOM.duration.textContent = format.time(duration); 
			DOM.progress.max = duration;
			DOM.title.textContent = data["Title"] || data["file"].split("/").pop();
			DOM.subtitle.textContent = format.subtitle(data, {duration:false});
		} else {
			DOM.title.textContent = "";
			DOM.subtitle.textContent = "";
		}

		pubsub.publish("song-change", null, data);
	}

	if (data["Artist"] != current["Artist"] || data["Album"] != current["Album"]) { // changed album (art)
		html.clear(DOM.art);
		art.get(data["Artist"], data["Album"], data["file"]).then(src => {
			if (src) {
				html.node("img", {src}, "", DOM.art);
			} else {
				html.icon("music", DOM.art);
			}
		});
	}

	let flags = [];
	if (data["random"] == "1") { flags.push("random"); }
	if (data["repeat"] == "1") { flags.push("repeat"); }
	node.dataset.flags = flags.join(" ");

	node.dataset.state = data["state"];

	current = data;
}

function idle() {
	idleTimeout = setTimeout(update, DELAY);
}

function clearIdle() {
	idleTimeout && clearTimeout(idleTimeout);
	idleTimeout = null;
}

async function command(cmd) {
	clearIdle();
	let data = await mpd.commandAndStatus(cmd);
	sync(data);
	idle();
}

export async function update() {
	clearIdle();
	let data = await mpd.status();
	sync(data);
	idle();
}

export function init(n) {
	node = n;
	let all = node.querySelectorAll("[class]");
	Array.from(all).forEach(node => DOM[node.className] = node);

	DOM.progress = DOM.timeline.querySelector("progress");

	DOM.volume.insertBefore(html.icon("volume-high"), DOM.volume.firstChild);
	DOM.volume = DOM.volume.querySelector("meter");

	DOM.play.addEventListener("click", e => command("play"));
	DOM.pause.addEventListener("click", e => command("pause 1"));
	DOM.prev.addEventListener("click", e => command("previous"));
	DOM.next.addEventListener("click", e => command("next"));

	DOM.random.addEventListener("click", e => command(`random ${current["random"] == "1" ? "0" : "1"}`));
	DOM.repeat.addEventListener("click", e => command(`repeat ${current["repeat"] == "1" ? "0" : "1"}`));

	DOM.progress.addEventListener("click", e => {
		let rect = e.target.getBoundingClientRect();
		let frac = (e.clientX - rect.left) / rect.width;
		command(`seekcur ${frac * e.target.max}`);
	});

	update();
}
