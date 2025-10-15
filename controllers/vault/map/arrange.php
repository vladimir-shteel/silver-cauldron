<?php
	class vault_map_arrange_controller extends cauldron_controller {
		protected $prevent_repost = false;

		private function arrange_map($map_id) {
			if (($map = $this->model->get_map($map_id)) == false) {
				$this->view->add_tag("result", "Database error.", array("url" => "vault/map"));
				return;
			}

			if (($library = $this->model->get_available_tokens()) === false) {
				$this->view->add_tag("result", "Database error.", array("url" => "vault/map"));
				return;
			}

			if (($adventure = $this->model->get_adventure($map["adventure_id"])) === false) {
				$this->view->add_tag("result", "Database error.", array("url" => "vault/map"));
				return;
			}

			if ($this->model->load_rule_system($adventure["rule_system_id"]) == false) {
				$this->view->add_tag("result", "Invalid rule system.");
				return;
			}

			if (($blinders = $this->model->get_blinders($map_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($characters = $this->model->get_characters($map_id)) === false) {
				$this->view->add_tag("result", "Database error.", array("url" => "vault/map"));
				return;
			}

			if (($conditions = $this->model->get_conditions()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($doors = $this->model->get_doors($map_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($map["fog_of_war"] != FOW_NIGHT_CELL) && ($map["fog_of_war"] != FOW_NIGHT_REAL)) {
				$lights = array();
			} else if (($lights = $this->model->get_lights($map_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($tokens = $this->model->get_tokens($map_id)) === false) {
				$this->view->add_tag("result", "Database error.", array("url" => "vault/map"));
				return;
			}

			if (($walls = $this->model->get_walls($map_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($zones = $this->model->get_zones($map_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$grid_cell_size = $this->settings->screen_grid_size;
			$factor = 1 / $map["grid_size"] * $grid_cell_size;
			$map["width"] = round($map["width"] * $factor);
			$map["height"] = round($map["height"] * $factor);
			$map["offset_x"] = round($map["offset_x"] * $factor);
			$map["offset_y"] = round($map["offset_y"] * $factor);

			$this->view->title = $adventure["title"];
			$this->view->set_layout("adventure");

			$this->view->add_javascript("includes/context_menu.js");
			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("includes/library.js");
			$this->view->add_javascript("includes/script.js");
			if (is_true($map["show_grid"])) {
				$this->view->add_javascript("includes/grid.js");
			}

			$this->model->rule_system->start_map_arrange();

			$this->view->add_javascript("vault/map/arrange.js");

			if (($map["fog_of_war"] == FOW_DAY_REAL) || ($map["fog_of_war"] == FOW_NIGHT_REAL)) {
				$type = "real";
			} else if (($map["fog_of_war"] == FOW_DAY_CELL) || ($map["fog_of_war"] == FOW_NIGHT_CELL)) {
				$type = "cell";
			} else {
				$type = "none";
			}

			$this->view->add_javascript("includes/fog_of_war_".$type.".js");

			$this->view->add_css("banshee/font-awesome.css");
		   	$this->view->add_css("includes/context_menu.css");

			$attr = array(
				"id"             => $adventure["id"],
				"resources_key"  => $this->user->resources_key,
				"grid_cell_size" => $grid_cell_size);
			$this->view->open_tag("adventure", $attr);

			for ($i = 0; $i < ADVENTURE_CUSTOM_OPTIONS; $i++) {
				$this->view->add_tag("custom", $adventure["custom".$i]);
				unset($adventure["custom".$i]);
			}

			$this->view->record($adventure);

			$map["url"] = $this->model->resource_path($map["url"]);
			$map["show_grid"] = show_boolean($map["show_grid"]);
			$map["start_x"] *= $grid_cell_size;
			$map["start_y"] *= $grid_cell_size;
			$this->view->record($map, "map");

			/* Blinders
			 */
			$this->view->open_tag("blinders");
			foreach ($blinders as $blinder) {
				$fields = array("pos1_x", "pos1_y", "pos2_x", "pos2_y");
				foreach ($fields as $field) {
					$blinder[$field] = round($blinder[$field] * $grid_cell_size / $map["grid_size"]);
				}
				$this->view->record($blinder, "blinder");
			}
			$this->view->close_tag();

			/* Conditions
			 */
			$this->view->open_tag("conditions");
			foreach ($conditions as $condition) {
				$this->view->add_tag("condition", $condition["name"], array("id" => $condition["id"]));
			}
			$this->view->close_tag();

			/* Library
			 */
			$this->view->open_tag("library");
			foreach ($library as $token) {
				$this->view->record($token, "token");
			}
			$this->view->close_tag();

			/* Doors
			 */
			$this->view->open_tag("doors");
			foreach ($doors as $door) {
				$door["secret"] = show_boolean($door["secret"]);
				$door["bars"] = show_boolean($door["bars"]);
				$this->view->record($door, "door");
			}
			$this->view->close_tag();

			/* Lights
			 */
			$this->view->open_tag("lights");
			foreach ($lights as $light) {
				$light["pos_x"] *= $grid_cell_size;
				$light["pos_y"] *= $grid_cell_size;
				$light["width"] = $grid_cell_size;
				$light["height"] = $grid_cell_size;
				$this->view->record($light, "light");
			}
			$this->view->close_tag();

			/* Walls
			 */
			$this->view->open_tag("walls");
			foreach ($walls as $wall) {
				$wall["transparent"] = show_boolean($wall["transparent"]);
				$this->view->record($wall, "wall");
			}
			$this->view->close_tag();

			/* Zones
			 */
			$this->view->open_tag("zones");
			foreach ($zones as $zone) {
				$zone["pos_x"] *= $grid_cell_size;
				$zone["pos_y"] *= $grid_cell_size;
				$zone["width"] *= $grid_cell_size;
				$zone["height"] *= $grid_cell_size;
				if ($zone["opacity"] < 0.2) {
					$zone["opacity"] = 0.2;
				} else if ($zone["opacity"] > 0.8) {
					$zone["opacity"] = 0.8;
				}
				$this->view->record($zone, "zone");
			}
			$this->view->close_tag();

			/* Tokens
			 */
			$this->view->open_tag("tokens");
			foreach ($tokens as $token) {
				$token["pos_x"] *= $grid_cell_size;
				$token["pos_y"] *= $grid_cell_size;
				$token["width"] *= $grid_cell_size;
				$token["height"] *= $grid_cell_size;
				$token["hidden"] = show_boolean($token["hidden"]);
				$token["known"] = show_boolean($token["known"]);

				$this->view->open_tag("token", array("id" => $token["id"]));

				for ($i = 0; $i < TOKEN_CUSTOM_OPTIONS; $i++) {
					$this->view->add_tag("custom", $token["custom".$i]);
					unset($token["custom".$i]);
				}

				$this->view->record($token);

				$this->view->close_tag();
			}
			$this->view->close_tag();

			/* Characters
			 */
			$this->view->open_tag("characters");
			foreach ($characters as $character) {
				$character["pos_x"] *= $grid_cell_size;
				$character["pos_y"] *= $grid_cell_size;
				$character["hidden"] = show_boolean($character["hidden"]);
				$this->view->record($character, "character");
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		public function execute() {
			$this->view->title = "Adventure";

			if (valid_input($this->page->parameters[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
				$this->view->add_tag("result", "No map specified.", array("url" => "vault/map"));
			} else {
				$this->arrange_map($this->page->parameters[0]);
			}
		}
	}
?>
