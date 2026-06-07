/* DM-controlled background music.
 *
 * Server (websocket-server.js) holds per-group { track, playing } state.
 * - music_play / music_stop are broadcast to ALL clients (incl. sender).
 * - music_state_request returns current state only to requester (music_state).
 *
 * Volume, mute, and seek are strictly local. Loop is forced on.
 */

var music_audio = null;
var music_track = null;
var music_muted = false;
var music_volume = 0.5;
var wf_music = null;
var music_autoplay_handler = null;
var music_blob_cache = {};
var music_load_token = 0;

const MUSIC_LS_VOLUME = 'music_volume';
const MUSIC_LS_MUTED = 'music_muted';

function music_storage_load() {
	var v = parseFloat(localStorage.getItem(MUSIC_LS_VOLUME));
	if (!isNaN(v) && v >= 0 && v <= 1) {
		music_volume = v;
	}
	music_muted = localStorage.getItem(MUSIC_LS_MUTED) === 'true';
}

function music_apply_volume() {
	if (music_audio == null) {
		return;
	}
	music_audio.volume = music_muted ? 0 : music_volume;
}

function music_set_volume(v) {
	music_volume = Math.max(0, Math.min(1, v));
	localStorage.setItem(MUSIC_LS_VOLUME, music_volume.toString());
	music_apply_volume();
}

function music_toggle_mute() {
	music_muted = !music_muted;
	localStorage.setItem(MUSIC_LS_MUTED, music_muted ? 'true' : 'false');
	music_apply_volume();
	music_update_ui();
}

function music_sync() {
	if (music_audio == null) {
		write_sidebar('Music: no track loaded yet, nothing to sync.');
		return;
	}
	if (music_audio.paused) {
		var p = music_audio.play();
		if (p && typeof p.catch === 'function') {
			p.catch(function() {});
		}
	}
	var pos = music_audio.currentTime;
	if (!isFinite(pos) || pos <= 0) {
		write_sidebar('Music: track has not started playing yet, sync skipped.');
		return;
	}
	music_send({ action: 'music_sync', position: pos });
}

function music_apply_sync(position) {
	if (music_audio == null) {
		return;
	}
	if (typeof position !== 'number' || !isFinite(position) || position < 0) {
		return;
	}
	var apply = function() {
		var dur = music_audio.duration;
		if (!isFinite(dur) || dur <= 0) {
			return;
		}
		music_audio.currentTime = Math.min(dur, position);
	};
	if (isFinite(music_audio.duration) && music_audio.duration > 0) {
		apply();
	} else {
		music_audio.addEventListener('loadedmetadata', apply, { once: true });
	}
}



/* DM commands — fire WS, the server bounces back music_play/music_stop to
 * everyone so all clients (including DM) go through the same apply path.
 */
function music_send(payload) {
	if (typeof websocket === 'undefined' || websocket == null) {
		return;
	}
	if (websocket.readyState !== WebSocket.OPEN) {
		return;
	}
	websocket.send(JSON.stringify(payload));
}

function music_play(track) {
	if (track == null || track === '') {
		return;
	}
	music_send({ action: 'music_play', track: track });
}

function music_stop() {
	music_send({ action: 'music_stop' });
}

/* Apply position once metadata is loaded — wrap with modulo so a long
 * server-side elapsed time on a short looped track lands correctly.
 */
function music_apply_position(position) {
	if (music_audio == null || !isFinite(position) || position <= 0) {
		return;
	}
	var apply = function() {
		var dur = music_audio.duration;
		if (!isFinite(dur) || dur <= 0) {
			return;
		}
		music_audio.currentTime = position % dur;
	};
	if (isFinite(music_audio.duration) && music_audio.duration > 0) {
		apply();
	} else {
		music_audio.addEventListener('loadedmetadata', apply, { once: true });
	}
}

function music_try_play() {
	if (music_audio == null) {
		return;
	}
	var p = music_audio.play();
	if (p && typeof p.catch === 'function') {
		p.catch(function(err) {
			// Autoplay blocked — retry on first user interaction anywhere.
			console.warn('Music autoplay blocked, waiting for user interaction:', err);
			if (music_autoplay_handler != null) {
				return;
			}
			music_autoplay_handler = function() {
				$(document).off('click.music_autoplay keydown.music_autoplay touchstart.music_autoplay');
				music_autoplay_handler = null;
				if (music_audio != null && music_audio.paused) {
					music_audio.play().catch(function(e) {
						console.warn('Music play still failed after interaction:', e);
					});
				}
			};
			$(document).on('click.music_autoplay keydown.music_autoplay touchstart.music_autoplay', music_autoplay_handler);
		});
	}
}

/* Fetch the track and return a same-origin Blob URL. We need this because
 * PHP's built-in server (and some other simple servers) don't support HTTP
 * byte-range requests for media — without ranges, the audio element's
 * `seekable` is empty, making currentTime assignment a no-op. Blob URLs are
 * fully in-memory and always seekable.
 *
 * Two-level cache:
 *   1. music_blob_cache (in-memory) — instant within a tab session.
 *   2. Cache API ('cauldron-music') — persists across reloads and even
 *      browser restarts, so accidental F5 during a session doesn't re-download.
 */
const MUSIC_CACHE_NAME = 'cauldron-music';

function music_load_blob(track) {
	if (music_blob_cache[track]) {
		return Promise.resolve(music_blob_cache[track]);
	}
	var cache_promise = (typeof caches !== 'undefined')
		? caches.open(MUSIC_CACHE_NAME)
		: Promise.reject(new Error('Cache API not available'));

	return cache_promise.then(function(cache) {
		return cache.match(track).then(function(hit) {
			if (hit) {
				return hit;
			}
			return fetch(track).then(function(r) {
				if (!r.ok) {
					throw new Error('HTTP ' + r.status);
				}
				cache.put(track, r.clone());
				return r;
			});
		});
	}).catch(function() {
		// Cache API unavailable (e.g. private/insecure context) — fall back
		// to a plain fetch. Still works, just no persistence.
		return fetch(track).then(function(r) {
			if (!r.ok) {
				throw new Error('HTTP ' + r.status);
			}
			return r;
		});
	}).then(function(r) {
		return r.blob();
	}).then(function(blob) {
		var url = URL.createObjectURL(blob);
		music_blob_cache[track] = url;
		return url;
	});
}

/* Unified state apply — called from WS handlers (music_play/music_stop/music_state). */
function music_apply_state(state) {
	var track = state.track || null;
	var playing = !!state.playing;
	var position = typeof state.position === 'number' ? state.position : 0;

	if (!playing || track == null) {
		if (music_audio != null) {
			music_audio.pause();
			music_audio.src = '';
			music_audio = null;
		}
		music_track = null;
		music_update_ui();
		return;
	}

	if (music_audio != null && music_track === track) {
		// Same track already loaded — just ensure it's playing. Don't jump
		// position: the user may have already been in sync, and a state
		// refresh shouldn't disturb playback.
		if (music_audio.paused) {
			music_try_play();
		}
		music_update_ui();
		return;
	}

	if (music_audio != null) {
		music_audio.pause();
		music_audio.src = '';
		music_audio = null;
	}

	music_track = track;
	music_audio = new Audio();
	music_audio.loop = true;
	music_audio.volume = music_muted ? 0 : music_volume;

	music_audio.addEventListener('timeupdate', music_update_seek);
	music_audio.addEventListener('loadedmetadata', music_update_seek);

	var token = ++music_load_token;
	music_update_ui();
	music_load_blob(track).then(function(url) {
		// If the user/DM moved on to another track while we were fetching,
		// abandon — don't clobber the new audio element.
		if (token !== music_load_token || music_track !== track || music_audio == null) {
			return;
		}
		music_audio.src = url;
		music_apply_position(position);
		music_try_play();
		music_update_ui();
	}).catch(function(err) {
		console.warn('Music track load failed, falling back to direct URL:', err);
		if (token !== music_load_token || music_track !== track || music_audio == null) {
			return;
		}
		music_audio.src = track;
		music_apply_position(position);
		music_try_play();
	});
}

function music_format_track(track) {
	if (track == null) {
		return '';
	}
	// /resources/<key>/audio/<file> → <file>
	var parts = track.split('/');
	try {
		return decodeURIComponent(parts[parts.length - 1]);
	} catch (e) {
		return parts[parts.length - 1];
	}
}

function music_format_time(t) {
	if (!isFinite(t) || t < 0) {
		return '0:00';
	}
	var m = Math.floor(t / 60);
	var s = Math.floor(t % 60);
	return m + ':' + (s < 10 ? '0' : '') + s;
}

function music_update_seek() {
	if (wf_music == null || music_audio == null) {
		return;
	}
	var dur = isFinite(music_audio.duration) ? music_audio.duration : 0;
	var cur = music_audio.currentTime || 0;
	var pct = dur > 0 ? Math.round((cur / dur) * 100) : 0;
	wf_music.find('div.music_pos_fill').css('width', pct + '%');
	wf_music.find('span.music_time').text(music_format_time(cur) + ' / ' + music_format_time(dur));
}

function music_update_ui() {
	if (wf_music == null) {
		return;
	}
	var now_playing = (music_audio != null && music_track != null);
	wf_music.find('span.music_current').text(now_playing ? music_format_track(music_track) : '(stopped)');
	wf_music.find('input.music_vol').val(Math.round(music_volume * 100));
	wf_music.find('button.music_mute').text(music_muted ? 'Unmute' : 'Mute');
	wf_music.find('button.music_sync_btn').prop('disabled', !now_playing);
	if (now_playing == false) {
		wf_music.find('div.music_pos_fill').css('width', '0%');
		wf_music.find('span.music_time').text('0:00 / 0:00');
	}
	music_update_seek();
}

function music_build_panel() {
	var dm = (typeof dungeon_master !== 'undefined' && dungeon_master);

	var html = '<div class="music_panel_body">';
	if (dm) {
		html += '<div class="form-group"><label>Track:</label> ' +
				'<select class="form-control music_select"><option value="">— Select a track —</option></select></div>' +
				'<div class="btn-group" style="margin-bottom:10px">' +
				'<button class="btn btn-primary music_play_btn">Play</button> ' +
				'<button class="btn btn-default music_stop_btn">Stop</button> ' +
				'<button class="btn btn-default music_sync_btn" title="Sync everyone to your current position">Sync</button>' +
				'</div>';
	}
	html += '<div style="margin-bottom:8px"><b>Now playing:</b> <span class="music_current">(stopped)</span></div>';
	html += '<div style="margin-bottom:8px">' +
			'<label>Volume: </label>' +
			'<input class="music_vol" type="range" min="0" max="100" step="1" value="50" style="width:200px;vertical-align:middle" /> ' +
			'<button class="btn btn-xs btn-default music_mute">Mute</button>' +
			'</div>';
	html += '<div style="margin-bottom:8px">' +
			'<label>Position: </label>' +
			'<div class="music_pos_bar" style="display:inline-block;width:200px;height:8px;vertical-align:middle;background:#ddd;border-radius:4px;overflow:hidden">' +
			'<div class="music_pos_fill" style="height:100%;width:0%;background:#5385c1;transition:width 0.2s linear"></div>' +
			'</div> ' +
			'<span class="music_time" style="margin-left:8px">0:00 / 0:00</span>' +
			'</div>';
	html += '</div>';

	return $(html);
}

function music_load_tracks() {
	$.ajax('/adventure/audio').done(function(data) {
		var sel = wf_music.find('select.music_select');
		if (sel.length === 0) {
			return;
		}
		sel.find('option').not('[value=""]').remove();
		wf_music.find('p.music_empty').remove();

		var files = $(data).find('audio sound');
		files.each(function() {
			var path = '/' + $(this).text();
			path = path.substr(0, 11) + resources_key + path.substr(10);
			var name = music_format_track(path);
			sel.append($('<option/>').attr('value', path).text(name));
		});
		if (files.length === 0) {
			sel.after('<p class="music_empty"><i>No audio files. Upload them to the \'audio\' directory in the DM\'s Vault Resources section.</i></p>');
		}
		if (music_track != null) {
			sel.val(music_track);
		}
	});
}

function music_init() {
	music_storage_load();

	var dm = (typeof dungeon_master !== 'undefined' && dungeon_master);
	var content = music_build_panel();
	var tracks_loaded = false;

	wf_music = content.windowframe({
		activator: 'button.music_panel',
		header: 'Background music',
		info: 'DM controls track selection and playback for everyone. Volume, mute, and position are local to each player. The current track loops automatically.',
		width: 500,
		open: function() {
			if (dm && tracks_loaded == false) {
				tracks_loaded = true;
				music_load_tracks();
			}
			music_update_ui();
		}
	});

	if (dm) {
		wf_music.on('click', 'button.music_play_btn', function() {
			var track = wf_music.find('select.music_select').val();
			if (track !== '') {
				music_play(track);
			}
		});
		wf_music.on('click', 'button.music_stop_btn', function() {
			music_stop();
		});
		wf_music.on('click', 'button.music_sync_btn', function() {
			music_sync();
		});
	}

	wf_music.on('input', 'input.music_vol', function() {
		music_set_volume(parseInt($(this).val(), 10) / 100);
	});
	wf_music.on('click', 'button.music_mute', function() {
		music_toggle_mute();
	});

	music_update_ui();
}

$(document).ready(function() {
	music_init();
});
