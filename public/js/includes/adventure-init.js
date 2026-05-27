
/* Main
 */
$(document).ready(function() {
	group_key = $('div.playarea').attr('group_key');
	adventure_id = parseInt($('div.playarea').attr('adventure_id'));
	map_id = parseInt($('div.playarea').attr('map_id'));
	map_width = $('div.playarea > div').width();
	map_height = $('div.playarea > div').height();
	user_id = parseInt($('div.playarea').attr('user_id'));
	resources_key = $('div.playarea').attr('resources_key');
	grid_cell_size = parseInt($('div.playarea').attr('grid_cell_size'));
	my_name = $('div.sidebar').attr('name');
	character_name = $('div.playarea').attr('name');
	dungeon_master = ($('div.playarea').attr('is_dm') == 'yes');
	fow_type = parseInt($('div.playarea').attr('fog_of_war'));
	fow_map_distance = parseInt($('div.playarea').attr('fow_distance'));
	player_notes = $('div.playarea div.notes').text();
	var version = $('div.playarea').attr('version');
	var ws_host = $('div.playarea').attr('ws_host');
	var ws_port = $('div.playarea').attr('ws_port');

	var my_char = $('div.playarea').attr('my_char');
	if (my_char != undefined) {
		my_character = $('div#' + my_char);
	}

	if (('ontouchstart' in window) || (navigator.maxTouchPoints > 0) || (navigator.msMaxTouchPoints > 0)) {
		mobile_device = true;
	}

	write_sidebar('<img src="/images/cauldron.png" style="max-width:80px; display:block; margin:0 auto" draggable="false" />');
	write_sidebar('<b>Welcome to Cauldron v' + version + '</b>');
	write_sidebar('Type /help for command information.');
	write_sidebar('You are ' + character_name + '.');

	/* Rule system initialize
	 */
	rule_system_initialize();

	if (dungeon_master) {
		/* Pauze button
		 */
		$('div.menu button.pause').on('click', function() {
			pause = (pause == false);

			if (pause) {
				$(this).addClass('btn-primary');
				$(this).removeClass('btn-default');
				write_sidebar('The game is paused.');
			} else {
				$(this).addClass('btn-default');
				$(this).removeClass('btn-primary');
				write_sidebar('The game is continued.');
			}

			var data = {
				action: 'pause',
				pause: pause
			};
			websocket_send(data);

			localStorage.setItem('pause', pause);
		});
	}

	/* Websocket
	 */
	websocket = new WebSocket('ws://' + ws_host + ':' + ws_port + '/websocket');

	websocket.onopen = function(event) {
		var data = {
			group_key: group_key
		};
		websocket_send(data);

		if (dungeon_master) {
			if (localStorage.getItem('pause') == 'true') {
				$('div.menu button.pause').trigger('click');
			}

			var color = $('div.draw-tools div.draw-colors span:nth-child(' + DRAW_DEFAULT_COLOR + ')').css('background-color');
			var data = {
				action: 'draw_color',
				color: color
			};
			websocket_send(data);

			var data = {
				action: 'draw_width',
				width: DRAW_DEFAULT_WIDTH
			};
			websocket_send(data);

			var data = {
				action: 'draw_clear'
			};
			websocket_send(data);
		}

		$('div.draw-tools div.draw-colors span:nth-child(' + DRAW_DEFAULT_COLOR + ')').trigger('click');

		write_sidebar('Connection established.');
		var role = (dungeon_master) ? 'being the' : 'playing';
		send_message(my_name + ' entered the session, ' + role + ' ' + character_name + '.', null, false);

		rule_system_websocket_open();

		if (my_character != null) {
			/* Unhide character
			 */
			if (my_character.attr('is_hidden') == 'yes') {
				object_show_command(my_character);
				scroll_to_my_character();
			}

			/* Request map status from DM
			 */
			var data = {
				action: 'request_init',
				user_id: user_id,
				char_id: my_character.prop('id')
			};
			websocket_send(data);
		}

		if ((fow_type == FOW_DAY_REAL) || (fow_type == FOW_NIGHT_REAL)) {
			if (FOW_REAL_FAST) {
				return;
			}
		}
	}

	websocket.onmessage = function(event) {
		try {
			data = JSON.parse(event.data);
		} catch (e) {
			return;
		}

		if (data.adventure_id != adventure_id) {
			return;
		} else if (data.map_id != map_id) {
			return;
		} else if (data.from_user_id == user_id) {
			return;
		}

		if (typeof data.to_char_id !== 'undefined') {
			if (dungeon_master && (data.to_char_id != 0)) {
				return;
			} else if (my_character != null) {
				if (data.to_char_id != my_character.prop('id')) {
					return;
				}
			}
		}

		if (typeof data.to_user_id !== 'undefined') {
			if (data.to_user_id != user_id) {
				return;
			}
		}

		delete data.adventure_id;
		delete data.from_user_id;

		if (rule_system_websocket_message(data)) {
			return;
		}

		switch (data.action) {
			case 'adventure_custom_value':
				adventure_custom_value_action(data.key, data.value);
				break;
			case 'alternate':
				var img_size = data.size * grid_cell_size;
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).css('width', img_size + 'px');
				$('div#' + data.char_id).find('img').css('height', img_size + 'px');
				break;
			case 'audio':
				var audio = new Audio(data.filename);
				audio.play();
				break;
			case 'create':
				var obj = '<div id="token' + data.instance_id + '" token_id="' + data.token_id +'" class="token" style="left:' + data.pos_x + 'px; top:' + data.pos_y + 'px; z-index:' + LAYER_TOKEN + '" type="' + data.type + '" is_hidden="no" rotation="0" armor_class="' + data.armor_class + '" hitpoints="' + data.hitpoints + '" damage="0" name="">' +
						  '<img src="' + data.url + '" style="width:' + data.width + 'px; height:' + data.height + 'px;" draggable="false" />' +
						  '</div>';
				$('div.playarea div.tokens').append(obj);
				$('div#token' + data.instance_id).on('contextmenu', object_contextmenu_player);
				break;
			case 'character_custom_value':
				var obj = $('div#' + data.instance_id);
				character_custom_value_action(obj, data.key, data.value);
				break;
			case 'delete':
				var obj = $('div#' + data.instance_id);
				obj.remove();
				break;
			case 'door_state':
				var obj = $('div#' + data.door_id);
				switch (data.state) {
					case 'closed': door_show_closed(obj); break;
					case 'open': door_show_open(obj); break;
				}
				break;
			case 'draw_brush':
				drawing_ctx.beginPath();
				var pattern = drawing_ctx.createPattern(brushes[data.brush], 'repeat');
				drawing_ctx.strokeStyle = pattern;
				break
			case 'draw_clear':
				drawing_ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height);

				if (fow_type == FOW_REVEAL) {
					fog_of_war_reset();
				}
				break
			case 'draw_color':
				drawing_ctx.beginPath();
				drawing_ctx.strokeStyle = data.color;
				break
			case 'draw_move':
				drawing_ctx.globalCompositeOperation = (data.erase == 'yes') ? 'destination-out' : 'source-over';
				drawing_ctx.lineWidth = data.width;
				drawing_ctx.beginPath();
				drawing_ctx.moveTo(data.draw_x, data.draw_y);
				break
			case 'draw_line':
				drawing_ctx.lineCap = data.linecap;
				drawing_ctx.lineTo(data.draw_x, data.draw_y);
				drawing_ctx.stroke();
				break
			case 'draw_width':
				drawing_ctx.beginPath();
				drawing_ctx.lineWidth = data.width;
				break;
			case 'effect_create':
				if (data.map_id != map_id) {
					break;
				}
				if ($('div#' + data.instance_id).length == 0) {
					effect_create_object(data.instance_id, data.src, data.pos_x, data.pos_y, data.width, data.height);
				}
				break;
			case 'effect_delete':
				$('div#' + data.instance_id).remove();
				break;
			case 'fill_texture':
				var image = new Image();
				image.src = data.src;
				$(image).on('load', function() {
					var pattern = drawing_ctx.createPattern(image, 'repeat');
					drawing_ctx.fillStyle = pattern;
					drawing_ctx.fillRect(0, 0, drawing_canvas.width, drawing_canvas.height);
				});
				break;
			case 'found':
				collectable_found_action(data.collectable_id);
				collectables_reopen_inventory();
				break;
			case 'fow_distance':
				var distance = parseInt(data.distance);
				if (isNaN(distance)) {
					break;
				}

				var obj = $('div#' + data.instance_id);
				obj.attr('vision', data.distance);

				if (my_character == null) {
					break;
				} else if (my_character.prop('id') != data.instance_id) {
					break;
				}

				distance = character_vision(obj);

				fog_of_war_set_distance(distance);
				fog_of_war_update(my_character);
				break;
			case 'handover':
				if (data.owner_id != my_character.prop('id')) {
					return;
				}

				if (data.instance_id.substring(0, 4) == 'zone') {
					var handle = null;
				} else {
					var handle = 'img';
				}

				var obj = $('div#' + data.instance_id);

				obj.draggable({
					containment: 'div.playarea > div',
					handle: handle,
					drag: draggable_drag_correction,
					stop: function(event, ui) {
						object_move($(this));
					}
				});

				if (obj.hasClass('token') || obj.hasClass('character')) {
					obj.draggable({
						start: object_drag_start,
						drag: object_drag_drag,
						stop: object_drag_stop
					});
				}

				obj.css('cursor', 'grab');

				message_to_sidebar('You can now control ' + object_target_link(obj) + '.');

				if (data.instance_id.substring(0, 4) == 'zone') {
					return;
				} else if (data.instance_id.substring(0, 6) == 'effect') {
					return;
				}

				obj.find('img').off('contextmenu');
				obj.find('img').on('contextmenu', function(event) {
					$('div.selected').removeClass('selected');

					var menu_entries = {};

					menu_entries['info'] = { name:'Get infomation', icon:'fa-info-circle' };
					menu_entries['view'] = { name:'View', icon:'fa-search' };
					menu_entries['sep1'] = '-';

					if (obj.attr('token_type') == 'topdown') {
						menu_entries['rotate'] = { name:'Rotate', icon:'fa-compass', items:{
							'rotate_n':  { name:'North', icon:'fa-arrow-circle-up' },
							'rotate_ne': { name:'North East' },
							'rotate_e':  { name:'East', icon:'fa-arrow-circle-right' },
							'rotate_se': { name:'South East' },
							'rotate_s':  { name:'South', icon:'fa-arrow-circle-down' },
							'rotate_sw': { name:'South West' },
							'rotate_w':  { name:'West', icon:'fa-arrow-circle-left' },
							'rotate_nw': { name:'North West' }
						}};
					}

					menu_entries['lower'] = { name:'Lower', icon:'fa-arrow-down' };
					menu_entries['sep2'] = '-';

					rule_system_menu_token_handover(menu_entries, obj);
					if (object_last_item(menu_entries) != '-') {
						menu_entries['sep3'] = '-';
					}

					menu_entries['marker'] = { name:'Set marker', icon:'fa-map-marker' };
					menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };

					context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);

					return false;
				});

				break;
			case 'hide':
				var obj = $('div#' + data.instance_id);
				object_hide_action(obj);
				break;
			case 'journal_add':
				journal_add_entry(data.name, data.content, data.entry_id);
				write_sidebar(data.name + ' added a journal entry.');
				break;
			case 'journal_update':
				var entry = $('div.journal div.entry[entry_id=' + data.entry_id + ']');
				if (data.content == '') {
					entry.remove();
				} else {
					entry.find('span.content').text(data.content);
				}
				break;
			case 'known':
				var obj = $('div#' + data.instance_id);
				obj.find('span.name').attr('known', data.known);
				obj.find('span.name').css('display', (data.known == 'yes') ? 'block' : 'none');
				break;
			case 'light_create':
				light_create_object(data.instance_id, data.pos_x, data.pos_y, data.radius);
				break;
			case 'light_delete':
				var obj = $('div#' + data.instance_id);
				light_delete(obj);
				break;
			case 'light_radius':
				var obj = $('div#' + data.instance_id);
				light_radius(obj, data.radius);
				break;
			case 'light_state':
				var light = $('div#light' + data.light_id);
				light_state(light, data.state);
				break;
			case 'lower':
				var obj = $('div#' + data.instance_id);
				obj.parent().prepend(obj);
				break;
			case 'map_image':
				var image = $('<img src="' + data.url + '" />');
				image.one('load', function() {
					$('div#map_background').css('background-image', 'url(' + data.url + ')');
					delete image;
				});
				break;
			case 'marker':
				marker_create(data.pos_x, data.pos_y, data.name);
				break;
			case 'move':
				var obj = $('div#' + data.instance_id);

				obj.stop(false, true);
				obj.animate({
					left: data.pos_x,
					top: data.pos_y
				}, data.speed, function() {
					if (obj.is(my_character)) {
						var pos = {
							left: data.pos_x,
							top: data.pos_y
						}

						zone_init_presence();
					} else if (obj.hasClass('zone') && (my_character != null)) {
						var pos = object_position(my_character);
						if (zone_covers_position(obj, pos)) {
							if (zone_presence.includes(data.instance_id) == false) {
								zone_presence.push(data.instance_id);
							}
						} else {
							if (zone_presence.includes(data.instance_id)) {
								zone_presence = zone_presence.remove(data.instance_id);
							}
						}
					}

					if (keep_centered && obj.is(my_character)) {
						scroll_to_my_character(0);
					}

					/* Fog of War
					 */
					if (obj.is(fow_obj) || obj.is(my_character)) {
						fog_of_war_update(obj);
					} else if (obj.hasClass('character') && (my_character != null)) {
						if (parseInt(obj.attr('light')) > 0) {
							fog_of_war_update(my_character);
						}
					}
				});
				break;
			case 'night':
				$('div.night').css('background-color', 'rgba(0, 0, 0, ' + data.level + ')');
				break;
			case 'noscript':
				script_disable_all();
				break;
			case 'pause':
				pause = data.pause;

				if (data.pause) {
					$('div.pause').show();
					$('div.input input').trigger('blur');
				} else {
					$('div.pause').hide();
				}
				break;
			case 'ping':
				var data = {
					action: 'pong',
					user_id: 0,
					name: my_name + ' (' + character_name + ')'
				};
				websocket_send(data);
				break;
			case 'player_notes':
				player_notes = data.notes;
				var notes = $('div.collectables textarea.notes');
				if (notes.length > 0) {
					notes.val(player_notes);
				}
				break;
			case 'pong':
				if (dungeon_master) {
					write_sidebar('&ndash; ' + data.name);
				}
				break;
			case 'reload':
				document.location = '/adventure/' + adventure_id;
				break;
			case 'request_init':
				if (dungeon_master == false) {
					break;
				} else if (data.map_id != map_id) {
					break;
				}

				var to_user_id = data.user_id;
				var char_id = data.char_id;

				if (pause) {
					var data = {
						action: 'pause',
						pause: true
					};
					websocket_send(data);
				}

				drawing_history.forEach(function(draw) {
					draw.to_user_id = to_user_id;
					websocket_send(draw);
				});

				$('div.effect').each(function() {
					var pos = object_position($(this));

					var data = {
						action: 'effect_create',
						to_user_id: to_user_id,
						instance_id: $(this).prop('id'),
						src: $(this).find('img').prop('src'),
						pos_x: pos.left,
						pos_y: pos.top,
						width: Math.round($(this).width() / grid_cell_size),
						height: Math.round($(this).height() / grid_cell_size)
					};
					websocket_send(data);
				});

				var data = {
					action: 'night',
					to_user_id: to_user_id,
					level: night_level
				};
				websocket_send(data);

				$('div.window[transparent=no]').each(function() {
					window_send_state($(this));
				});
				break;
			case 'rotate':
				var obj = $('div#' + data.instance_id);
				object_rotate_action(obj, data.rotation, data.speed);
				break;
			case 'dice_animate':
				if (typeof dice_animate_only == 'function') {
					dice_animate_only(data.dice, data.seed);
				}
				break;
			case 'dice_roll_hidden':
				if (!dungeon_master) { break; }
				if (typeof dice_roll_hidden_local == 'function') {
					dice_roll_hidden_local(data.dice, data.addition, data.notation, data.seed, data.name);
				}
				break;
			case 'say':
				message_to_sidebar(data.mesg, data.name);
				break;
			case 'scan':
				var data = {
					action: 'reveal',
					name: character_name
				};
				websocket_send(data);
				break;
			case 'shape':
				var size = parseInt(data.size)
				$('div#' + data.char_id).find('img').attr('src', '/resources/' + resources_key + '/' + data.src);
				$('div#' + data.char_id).css('width', (grid_cell_size * size) + 'px');
				$('div#' + data.char_id).find('img').css('height', (grid_cell_size * size) + 'px');
				break;
			case 'show':
				var obj = $('div#' + data.instance_id);
				object_show_action(obj);
				break;
			case 'takeback':
				var obj = $('div#' + data.instance_id);

				if (obj.css('cursor') != 'grab') {
					return;
				}

				obj.css('cursor', 'default');
				obj.find('img').css('cursor', 'default');
				obj.draggable('destroy');
				obj.removeClass('selected');

				obj.find('img').off('contextmenu');
				obj.find('img').on('contextmenu', object_contextmenu_player);

				message_to_sidebar('You can no longer control ' + object_target_link(obj) + '.');
				break;
			case 'travel':
				if (data.instance_id == my_character.prop('id')) {
					document.location = '/adventure/' + adventure_id + '/' + data.travel_map_id;
				}
				break;
			case 'turn':
				if (my_character == null) {
					break;
				}

				if (my_character.attr('char_id') == data.char_id) {
					zone_check_presence_for_turn(my_character);
				}
				break;
			case 'unfound':
				collectable_unfound_action(data.collectable_id);
				collectables_reopen_inventory();
				break;
			case 'window_state':
				var obj = $('div#' + data.window_id);
				switch (data.transparent) {
					case 'no': window_show_closed(obj); break;
					case 'yes': window_show_open(obj); break;
				}
				break;
			case 'zone_create':
				zone_create_object(data.instance_id, data.pos_x, data.pos_y, data.width, data.height,
				                   data.color, data.opacity, data.group, data.altitude);
				break;
			case 'zone_delete':
				var zone = $('div#' + data.instance_id);
				var altitude = parseInt(zone.attr('altitude'));
				zone.remove();

				if (altitude > 0) {
					if (my_character != null) {
						fog_of_war_update(my_character);
					} else if (fow_obj != null) {
						fog_of_war_update(fow_obj);
					}
				}
				break;
			case 'zone_group':
				if (data.zone_group != '') {
					$('div#' + data.zone_id).attr('group', data.zone_group);
				} else {
					$('div#' + data.zone_id).removeAttr('group');
				}
				break;
			default:
				write_sidebar('Unknown action: ' + data.action);
		}
	};

	websocket.onerror = function(event) {
		write_sidebar('Connection error. Does your firewall allow outgoing traffic via port ' + ws_port + '?');
		websocket = null;
	};

	websocket.onclose = function(event) {
		write_sidebar('Connection closed.');
		window.setTimeout(function() {
			cauldron_alert('The connection to the server was lost. Refresh the page to reconnect.');
		}, 1000);
		websocket = null;
	};

	/* Menu
	 */
	$('button.open_menu').on('click', function(event) {
		var skip = 1;
		$('div.menu').toggle();
		$('body').one('click', function() {
			$('div.menu').hide();
		});
		event.stopPropagation();
	});

	$('div.menu').on('click', function(event) {
		event.stopPropagation();
	});

	$('div.menu button').on('click', function(event) {
		$('div.menu').hide();
	});

	$('div.menu').css('z-index', LAYER_MENU);

	var map = $('div.playarea > div');
	var width = Math.round(map.width());
	var height = Math.round(map.height());

	/* Layers
	 */
	$('div.night').css('z-index', LAYER_NIGHT);
	$('div.drawing').css('z-index', LAYER_DRAWING);
	$('div.grid').css('z-index', LAYER_GRID);
	$('div.zones').css('z-index', LAYER_ZONE);
	$('div.walls').css('z-index', LAYER_CONSTRUCT);
	$('div.doors').css('z-index', LAYER_CONSTRUCT);
	$('div.blinders').css('z-index', LAYER_CONSTRUCT);
	$('div.lights').css('z-index', LAYER_LIGHT);
	$('div.tokens').css('z-index', LAYER_TOKEN);
	$('div.effects').css('z-index', LAYER_EFFECT);
	$('div.characters').css('z-index', LAYER_CHARACTER);
	$('div.markers').css('z-index', LAYER_MARKER);
	$('div.fog_of_war').css('z-index', LAYER_FOG_OF_WAR);

	/* Night mode
	 */
	$('div.night').css({
		width:width,
		height:height
	});

	/* Show grid
	 */
	if ($('div.playarea').attr('show_grid') == 'yes') {
		grid_init(grid_cell_size);
		$('div.grid canvas').css('z-index', LAYER_GRID);
	}

	/* Map offset
	 */
	var map_offset_x = parseInt($('div.playarea').attr('offset_x'));
	var map_offset_y = parseInt($('div.playarea').attr('offset_y'));

	if ((map_offset_x > 0) || (map_offset_y > 0)) {
		var map = $('div.playarea div:first video');
		if (map.length == 0) {
			map = $('div.playarea div#map_background');
			map.css('background-position', '-' + map_offset_x + 'px -' + map_offset_y + 'px');
		} else {
			map.css('margin-left', '-' + map_offset_x + 'px');
			map.css('margin-top', '-' + map_offset_y + 'px');
		}
	}

	/* Drawing
	 */
	drawing_canvas = $('canvas#drawing');
	drawing_canvas.css('z-index', LAYER_DRAWING);
	drawing_canvas = drawing_canvas[0];

	drawing_ctx = drawing_canvas.getContext('2d');
	drawing_ctx.lineWidth = DRAW_DEFAULT_WIDTH;
	drawing_ctx.strokeStyle = DRAW_DEFAULT_COLOR;

	drawing_ctx.lineJoin = 'bevel';

	/* Zoom with mouse wheel */
	$('div.playarea').on('wheel', function(event) {
		event.preventDefault();

		var delta = event.originalEvent.deltaY < 0 ? zoom_step : -zoom_step;
		var new_zoom = Math.min(zoom_max, Math.max(zoom_min, zoom_level + delta));

		if (new_zoom === zoom_level) {
			return;
		}

		var offset = $(this).offset();
		var cx = event.clientX - offset.left;
		var cy = event.clientY - offset.top;

		var mx = (cx - zoom_tx) / zoom_level;
		var my = (cy - zoom_ty) / zoom_level;

		zoom_level = new_zoom;
		zoom_tx = cx - mx * zoom_level;
		zoom_ty = cy - my * zoom_level;

		apply_zoom();
	});



	if (dungeon_master) {
		var handle = $('div#draw_width div');
		$('div#draw_width').slider({
			value: DRAW_DEFAULT_WIDTH,
			min: 1,
			max: grid_cell_size,
			create: function() {
				handle.text($(this).slider("value"));
			},
			slide: function(event, ui) {
				handle.text(ui.value);
			},
			stop: function(event, ui) {
				drawing_ctx.lineWidth = ui.value;

				var data = {
					action: 'draw_width',
					width: ui.value
				};
				websocket_send(data);
				drawing_history.push(data);
			}
		});

		$('canvas#drawing').on('mousedown', function(event) {
			if (event.button != 0) {
				return true;
			}

			if ($('div.ruler').length > 0) {
				$(this).remove();
				return true;
			}

			var pos = $('div.playarea').position();
			var canvas_x = Math.round(pos.left) + 1;
			var canvas_y = Math.round(pos.top) + 1;

			if (shift_down) {
				drawing_ctx.globalCompositeOperation = 'destination-out';
				if (ctrl_down == false) {
					drawing_ctx.lineWidth = DRAW_ERASE_THIN;
				} else if (alt_down) {
					drawing_ctx.lineWidth = grid_cell_size;
				} else {
					drawing_ctx.lineWidth = DRAW_ERASE_THICK;
				}
			} else if (ctrl_down) {
				drawing_ctx.globalCompositeOperation = drawing_mode;
				drawing_ctx.lineWidth = parseInt($('div#draw_width div').text());
			} else {
				return;
			}

			var dpos = viewport_to_map(event.clientX, event.clientY);
			var draw_x = dpos.x;
			var draw_y = dpos.y;

			var half_grid = grid_cell_size >> 1;
			var draw_wide = drawing_ctx.lineWidth > half_grid;
			if (alt_down) {
				draw_x = coord_to_grid(draw_x, draw_wide == false);
				draw_y = coord_to_grid(draw_y, draw_wide == false);

				if (draw_wide) {
					draw_x += half_grid;
					draw_y += half_grid;
				}
			}

			var data = {
				action: 'draw_move',
				erase: shift_down ? 'yes' : 'no',
				width: drawing_ctx.lineWidth,
				draw_x: draw_x,
				draw_y: draw_y
			};
			websocket_send(data);
			drawing_history.push(data);

			drawing_ctx.beginPath();
			drawing_ctx.moveTo(draw_x, draw_y);

			var draw_prev_x = null;
			var draw_prev_y = null;

			var draw = function(event) {
				var dpos = viewport_to_map(event.clientX, event.clientY);
				var draw_x = dpos.x;
				var draw_y = dpos.y;

				if (alt_down) {
					draw_x = coord_to_grid(draw_x, draw_wide == false);
					draw_y = coord_to_grid(draw_y, draw_wide == false);

					if (draw_wide) {
						draw_x += half_grid;
						draw_y += half_grid;
					}
				}

				if ((draw_x == draw_prev_x) && (draw_y == draw_prev_y)) {
					return;
				}

				draw_prev_x = draw_x;
				draw_prev_y = draw_y;

				if ((drawing_ctx.lineWidth == grid_cell_size) && alt_down) {
					drawing_ctx.lineCap = 'square';
				} else {
					drawing_ctx.lineCap = 'round';
				}

				var data = {
					action: 'draw_line',
					draw_x: draw_x,
					draw_y: draw_y,
					linecap: drawing_ctx.lineCap
				};
				websocket_send(data);
				drawing_history.push(data);

				drawing_ctx.lineTo(draw_x, draw_y);
				drawing_ctx.stroke();
			}

			draw(event);
			$('canvas#drawing').on('mousemove', function(event) {
				draw(event);
			});

			$('canvas#drawing').on('mouseleave', function(event) {
				drawing_ctx.closePath();
			});

			$('canvas#drawing').on('mouseenter', function(event) {
				var dpos = viewport_to_map(event.clientX, event.clientY);
				var draw_x = dpos.x;
				var draw_y = dpos.y;

				drawing_ctx.beginPath();
				drawing_ctx.moveTo(draw_x, draw_y);
			});

			$('canvas#drawing').one('mouseup', function() {
				$('canvas#drawing').off('mousemove');
			});
		});

		$('div.draw-tools div.draw-colors span').on('click', function() {
			var color = $(this).css('background-color');

			drawing_ctx.strokeStyle = color;
			drawing_mode = 'source-over';

			var data = {
				action: 'draw_color',
				color: color
			};
			websocket_send(data);
			drawing_history.push(data);

			$('div.draw-tools div.draw-colors span').css('box-shadow', '');
			$('div.draw-tools div.draw-brushes span').css('box-shadow', '');
			$(this).css('box-shadow', '0 0 5px 2px #0080ff');
		});

		$('div.draw-tools div.draw-brushes span').on('click', function() {
			if ($(this).attr('title') == 'Fog of War') {
				drawing_ctx.strokeStyle = FOW_COLOR_DM;
				drawing_mode = 'xor';
			} else {
				var img = new Image();
				img.src = $(this).attr('brush');
				img.onload = function() {
					var pattern = drawing_ctx.createPattern(img, 'repeat');
					drawing_ctx.strokeStyle = pattern;
				};
				drawing_mode = 'source-over';
			}

			var data = {
				action: 'draw_brush',
				brush: $(this).attr('brush')
			};
			websocket_send(data);
			drawing_history.push(data);

			$('div.draw-tools div.draw-colors span').css('box-shadow', '');
			$('div.draw-tools div.draw-brushes span').css('box-shadow', '');
			$(this).css('box-shadow', '0 0 5px 2px #0080ff');
		});

		$('div.draw-tools div.draw-brushes span').on('contextmenu', function(event) {
			menu_entries = {
				'fill_texture': { name:'Fill map with texture', icon:'fa-square' }
			};

			var menu_settings = {
				root: 'body',
				z_index: LAYER_MENU
			};

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_settings);
			return false;

		});

		$('button.draw_clear').on('click', function() {
			var image = $('div#map_background').css('background-image');
			image = image.substring(image.length - 15, image.length - 2);

			var clear_dialog = '<div class="clear"><p>Remove drawings?</p>';
			if (image == 'empty_map.png') {
				clear_dialog +=
					'<div><input type="checkbox" checked="checked" class="remove_effects"> Remove effects.</div>' +
					'<div><input type="checkbox" checked="checked" class="remove_tokens"> Remove tokens.</div>' +
					'<div><input type="checkbox" checked="checked" class="remove_zones"> Remove zones.</div>';
			}
			clear_dialog += '</div>';

			var wf_clear_window = $(clear_dialog).windowframe({
				header: 'Remove map items',
				buttons: {
					'Remove': function() {
						/* Drawings
						 */
						var data = {
							action: 'draw_clear'
						};
						websocket_send(data);

						drawing_history = [];

						var data = {
							action: 'draw_color',
							color: drawing_ctx.strokeStyle
						};
						drawing_history.push(data);

						var data = {
							action: 'draw_width',
							width: drawing_ctx.lineWidth
						};
						drawing_history.push(data);

						drawing_ctx.clearRect(0, 0, drawing_canvas.width, drawing_canvas.height);

						if (fow_type == FOW_REVEAL) {
							fog_of_war_reset();
						}

						/* Effects
						 */
						if (wf_clear_window.find('input.remove_effects').prop('checked')) {
							$('div.effect').each(function() {
								var data = {
									action: 'effect_delete',
									instance_id: $(this).prop('id')
								};
								websocket_send(data);

								$(this).remove();
							});
						}

						/* Tokens
						 */
						if (wf_clear_window.find('input.remove_tokens').prop('checked')) {
							$('div.token').each(function() {
								object_delete($(this));
							});
						}

						/* Zones
						 */
						if (wf_clear_window.find('input.remove_zones').prop('checked')) {
							$('div.zone').each(function() {
								zone_delete($(this));
							});
						}

						$(this).close();
					},
					'Cancel': function() {
						$(this).close();
					},
				},
				close: function() {
					wf_clear_window.destroy();
				}
			});

			wf_clear_window.open();
		});
	}

	/* Doors
	 */
	$('div.door').each(function() {
		door_position($(this));
	});

	$('div.door').css('z-index', LAYER_CONSTRUCT);

	if (dungeon_master) {
		$('div.door').on('contextmenu', function(event) {
			var menu_entries = {};

			if ($(this).attr('state') == 'open') {
				menu_entries['door_close'] = { name:'Close', icon:'fa-toggle-off' };
			} else {
				menu_entries['door_open'] = { name:'Open', icon:'fa-toggle-on' };
			}

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		$('div.door').on('dblclick', function(event) {
			if ($(this).attr('state') == 'open') {
				door_make_closed($(this));
			} else {
				door_make_open($(this));
			}
		});
	}

	/* Walls
	 */
	$('div.wall[transparent="yes"]').addClass('window');

	$('div.wall').each(function() {
		wall_position($(this));
	});

	$('div.wall').css('z-index', LAYER_CONSTRUCT);

	$('div.wall[transparent=yes]').on('contextmenu', function(event) {
		var menu_entries = {};

		if ($(this).attr('transparent') == 'yes') {
			menu_entries['window_close'] = { name:'Close', icon:'fa-toggle-off' };
		} else {
			menu_entries['window_open'] = { name:'Open', icon:'fa-toggle-on' };
		}

		context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
		return false;
	});

	/* Lights
	 */
	if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
		$('div.light').css('z-index', LAYER_LIGHT);
	}

	/* Blinders
	 */
	$('div.blinder').each(function() {
		blinder_position($(this));
	});

	$('div.blinder').css('z-index', LAYER_CONSTRUCT);

	/* Zones
	 */
	$('div.zone').css('z-index', LAYER_ZONE);

	/* Objects
	 */
	if ($('video').length > 0) {
		$('video').on('loadeddata', function() {
			$('div.token[is_hidden=no]').each(function() {
				$(this).show();
			});
		});
		$('video').on('play', function() {
			$('button.playvideo').remove();
		});
		$('video').append('<source src="' + $('video').attr('source') + '"></source>');
	} else {
		$('div.token[is_hidden=no]').each(function() {
			$(this).show();
		});
	}

	$('div.character[is_hidden=yes]').each(function() {
		object_hide_action($(this));
	});

	$('div.token').each(function() {
		$(this).css('z-index', LAYER_TOKEN);
		object_rotate_action($(this), $(this).attr('rotation'), 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	$('div.character').each(function() {
		$(this).css('z-index', LAYER_CHARACTER);
		object_rotate_action($(this), $(this).attr('rotation'), 0);

		if ($(this).attr('hitpoints') > 0) {
			if ($(this).attr('damage') == $(this).attr('hitpoints')) {
				object_dead($(this));
			}
		}
	});

	if (dungeon_master) {
		/* Dungeon Master settings
		 */
		$('div.zone').draggable({
			containment: 'div.playarea > div',
			drag: draggable_drag_correction,
			stop: function(event, ui) {
				object_move($(this));
			}
		});
		$('div.zone').filter(function() {
			return $(this).css('background-color') == 'rgb(0, 0, 0)';
		}).hover(function() {
			$(this).css('border', '1px solid #a0a000');
		}, function() {
			$(this).css('border', '');
		});

		if ($('div.character').length == 0) {
			write_sidebar('<hr class="top" />');
			write_sidebar('There are no player characters in your adenture. Invite players via the invitation code as set in the <a href="/vault/invite">Invite</a> section in the Dungeon Master\'s Vault. After that, add their characters via the <a href="/vault/players">Players</a> section.');
			write_sidebar('<hr class="bottom" />');
		};

		$('div.character, div.token').each(function() {
			var hitpoints = parseInt($(this).attr('hitpoints')) - parseInt($(this).attr('damage'));
			$(this).attr('title', 'HP: ' + hitpoints);
		});

		/* Drag multiple tokens and characters
		 */
		$('div.token, div.character').draggable({
			containment: 'div.playarea > div',
			handle: 'img',
			start: object_drag_start,
			drag: object_drag_drag,
			stop: object_drag_stop
		});

		if (mobile_device == false) {
			$('div.characters div.character img').on('click', object_click);
			$('div.characters div.character img').on('dblclick', object_dblclick);
			$('div.tokens div.token img').on('click', object_click);
			$('div.tokens div.token img').on('dblclick', object_dblclick);
		}

		$('div.playarea').on('click', playarea_click);

		$('div.token[is_hidden=yes]').each(function() {
			$(this).fadeTo(0, OBJECT_HIDDEN_FADE);
		});

		$('div.light').each(function() {
			var state = $(this).attr('state');
			var radius = $(this).attr('radius');
			$(this).append('<img src="/images/light_' + state + '.png" title="Radius: ' + radius + '" style="width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px;" />');
		});

		$('div.light').draggable({
			containment: 'div.playarea > div',
			handler: 'img',
			drag: draggable_drag_correction,
			stop: function(event, ui) {
				object_move($(this));
			}
		});

		$('div.light').on('dblclick', function(event) {
			light_toggle($(this));
			event.stopPropagation();
		});

		$('div.light').on('contextmenu', function(event) {
			var menu_entries = {};

			if ($(this).attr('state') == 'on') {
				menu_entries['light_toggle'] = { name:'Turn off', icon:'fa-toggle-off' };
			} else {
				menu_entries['light_toggle'] = { name:'Turn on', icon:'fa-toggle-on' };
			}

			menu_entries['light_delete'] = { name:'Delete', icon:'fa-trash' };

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu zones
		 */
		zone_menu = {};
		zone_menu['info'] = { name:'Get information', icon:'fa-info-circle' };
		zone_menu['sep1'] = '-';
		zone_menu['marker'] = { name:'Set marker', icon:'fa-map-marker' };
		zone_menu['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
		zone_menu['coordinates'] = { name:'Show coordinates', icon:'fa-flag' };
		zone_menu['effect_create'] = { name:'Create effect', icon:'fa-fire' };

		if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
			zone_menu['light_create'] = { name:'Create light', icon:'fa-lightbulb-o' };
		}

		zone_menu['sep2'] = '-';
		rule_system_menu_zone(zone_menu);
		if (object_last_item(zone_menu) != '-') {
			zone_menu['sep3'] = '-';
		}

		zone_menu['handover'] = { name:'Hand over', icon:'fa-hand-stop-o' };
		zone_menu['takeback'] = { name:'Take back', icon:'fa-hand-grab-o' };
		zone_menu['sep4'] = '-';
		zone_menu['zone_delete'] = { name:'Delete', icon:'fa-trash' };

		$('div.zone').on('contextmenu', function(event) {
			var menu_entries = zone_menu;

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu tokens
		 */
		$('div.tokens div.token img').on('contextmenu', object_contextmenu_dm);

		/* Menu characters
		 */
		$('div.character img').on('contextmenu', function(event) {
			var obj = $(this).parent();

			$('div.selected').removeClass('selected');

			var menu_entries = {
				'info': { name:'Get information', icon:'fa-info-circle' },
				'view': { name:'View', icon:'fa-search' }
			};

			var char_id = obj.attr('char_id');
			var sheet = $('div.characters div.character[char_id="' + char_id + '"]').attr('sheet');
			if (sheet != '') {
				menu_entries['sheet'] = { name:'View character sheet', icon:'fa-file-text-o' };
			}

			menu_entries['presence'] = { name:'Toggle presence', icon:'fa-low-vision' };

			menu_entries['sep1'] = '-';
			menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
			menu_entries['coordinates'] = { name:'Get coordinates', icon:'fa-flag' };
			menu_entries['focus'] = { name:'Focus', icon:'fa-binoculars' };

			if ((fow_type != FOW_NONE) && (fow_type != FOW_REVEAL)) {
				menu_entries['sep2'] = '-';
				if (obj.is(fow_obj)) {
					menu_entries['fow_show'] = { name:'Remove Fog of War', icon:'fa-mixcloud' };
				} else {
					menu_entries['fow_show'] = { name:'Show its Fog of War', icon:'fa-cloud' };
				}
				menu_entries['fow_distance'] = { name:'Set vision distance', icon:'fa-cloud-upload' };
				menu_entries['light_radius'] = { name:'Set light radius', icon:'fa-lightbulb-o' };
			}

			menu_entries['sep3'] = '-';
			rule_system_menu_character_dm(menu_entries, obj);

			var shapes = {};
			shapes['shape_0'] = { name: 'Default' };
			shapes['sep0'] = '-';
			$('div.shape_change div').each(function() {
				var shape_id = $(this).attr('shape_id');
				shapes['shape_' + shape_id] = { name: $(this).text()};
			});

			if (Object.keys(shapes).length > 2) {
				menu_entries['shapes'] = { name:'Change shape', icon:'fa-user-circle', items:shapes};
			}

			if (object_last_item(menu_entries) != '-') {
				menu_entries['sep4'] = '-';
			}

			menu_entries['zone_create'] = { name:'Create zone', icon:'fa-square-o' };

			var maps = {};
			$('select.map-selector option').each(function() {
				var m_id = $(this).attr('value');
				if (m_id != map_id) {
					var key = 'travel_' + m_id;
					maps[key] = { name: $(this).text()};
				}
			});

			if (Object.keys(maps).length > 0) {
				menu_entries['send'] = { name:'Send to map', icon:'fa-compass', items:maps};
			}

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);

			return false;
		});

		/* Menu map
		 */
		$('div.playarea > div').on('contextmenu', function(event) {
			var menu_entries = {};
			menu_entries['marker'] = { name:'Set marker', icon:'fa-map-marker' };
			menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
			menu_entries['coordinates'] = { name:'Get coordinates', icon:'fa-flag' };
			menu_entries['sep1'] = '-';

			rule_system_menu_map(menu_entries);
			if (object_last_item(menu_entries) != '-') {
				menu_entries['sep2'] = '-';
			}

			menu_entries['effect_create'] = { name:'Ceate effect', icon:'fa-fire' };

			if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
				menu_entries['light_create'] = { name:'Create light', icon:'fa-lightbulb-o' };
			}

			menu_entries['zone_create'] = { name:'Create zone', icon:'fa-square-o' };

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		$('div.characters').css('cursor', 'grab');
		$('div.effects').css('cursor', 'grab');
		$('div.lights').css('cursor', 'grab');
		$('div.tokens').css('cursor', 'grab');
		$('div.zones').css('cursor', 'grab');

		/* Library
		 */
		$('div.library img.icon').draggable({
			helper: 'clone',
			appendTo: 'div.content',
			scroll: false,
			start: function(event, ui) {
				var width = parseInt($(this).attr('obj_width')) * grid_cell_size;
				var height = parseInt($(this).attr('obj_height')) * grid_cell_size;
				ui.helper.css('width', width + 'px');
				ui.helper.css('max-width', width + 'px');
				ui.helper.css('height', height + 'px');
				ui.helper.css('max-height', height + 'px');
				ui.helper.css('z-index', '1');
			},
			stop: function(event, ui) {
				var x = (event.pageX > 0) ? event.pageX : 0;
				var y = (event.pageY > 0) ? event.pageY : 0;
				object_create($(this), x, y);
			}
		});

		if (fow_type == FOW_REVEAL) {
			fog_of_war_init(LAYER_FOG_OF_WAR, true);
		}

		/* Draw tools
		 */
		$('div.playarea').css('bottom', '90px');

		/* Library filter
		 */
		var library_filter = function() {
			var param = $('div.filter input').val().toLowerCase();

			$('div.library div.well').each(function() {
				var name = $(this).find('div.name').text().toLowerCase();
				if (name.includes(param) == false) {
					$(this).hide();
				} else {
					$(this).show();
				}
			});
		};
		$('div.filter input').on('keyup', library_filter);
		library_filter();
	} else {
		/* Player settings
		 */
		character_id = my_character.attr('char_id');

		my_character.addClass('mine');

		if ($('div.playarea').attr('drag_character') == 'yes') {
			my_character.draggable({
				containment: 'div.playarea > div',
				handle: 'img',
				drag: draggable_drag_correction,
				stop: function(event, ui) {
					object_move($(this));
				}
			});
			my_character.css('cursor', 'grab');
		}

		my_character.css('z-index', LAYER_CHARACTER_OWN);

		/* Menu my character
		 */
		$('div#' + my_char + ' img').on('contextmenu', function(event) {
			var menu_entries = {};
			menu_entries['info'] = { name:'Get information', icon:'fa-info-circle' };
			menu_entries['view'] = { name:'View', icon:'fa-search' };
			menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };
			menu_entries['sep1'] = '-';
			rule_system_menu_character_mine(menu_entries, $(this).parent());

			var alternates = $('div.alternates div');
			if (alternates.length > 0) {
				menu_entries['sep2'] = '-';

				var icons = {};
				icons['alternate_0'] = { name: 'Default' };
				icons['sep1'] = '-';

				alternates.each(function() {
					var icon_id = $(this).attr('icon_id');
					icons['alternate_' + icon_id] = { name: $(this).text()};
				});

				menu_entries['alternates'] = { name:'Change icon', icon:'fa-user-circle', items:icons };
			}

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Unknown tokens
		 */
		$('div.token span.name[known="no"]').css('display', 'none');

		/* Zone presence
		 */
		zone_init_presence();

		/* Fog of war
		 */
		if (fow_type == FOW_REVEAL) {
			fog_of_war_init(LAYER_FOG_OF_WAR, false);
		} else {
			fog_of_war_init(LAYER_FOG_OF_WAR);
			if ((fow_type == FOW_NIGHT_CELL) || (fow_type == FOW_NIGHT_REAL)) {
				var distance = character_vision(my_character);
				fog_of_war_set_distance(distance);
			}
			fog_of_war_update(my_character);
		}

		/* Anti-cheat
		 */
		var layer_removed_triggered = false;

		var layer_removed = function(layer) {
			if (layer_removed_triggered) {
				return;
			}
			layer_removed_triggered = true;

			$('div#map_background').remove();
			send_message('Player ' + character_name + ' removed the ' + layer + ' layer.', 'Anti-Cheat');

		};

		$('div.walls').on('DOMNodeRemoved', function() {
			layer_removed('walls');
		});
		$('div.wall').on('DOMNodeRemoved', function() {
			layer_removed('walls');
		});

		$('div.doors').on('DOMNodeRemoved', function() {
			layer_removed('doors');
		});
		$('div.door').on('DOMNodeRemoved', function() {
			layer_removed('doors');
		});

		$('div.blinders').on('DOMNodeRemoved', function() {
			layer_removed('blinders');
		});
		$('div.blinder').on('DOMNodeRemoved', function() {
			layer_removed('blinders');
		});

		$('div.fog_of_war').on('DOMNodeRemoved', function() {
			layer_removed('fog of war');
		});
		$('div.fog_of_war canvas').on('DOMNodeRemoved', function() {
			layer_removed('fog of war');
		});

		$('div.pause').on('DOMNodeRemoved', function() {
			layer_removed('pause');
		});

		/* Menu tokens
		 */
		$('div.tokens div.token').on('contextmenu', object_contextmenu_player);

		/* Menu (other) characters
		 */
		$('div.character:not(.mine) img').on('contextmenu', function(event) {
			var menu_entries = {};
			menu_entries['info'] = { name:'Get information', icon:'fa-info-circle' };
			menu_entries['view'] = { name:'View', icon:'fa-search' };
			menu_entries['sep1'] = '-';

			rule_system_menu_character_other(menu_entries, $(this).parent());
			if (object_last_item(menu_entries) != '-') {
				menu_entries['sep2'] = '-';
			}

			menu_entries['marker'] = { name:'Set marker', icon:'fa-map-marker' };
			menu_entries['distance'] = { name:'Measure distance', icon:'fa-map-signs' };

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Menu map
		 */
		$('div.playarea > div').on('contextmenu', function(event) {
			var menu_entries = {
				'marker': { name:'Set marker', icon:'fa-map-marker' },
				'distance': { name:'Measure distance', icon:'fa-map-signs' },
			};

			rule_system_menu_map(menu_entries);

			context_menu_show($(this), event, menu_entries, context_menu_handler, menu_defaults);
			return false;
		});

		/* Update character position
		 */
		window.setInterval(function() {
			if (char_pos_changed == false) {
				return;
			}

			$.post('/object/move', {
				instance_id: my_character.prop('id'),
				pos_x: char_pos_x,
				pos_y: char_pos_y
			});

			char_pos_changed = false;
		}, CHAR_POS_SAVE_DELAY * 1000);

		/* Pre-load brushes
		 */
		$('div.brushes img').each(function() {
			var src = $(this).attr('src');

			var image = new Image;
			image.src = src;
			brushes[src] = image;
		});
	}

	/* Mouse down on tokens and characters for icon selector
	 */
	$('div.token, div.character').on('mousedown', object_mouse_down);

	/* Select multiple tokens and characters.
	 */
	$('div.playarea').on('mousedown', function(event) {
		$('div.token, div.character').removeClass('selected');

		if ((event.which != 2) || (ctrl_down == false)) {
			return true;
		}

		if ($('div.playarea div.icon-selector').length > 0) {
			return true;
		}

		context_menu_remove();

		$('div.playarea > div').append('<div class="icon-selector"></div>');
		$('div.icon-selector').css('z-index', DEFAULT_Z_INDEX + 4);

		var ipos = viewport_to_map(event.clientX, event.clientY);
		var icon_selector_x1 = ipos.x;
		var icon_selector_y1 = ipos.y;
		var icon_selector_x2 = icon_selector_x1;
		var icon_selector_y2 = icon_selector_y1;

		$('div.playarea').on('mousemove', function(event) {
			var ipos = viewport_to_map(event.clientX, event.clientY);
			icon_selector_x2 = ipos.x;
			icon_selector_y2 = ipos.y;

			$('div.icon-selector').css({
				left: Math.min(icon_selector_x1, icon_selector_x2),
				top: Math.min(icon_selector_y1, icon_selector_y2),
				width: Math.abs(icon_selector_x1 - icon_selector_x2) + 'px',
				height: Math.abs(icon_selector_y1 - icon_selector_y2) + 'px'
			});
		});

		$('div.playarea').one('mouseup mouseleave', function() {
			$('div.playarea').off('mousemove');
			$('div.playarea').off('mouseup');
			$('div.playarea div.icon-selector').remove();

			var x1 = Math.min(icon_selector_x1, icon_selector_x2);
			var y1 = Math.min(icon_selector_y1, icon_selector_y2);
			var x2 = Math.max(icon_selector_x1, icon_selector_x2);
			var y2 = Math.max(icon_selector_y1, icon_selector_y2);

			$('div.token, div.character').each(function() {
				if ($(this).hasClass('ui-draggable') == false) {
					return true;
				}

				var pos = object_position($(this));
				var x = pos.left + Math.round($(this).find('img').width() / 2);
				var y = pos.top + Math.round($(this).find('img').height() / 2);

				if ((x >= x1) && (x <= x2) && (y >= y1) && (y <= y2)) {
					$(this).addClass('selected');
				}
			});
		});

		return false;
	});

	/* Drag map
	 */
	$('div.playarea').on('mousedown', function(event) {
		if ((event.button != 1) || ctrl_down) {
			return true;
		}

		event.preventDefault();
		context_menu_remove();

		$('div.playarea').css('cursor', 'grab');

		var start_x = event.clientX;
		var start_y = event.clientY;
		var start_tx = zoom_tx;
		var start_ty = zoom_ty;

		$('div.playarea').on('mousemove.dragmap', function(event) {
			zoom_tx = start_tx + (event.clientX - start_x);
			zoom_ty = start_ty + (event.clientY - start_y);
			apply_zoom();
		});

		var map_move_stop = function() {
			$('div.playarea').css('cursor', 'default');
			$('div.playarea').off('mousemove.dragmap');
		};

		$('div.playarea').one('mouseup', map_move_stop);
		$('div.playarea').one('mouseleave', map_move_stop);

		return false;
	});

	/* Sidebar expand
	 */
	expand_sidebar = function() {
		var content = $('div.sidebar').clone();
		content.removeClass('sidebar').addClass('sidebar_expanded');
		content.find('div.expand').remove();

		var wf_expanded = $(content).windowframe({
			header: 'Sidebar expanded',
			width: 1000,
			height: 600,
			open: function() {
				var container = wf_expanded.parent();
				container.scrollTop(container.prop("scrollHeight"));
			},
			close: function() {
				wf_expanded.destroy();
			}
		});

		wf_expanded.parent().css('background-image', 'url(/images/layout/background-bright.png)');

		wf_expanded.open();
	};

	$('div.sidebar').on('click', function() {
		if (ctrl_down) {
			expand_sidebar();
		}
	});

	/* Input field
	 */
	$('div.input input').on('keyup', function (e) {
		if ((e.key === 'Enter') || (e.keyCode === 13)) {
			var input = $(this).val();
			$(this).val('');
			handle_input(input);
		}

		if ((e.key === 'ArrowUp') || (e.keyCode === 38)) {
			if (input_index + 1 < input_history.length) {
				input_index++;
			}
			$(this).val(input_history[input_index]);
		}

		if ((e.key === 'ArrowDown') || (e.keyCode === 40)) {
			if (input_index >= 0) {
				input_index--;
				$(this).val(input_history[input_index]);
			} else {
				$(this).val('');
			}
		}
	});

	/* Windows
	 */
	if (dungeon_master) {
		var audio_content = '<div><ul class="audio"></ul></div';
		wf_audio_player = $(audio_content).windowframe({
			activator: 'button.play_audio',
			header: 'Audio files from Resources',
			info: 'This tool allows you to play audio files for everybody. It uses the files in the audio resources directory. The resources section can be found in the DM\'s Vault.',
			open: function() {
				var audio_list = wf_audio_player.find('ul');
				audio_list.empty();

				$.ajax('/adventure/audio').done(function(data) {
					var files = $(data).find('audio sound');
					if (files.length > 0) {
						files.each(function() {
							audio_list.append('<li>/' + $(this).text() + '</li>');
						});

						audio_list.find('li').on('click', function() {
							wf_audio_player.close();

							$('div.input input').focus();

							var filename = $(this).text();
							filename = filename.substr(0, 11) + resources_key + filename.substr(10);

							var data = {
								action: 'audio',
								filename: filename
							};
							websocket_send(data);

							var audio = new Audio(filename);
							audio.play();
						});
					} else {
						wf_audio_player.append('<p>You have no audio files. Upload them to the \'audio\' directory in the DM\'s Vault Resources section.</p>');
					}
				});
			}
		});

		wf_effect_create = $('div.effect_create').windowframe({
			width: 540,
			style: 'default',
			header: 'Create effect',
			footer: '<span class="effect_size">width: <input id="effect_width" type="number" value="1" min="1" /></span>' +
					'<span class="effect_size">height: <input id="effect_height" type="number" value="1" min="1" /></span>'
		});

		$('div.effect_create img').on('click', function() {
			effect_create($(this));
		});

		wf_dm_notes = $('div.dm_notes').windowframe({
			activator: 'button.show_dm_notes',
			style: 'danger',
			header: 'DM notes'
		});

		var pictures_loaded = false;
		wf_pictures = $('<div class="pictures"><div>Directory: <select class="form-control"></select></div><div class="row"></div></div>').windowframe({
			activator: 'button.pictures',
			style: 'primary',
			header: 'Pictures',
			info: 'This tool allows you to show pictures to everybody. It uses the files in the pictures resources directory. The resources section can be found in the DM\'s Vault.',
			width: 900,
			top: 100,
			open: function() {
				if (pictures_loaded == false) {
					wf_pictures.find('select').trigger('change');
				}
			}
		});

		$.ajax('/adventure/picture_directories').done(function(data) {
			var directories = wf_pictures.find('select');

			directories.append('<option value="">[root]</option>');
			$(data).find('directories directory').each(function() {
				directories.append('<option>' + $(this).text() + '</option>');
			});
		});

		wf_pictures.find('select').on('change', function() {
			var directory = wf_pictures.find('select').val();
			var pictures = wf_pictures.find('div.row');

			wf_pictures.find('p').remove();
			pictures.empty();

			$.post('/adventure/pictures', {
				directory: directory
			}).done(function(data) {
				if (directory != '') {
					directory += '/';
				}

				if ($(data).find('files file').length == 0) {
					wf_pictures.append('<p>No pictures found.</p>');
				} else $(data).find('files file').each(function() {
					var image = '<img src="/resources/' + resources_key + '/pictures/' + directory + $(this).text() + '" />';
					pictures.append('<div class="col-xs-4">' + image + '</div>');
				});

				wf_pictures.find('img').on('click', function() {
					var link = $(this).attr('src');
					link = 'https://' + location.hostname + link;
					send_message(link);

					wf_pictures.close();
				});

				pictures_loaded = true;
			});
		});

		wf_zone_create = $('div.zone_create').windowframe({
			width: 450,
			header: 'Create zone',
			buttons: {
				'Create': function() {
					var width = parseInt($('input#width').val());
					var height = parseInt($('input#height').val());
					var color = $('input#color').val();
					var opacity = parseFloat($('input#opacity').val());
					var group = $('input#group').val();
					var altitude = parseInt($('input#altitude').val());

					if (isNaN(width)) {
						write_sidebar('Invalid width.');
						return;
					} else if (isNaN(height)) {
						write_sidebar('Invalid height.');
						return;
					} else if (isNaN(opacity)) {
						write_sidebar('Invalid opacity.');
						return;
					} else if (isNaN(altitude)) {
						write_sidebar('Invalid altitude.');
						return;
					}

					if (color.substr(0, 1) != '#') {
						write_sidebar('Invalid color.');
						return;
					}

					if (opacity < 0) {
						opacity = 0;
					} else if (opacity > 1) {
						opacity = 1;
					}

					if ((altitude < 0) || (altitude > 250)) {
						write_sidebar('Altitude out of range (0 - 250).');
						return;
					}

					zone_x -= Math.floor((width - 1) / 2) * grid_cell_size;
					if (zone_x < 0) {
						zone_x = 0;
					}

					zone_y -= Math.floor((height - 1) / 2) * grid_cell_size;
					if (zone_y < 0) {
						zone_y = 0;
					}

					zone_create(width, height, color, opacity, group, altitude);

					$(this).close();
				},
				'Cancel': function() {
					$(this).close();
				}
			}
		});
	}

	wf_collectables = $('<div class="collectables"></div>').windowframe({
		activator: 'button.show_collectables',
		style: 'success',
		header: 'Inventory',
		info: 'This window shows all the collectables that have been found by the players during the adventure.',
		width: 700,
		top: 150,
		open: collectables_show
	});

	wf_journal = $('div.journal').windowframe({
		activator: 'button.show_journal',
		style: 'info',
		header: 'Journal',
		info: 'Use the journal to keep track of the adventure\'s progress. Entries are shared among all players and the dungeon master. The filter can be used to search for journal entries.</p><p>Click one of your own entries while holding the CTRL key to edit it. Remove the entire text to delete the entry.',
		width: 1000,
		height: 500,
		open: journal_show,
		close: function() {
			if (wf_entry_edit != null) {
				wf_entry_edit.destroy();
				wf_entry_edit = null;
			}
		}
	});

	var my_entries = $('div.journal div.entry[user_id=' + user_id + ']');
	my_entries.css('cursor', 'text');
	my_entries.on('click', function() {
		journal_edit_entry($(this));
	});

	$('div.journal textarea').on('keyup', function(event) {
		event.stopPropagation();
	});

	$('button.journal_write').on('click', function() {
		journal_write();
	});

	$('button.center_character').on('click', function() {
		center_character($(this));
	});

	$('button.interface_color').on('click', function() {
		interface_color($(this));
	});

	$('button.fullscreen').on('click', function() {
		toggle_fullscreen();
	});

	$('select.map-selector').on('change', function() {
		map_switch();
	});

	$('button.map_image').on('click', function() {
		map_image();
	});

	$('button.playvideo').on('click', function() {
		$('video').get(0).play();
	});

	/* Other stuff
	 */
	$('div.playarea').on('mousedown', store_mouse_position);

	var audio_file = $('div.playarea').attr('audio');
	if (audio_file != undefined) {
		var audio = new Audio(audio_file);
		audio.loop = true;
		audio.play();
	}

	input_history = localStorage.getItem('input_history');
	if (input_history != undefined) {
		input_history = JSON.parse(input_history);
	} else {
		input_history = [];
	}

	scroll_to_my_character();

	$('body').on('keydown', key_down);
	$('body').on('keyup', key_up);
	$('body').on('keyup', object_steer);

	$(window).focus(function() {
		ctrl_down = false;
		shift_down = false;
		alt_down = false;
		$('canvas#drawing').off('mousemove');
	});

	/* Interface color
	 */
	var color = localStorage.getItem('interface_color');
	if (color == 'dark') {
		interface_color($('button#itfcol'), false);
	}

	/* Touchscreens
	 */
	if (mobile_device) {
		$('div.characters div.character img').on('click', object_click_mobile);
		$('div.tokens div.token img').on('click', object_click_mobile);
	}

	/* Dice roll initialize
	 */
	var support_crit_rolls = ($('div.playarea').attr('rule_system') == 'dnd5');
	dice_roll_initialize(support_crit_rolls);

	/* Cauldron20 browser extension
	 */
	window.setTimeout(function() {
		$('div.topbar div.btn-group button:nth-of-type(2)').on('click', function() {
			window.setTimeout(function() {
				$('div#customOverlay').draggable({
					containment: 'div.playarea > div'
				});
			}, 500);
		});
	}, 1000);
});

$(window).on('load', function() {
	$('div.loading').remove();
});
