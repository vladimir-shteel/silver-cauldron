const FINDER_SIZE = 5;
const MAX_OFFSET = 99;

var grid_size_min = 20;
var grid_size_max = 300;

function init_map_edit() {
	$('div.method input').change(method_select);
	method_select();

	$('div.method-upload input[type=file]').change(function() {
		var name = this.files[0].name;
		$('#upload-file-info').val(name);

		var title = $('input#title');
		if (title.val() == '') {
			name = name.split('.').shift();
			name = name.charAt(0).toUpperCase() + name.substr(1);
			name = name.replace(/_/g, ' ');
			title.val(name);
		}
	});

	/* Init resources browser
	 */
	$.ajax('/vault/map/maps').done(function(data) {
		var list = '<ul class="browse-list">';
		$(data).find('map').each(function() {
			list += '<li>/' + $(this).text() + '</li>';
		});
		list += '</ul>';

		var map_dialog = $(list).windowframe({
			activator: 'input.map_browser',
			header: 'Maps from Resources',
		});

		map_dialog.find('li').on('click', function() {
			var file = $(this).text();
			$('input#url').val(file);
			reset_dimension();

			var title = $('input#title');
			if (title.val() == '') {
				var parts = file.split('/');
				var name = parts.pop().split('.').shift();
				name = name.charAt(0).toUpperCase() + name.substr(1);
				name = name.replace(/_/g, ' ');
				title.val(name);
			}

			if (file == '/files/empty_map.png') {
				$('div.empty_map').show();
				$('input[name="show_grid"]').val('yes');
			} else {
				$('div.empty_map').hide();
				$('input[name="show_grid"]').val('no');
			}

			map_dialog.close();
		});
	});

	$.ajax('/vault/map/audio').done(function(data) {
		var audio_dialog = $('<div></div>').windowframe({
			activator: 'input.audio_browser',
			header: 'Audio from Resources',
		});

		var audio = $(data).find('audio');

		if (audio.length > 0) {
			var list = '<ul class="browse-list">';
			$(data).find('audio').each(function() {
				list += '<li>/' + $(this).text() + '</li>';
			});
			list += '</ul>';

			audio_dialog.append(list);

			audio_dialog.find('li').on('click', function() {
				$('input#audio').val($(this).text());

				audio_dialog.close();
			});
		} else {
			audio_dialog.append('<p>No audio files have been found in the Resources \'audio\' directory.</p>');
		}
	});
}

function method_select() {
	var method = $('div.method input:checked').val();
	$('div.method-option').hide();
	$('div.method-' + method).show();
}

function reset_dimension() {
	$('input#width').val('');
	$('input#height').val('');
}

/* Grid
 */
function init_grid(grid_cell_size) {
	grid_init(grid_cell_size, 'rgba(240, 0, 0, 0.6)');

	var grid_value = Math.floor(grid_cell_size);
	var grid_fraction = (grid_cell_size % 1) * 100;
	var map_offset_x = $('input[name="offset_x"]').val();
	var map_offset_y = $('input[name="offset_y"]').val();

	var handle_value = $('#grid-handle-value');
	var slider_value = $('#slider1').slider({
		value: grid_value,
		min: grid_size_min,
		max: grid_size_max,
		create: function() {
			handle_value.text($(this).slider('value'));
		},
		slide: function(event, ui) {
			handle_value.text(ui.value);

			var value = ui.value;
			var fraction = parseInt($('#grid-handle-fraction').text());
			value += fraction / 100;

			$('input[name="grid_size"]').val(value);

			grid_draw(value);
		}
	});

	var handle_fraction = $('#grid-handle-fraction');
	var slider_fraction = $('#slider2').slider({
		value: grid_fraction,
		min: 0,
		max: 99,
		create: function() {
			handle_fraction.text($(this).slider('value'));
		},
		slide: function(event, ui) {
			handle_fraction.text(ui.value);

			var value = parseInt($('#grid-handle-value').text());
			value += ui.value / 100;

			$('input[name="grid_size"]').val(value);

			grid_draw(value);
		}
	});

	var handle_offset_x = $('#map-x-offset');
	var slider_offset_x = $('#slider3').slider({
		value: map_offset_x,
		min: 0,
		max: MAX_OFFSET,
		create: function() {
			handle_offset_x.text($(this).slider('value'));
			$('div.playarea img.map,video').css('left', -map_offset_x + 'px');
		},
		slide: function(event, ui) {
			handle_offset_x.text(ui.value);

			$('div.playarea div.map *').css('left', -ui.value + 'px');
			$('input[name="offset_x"]').val(ui.value);
		}
	});

	var handle_offset_y = $('#map-y-offset');
	var slider_offset_y = $('#slider4').slider({
		value: map_offset_y,
		min: 0,
		max: MAX_OFFSET,
		create: function() {
			handle_offset_y.text($(this).slider('value'));
			$('div.playarea img.map,video').css('top', -map_offset_y + 'px');
		},
		slide: function(event, ui) {
			handle_offset_y.text(ui.value);

			$('div.playarea div.map *').css('top', -ui.value + 'px');
			$('input[name="offset_y"]').val(ui.value);
		}
	});

	/* Possible sizes
	 */
	var map_width = Math.round($('div.playarea > div').first().width());
	var map_height = Math.round($('div.playarea > div').first().height());

	var possible_sizes = [];
	for (i = grid_size_min; i <= grid_size_max; i++) {
		if (((map_width % i) == 0) && ((map_height % i) == 0)) {
			possible_sizes.push(i);
		}
	}

	if (possible_sizes.length == 0) {
		$('span.sizes').text('None found.');
	} else {
		$('span.sizes').text(possible_sizes.join(', '));
	}

	/* Add grid find
	 */
	$('div.btn-group').first().before('<div class="btn-group right"><input type="button" class="btn btn-primary finder" value="Grid finder" /></div>')
	$('div.btn-group').last().after('<p class="finder_info">Draw a ' + FINDER_SIZE + '&times;' + FINDER_SIZE + ' grid box in the middle of the map.</p>');
	$('p.finder_info').css({
		color: '#ff0000',
		textAlign: 'right'
	}).hide();

	$('input.finder').on('click', function() {
		$(this).prop('disabled', true);
		$('p.finder_info').show();

		$('div.playarea div.map *').css('left', '0');
		$('div.playarea div.map *').css('top', '0');
		grid_ctx.clearRect(0, 0, grid_canvas.width, grid_canvas.height)

		$('canvas').one('mousedown', function(event) {
			var pos = $('canvas').offset();
			var from_x = Math.max(Math.round(event.clientX - pos.left + window.scrollX), 0);
			var from_y = Math.max(Math.round(event.clientY - pos.top + window.scrollY), 0);
			var width = 0;

			grid_ctx.fillStyle = 'rgba(255, 96, 32, 0.2)';

			$('canvas').on('mousemove', function(event) {
				var pos = $('canvas').offset();
				var width_x = Math.round(event.clientX - pos.left + window.scrollX) - from_x;
				var width_y = Math.round(event.clientY - pos.top + window.scrollY) - from_y;
				width = (Math.abs(width_x) + Math.abs(width_y)) / 2;

				var sign_x = (width_x == 0) ? 0 : Math.round(width_x / Math.abs(width_x));
				var sign_y = (width_y == 0) ? 0 : Math.round(width_y / Math.abs(width_y));

				grid_ctx.clearRect(0, 0, grid_canvas.width, grid_canvas.height);
				grid_ctx.beginPath();
				grid_ctx.fillRect(from_x, from_y, width * sign_x, width * sign_y);
				grid_ctx.rect(from_x, from_y, width * sign_x, width * sign_y);
				grid_ctx.stroke();
			});

			$('canvas').one('mouseup', function() {
				$('canvas').off('mousemove');

				width = Math.abs(width);

				var cell_size = (width - 1) / FINDER_SIZE;
				if (cell_size < 20) {
					cell_size = 20;
					cauldron_alert('Grid cell size is too small.');
				} else {
					possible_sizes.forEach(function(size) {
						if (100 * Math.abs(size - cell_size) / cell_size <= 2) {
							cell_size = size;
							return false;
						}
					});
				}

				$('input[name="grid_size"]').val(cell_size);

				var value = Math.floor(cell_size);
				slider_value.slider('value', value);
				handle_value.text(value);

				var fraction = Math.round((cell_size - Math.floor(cell_size)) * 100);
				slider_fraction.slider('value', fraction);
				handle_fraction.text(fraction);

console.log(possible_sizes);
				var ofs_x = Math.round(from_x % cell_size);
				if (ofs_x > MAX_OFFSET) {
					ofs_x = 0;
				} else if (possible_sizes.length > 0) {
					if ((100 * ofs_x / cell_size <= 3) || (100 * (ofs_x - cell_size) / cell_size <= 2)) {
						ofs_x = 0;
					}
				}
				slider_offset_x.slider('value', ofs_x);
				handle_offset_x.text(ofs_x);
				$('input[name="offset_x"]').val(ofs_x);

				var ofs_y = Math.round(from_y % cell_size);
				if (ofs_y > MAX_OFFSET) {
					ofs_y = 0;
				} else if (possible_sizes.length > 0) {
					if ((100 * ofs_y / cell_size <= 3) || (100 * (ofs_y - cell_size) / cell_size <= 2)) {
						ofs_y = 0;
					}
				}
				slider_offset_y.slider('value', ofs_y);
				handle_offset_y.text(ofs_y);
				$('input[name="offset_y"]').val(ofs_y);

				$('div.playarea div.map *').css('left', -ofs_x + 'px');
				$('div.playarea div.map *').css('top', -ofs_y + 'px');
				grid_draw(cell_size);

				$('input.finder').prop('disabled', false);
				$('p.finder_info').hide();
			});
		});
	});
}
