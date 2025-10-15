/*most up to date so far
- Lights (heavily degraded it's performance just with a few on the map)
    - Implimented some better caching for the lights
    - For each light, they use a spatial partitioning grid system to find relevant walls in relation to each light - this only rebuilds itself whenever updateCachedElements is called.
    - Changed the composite operation from 'xor' to 'destination-out' for better performance
    - The dirty rectangle merge function originally had an ineffecient loop with O(n2) which was expensive when there was several lights (been improved so it isn't as bad now).
    - lights now only calculate the walls and shadows that are relavent to them.
- Reordered the code so it's more structured and easier to read
-  the player's dirty rect was being merged with light's dirty rects, thus causing issues, they are now processed seperately. The player vision is always processed first before lights.
- Fixed an issue with the lights where sometimes certain one's dirty rects wasn't being merged
*/

const FOW_COLOR = '#202020';
const FOW_LIGHT_EDGE = 0.75;
const FOW_COVERED_CHECKS = 2;

var fog_of_war_distance = 0;

var fow_canvas = null;
var fow_ctx = null;
var fow_image_data = null;
var fow_pattern = null;
let textureCache = new Map();

let l_canvas = null;
let l_ctx = null;
let cachedGradients = new Map();

//lights
const LIGHT_RESOLUTION = 256
const MAX_CACHED_GRADIENTS = 50;
let lightCache = new Map();

//walls
let wallGridCache = null;
let wallsLastUpdated = 0;
const WALL_GRID_SIZE = 100;

//change this if you want the bar doors to have shadows
let DRAW_SHADOWS_FOR_BAR_DOORS = false;

let dirtyRects = [];
const BUFFER = 30; //30 seems to be the minimum value without showing gaps around the dirty rectangles

const FOW_REAL_FAST = true;

const cachedElements = {
    walls: null,
    doors: null,
    blinders: null,
    lights: null,
    zones: null,
    characters: null
}

function updateCachedElements() {
    cachedElements.walls = $('div.wall').toArray();
    cachedElements.doors = $('div.door').toArray();
    cachedElements.blinders = $('div.blinder').toArray();
    cachedElements.lights = $('.light').toArray();
    cachedElements.zones = $('div.zone').toArray();
    cachedElements.characters = null;
    wallGridCache = null;
}
/*
==========
Dirty rectangles
==========
*/

class DirtyRectPool {
    constructor(initialSize = 100) {
        this.pool = Array(initialSize).fill().map(() => ({
            x: 0, y: 0, width: 0, height: 0, inuse: false}));
    }

    aquire() {
        let rect = this.pool.find(r => !r.inuse);
        if (!rect){
            rect = {x: 0, y: 0, width: 0, height: 0, inuse: false};
            this.pool.push(rect);
        }
        rect.inuse = true;
        return rect;
    }

    release(rect) {
        rect.inuse = false;
    }

    clear() {
        this.pool.forEach(rect => rect.inuse = false);
    }
}

//Creates/adds a dirty rectangle to the list of dirty rectangles
function addDirtyRect(x, y, radius) {
    const rect = {
        x: x - radius - BUFFER,
        y: y - radius - BUFFER,
        width: (radius + BUFFER) * 2,
        height: (radius + BUFFER) * 2
    };
    dirtyRects.push(rect);
}

function processDirtyRects(obj_x, obj_y, obj_pos) {
    const BATCH_SIZE = 10;
    for (let i = 0; i < dirtyRects.length; i += BATCH_SIZE) {
        const batch = dirtyRects.slice(i, i + BATCH_SIZE);
        fow_ctx.save();

        batch.forEach(rect => {
            fow_ctx.save();

            // Process walls 
            const nearbyWalls = getWallsInRect(rect);
            nearbyWalls.forEach(wall => {
                fog_of_war_walls($(wall), obj_x, obj_y, rect);
            });

            // Process doors
            cachedElements.doors.forEach(door => {
                const $door = $(door);
                if ($door.attr('state') === 'open') return;
                if ($door.attr('bars') === 'yes') {
                    if (DRAW_SHADOWS_FOR_BAR_DOORS) {
                        fog_of_war_bar_door($door, obj_x, obj_y, rect);
                    }
                } else {
                    fog_of_war_walls($door, obj_x, obj_y, rect);
                }
            });

            // Process blinders
            const nearbyBlinders = getBlindersInRect(rect);
            nearbyBlinders.forEach(blinder => {
                fog_of_war_blinders($(blinder), obj_x, obj_y, rect);
            });

            // Process zones
            processZoneShadows(obj_x, obj_y, obj_pos, rect);

            fow_ctx.restore();
        });
        fow_ctx.restore();
    }
}

// Merges overlapping or touching dirty rectangles
function mergeDirtyRects() {
    if (dirtyRects.length <= 1) return;
    
    let changed = true;
    let result = [...dirtyRects];
    
    // Keep merging until no more merges are possible
    while (changed) {
        changed = false;
        const newResult = [];
        const used = new Array(result.length).fill(false);
        
        for (let i = 0; i < result.length; i++) {
            if (used[i]) continue;
            
            let current = {...result[i]};
            used[i] = true;
            
            // Try to merge with remaining rectangles
            for (let j = i + 1; j < result.length; j++) {
                if (used[j]) continue;
                
                const other = result[j];
                
                // Check if rectangles are touching or overlapping
                const touching = !(
                    current.x > other.x + other.width ||    
                    other.x > current.x + current.width ||
                    current.y > other.y + other.height || 
                    other.y > current.y + current.height 
                );
                
                if (touching) {
                    // Merge the rectangles
                    const newX = Math.min(current.x, other.x);
                    const newY = Math.min(current.y, other.y);
                    const newRight = Math.max(current.x + current.width, other.x + other.width);
                    const newBottom = Math.max(current.y + current.height, other.y + other.height);
                    
                    current = {
                        x: newX,
                        y: newY,
                        width: newRight - newX,
                        height: newBottom - newY
                    };
                    
                    used[j] = true;
                    changed = true;
                }
            }
            newResult.push(current);
        }   
        result = newResult;
    }
    dirtyRects = result;
}

function processDirtyRectsForNonWallElements(obj_x, obj_y, obj_pos) {
    const BATCH_SIZE = 10;
    for (let i = 0; i < dirtyRects.length; i += BATCH_SIZE) {
        const batch = dirtyRects.slice(i, i + BATCH_SIZE);
        fow_ctx.save();

        batch.forEach(rect => {
            // Process shadows for all objects
            fow_ctx.save();

            // Process doors
            cachedElements.doors.forEach(door => {
                const $door = $(door);
                if ($door.attr('state') === 'open') return;
                if ($door.attr('bars') === 'yes') {
                    if (DRAW_SHADOWS_FOR_BAR_DOORS) {
                        fog_of_war_bar_door($door, obj_x, obj_y, rect);
                    }
                } else {
                    fog_of_war_walls($door, obj_x, obj_y, rect);
                }
            });

            // Process blinders
            const nearbyBlinders = getBlindersInRect(rect);
            nearbyBlinders.forEach(blinder => {
                fog_of_war_blinders($(blinder), obj_x, obj_y, rect);
            });

            // Process zones
            processZoneShadows(obj_x, obj_y, obj_pos, rect);

            fow_ctx.restore();
        });
        fow_ctx.restore();
    }
}

//checks if two rectangles overlap
function rectsOverlap(r1, r2) {
    return !(r2.x > r1.x + r1.width || 
             r2.x + r2.width < r1.x || 
             r2.y > r1.y + r1.height ||
             r2.y + r2.height < r1.y);
}

//Creates a new rectangle that contains both the overlapping ones
function getMergedRect(r1, r2) {
    const x = Math.min(r1.x, r2.x);
    const y = Math.min(r1.y, r2.y);
    const width = Math.max(r1.x + r1.width, r2.x + r2.width) - x;
    const height = Math.max(r1.y + r1.height, r2.y + r2.height) - y;
    return {x, y, width, height};
}

//checks if a light source intersects a rectangle
function rectIntersects(rect, x, y, radius) {
    const cx = x - rect.x;
    const cy = y - rect.y;
    return cx + radius >= 0 && cx - radius <= rect.width &&
           cy + radius >= 0 && cy - radius <= rect.height;
}

/*
==========
Fog Of War
==========
*/

function draw_fow_shape(ctx, player_x, player_y, wall_x1, wall_y1, wall_x2, wall_y2) {
    // Calculate directions from light to each wall endpoint
    const dx1 = wall_x1 - player_x;
    const dy1 = wall_y1 - player_y;
    const dx2 = wall_x2 - player_x;
    const dy2 = wall_y2 - player_y;
    
    // Calculate distances and normalize
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    
    if (dist1 === 0 || dist2 === 0) return; // Avoid division by zero
    
    const nx1 = dx1 / dist1;
    const ny1 = dy1 / dist1;
    const nx2 = dx2 / dist2;
    const ny2 = dy2 / dist2;
    
    // Calculate shadow points for each endpoint individually
    const shadowDepth = Math.max(fow_canvas.width, fow_canvas.height) * 2;
    const shadow_x1 = wall_x1 + nx1 * shadowDepth;
    const shadow_y1 = wall_y1 + ny1 * shadowDepth;
    const shadow_x2 = wall_x2 + nx2 * shadowDepth;
    const shadow_y2 = wall_y2 + ny2 * shadowDepth;
    
    // Draw shadow polygon using the individual endpoint shadows
    ctx.beginPath();
    ctx.moveTo(wall_x1, wall_y1);
    ctx.lineTo(wall_x2, wall_y2);
    ctx.lineTo(shadow_x2, shadow_y2);
    ctx.lineTo(shadow_x1, shadow_y1);
    ctx.closePath();
    
    ctx.fillStyle = fow_pattern;
    ctx.fill();
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

function fog_of_war_set_distance(distance) {
	if (distance > 0) {
		distance = distance * grid_cell_size;
	}

	fog_of_war_distance = distance;
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

/* 
=========
Fog of war interface
=========
*/

//Initializes full fog coverage
function initializeFogCoverage() {
    fow_ctx.fillStyle = fow_pattern;
    fow_ctx.fillRect(0, 0, fow_canvas.width, fow_canvas.height);
}

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

    updateCachedElements();
    initializeFogCoverage();
}

function fog_of_war_pattern(pattern, obj)  {
    if (pattern == null) {
        pattern = '/images/fow.jpg';
    }

    //check if image is already cached
    if (textureCache.has(pattern)) {
        fow_pattern = textureCache.get(pattern);
        fow_ctx.fillStyle = fow_pattern;
        fow_ctx.strokeStyle = fow_pattern;
        if (obj != null) {
            fog_of_war_update(obj);
        }
        return;
    }

    //create the pattern and cache it
    const img = new Image();
    img.src = pattern;
    
    img.onload = function() {
        //for better performance, create a smaller version of the pattern
        const patternCanvas = document.createElement('canvas');
        const patternCtx = patternCanvas.getContext('2d', { alpha: true });
        patternCanvas.width = 512;  //can increase these to 512 if 256 looks too small
        patternCanvas.height = 512;

        patternCtx.drawImage(img, 0, 0, patternCanvas.width, patternCanvas.height);
        
        fow_pattern = fow_ctx.createPattern(patternCanvas, 'repeat');
        textureCache.set(pattern, fow_pattern);

        fow_ctx.fillStyle = fow_pattern;
        fow_ctx.strokeStyle = fow_pattern;

        if (obj != null) {
            fog_of_war_update(obj);
        }
    };
}

function fog_of_war_update(obj) {
	if (fow_ctx == null) {
		return;
	}

    requestAnimationFrame(() => {
        const original_pos = object_position(obj);
        let obj_x = original_pos.left + (grid_cell_size / 2);
        let obj_y = original_pos.top + (grid_cell_size / 2);
        
        // Get DOM elements for light source calculations
        const $obj = $(obj);
        const $playarea = $('.playarea > div');
        let playareaOffset = null;
        
        if ($obj.length && $playarea.length) {
            playareaOffset = $playarea.offset();
        } else {
            playareaOffset = $playarea.length ? $playarea.offset() : { left: 0, top: 0 };
        }

        // Clear the canvas first
        fow_ctx.clearRect(0, 0, fow_canvas.width, fow_canvas.height);
        dirtyRects = [];

        if (fog_of_war_distance > 0) {
            // Fill with fog pattern
            fow_ctx.fillStyle = fow_pattern;
            fow_ctx.fillRect(0, 0, fow_canvas.width, fow_canvas.height);

            // Create player's dirty rectangle 
            playerRect = {
                x: Math.round(obj_x - fog_of_war_distance - BUFFER),
                y: Math.round(obj_y - fog_of_war_distance - BUFFER),
                width: (fog_of_war_distance + BUFFER) * 2,
                height: (fog_of_war_distance + BUFFER) * 2
            };
                        
            // Process player's fog of war FIRST, separately from other lights
            processPlayerFogOfWar(obj_x, obj_y, playerRect);

            // Process character lights
            const characterLights = [];
            if (playareaOffset) {
                $('div.character').each(function() {
                    const radius = parseInt($(this).attr('light'));
                    if (radius > 0) {
                        try {
                            const $char = $(this);
                            const charOffset = $char.offset();
                            const charWidth = $char.width();
                            const charHeight = $char.height();

                            const x = Math.round(charOffset.left - playareaOffset.left + (charWidth / 2));
                            const y = Math.round(charOffset.top - playareaOffset.top + (charHeight / 2));
                            
                            characterLights.push({
                                x: x,
                                y: y,
                                radius: radius * grid_cell_size
                            });
                            
                            // Add character light rect
                            addDirtyRect(x, y, radius * grid_cell_size);
                        } catch (e) {
                            console.error('Error with character light:', e);
                        }
                    }
                });
            }

            // Add light sources
            if (playareaOffset) {
                cachedElements.lights.forEach(light => {
                    if (light.getAttribute('state') === 'on') {
                        try {
                            const $light = $(light);
                            const lightOffset = $light.offset();
                            const lightWidth = $light.width();
                            const lightHeight = $light.height();
                            const radius = parseInt(light.getAttribute('radius')) * grid_cell_size;
                            
                            const x = Math.round(lightOffset.left - playareaOffset.left + (lightWidth / 2));
                            const y = Math.round(lightOffset.top - playareaOffset.top + (lightHeight / 2));
                            
                            addDirtyRect(x, y, radius);
                        } catch (e) {
                            const pos = object_position($(light));
                            const radius = parseInt(light.getAttribute('radius')) * grid_cell_size;
                            addDirtyRect(pos.left + (grid_cell_size / 2), pos.top + (grid_cell_size / 2), radius);
                        }
                    }
                });
            }

            // Process light sources separately
            if (dirtyRects.length > 0) {
                mergeDirtyRects();
                processLightsWithSpatialPartitioning(obj_x, obj_y, characterLights, playareaOffset);
                
                const obj_pos = {
                    left: obj_x - (grid_cell_size / 2),
                    top: obj_y - (grid_cell_size / 2)
                };
                
                // Process light dirty rectangles
                processDirtyRects(obj_x, obj_y, obj_pos);
            }
        } else {
            fow_ctx.fillStyle = fow_pattern;

            cachedElements.walls.forEach(wall => {
                if ($(wall).attr('transparent') === 'yes') return;
                fog_of_war_walls($(wall), obj_x, obj_y, {
                    x: 0, y: 0, 
                    width: fow_canvas.width, 
                    height: fow_canvas.height
                });
            });

            cachedElements.doors.forEach(door => {
                const $door = $(door);
                if ($door.attr('state') === 'open') return;
                if ($door.attr('bars') === 'yes') {
                    if (DRAW_SHADOWS_FOR_BAR_DOORS) {
                        fog_of_war_bar_door($door, obj_x, obj_y, {
                            x: 0, y: 0,
                            width: fow_canvas.width,
                            height: fow_canvas.height
                        });
                    }
                } else {
                    fog_of_war_walls($door, obj_x, obj_y, {
                        x: 0, y: 0,
                        width: fow_canvas.width,
                        height: fow_canvas.height
                    });
                }
            });

            cachedElements.blinders.forEach(blinder => {
                fog_of_war_blinders($(blinder), obj_x, obj_y, {
                    x: 0, y: 0,
                    width: fow_canvas.width,
                    height: fow_canvas.height
                });
            });

            const obj_pos = {
                left: obj_x - (grid_cell_size / 2),
                top: obj_y - (grid_cell_size / 2)
            };
            processZoneShadows(obj_x, obj_y, obj_pos, {
                x: 0, y: 0,
                width: fow_canvas.width,
                height: fow_canvas.height
            });
        }
    });
}

function processPlayerFogOfWar(obj_x, obj_y, playerRect) {
    fow_ctx.save();
    
    // Clip to player's vision area
    fow_ctx.beginPath();
    fow_ctx.rect(playerRect.x, playerRect.y, playerRect.width, playerRect.height);
    fow_ctx.clip();
    fow_ctx.globalCompositeOperation = 'destination-out';
    
    const gradient = fow_ctx.createRadialGradient(obj_x, obj_y, 0, obj_x, obj_y, fog_of_war_distance);
    gradient.addColorStop(0, 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(FOW_LIGHT_EDGE, 'rgba(0, 0, 0, ' + FOW_LIGHT_EDGE + ')');
    gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    
    fow_ctx.fillStyle = gradient;
    fow_ctx.beginPath();
    fow_ctx.arc(obj_x, obj_y, fog_of_war_distance, 0, Math.PI * 2);
    fow_ctx.fill();
    
    fow_ctx.globalCompositeOperation = 'source-over';
    fow_ctx.fillStyle = fow_pattern;
    
    const nearbyWalls = getWallsInRect(playerRect);
    nearbyWalls.forEach(wall => {
        fog_of_war_walls($(wall), obj_x, obj_y, playerRect);
    });

    cachedElements.doors.forEach(door => {
        const $door = $(door);
        if ($door.attr('state') === 'open') return;
        if ($door.attr('bars') === 'yes') {
            if (DRAW_SHADOWS_FOR_BAR_DOORS) {
                fog_of_war_bar_door($door, obj_x, obj_y, playerRect);
            }
        } else {
            fog_of_war_walls($door, obj_x, obj_y, playerRect);
        }
    });

    const nearbyBlinders = getBlindersInRect(playerRect);
    nearbyBlinders.forEach(blinder => {
        fog_of_war_blinders($(blinder), obj_x, obj_y, playerRect);
    });

    const obj_pos = {
        left: obj_x - (grid_cell_size / 2),
        top: obj_y - (grid_cell_size / 2)
    };
    processZoneShadows(obj_x, obj_y, obj_pos, playerRect);
    
    fow_ctx.restore();
}

function getAccurateObjectPosition(obj) {
    const $obj = $(obj);
    const $playarea = $('.playarea > div');
    
    if (!$obj.length || !$playarea.length) {
        console.log('Invalid object or playarea not found');
        return object_position(obj); 
    }
    
    try {
        // Get absolute positions
        const objOffset = $obj.offset();
        const playareaOffset = $playarea.offset();
        
        // Calculate relative position 
        const relLeft = objOffset.left - playareaOffset.left;
        const relTop = objOffset.top - playareaOffset.top;
        
        // Get object dimensions
        const width = $obj.width();
        const height = $obj.height();
        
        return {
            left: relLeft + (width / 2) - (grid_cell_size / 2), 
            top: relTop + (height / 2) - (grid_cell_size / 2)  
        };
    } catch (e) {
        return object_position(obj);
    }
}

function collectCharacterLightsAccurate() {
    const characterLights = [];
    $('div.character').each(function() {
        const radius = parseInt($(this).attr('light'));
        if (radius > 0) {
            const pos = getAccurateObjectPosition(this);
            characterLights.push({
                x: pos.left + (grid_cell_size / 2),
                y: pos.top + (grid_cell_size / 2),
                radius: radius * grid_cell_size
            });
            addDirtyRect(pos.left + (grid_cell_size / 2), pos.top + (grid_cell_size / 2), radius * grid_cell_size);
        }
    });
    return characterLights;
}

// Process zone shadows separately
function processZoneShadows(obj_x, obj_y, obj_pos, rect) {
    let my_altitude = 0;
    cachedElements.zones.forEach(zone => {
        const $zone = $(zone);
        if (zone_covers_position($zone, obj_pos)) {
            const zone_altitude = parseInt($zone.attr('altitude'));
            if (zone_altitude > my_altitude) {
                my_altitude = zone_altitude;
            }
        }
    });

    cachedElements.zones.forEach(zone => {
        const $zone = $(zone);
        const zone_altitude = $zone.attr('altitude');
        if (zone_altitude <= my_altitude) return;

        const zone_pos = object_position($zone);
        const zone_width = $zone.width();
        const zone_height = $zone.height();

        // Cast shadows from zone edges
        if (zone_pos.left + zone_width < obj_x) {
            draw_fow_shape(fow_ctx, obj_x, obj_y, 
                zone_pos.left + zone_width, zone_pos.top, 
                zone_pos.left + zone_width, zone_pos.top + zone_height);
        } else if (zone_pos.left > obj_x) {
            draw_fow_shape(fow_ctx, obj_x, obj_y,
                zone_pos.left, zone_pos.top,
                zone_pos.left, zone_pos.top + zone_height);
        }

        if (zone_pos.top + zone_height < obj_y) {
            draw_fow_shape(fow_ctx, obj_x, obj_y,
                zone_pos.left, zone_pos.top + zone_height,
                zone_pos.left + zone_width, zone_pos.top + zone_height);
        } else if (zone_pos.top > obj_y) {
            draw_fow_shape(fow_ctx, obj_x, obj_y,
                zone_pos.left, zone_pos.top,
                zone_pos.left + zone_width, zone_pos.top);
        }
    });
}


/*
==========
Constructs - Bar door
==========
*/
function fog_of_war_bar_door(door, obj_x, obj_y, rect) {
    const pos_x = parseInt(door.attr('pos_x')) * grid_cell_size;
    const pos_y = parseInt(door.attr('pos_y')) * grid_cell_size;
    const length = parseInt(door.attr('length')) * grid_cell_size;
    const direction = door.attr('direction');
    const shadowDepth = Math.max(fow_canvas.width, fow_canvas.height) * 2;

    const isHorizontal = direction === 'horizontal';
    const offset = 0;
    const thickness = 0;
    
    fow_ctx.save();
    fow_ctx.beginPath();
    fow_ctx.rect(rect.x, rect.y, rect.width, rect.height);
    fow_ctx.clip();
    
    fow_ctx.fillStyle = fow_pattern;

    //Calculate all bars at once
    const barCount = Math.floor(length / 10);
    const bars = new Array(barCount);
    
    if (isHorizontal) {
        const adjustedY = pos_y + offset;
        
        for (let i = 0; i < barCount; i++) {
            const barStart = pos_x + (i * 10) + 5;
            const barEnd = Math.min(barStart + 5, pos_x + length);

            const dx1 = barStart - obj_x;
            const dy1 = adjustedY - obj_y;
            const dx2 = barEnd - obj_x;
            const dy2 = (adjustedY + thickness) - obj_y;
            
            const invDist1 = 1 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const invDist2 = 1 / Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            bars[i] = {
                x1: barStart,
                y1: adjustedY,
                x2: barEnd,
                y2: adjustedY + thickness,
                sx1: barStart + dx1 * invDist1 * shadowDepth,
                sy1: adjustedY + dy1 * invDist1 * shadowDepth,
                sx2: barEnd + dx2 * invDist2 * shadowDepth,
                sy2: (adjustedY + thickness) + dy2 * invDist2 * shadowDepth
            };
        }
    } else {
        const adjustedX = pos_x + offset;
        
        for (let i = 0; i < barCount; i++) {
            const barStart = pos_y + (i * 10) + 5;
            const barEnd = Math.min(barStart + 5, pos_y + length);
            
            const dx1 = adjustedX - obj_x;
            const dy1 = barStart - obj_y;
            const dx2 = (adjustedX + thickness) - obj_x;
            const dy2 = barEnd - obj_y;
            
            const invDist1 = 1 / Math.sqrt(dx1 * dx1 + dy1 * dy1);
            const invDist2 = 1 / Math.sqrt(dx2 * dx2 + dy2 * dy2);
            
            bars[i] = {
                x1: adjustedX,
                y1: barStart,
                x2: adjustedX + thickness,
                y2: barEnd,
                sx1: adjustedX + dx1 * invDist1 * shadowDepth,
                sy1: barStart + dy1 * invDist1 * shadowDepth,
                sx2: (adjustedX + thickness) + dx2 * invDist2 * shadowDepth,
                sy2: barEnd + dy2 * invDist2 * shadowDepth
            };
        }
    }

    //draw shadows in batch
    for (let i = 0; i < barCount; i++) {
        const bar = bars[i];
        fow_ctx.beginPath();
        fow_ctx.moveTo(bar.x1, bar.y1);
        fow_ctx.lineTo(bar.x2, bar.y1);
        fow_ctx.lineTo(bar.x2, bar.y2);
        fow_ctx.lineTo(bar.sx2, bar.sy2);
        fow_ctx.lineTo(bar.sx1, bar.sy1);
        fow_ctx.closePath();
        fow_ctx.fill();
    }

    fow_ctx.restore();
}

/*
==========
Constructs - walls
==========
*/

function getWallsInRect(rect) {
    return cachedElements.walls.filter(wall => {
        const $wall = $(wall);
        //gets potions of the walls
        const pos_x = parseInt($wall.attr('pos_x')) * grid_cell_size;
        const pos_y = parseInt($wall.attr('pos_y')) * grid_cell_size;
        const length = parseInt($wall.attr('length')) * grid_cell_size;
        const direction = $wall.attr('direction');

        //calculate the bounds of the walls
        const wallRect = {
            x: pos_x,
            y: pos_y,
            width: direction === 'horizontal' ? length : grid_cell_size,
            height: direction === 'vertical' ? length : grid_cell_size
        };

        //buffer to ensure all the walls near the edge are caught
        const expandedRect = {
            x: rect.x - BUFFER,
            y: rect.y - BUFFER,
            width: rect.width + BUFFER * 2,
            height: rect.height + BUFFER * 2
        };

        return rectsOverlap(expandedRect, wallRect);
    });
}

function fog_of_war_walls(wall, obj_x, obj_y, rect) {
    if (wall.attr('transparent') === 'yes') {
        return true;
    }

    const WALL_BUFFER = 0.8;
    let pos1_x = parseInt(wall.attr('pos_x')) * grid_cell_size;
    let pos1_y = parseInt(wall.attr('pos_y')) * grid_cell_size;
    let pos2_x = pos1_x;
    let pos2_y = pos1_y;
    let length = parseInt(wall.attr('length')) * grid_cell_size;
    let direction = wall.attr('direction');

    if (direction === 'horizontal') {
        pos2_x += length;
        pos1_x -= WALL_BUFFER;
        pos2_x += WALL_BUFFER;
    } else if (direction === 'vertical') {
        pos2_y += length;
        pos1_y -= WALL_BUFFER;
        pos2_y += WALL_BUFFER;
    } else {
        return;
    }

    // Calculate direction vectors from player to wall endpoints
    const dx1 = pos1_x - obj_x;
    const dy1 = pos1_y - obj_y;
    const dx2 = pos2_x - obj_x;
    const dy2 = pos2_y - obj_y;

    // Calculate distances and normalize vectors
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    
    // Avoid division by zero
    if (dist1 === 0 || dist2 === 0) return;
    
    const nx1 = dx1 / dist1;
    const ny1 = dy1 / dist1;
    const nx2 = dx2 / dist2;
    const ny2 = dy2 / dist2;

    // Calculate shadow points
    const shadowDepth = Math.max(fow_canvas.width, fow_canvas.height) * 2;
    const shadow_x1 = pos1_x + nx1 * shadowDepth;
    const shadow_y1 = pos1_y + ny1 * shadowDepth;
    const shadow_x2 = pos2_x + nx2 * shadowDepth;
    const shadow_y2 = pos2_y + ny2 * shadowDepth;

    // Save context state
    fow_ctx.save();
    
    // Clip to dirty rectangle
    fow_ctx.beginPath();
    fow_ctx.rect(rect.x, rect.y, rect.width, rect.height);
    fow_ctx.clip();

    // Draw shadow polygon
    fow_ctx.beginPath();
    fow_ctx.moveTo(pos1_x, pos1_y);
    fow_ctx.lineTo(pos2_x, pos2_y);
    fow_ctx.lineTo(shadow_x2, shadow_y2);
    fow_ctx.lineTo(shadow_x1, shadow_y1);
    fow_ctx.closePath();

    // Use pattern instead of solid color
    fow_ctx.fillStyle = fow_pattern;
    fow_ctx.fill();

    // Restore context state
    fow_ctx.restore();
}


/*
==========
Constructs - Blinders
==========
*/

function getBlindersInRect(rect) {
    return cachedElements.blinders.filter(blinder => {
        const $blinder = $(blinder);
        //gets potions of the walls
        const pos_x = parseInt($blinder.attr('pos_x')) * grid_cell_size;
        const pos_y = parseInt($blinder.attr('pos_y')) * grid_cell_size;
        const length = parseInt($blinder.attr('length')) * grid_cell_size;
        const direction = $blinder.attr('direction');

        //calculate the bounds of the walls
        const blinderRect = {
            x: pos_x,
            y: pos_y,
            width: direction === 'horizontal' ? length : grid_cell_size,
            height: direction === 'vertical' ? length : grid_cell_size
        };

        //buffer to ensure all the walls near the edge are caught
        const expandedRect = {
            x: rect.x - BUFFER,
            y: rect.y - BUFFER,
            width: rect.width + BUFFER * 2,
            height: rect.height + BUFFER * 2
        };

        return rectsOverlap(expandedRect, blinderRect);
    });
}

function fog_of_war_blinders(blinder, obj_x, obj_y, rect) {   
    const pos = {
        x1: parseInt(blinder.attr('pos1_x')),
        y1: parseInt(blinder.attr('pos1_y')),
        x2: parseInt(blinder.attr('pos2_x')),
        y2: parseInt(blinder.attr('pos2_y'))
    };

    const PADDING = 1; 
    
    //Calculate direction of the blinder
    const dx = pos.x2 - pos.x1;
    const dy = pos.y2 - pos.y1;
    const length = Math.sqrt(dx * dx + dy * dy);
    
    //normalize blinder direction
    const dirX = dx / length;
    const dirY = dy / length;
    
    //add padding, otherwise the corners of blinders would have a tiny missing strip
    pos.x1 -= dirX * PADDING;
    pos.y1 -= dirY * PADDING;
    pos.x2 += dirX * PADDING;
    pos.y2 += dirY * PADDING;

    // Calculate direction vectors from viewer to padded endpoints
    const dx1 = pos.x1 - obj_x;
    const dy1 = pos.y1 - obj_y;
    const dx2 = pos.x2 - obj_x;
    const dy2 = pos.y2 - obj_y;

    //Calculate distances
    const dist1 = Math.sqrt(dx1 * dx1 + dy1 * dy1);
    const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);
    
    if (dist1 === 0 || dist2 === 0) return;
    
    //normalize vectors
    const nx1 = dx1 / dist1;
    const ny1 = dy1 / dist1;
    const nx2 = dx2 / dist2;
    const ny2 = dy2 / dist2;

    const shadowDepth = Math.max(fow_canvas.width, fow_canvas.height) * 2.2;
    const shadow_x1 = pos.x1 + nx1 * shadowDepth;
    const shadow_y1 = pos.y1 + ny1 * shadowDepth;
    const shadow_x2 = pos.x2 + nx2 * shadowDepth;
    const shadow_y2 = pos.y2 + ny2 * shadowDepth;

    fow_ctx.save();
    fow_ctx.beginPath();
    fow_ctx.rect(rect.x, rect.y, rect.width, rect.height);
    fow_ctx.clip();

    fow_ctx.beginPath();
    fow_ctx.moveTo(pos.x1, pos.y1);
    fow_ctx.lineTo(pos.x2, pos.y2);
    fow_ctx.lineTo(shadow_x2, shadow_y2);
    fow_ctx.lineTo(shadow_x1, shadow_y1);
    fow_ctx.closePath();

    fow_ctx.fillStyle = fow_pattern;
    fow_ctx.fill();

    fow_ctx.restore();
}

/*
==========
Lights
==========
*/
function createCachedLight(radius) {
    // Check cache first
    const cacheKey = Math.round(radius);
    if (lightCache.has(cacheKey)) {
        return lightCache.get(cacheKey);
    }

    // Create new light texture at lower resolution
    const lightCanvas = document.createElement('canvas');
    lightCanvas.width = LIGHT_RESOLUTION;
    lightCanvas.height = LIGHT_RESOLUTION;
    const lightCtx = lightCanvas.getContext('2d', { alpha: true });

    const grad = lightCtx.createRadialGradient(
        LIGHT_RESOLUTION/2, LIGHT_RESOLUTION/2, 0,
        LIGHT_RESOLUTION/2, LIGHT_RESOLUTION/2, LIGHT_RESOLUTION/2
    );
    // These color stops need to be in this order for destination-out to work correctly
    grad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    grad.addColorStop(FOW_LIGHT_EDGE, 'rgba(0, 0, 0, ' + FOW_LIGHT_EDGE + ')');
    grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

    // Draw gradient
    lightCtx.fillStyle = grad;
    lightCtx.fillRect(0, 0, LIGHT_RESOLUTION, LIGHT_RESOLUTION);

    // Cache the light texture
    lightCache.set(cacheKey, lightCanvas);

    // Limit cache size
    if (lightCache.size > MAX_CACHED_GRADIENTS) {
        const firstKey = lightCache.keys().next().value;
        lightCache.delete(firstKey);
    }

    return lightCanvas;
}

function draw_light_sphere(pos_x, pos_y, radius, relevantWalls) {
    // Initialize canvas once if not already done
    if (!l_canvas) {
        l_canvas = document.createElement('canvas');
        l_canvas.width = fow_canvas.width;
        l_canvas.height = fow_canvas.height;
        l_ctx = l_canvas.getContext('2d', { alpha: true });
    }

    // Only process walls that actually intersect the light's area
    const lightBounds = {
        x: pos_x - radius,
        y: pos_y - radius,
        width: radius * 2,
        height: radius * 2
    };
    
    const wallsToProcess = relevantWalls.filter(wall => {
        const $wall = $(wall);
        const pos_x_wall = parseInt($wall.attr('pos_x')) * grid_cell_size;
        const pos_y_wall = parseInt($wall.attr('pos_y')) * grid_cell_size;
        const length = parseInt($wall.attr('length')) * grid_cell_size;
        const direction = $wall.attr('direction');
        
        const wallRect = {
            x: pos_x_wall,
            y: pos_y_wall,
            width: direction === 'horizontal' ? length : grid_cell_size,
            height: direction === 'vertical' ? length : grid_cell_size
        };
        
        return rectsOverlap(lightBounds, wallRect);
    });

    // Skip expensive operations if no walls to process and light doesn't reach edge
    const reachesEdge = pos_x - radius <= 0 || 
                       pos_x + radius >= fow_canvas.width ||
                       pos_y - radius <= 0 ||
                       pos_y + radius >= fow_canvas.height;
    
    // Fast path for lights with no shadow-casting walls
    if (wallsToProcess.length === 0 && !reachesEdge) {
        // Just punch a hole directly in the fog, but still use the light canvas system
        l_ctx.clearRect(0, 0, l_canvas.width, l_canvas.height);
        l_ctx.fillStyle = fow_pattern;
        l_ctx.fillRect(0, 0, l_canvas.width, l_canvas.height);

        const lightTexture = createCachedLight(radius);
        l_ctx.globalCompositeOperation = 'destination-out';
        l_ctx.drawImage(lightTexture, 
            pos_x - radius, pos_y - radius, 
            radius * 2, radius * 2
        );
        
        l_ctx.globalCompositeOperation = 'source-over';
        
        // Apply to main canvas u
        fow_ctx.globalCompositeOperation = 'destination-in';
        fow_ctx.drawImage(l_canvas, 0, 0);
        fow_ctx.globalCompositeOperation = 'source-over';
        return;
    }
    
    // Standard path with shadow calculations
    l_ctx.clearRect(0, 0, l_canvas.width, l_canvas.height); 
    l_ctx.fillStyle = fow_pattern;
    l_ctx.fillRect(0, 0, l_canvas.width, l_canvas.height);

    const lightTexture = createCachedLight(radius);
    l_ctx.globalCompositeOperation = 'destination-out';
    l_ctx.drawImage(lightTexture, 
        pos_x - radius, pos_y - radius, 
        radius * 2, radius * 2
    );

    l_ctx.globalCompositeOperation = 'source-over';
    l_ctx.fillStyle = fow_pattern;

    // Only process walls that actually cast shadows visible in this light
    wallsToProcess.forEach(wall => {
        const $wall = $(wall);
        const WALL_BUFFER = 0.8;  // Add same buffer as in fog_of_war_walls
        let pos_x_wall = parseInt($wall.attr('pos_x')) * grid_cell_size;
        let pos_y_wall = parseInt($wall.attr('pos_y')) * grid_cell_size;
        let pos2_x = pos_x_wall;
        let pos2_y = pos_y_wall;
        const length = parseInt($wall.attr('length')) * grid_cell_size;
        const direction = $wall.attr('direction');
    
        if (direction === 'horizontal') {
            pos2_x += length;
            pos_x_wall -= WALL_BUFFER;  // Add buffer
            pos2_x += WALL_BUFFER;      // Add buffer
        } else {
            pos2_y += length;
            pos_y_wall -= WALL_BUFFER;  // Add buffer
            pos2_y += WALL_BUFFER;      // Add buffer
        }
    
        draw_fow_shape(l_ctx, pos_x, pos_y, pos_x_wall, pos_y_wall, pos2_x, pos2_y);
    });

    fow_ctx.globalCompositeOperation = 'destination-in';
    fow_ctx.drawImage(l_canvas, 0, 0);
    fow_ctx.globalCompositeOperation = 'source-over';
}

//Uses spatial partitioning to process lights more efficiently (does not process player)
function processLightsWithSpatialPartitioning(playerX, playerY, characterLights, playareaOffset) {
    if (!wallGridCache) {
        createWallGrid();
    }
    
    cachedElements.lights.forEach(light => {
        if (light.getAttribute('state') === 'on') {
            try {
                const $light = $(light);
                const lightOffset = $light.offset();
                const lightWidth = $light.width();
                const lightHeight = $light.height();
                const radius = parseInt(light.getAttribute('radius')) * grid_cell_size;
                
                if (playareaOffset) {
                    const x = Math.round(lightOffset.left - playareaOffset.left + (lightWidth / 2));
                    const y = Math.round(lightOffset.top - playareaOffset.top + (lightHeight / 2));
                    
                    processLightWithSpatialOptimization(x, y, radius);
                } else {
                    const pos = object_position($light);
                    processLightWithSpatialOptimization(
                        pos.left + (grid_cell_size >> 1),
                        pos.top + (grid_cell_size >> 1),
                        radius
                    );
                }
            } catch (e) {
                const pos = object_position($(light));
                const radius = parseInt(light.getAttribute('radius')) * grid_cell_size;
                processLightWithSpatialOptimization(
                    pos.left + (grid_cell_size >> 1),
                    pos.top + (grid_cell_size >> 1),
                    radius
                );
            }
        }
    });
    
    // Process character lights
    characterLights.forEach(light => {
        processLightWithSpatialOptimization(light.x, light.y, light.radius);
    });
}

function createWallGrid() {
    // Create a spatial grid for walls
    wallGridCache = new Map();
    
    // Add walls to spatial grid
    cachedElements.walls.forEach(wall => {
        const $wall = $(wall);
        if ($wall.attr('transparent') === 'yes') return;
        
        const pos_x = parseInt($wall.attr('pos_x')) * grid_cell_size;
        const pos_y = parseInt($wall.attr('pos_y')) * grid_cell_size;
        const length = parseInt($wall.attr('length')) * grid_cell_size;
        const direction = $wall.attr('direction');
        
        // Calculate wall bounds
        const minX = Math.floor(pos_x / WALL_GRID_SIZE);
        const minY = Math.floor(pos_y / WALL_GRID_SIZE);
        const maxX = Math.floor((pos_x + (direction === 'horizontal' ? length : grid_cell_size)) / WALL_GRID_SIZE);
        const maxY = Math.floor((pos_y + (direction === 'vertical' ? length : grid_cell_size)) / WALL_GRID_SIZE);
        
        // Add wall to all grid cells it intersects
        for (let x = minX; x <= maxX; x++) {
            for (let y = minY; y <= maxY; y++) {
                const key = `${x},${y}`;
                if (!wallGridCache.has(key)) wallGridCache.set(key, []);
                wallGridCache.get(key).push(wall);
            }
        }
    });
    
    wallsLastUpdated = Date.now();
}

function processLightWithSpatialOptimization(x, y, radius) {
    if (!wallGridCache) {
        createWallGrid();
    }
    
    // Get relevant walls for this light using the cached grid
    const relevantWalls = new Set();
    const minGridX = Math.floor((x - radius) / WALL_GRID_SIZE);
    const minGridY = Math.floor((y - radius) / WALL_GRID_SIZE);
    const maxGridX = Math.floor((x + radius) / WALL_GRID_SIZE);
    const maxGridY = Math.floor((y + radius) / WALL_GRID_SIZE);
    
    for (let gx = minGridX; gx <= maxGridX; gx++) {
        for (let gy = minGridY; gy <= maxGridY; gy++) {
            const key = `${gx},${gy}`;
            const walls = wallGridCache.get(key);
            if (walls) {
                walls.forEach(wall => relevantWalls.add(wall));
            }
        }
    }
    
    // Now draw the light with only relevant walls
    draw_light_sphere(x, y, radius, Array.from(relevantWalls));
}
