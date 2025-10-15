const FOW_COLOR = '#202020';
const FOW_CELL_PADDING = 0.25;
const FOW_POINTS_VISIBLE = 2;
const FOW_DISTANCE_ADJUST = -0.4;

var fog_of_war_map_width = null;
var fog_of_war_map_height = null;
var fog_of_war_checks = [
	[1, 0.5, 0.5],
	[2, 0.5, FOW_CELL_PADDING],
	[4, 1 - FOW_CELL_PADDING, 0.5],
	[8, 0.5, 1 - FOW_CELL_PADDING],
	[16, FOW_CELL_PADDING, 0.5]];
var fog_of_war_spot_max = null;
var fog_of_war_distance = 0;
var fog_of_war_lights = null;

var walls = [];
var windows = [];
var doors = [];

/* Check if two lines cross
 */
function on_segment(point, line_p1, line_p2) {
	return (point.left <= Math.max(line_p1.left, line_p2.left)) &&
	       (point.left >= Math.min(line_p1.left, line_p2.left)) &&
	       (point.top  <= Math.max(line_p1.top,  line_p2.top)) &&
	       (point.top  >= Math.min(line_p1.top,  line_p2.top));
}

function orientation(point1, point2, point3) {
	var value = (point2.top - point1.top) * (point3.left - point2.left) -
	            (point2.left - point1.left) * (point3.top - point2.top);

	if (value == 0) {
		return 0;
	}

	return (value > 0) ? 1 : 2;
}

function lines_intersect(line1_p1, line1_p2, line2_p1, line2_p2) {
	var o1 = orientation(line1_p1, line1_p2, line2_p1);
	var o2 = orientation(line1_p1, line1_p2, line2_p2);
	var o3 = orientation(line2_p1, line2_p2, line1_p1);
	var o4 = orientation(line2_p1, line2_p2, line1_p2);

	if ((o1 != o2) && (o3 != o4)) {
		return true;
	}

	if ((o1 == 0) && on_segment(line2_p1, line1_p1, line1_p2)) {
		return true;
	}

	if ((o2 == 0) && on_segment(line2_p2, line1_p1, line1_p2)) {
		return true;
	}

	if ((o3 == 0) && on_segment(line1_p1, line2_p1, line2_p2)) {
		return true;
	}

	if ((o4 == 0) && on_segment(line1_p2, line2_p1, line2_p2)) {
		return true;
	}

	return false;
}

/* Fog of War functions
 */
function check_vision(char_pos, construct, fog_of_war_spots) {
	var cons_x = construct.pos_x;
	var cons_y = construct.pos_y;

	var cons_p1 = {
		left: cons_x * grid_cell_size,
		top: cons_y * grid_cell_size
	}

	if (construct.direction == 'horizontal') {
		cons_x += construct.length;
	} else if (construct.direction == 'vertical') {
		cons_y += construct.length;
	} else {
		return;
	}

	var cons_p2 = {
		left: cons_x * grid_cell_size,
		top: cons_y * grid_cell_size
	}

	for (var y = 0; y < fog_of_war_map_height; y++) {
		for (var x = 0; x < fog_of_war_map_width; x++) {
			if (fog_of_war_spots[y][x] == 0) {
				continue;
			}

			for (s = 0; s < fog_of_war_checks.length; s++) {
				var step = fog_of_war_checks[s];

				var cell_pos = {
					left: (x + step[1]) * grid_cell_size,
					top: (y + step[2]) * grid_cell_size
				}

				if (lines_intersect(char_pos, cell_pos, cons_p1, cons_p2)) {
					fog_of_war_spots[y][x] &= (fog_of_war_spot_max - step[0]);
				}
			}
		}
	}

	return fog_of_war_spots;
}

function check_lighting(pos, light_pos, construct, fog_of_war_spot) {
	var cons_x = construct.pos_x;
	var cons_y = construct.pos_y;

	var cons_p1 = {
		left: cons_x * grid_cell_size,
		top: cons_y * grid_cell_size
	}

	if (construct.direction == 'horizontal') {
		cons_x += construct.length;
	} else if (construct.direction == 'vertical') {
		cons_y += construct.length;
	} else {
		return;
	}

	var cons_p2 = {
		left: cons_x * grid_cell_size,
		top: cons_y * grid_cell_size
	}

	for (s = 0; s < fog_of_war_checks.length; s++) {
		var step = fog_of_war_checks[s];

		if (lines_intersect(pos, light_pos, cons_p1, cons_p2)) {
			fog_of_war_spot &= (fog_of_war_spot_max - step[0]);
		}
	}

	return fog_of_war_spot;
}

function distance(obj, x, y) {
	x = Math.abs(x - obj.left);
	y = Math.abs(y - obj.top);

	return Math.sqrt(x*x + y*y).toFixed(1);
}

function enlightened(x, y) {
	var pos = {
		left: x,
		top: y
	}

	var enlight = false;

	for (light of fog_of_war_lights) {
		var light_pos = {
			left: light[0],
			top: light[1]
		}
		var radius = light[2];

		var light_spot = fog_of_war_spot_max;
		var light_altitude = 0;

		if (distance(light_pos, x, y) > radius) {
			continue;
		}

		/* Walls
		 */
		walls.forEach(function(wall) {
			light_spot = check_lighting(pos, light_pos, wall, light_spot);

			if (light_spot == 0) {
				return false;
			}
		});

		/* Windows
		 */
		windows.forEach(function(wall) {
			if (wall.obj.attr('transparent') == 'yes') {
				return true;
			}

			light_spot = check_lighting(pos, light_pos, wall, light_spot);

			if (light_spot == 0) {
				return false;
			}
		});

		if (light_spot >= 0) {
			/* Doors
			 */
			doors.forEach(function(door) {
				if (door.bars) {
					return true;
				} else if (door.obj.attr('state') == 'open') {
					return true;
				}

				light_spot = check_lighting(pos, light_pos, door, light_spot);

				if (light_spot == 0) {
					return false;
				}
			});
		}

		var fog_of_war_bits = 0;
		for (b = 0; b < fog_of_war_checks.length; b++) {
			if ((light_spot & 1) == 1) {
				fog_of_war_bits++;
			}
			light_spot >>= 1;
		}

		if (fog_of_war_bits >= FOW_POINTS_VISIBLE) {
			return true;
		}
	};

	return false;
}

/* Fog of war interface
 */
function fog_of_war_init(z_index) {
	fog_of_war_map_width = Math.floor($('div.playarea > div').width() / grid_cell_size);
	fog_of_war_map_height = Math.floor($('div.playarea > div').height() / grid_cell_size);

	for (var y = 0; y < fog_of_war_map_height; y++) {
		for (var x = 0; x < fog_of_war_map_width; x++) {
			var left = x * grid_cell_size;
			var top = y * grid_cell_size;
			var fog = '<div id="fog_of_war_' + x + '_' + y +'" class="fow" style="position:absolute; z-index:' + z_index + '; left:' + left + 'px; top:' + top + 'px; width:' + grid_cell_size + 'px; height:' + grid_cell_size + 'px; background-color:' + FOW_COLOR + ';" />';

			$('div.fog_of_war').append(fog);
		}
	}

	fog_of_war_spot_max = 0;
	for (s = 0; s < fog_of_war_checks.length; s++) {
		fog_of_war_spot_max += fog_of_war_checks[s][0];
	}
	
	fog_of_war_index_constructs();
}

function fog_of_war_index_constructs() {
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
}

function fog_of_war_pattern(pattern, obj) {
}

function fog_of_war_set_distance(distance) {
	if (distance > 0) {
		distance = Math.round((distance + FOW_DISTANCE_ADJUST) * grid_cell_size);
	}

	fog_of_war_distance = distance;
}

function fog_of_war_update(obj) {
	if (fog_of_war_spot_max === null) {
		return;
	}

	fog_of_war_lights = [];

    if (fog_of_war_distance > 0) {
		$('.light').each(function() {
			if ($(this).attr('state') != 'on') {
				return true;
			}

			var pos = object_position($(this));
			pos.left += (grid_cell_size >> 1);
			pos.top += (grid_cell_size >> 1);

			var radius = (parseInt($(this).attr('radius')) + FOW_DISTANCE_ADJUST) * grid_cell_size;

			fog_of_war_lights.push([pos.left, pos.top, radius]);
		});

		$('div.character').each(function() {
			if ($(this).attr('light') == '0') {
				return true;
			}

			var pos = object_position($(this));
			pos.left += (grid_cell_size >> 1);
			pos.top += (grid_cell_size >> 1);

			var radius = (parseInt($(this).attr('light')) + FOW_DISTANCE_ADJUST) * grid_cell_size;

			fog_of_war_lights.push([pos.left, pos.top, radius]);
		});
	}

	var pos = object_position(obj);

	var my_altitude = 0;
	$('div.zone').each(function() {
		if (zone_covers_position($(this), pos)) {
			var zone_altitude = parseInt($(this).attr('altitude'));
			if (zone_altitude > my_altitude) {
				my_altitude = zone_altitude;
			}
		}
	});

	var char_pos = {
		left: pos.left + (obj.width() / 2),
		top: pos.top + (obj.width() / 2)
	}

	var fog_of_war_spots = [];
	for (var y = 0; y < fog_of_war_map_height; y++) {
		fog_of_war_spots[y] = [];
		for (var x = 0; x < fog_of_war_map_width; x++) {
			if (fog_of_war_distance == 0) {
				fog_of_war_spots[y][x] = fog_of_war_spot_max;
			} else if (distance(char_pos, (x + 0.5) * grid_cell_size, (y + 0.5) * grid_cell_size) <= fog_of_war_distance) {
				fog_of_war_spots[y][x] = fog_of_war_spot_max;
			} else if (enlightened((x + 0.5) * grid_cell_size, (y + 0.5) * grid_cell_size)) {
				fog_of_war_spots[y][x] = fog_of_war_spot_max;
			} else {
				fog_of_war_spots[y][x] = 0;
			}
		}
	}

	/* Walls
	 */
	walls.forEach(function(wall) {
		fog_of_war_spots = check_vision(char_pos, wall, fog_of_war_spots);
	});

	/* Windows
	 */
	windows.forEach(function(wall) {
		if (wall.obj.attr('transparent') == 'yes') {
			return true;
		}

		fog_of_war_spots = check_vision(char_pos, wall, fog_of_war_spots);
	});

	/* Doors
	 */
	doors.forEach(function(door) {
		if (door.bars) {
			return true;
		} else if (door.obj.attr('state') == 'open') {
			return true;
		}

		fog_of_war_spots = check_vision(char_pos, door, fog_of_war_spots);
	});

	/* Zones
	 */
	$('div.zone').each(function() {
		var zone_altitude = $(this).attr('altitude');
		if (zone_altitude <= my_altitude) {
			return true;
		}

		var zone_pos = object_position($(this));
		var pos_x = zone_pos.left / grid_cell_size;
		var pos_y = zone_pos.top / grid_cell_size;
		var width = $(this).width() / grid_cell_size;
		var height = $(this).height() / grid_cell_size;

		var zone = {};
		zone.pos_x = pos_x;
		zone.pos_y = pos_y
		zone.length = width;
		zone.direction = 'horizontal';
		fog_of_war_spots = check_vision(char_pos, zone, fog_of_war_spots);

		zone.pos_y = pos_y + height;
		fog_of_war_spots = check_vision(char_pos, zone, fog_of_war_spots);

		zone.pos_y = pos_y;
		zone.length = height;
		zone.direction = 'vertical';
		fog_of_war_spots = check_vision(char_pos, zone, fog_of_war_spots);

		zone.pos_x = pos_x + width;
		fog_of_war_spots = check_vision(char_pos, zone, fog_of_war_spots);
	});

	for (var y = 0; y < fog_of_war_map_height; y++) {
		for (var x = 0; x < fog_of_war_map_width; x++) {
			var fog_of_war_cell = fog_of_war_spots[y][x];

			var fog_of_war_bits = 0;
			for (b = 0; b < fog_of_war_checks.length; b++) {
				if ((fog_of_war_cell & 1) == 1) {
					fog_of_war_bits++;
				}
				fog_of_war_cell >>= 1;
			}

			if (fog_of_war_bits < FOW_POINTS_VISIBLE) {
				$('div#fog_of_war_' + x + '_' + y).show();
			} else {
				$('div#fog_of_war_' + x + '_' + y).hide();
			}
		}
	}
}

function fog_of_war_destroy() {
	$('div.fog_of_war div.fow').remove();
	fog_of_war_spot_max = null;
}
