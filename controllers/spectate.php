<?php
	class spectate_controller extends Banshee\controller {
		protected $prevent_repost = false;

		private function format_text($text) {
			if ($text == "") {
				return $text;
			}

			$message = new \Banshee\message($text);
			$message->unescaped_output();
			$message->translate_bbcodes(false);

			return "<p>".$message->content."</p>";
		}

		private function show_adventures() {
			if (($adventures = $this->model->get_adventures()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("adventures.js");

			$this->view->open_tag("adventures");
			foreach ($adventures as $adventure) {
				$adventure["image"] = $this->model->resource_path($adventure["image"], $adventure["resources_key"]);
				$adventure["introduction"] = $this->format_text($adventure["introduction"]);

				$this->view->record($adventure, "adventure");
			}
			$this->view->close_tag();
		}

		private function spectate_adventure($adventure_id) {
			if (($adventure = $this->model->get_adventure($adventure_id)) === false) {
				$page = ($this->page->previous != "spectate") ? "adventure" : "spectate";
				$this->view->add_tag("result", "Adventure not found.", array("url" => $page));
				return;
			}

			if ($this->page->parameter_numeric(1)) {
				$adventure["active_map_id"] = $this->page->parameters[1];
			}

			if (($maps = $this->model->get_maps($adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (count($maps) == 0) {
				$this->view->add_tag("result", "This adventure has no maps.");
				return;
			}

			$grid_cell_size = $this->settings->screen_grid_size;

			if ($adventure["active_map_id"] == null) {
				$adventure["active_map_id"] = $maps[0]["id"];
			}

			if (($active_map = $this->model->get_map($adventure["active_map_id"])) == false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if ($active_map["adventure_id"] != $adventure_id) {
				$this->view->add_tag("result", "Invalid map.");
				return;
			}

			if (($tokens = $this->model->get_tokens($adventure["active_map_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($characters = $this->model->get_characters($adventure["active_map_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($doors = $this->model->get_doors($adventure["active_map_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($walls = $this->model->get_walls($adventure["active_map_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($lights = $this->model->get_lights($adventure["active_map_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($zones = $this->model->get_zones($adventure["active_map_id"])) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($journal = $this->model->get_journal($adventure_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$factor = 1 / $active_map["grid_size"] * $grid_cell_size;
			$active_map["width"] = round($active_map["width"] * $factor);
			$active_map["height"] = round($active_map["height"] * $factor);
			$active_map["offset_x"] = round($active_map["offset_x"] * $factor);
			$active_map["offset_y"] = round($active_map["offset_y"] * $factor);

			$this->view->title = $adventure["title"];
			$this->view->set_layout("adventure");

			$this->view->add_javascript("includes/context_menu.js");
			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("includes/library.js");
			if (is_true($active_map["show_grid"])) {
				$this->view->add_javascript("includes/grid.js");
			}
			$this->view->add_javascript("spectate.js");

			$this->view->add_tag("back", $this->user->is_admin ? "spectate" : "adventure");

			$this->view->add_css("banshee/font-awesome.css");
			$this->view->add_css("includes/context_menu.css");

			$attr = array("id" => $adventure["id"]);
			$this->view->open_tag("adventure", $attr);
			$this->view->record($adventure);

			$group_key = hash_hmac("sha256", $adventure["title"], $this->settings->secret_website_code);
			$group_key = substr($group_key, 0, 12);
			$this->view->add_tag("group_key", $group_key);

			$this->view->add_tag("grid_cell_size", $grid_cell_size);

			/* Websocket
			 */
			$this->view->open_tag("websocket");
			$this->view->add_tag("host", $_SERVER["HTTP_HOST"]);
			$this->view->add_tag("port", WEBSOCKET_PORT);
			$this->view->close_tag();

			/* Map selector
			 */
			if ($maps != null) {
				$this->view->open_tag("maps");
				if ($active_map == null) {
					$this->view->add_tag("map", "-", array("id" => 0));
				}
				foreach ($maps as $map) {
					$attr = array("id" => $map["id"]);
					if ($active_map != null) {
						$attr["current"] = show_boolean($map["id"] == $active_map["id"]);
					} else {
						$attr["current"] = "no";
					}

					$this->view->add_tag("map", $map["title"], $attr);
				}
				$this->view->close_tag();
			}

			if ($active_map != null) {
				unset($active_map["dm_notes"]);

				$active_map["show_grid"] = show_boolean($active_map["show_grid"]);
				$active_map["drag_character"] = show_boolean($active_map["drag_character"]);
				$active_map["url"] = $this->model->resource_path($active_map["url"], $adventure["resources_key"]);

				$this->view->record($active_map, "map");

				/* Doors
				 */
				$this->view->open_tag("doors");
				foreach ($doors as $door) {
					$door["secret"] = show_boolean($door["secret"]);
					$door["bars"] = show_boolean($door["bars"]);
					$this->view->record($door, "door");
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

				/* Lights
				 */
				$this->view->open_tag("lights");
				foreach ($lights as $light) {
					$light["pos_x"] *= $grid_cell_size;
					$light["pos_y"] *= $grid_cell_size;

					$this->view->record($light, "light");
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
					unset($zone["script"]);
					$this->view->record($zone, "zone");
				}
				$this->view->close_tag();

				/* Tokens
				 */
				$this->view->open_tag("tokens");
				foreach ($tokens as $token) {
					$token["type"] = rtrim($token["type"], " 01234567890");
					$token["pos_x"] *= $grid_cell_size;
					$token["pos_y"] *= $grid_cell_size;
					$token["width"] *= $grid_cell_size;
					$token["height"] *= $grid_cell_size;
					$token["hidden"] = show_boolean($token["hidden"]);
					if ($token["hitpoints"] > 0) {
						$token["perc"] = round(100 * $token["damage"] / $token["hitpoints"]);
					}
					if (isset($token["c_id"])) {
						$token["c_hide"] = show_boolean($token["c_hide"]);
						$token["c_found"] = show_boolean($token["c_found"]);
					}
					$this->view->record($token, "token");
				}
				$this->view->close_tag();

				/* Characters
				 */
				$this->view->open_tag("characters");
				foreach ($characters as $character) {
					$character["pos_x"] *= $grid_cell_size;
					$character["pos_y"] *= $grid_cell_size;
					$character["width"] = $grid_cell_size;
					$character["height"] = $grid_cell_size;
					$character["hidden"] = show_boolean($character["hidden"]);
					$character["perc"] = round(100 * $character["damage"] / $character["hitpoints"]);
					$character["orig_src"] = $character["id"].".".$character["extension"];
					if ($character["alternate_id"] != null) {
						$character["src"] = $character["id"]."_".$character["alternate_id"].".".$character["extension"];
						$character["width"] *= $character["alternate_size"];
						$character["height"] *= $character["alternate_size"];
					} else {
						$character["src"] = $character["orig_src"];
					}
					$this->view->record($character, "character");
				}
				$this->view->close_tag();

				/* Journal
				 */
				$timestamp = 0;
				$session = 1;
				$this->view->open_tag("journal");
				foreach ($journal as $entry) {
					if ($entry["timestamp"] - $timestamp > 6 * HOUR) {
						$entry["session"] = "Session ".$session;
						$session++;
					}
					$this->view->record($entry, "entry");
					$timestamp = $entry["timestamp"];
				}
				if (time() - $timestamp > 6 * HOUR) {
					$this->view->record(array("session" => "Session ".$session), "entry");
				}
				$this->view->close_tag();
			}

			$this->view->close_tag();
		}

		public function execute() {
			$this->view->title = "Spectate adventures";
			$this->view->add_css("adventure.css");
			$this->view->add_css("spectate.css");

			if ($this->page->parameter_numeric(0)) {
				$this->spectate_adventure($this->page->parameters[0]);
			} else {
				$this->show_adventures();
			}
		}
	}
?>
