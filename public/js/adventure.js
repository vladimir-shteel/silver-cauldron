const FOW_NONE = 0;
const FOW_DAY_CELL = 1;
const FOW_DAY_REAL = 2;
const FOW_NIGHT_CELL = 3;
const FOW_NIGHT_REAL = 4;
const FOW_REVEAL = 5;

const DEFAULT_Z_INDEX = 1000;
const LAYER_NIGHT = DEFAULT_Z_INDEX;
const LAYER_DRAWING = DEFAULT_Z_INDEX + 1;
const LAYER_GRID = DEFAULT_Z_INDEX + 2;
const LAYER_ZONE = DEFAULT_Z_INDEX + 3;
const LAYER_EFFECT = DEFAULT_Z_INDEX + 4;
const LAYER_TOKEN = DEFAULT_Z_INDEX + 5;
const LAYER_CONSTRUCT = DEFAULT_Z_INDEX + 6;
const LAYER_LIGHT = DEFAULT_Z_INDEX + 7;
const LAYER_CHARACTER = DEFAULT_Z_INDEX + 8;
const LAYER_CHARACTER_OWN = DEFAULT_Z_INDEX + 9;
const LAYER_FOG_OF_WAR = DEFAULT_Z_INDEX + 10;
const LAYER_MARKER = DEFAULT_Z_INDEX + 11;
const LAYER_MENU = DEFAULT_Z_INDEX + 12;
const LAYER_VIEW = DEFAULT_Z_INDEX + 20000;

const DOOR_SECRET = '#a0a000';
const DOOR_OPEN = '#40c040';
const DOOR_OPACITY = '0.6';

const OBJECT_HIDDEN_FADE = 0.6;

const INPUT_HISTORY_SIZE = 20;

const DRAW_DEFAULT_COLOR = 1;
const DRAW_DEFAULT_WIDTH = 5;
const DRAW_ERASE_THIN = 25;
const DRAW_ERASE_THICK = 75;

const CHAR_POS_SAVE_DELAY = 2;

var websocket;
var group_key = null;
var adventure_id = null;
var map_id = null;
var user_id = null;
var character_id = null;
var resources_key = null;
var grid_cell_size = null;
var map_width = null;
var map_height = null;
var dungeon_master = null;
var my_name = null;
var character_name = null;
var character_steerable = true;
var my_character = null;
var wf_audio_player = null;
var wf_collectables = null;
var wf_effect_create = null;
var wf_journal = null;
var wf_pictures = null;
var wf_zone_create = null;
var wf_entry_edit = null;
var keep_centered = true;
var focus_obj = null;
var fow_type = null;
var fow_obj = null;
var fow_map_distance = null;
var input_history = null;
var input_index = -1;
var mouse_x = 0;
var mouse_y = 0;
var night_level = 0;
var effect_counter = 1;
var effect_x = 0;
var effect_y = 0;
var zone_presence = [];
var zone_x = 0;
var zone_y = 0;
var zone_menu = null;
var menu_defaults = {
	root: 'div.playarea',
	z_index: LAYER_MENU
};
var ctrl_down = false;
var shift_down = false;
var alt_down = false;
var drawing_canvas = null;
var drawing_ctx = null;
var drawing_history = [];
var drawing_mode = 'source-over';
var fullscreen = false
var fullscreen_backup = undefined;
var zoom_level = 1.0;
var zoom_tx = 0;
var zoom_ty = 0;
var zoom_min = 0.25;
var zoom_max = 4.0;
var zoom_step = 0.1;
var pause = false;
var ruler_distance = 0;
var ruler_previous = 0;
var key_to_direction = null;
var brushes = {};
var mobile_device = false;
var player_notes = null;

var char_pos_x = 0;
var char_pos_y = 0;
var char_pos_changed = false
