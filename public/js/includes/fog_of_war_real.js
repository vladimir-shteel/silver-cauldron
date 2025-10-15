const FOW_COLOR = '#202020';
const FOW_LIGHT_EDGE = 0.75;
const FOW_COVERED_CHECKS = 2;
const FOW_REAL_FAST = false;

var fog_of_war_distance = 0;

var fow_canvas = null;
var fow_ctx = null;
var fow_image_data = null;

var fow_pattern = null;

var walls = null;
var windows = null;
var blinders = null;
var doors = null;

function get_edge_pos(obj_x, obj_y, wall_x, wall_y) {
	var edge_x = 0;
	var edge_y = 0;

	if (wall_x < obj_x) {
		if (obj_x != wall_x) {
			var factor = (1 / (obj_x - wall_x)) * obj_x;
			edge_y = Math.round(obj_y - ((obj_y - wall_y) * factor));
		} else {
			edge_y = obj_y;
		}
	} else if (wall_x > obj_x) {
		edge_x = fow_canvas.width;

		if (obj_x != wall_x) {
			var factor = (1 / (wall_x - obj_x)) * (fow_canvas.width - obj_x);
			edge_y = Math.round(obj_y - ((obj_y - wall_y) * factor));
		} else {
			edge_y = obj_y;
		}
	} else {
		edge_x = obj_x;

		if (wall_y > obj_y) {
			edge_y = fow_canvas.height;
		}
	}

	var edge_pos = {
		left: edge_x,
		top: edge_y
	}

	return edge_pos;
}

function draw_fow_shape(ctx, obj_x, obj_y, pos1_x, pos1_y, pos2_x, pos2_y) {
	if (pos2_x < pos1_x) {
		var p = pos1_x;
		pos1_x = pos2_x;
		pos2_x = p;

		p = pos1_y;
		pos1_y = pos2_y;
		pos2_y = p;
	}

	ctx.beginPath();
	ctx.moveTo(pos1_x, pos1_y);

	var edge_pos = get_edge_pos(obj_x, obj_y, pos1_x, pos1_y);
	ctx.lineTo(edge_pos.left, edge_pos.top);

	var prev_edge_x = edge_pos.left;
	var edge_pos = get_edge_pos(obj_x, obj_y, pos2_x, pos2_y);

	if (edge_pos.left != prev_edge_x) {
		if ((pos1_x == pos2_x) || (pos1_y == pos2_y)) {
			/* Horizontal or vertical
			 */
			if (edge_pos.top < obj_y) {
				var corner_y = 0;
			} else {
				var corner_y = fow_canvas.height;
			}

			ctx.lineTo(prev_edge_x, corner_y);
			ctx.lineTo(edge_pos.left, corner_y);
		} else if (pos1_x < obj_x < pos2_x) {
			var angle = (pos2_y - pos1_y) / (pos2_x - pos1_x);
			var y = pos1_y + (obj_x - pos1_x) * angle;

			if (y < obj_y) {
				var corner_y = 0;
			} else {
				var corner_y = fow_canvas.height;
			}

			ctx.lineTo(prev_edge_x, corner_y);
			ctx.lineTo(edge_pos.left, corner_y);
		}
	}

	ctx.lineTo(edge_pos.left, edge_pos.top);

	ctx.lineTo(pos2_x, pos2_y);

	ctx.closePath();

	ctx.fill();
	ctx.stroke();
}

function draw_fow_shape_for_construct(ctx, obj_x, obj_y, construct) {
	var pos1_x = construct.pos_x * grid_cell_size;
	var pos1_y = construct.pos_y * grid_cell_size;

	var pos2_x = pos1_x;
	var pos2_y = pos1_y;

	var length = construct.length * grid_cell_size;

	if (construct.direction == 'horizontal') {
		pos2_x += length;
	} else if (construct.direction == 'vertical') {
		pos2_y += length;
	} else {
		return;
	}

	draw_fow_shape(ctx, obj_x, obj_y, pos1_x, pos1_y, pos2_x, pos2_y);
}

function draw_light_sphere(pos_x, pos_y, radius) {
	var l_canvas = document.createElement('canvas');
	l_canvas.width = fow_canvas.width;
	l_canvas.height = fow_canvas.height;
	var l_ctx = l_canvas.getContext('2d');

	l_ctx.fillStyle = fow_pattern;
	l_ctx.strokeStyle = fow_pattern;
	l_ctx.lineWidth = 1;
	l_ctx.fillRect(0, 0, l_canvas.width, l_canvas.height);

	radius -= Math.round(grid_cell_size * 0.4);

	/* Draw sphere
	 */
	var grad = l_ctx.createRadialGradient(pos_x, pos_y, 0, pos_x, pos_y, radius);
	grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
	grad.addColorStop(FOW_LIGHT_EDGE, 'rgba(0, 0, 0, ' + FOW_LIGHT_EDGE + ')');
	grad.addColorStop(0, 'rgba(0, 0, 0, 1)');

	l_ctx.globalCompositeOperation = 'xor';
	l_ctx.fillStyle = grad;
	l_ctx.fillRect(pos_x - radius, pos_y - radius, 2 * radius, 2 * radius);

	l_ctx.globalCompositeOperation = 'source-over';
	l_ctx.fillStyle = fow_pattern;

	/* Walls
	 */
	walls.forEach(function(wall) {
		draw_fow_shape_for_construct(l_ctx, pos_x, pos_y, wall);
	});

	/* Windows
	 */
	windows.forEach(function(wall) {
		if (wall.obj.attr('transparent') == 'yes') {
			return true;
		}

		draw_fow_shape_for_construct(l_ctx, pos_x, pos_y, wall);
	});

	/* Doors
	 */
	doors.forEach(function(door) {
		if (door.bars) {
			return true;
		} else if (door.obj.attr('state') == 'open') {
			return true;
		}

		draw_fow_shape_for_construct(l_ctx, pos_x, pos_y, door);
	});
	
	/* Blinders
	 */
	blinders.forEach(function(blinder) {
		draw_fow_shape(l_ctx, pos_x, pos_y, blinder.pos1_x, blinder.pos1_y, blinder.pos2_x, blinder.pos2_y);
	});

	fow_ctx.globalCompositeOperation = 'destination-in';
	fow_ctx.drawImage(l_canvas, 0, 0);
	fow_ctx.globalCompositeOperation = 'source-over';
}

function fog_of_war_covered(ctx, obj) {
	if (fow_image_data == null) {
		fow_image_data = ctx.getImageData(0, 0, fow_canvas.width, fow_canvas.height);
	}

	var obj_pos = object_position(obj);
	var obj_x = obj_pos.left;
	var obj_y = obj_pos.top;

	var step = Math.round(grid_cell_size / (FOW_COVERED_CHECKS + 1));

	var visible = 0;
	for (var y = 1; y <= FOW_COVERED_CHECKS; y++) {
		for (var x = 1; x <= FOW_COVERED_CHECKS; x++) {
			var pos = (obj_y + y * step) * fow_canvas.width;
			pos += (obj_x + x * step);
			var transparancy = fow_image_data.data[pos * 4 + 3];
			if (transparancy < 192) {
				visible++;
			}
		}
	}

	return visible < 2;
}

/* Fog of war interface
 */
function fog_of_war_init(z_index) {
	var width = $('div.playarea > div').width();
	var height = $('div.playarea > div').height();

	$('div.fog_of_war').append('<canvas id="fow_real" class="fow" width="' + width + '" height="' + height + '"></canvas>');
	$('canvas#fow_real').css('z-index', z_index);

	fow_canvas = document.getElementById('fow_real');

	fow_pattern = FOW_COLOR;

	if (fow_ctx == null) {
		fow_ctx = fow_canvas.getContext('2d');
		fow_ctx.fillStyle = fow_pattern;
		fow_ctx.strokeStyle = fow_pattern;
		fow_ctx.lineWidth = 1;
	}

	fog_of_war_index_constructs();
}

function fog_of_war_index_constructs() {
	walls = [];
	windows = [];
	$('div.wall').each(function() {
		var wall = {};
		wall.pos_x = parseInt($(this).attr('pos_x'));
		wall.pos_y = parseInt($(this).attr('pos_y'));
		wall.length = parseInt($(this).attr('length'));
		wall.direction = $(this).attr('direction');
		wall.transparent = ($(this).attr('transparent') == 'yes');

		if ($(this).hasClass('window')) {
			wall.obj = $(this);
			windows.push(wall);
		} else {
			walls.push(wall);
		}
	});

	doors = [];
	$('div.door').each(function() {
		var door = {};
		door.obj = $(this);
		door.pos_x = parseInt($(this).attr('pos_x'));
		door.pos_y = parseInt($(this).attr('pos_y'));
		door.length = parseInt($(this).attr('length'));
		door.direction = $(this).attr('direction');
		door.bars = ($(this).attr('bars') == 'yes');

		doors.push(door);
	});

	blinders = [];
	$('div.blinder').each(function() {
		var blinder = {};
		blinder.pos1_x = parseInt($(this).attr('pos1_x'));
		blinder.pos1_y = parseInt($(this).attr('pos1_y'));
		blinder.pos2_x = parseInt($(this).attr('pos2_x'));
		blinder.pos2_y = parseInt($(this).attr('pos2_y'));

		blinders.push(blinder);
	});
}

function fog_of_war_pattern(pattern, obj) {
	if (pattern == null) {
		pattern = '/images/fow.jpg';
	}

	$('<img src="' + pattern + '" />').on('load', function() {
		fow_pattern = fow_ctx.createPattern($(this)[0], 'repeat');
		fow_ctx.fillStyle = fow_pattern;
		fow_ctx.strokeStyle = fow_pattern;

		if (obj != null) {
			fog_of_war_update(obj);
		}
	});
}

function fog_of_war_set_distance(distance) {
	if (distance > 0) {
		distance = distance * grid_cell_size;
	}

	fog_of_war_distance = distance;
}

function fog_of_war_update(obj) {
	if (fow_ctx == null) {
		return;
	}

	var half_cell = (grid_cell_size >> 1);
	var obj_pos = object_position(obj);
	var obj_x = obj_pos.left + half_cell;
	var obj_y = obj_pos.top + half_cell;

	if (fog_of_war_distance > 0) {
		fow_ctx.fillRect(0, 0, fow_canvas.width, fow_canvas.height);

		draw_light_sphere(obj_x, obj_y, fog_of_war_distance);

		$('.light').each(function() {
			if ($(this).attr('state') != 'on') {
				return true;
			}

			var pos = object_position($(this));
			var radius = parseInt($(this).attr('radius'));

			draw_light_sphere(pos.left + half_cell, pos.top + half_cell, radius * grid_cell_size);
		});

		$('div.character').each(function() {
			if ($(this).attr('light') == '0') {
				return true;
			}

			var pos = object_position($(this));
			var radius = parseInt($(this).attr('light'));

			draw_light_sphere(pos.left + half_cell, pos.top + half_cell, radius * grid_cell_size);
		});
	} else {
		fow_ctx.clearRect(0, 0, fow_canvas.width, fow_canvas.height);
	}

	/* Walls
	 */
	walls.forEach(function(wall) {
		draw_fow_shape_for_construct(fow_ctx, obj_x, obj_y, wall);
	});

	/* Windows
	 */
	windows.forEach(function(wall) {
		if (wall.obj.attr('transparent') == 'yes') {
			return true;
		}

		draw_fow_shape_for_construct(fow_ctx, obj_x, obj_y, wall);
	});

	/* Doors
	 */
	doors.forEach(function(door) {
		if (door.bars) {
			return true;
		} else if (door.obj.attr('state') == 'open') {
			return true;
		}

		draw_fow_shape_for_construct(fow_ctx, obj_x, obj_y, door);
	});

	/* Blinders
	 */
	blinders.forEach(function(blinder) {
		draw_fow_shape(fow_ctx, obj_x, obj_y, blinder.pos1_x, blinder.pos1_y, blinder.pos2_x, blinder.pos2_y);
	});

	/* Zones
	 */
	var my_altitude = 0;
	$('div.zone').each(function() {
		if (zone_covers_position($(this), obj_pos)) {
			var zone_altitude = parseInt($(this).attr('altitude'));
			if (zone_altitude > my_altitude) {
				my_altitude = zone_altitude;
			}
		}
	});

	$('div.zone').each(function() {
		var zone_altitude = $(this).attr('altitude');
		if (zone_altitude <= my_altitude) {
			return true;
		}

		var zone_pos = object_position($(this));
		var zone_x = zone_pos.left;
		var zone_y = zone_pos.top;
		var zone_width = $(this).width();
		var zone_height = $(this).height();

		if (zone_pos.left + zone_width < obj_x) {
			draw_fow_shape(fow_ctx, obj_x, obj_y, zone_x + zone_width, zone_y, zone_x + zone_width, zone_y + zone_height);
		} else if (zone_pos.left > obj_x) {
			draw_fow_shape(fow_ctx, obj_x, obj_y, zone_x, zone_y, zone_x, zone_y + zone_height);
		}

		if (zone_pos.top + zone_height < obj_y) {
			draw_fow_shape(fow_ctx, obj_x, obj_y, zone_x, zone_y + zone_height, zone_x + zone_width, zone_y + zone_height);
		} else if (zone_pos.top > obj_y) {
			draw_fow_shape(fow_ctx, obj_x, obj_y, zone_x, zone_y, zone_x + zone_width, zone_y);
		}
	});

	/* Hide covered objects
	 */
	fow_image_data = null;
	['character', 'token'].forEach(type => {
		$('div.' + type).removeClass('fow_covered');
		$('div.' + type).each(function() {
			if (fog_of_war_covered(fow_ctx, $(this))) {
				$(this).addClass('fow_covered');
			}
		});
	});
}

function fog_of_war_destroy() {
	$('div.fog_of_war canvas').remove();

	fow_canvas = null;
	fow_ctx = null;
	fow_image_data = null;

	['character', 'token'].forEach(type => {
		$('div.' + type).removeClass('fow_covered');
	});
}
