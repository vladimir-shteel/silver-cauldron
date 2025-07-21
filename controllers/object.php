<?php
	class object_controller extends Banshee\api_controller {
		public function post_player_notes() {
			$this->model->save_player_notes($_POST["adventure_id"], $_POST["notes"]);
		}

		public function post_armor_class() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_armor_class($instance_id, $_POST["armor_class"]);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_armor_class($instance_id, $_POST["armor_class"]);
			}
		}

		public function post_change_map() {
			$this->model->change_map($_POST["adventure_id"], $_POST["map_id"]);
		}

		public function post_create_blinder() {
			if (($instance_id = $this->model->blinder_create($_POST)) !== false) {
				$this->view->add_tag("instance_id", $instance_id);
			} else {
				debug_log($_POST);
				return false;
			}
		}

		public function post_create_door() {
			if (($instance_id = $this->model->door_create($_POST)) !== false) {
				$this->view->add_tag("instance_id", $instance_id);
			} else {
				debug_log($_POST);
				return false;
			}
		}

		public function post_create_light() {
			if (($instance_id = $this->model->light_create($_POST)) !== false) {
				$this->view->add_tag("instance_id", $instance_id);
			} else {
				debug_log($_POST);
				return false;
			}
		}

		public function post_create_token() {
			if (($instance_id = $this->model->token_create($_POST)) !== false) {
				$this->view->add_tag("instance_id", $instance_id);
			} else {
				debug_log($_POST);
				return false;
			}
		}

		public function post_create_wall() {
			if (($instance_id = $this->model->wall_create($_POST)) !== false) {
				$this->view->add_tag("instance_id", $instance_id);
			} else {
				debug_log($_POST);
				return false;
			}
		}

		public function post_create_zone() {
			if (($instance_id = $this->model->zone_create($_POST)) !== false) {
				$this->view->add_tag("instance_id", $instance_id);
			} else {
				debug_log($_POST);
				return false;
			}
		}

		public function post_damage() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_damage($instance_id, $_POST["damage"]);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_damage($instance_id, $_POST["damage"]);
			}
		}

		public function post_delete() {
			if (substr($_POST["instance_id"], 0, 7) == "blinder") {
				$instance_id = substr($_POST["instance_id"], 7);
				$this->model->blinder_delete($instance_id);
			} else if (substr($_POST["instance_id"], 0, 4) == "door") {
				$instance_id = substr($_POST["instance_id"], 4);
				$this->model->door_delete($instance_id);
			} else if (substr($_POST["instance_id"], 0, 5) == "light") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->light_delete($instance_id);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_delete($instance_id);
			} else if (substr($_POST["instance_id"], 0, 4) == "wall") {
				$instance_id = substr($_POST["instance_id"], 4);
				$this->model->wall_delete($instance_id);
			} else if (substr($_POST["instance_id"], 0, 4) == "zone") {
				$instance_id = substr($_POST["instance_id"], 4);
				$this->model->zone_delete($instance_id);
			}
		}

		public function post_hide() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_hide($instance_id, true);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_hide($instance_id, true);
			}
		}

		public function post_hitpoints() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_hitpoints($instance_id, $_POST["hitpoints"]);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_hitpoints($instance_id, $_POST["hitpoints"]);
			}
		}

		public function post_move() {
			if ($_POST["instance_id"] == "start") {
				$this->model->start_move($_POST["map_id"], $_POST["pos_x"], $_POST["pos_y"]);
			} else if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_move($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
			} else if (substr($_POST["instance_id"], 0, 5) == "light") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->light_move($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_move($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
			} else if (substr($_POST["instance_id"], 0, 4) == "zone") {
				$instance_id = substr($_POST["instance_id"], 4);
				$this->model->zone_move($instance_id, $_POST["pos_x"], $_POST["pos_y"]);
			}
		}

		public function post_name() {
			if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_name($instance_id, $_POST["name"]);
			}
		}

		public function post_known() {
			if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_known($instance_id, $_POST["known"]);
			}
		}

		public function post_rotate() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_rotate($instance_id, $_POST["rotation"]);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_rotate($instance_id, $_POST["rotation"]);
			}
		}

		public function post_show() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_hide($instance_id, false);
			} else if (substr($_POST["instance_id"], 0, 5) == "token") {
				$instance_id = substr($_POST["instance_id"], 5);
				$this->model->token_hide($instance_id, false);
			}
		}

		public function post_vision() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_vision($instance_id, $_POST["vision"]);
			}
		}

		/* Collectables
		 */
		public function post_collectables_unused() {
			if (($collectables = $this->model->collectables_get_unused($_POST["adventure_id"], $_POST["instance_id"])) === false) {
				return false;
			}

			foreach ($collectables as $collectable) {
				$this->view->record($collectable, "collectable");
			}
		}

		public function post_collectable_place() {
			$this->model->collectable_place($_POST["collectable_id"], $_POST["instance_id"]);
		}

		public function post_collectable_found() {
			$this->model->collectable_found($_POST["collectable_id"]);
		}

		public function post_collectables_found() {
			if (($collectables = $this->model->collectables_get_found($_POST["adventure_id"])) === false) {
				return false;
			}

			foreach ($collectables as $collectable) {
				if ($collectable["explain"] == 0) {
					$collectable["description"] = "";
				}
				$this->view->record($collectable, "collectable");
			}
		}

		public function post_collectables_all() {
			if (($collectables = $this->model->collectables_get_all($_POST["adventure_id"])) === false) {
				return false;
			}

			foreach ($collectables as $collectable) {
				$collectable["found"] = show_boolean($collectable["found"] ?? false);
				$collectable["explain"] = show_boolean($collectable["explain"] ?? false);

				$this->view->record($collectable, "collectable");
			}
		}

		public function post_collectable_state() {
			$this->model->collectable_state($_POST["id"], $_POST["field"], $_POST["state"]);
		}

		/* Alternate icon
		 */
		public function post_alternate() {
			$this->model->set_alternate($_POST["adventure_id"], $_POST["char_id"], $_POST["alternate_id"]);
		}

		/* Change shape
		 */
		public function post_shape() {
			$this->model->set_shape($_POST["adventure_id"], $_POST["char_id"], $_POST["token_id"]);
		}

		/* Doors
		 */
		public function post_door_state() {
			$this->model->door_state($_POST["door_id"], $_POST["state"]);
		}

		public function post_door_secret() {
			$this->model->door_secret($_POST["door_id"], $_POST["secret"]);
		}

		public function post_door_bars() {
			$this->model->door_bars($_POST["door_id"], $_POST["bars"]);
		}

		/* Journal
		 */
		public function post_journal_add() {
			if (($entry_id = $this->model->journal_add($_POST["adventure_id"], $_POST["content"])) !== false) {
				$this->view->add_tag("entry_id", $entry_id);
			}
		}

		public function post_journal_update() {
			$this->model->journal_update($_POST["entry_id"], $_POST["content"]);
		}

		/* Lights
		 */
		public function post_light() {
			if (substr($_POST["instance_id"], 0, 9) == "character") {
				$instance_id = substr($_POST["instance_id"], 9);
				$this->model->character_light($instance_id, $_POST["radius"]);
			}
		}

		public function post_light_radius() {
			$this->model->light_radius($_POST["light_id"], $_POST["radius"]);
		}

		public function post_light_state() {
			$this->model->light_state($_POST["light_id"], $_POST["state"]);
		}

		/* Script
		 */
		public function post_script() {
			$copy_script = is_true($_POST["copy_script"]);
			$this->model->script_save($_POST["zone_id"], $_POST["map_id"], $_POST["script"], $_POST["zone_group"], $copy_script);
		}
	}
?>
