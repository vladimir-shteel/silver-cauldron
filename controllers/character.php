<?php
	class character_controller extends cauldron_controller {
		protected $prevent_repost = true;

		private function show_overview() {
			if (($characters = $this->model->get_characters()) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			if (($rule_systems = $this->model->get_rule_systems()) == false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_javascript("character_overview.js");
			$this->view->add_css("banshee/font-awesome.css");

			$this->view->open_tag("overview");

			$this->view->open_tag("rule_systems");
			foreach ($rule_systems as $rule_system) {
				$this->view->add_tag("rule_system", $rule_system["name"], array("id" => $rule_system["id"]));
			}
			$this->view->close_tag();

			$this->view->open_tag("characters", array("max" => MAX_CHARACTER_COUNT));
			foreach ($characters as $character) {
				if ($character["adventure"] == "") {
					$character["adventure"] = "(none)";
				}

				if ($this->model->load_rule_system($character["rule_system_id"]) == false) {
					$this->view->add_tag("result", "Rule system error.");
					return;
				}

				$character["rule_system"] = $this->model->rule_system->name;
				$character["armor_class_label"] = $this->model->rule_system->armor_class_label;
				$character["initiative_label"] = $this->model->rule_system->initiative_label;

				$this->view->open_tag("character", array("id" => $character["id"]));

				$this->view->record($character);

				foreach ($this->model->rule_system->character_options_custom as $i => $custom) {
					$this->view->add_tag("custom", $character["custom".$i], array("label" => $custom));
				}

				$this->view->close_tag();
			}
			$this->view->close_tag();

			$this->view->close_tag();
		}

		private function show_character_form($character) {
			if (isset($character["id"]) && ($_SERVER["REQUEST_METHOD"] == "POST")) {
				if (($character["rule_system_id"] = $this->model->get_character_rule_system($character["id"])) == false) {
					$this->view->add_tag("result", "Database error.");
					return;
				}
			}

			if ($this->model->load_rule_system($character["rule_system_id"], $character["rule_system"]) == false) {
				$this->view->add_tag("result", "Rule system error.");
				return;
			}

			$this->view->add_javascript("banshee/jquery.windowframe.js");
			$this->view->add_javascript("character_edit.js");

			if ($character["sheet"] == "file") {
				$character["sheet_url"] = "";
			}

			if (isset($character["token_type"]) == false) {
				$character["token_type"] = $character["token_type_backup"];
			}

			foreach (CHARACTER_OPTIONS as $option) {
				if (in_array($option, $this->model->rule_system->character_options) == false) {
					unset($character[$option]);
				}
			}

			$this->view->open_tag("edit");

			$this->view->open_tag("custom_options");
			foreach ($this->model->rule_system->character_options_custom as $i => $option) {
				$this->view->add_tag("custom", $option);
				if (isset($character["custom".$i]) == false) {
					$character["custom".$i] = 0;
				}
			}
			$this->view->close_tag();

			$this->view->add_tag("armor_class_label", $this->model->rule_system->armor_class_label);
			$this->view->add_tag("initiative_label", $this->model->rule_system->initiative_label);

			$this->view->record($character, "character");

			$this->view->close_tag();
		}

		private function show_alternate_form($character_id) {
			$this->view->title = "Character alternate tokens.";

			if (($character = $this->model->get_character($character_id)) == false) {
				$this->view->add_tag("result", "Character not found.");
				return;
			}

			if (($alternates = $this->model->get_alternates($character_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$sizes = array(1 => "Medium", 2 => "Large", 3 => "Huge");

			$attr = array(
				"char_id"   => $character["id"],
				"character" => $character["name"]);
			$this->view->open_tag("alternates", $attr);

			foreach ($alternates as $alternate) {
				$alternate["size"] = strtolower($sizes[$alternate["size"]]);
				$alternate["token_type"] = $character["token_type"];

				$this->view->record($alternate, "alternate");
			}

			$this->view->open_tag("sizes");
			foreach ($sizes as $value => $label) {
				$this->view->add_tag("size", $label, array("value" => $value));
			}
			$this->view->close_tag();
			
			$this->view->close_tag();
		}

		private function show_weapon_form($character_id) {
			$this->view->add_javascript("character_weapons.js");

			$this->view->title = "Character weapons";

			if (($character = $this->model->get_character($character_id)) == false) {
				$this->view->add_tag("result", "Character not found.");
				return;
			}

			if (($weapons = $this->model->get_weapons($character_id)) === false) {
				$this->view->add_tag("result", "Database error.");
				return;
			}

			$this->view->add_help_button();

			$attr = array(
				"char_id"   => $character["id"],
				"character" => $character["name"]);
			$this->view->open_tag("weapons", $attr);

			foreach ($weapons as $weapon) {
				$this->view->record($weapon, "weapon");
			}

			$this->view->close_tag();
		}


		public function execute() {
			$this->view->title = "Characters";
			$this->view->add_help_button();

			if ($_SERVER["REQUEST_METHOD"] == "POST") {
				if ($_POST["submit_button"] == "Save character") {
					/* Save character
					 */
					if ($_FILES["token"]["error"] == 0) {
						list(, $extension) = explode("/", $_FILES["token"]["type"], 2);
						if ($extension == "jpeg") {
							$extension = "jpg";
						}
						$_FILES["token"]["extension"] = $extension;
					}

					if ($this->model->save_okay($_POST, $_FILES["token"], $_FILES["sheet_file"]) == false) {
						$this->show_character_form($_POST);
					} else if (isset($_POST["id"]) === false) {
						/* Create character
						 */
						if ($this->model->create_character($_POST, $_FILES["token"], $_FILES["sheet_file"]) === false) {
							$this->view->add_message("Error creating character. Possibly, the token's image extension is wrong (.jpg instead of .webp).");
							$this->show_character_form($_POST);
						} else {
							$this->user->log_action("character %d created", $this->db->last_insert_id);
							$this->show_overview();
						}
					} else {
						/* Update character
						 */
						if ($this->model->update_character($_POST, $_FILES["token"], $_FILES["sheet_file"]) === false) {
							$this->view->add_message("Error updating character.");
							$this->show_character_form($_POST);
						} else {
							$this->user->log_action("character %d updated", $_POST["id"]);
							$this->show_overview();
						}
					}
				} else if ($_POST["submit_button"] == "Delete character") {
					/* Delete character
					 */
					if ($this->model->delete_okay($_POST) == false) {
						$this->show_character_form($_POST);
					} else if ($this->model->delete_character($_POST["id"]) === false) {
						$this->view->add_message("Error deleting character.");
						$this->show_character_form($_POST);
					} else {
						$this->user->log_action("character %d deleted", $_POST["id"]);
						$this->show_overview();
					}
				} else if ($_POST["submit_button"] == "Add token") {
					/* Add alternate token
					 */
					if ($this->model->token_okay($_POST, $_FILES["token"]) != false) {
						if ($this->model->add_token($_POST, $_FILES["token"]) == false) {
							$this->view->add_message("Error adding alternate token.");
						}
					} else {
						$this->view->add_tag("name", $_POST["name"]);
						$this->view->add_tag("size", $_POST["size"]);
					}
					$this->show_alternate_form($_POST["char_id"]);
				} else if ($_POST["submit_button"] == "delete") {
					/* Delete alternate token
					 */
					if (($char_id = $this->model->delete_token($_POST["token_id"])) == false) {
						$this->view->add_system_warning("Icon not found.");
						$this->show_overview();
					} else {
						$this->show_alternate_form($char_id);
					}
				} else if ($_POST["submit_button"] == "Add weapon") {
					/* Add weapon
					 */
					if ($this->model->weapon_okay($_POST) != false) {
						if ($this->model->add_weapon($_POST) == false) {
							$this->view->add_message("Error adding weapon.");
						}
					} else {
						$this->view->add_tag("name", $_POST["name"]);
						$this->view->add_tag("roll", $_POST["roll"]);
					}
					$this->show_weapon_form($_POST["char_id"]);
				} else if ($_POST["submit_button"] == "remove") {
					/* Delete alternate token
					 */
					if (($char_id = $this->model->delete_weapon($_POST["weapon_id"])) == false) {
						$this->view->add_system_warning("Weapon not found.");
						$this->show_overview();
					} else {
						$this->show_weapon_form($char_id);
					}
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "alternate")) {
				/* Alternate token
				 */
				if (valid_input($this->page->parameters[1], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
					$this->show_alternate_form($this->page->parameters[1]);
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "weapon")) {
				/* Weapon
				 */
				if (valid_input($this->page->parameters[1], VALIDATE_NUMBERS, VALIDATE_NONEMPTY)) {
					$this->show_weapon_form($this->page->parameters[1]);
				} else {
					$this->show_overview();
				}
			} else if ($this->page->parameter_value(0, "new") && $this->page->parameter_numeric(1)) {
				/* New character
				 */
				$character = array("rule_system_id" => $this->page->parameters[1],
				                   "hitpoints"      => 1,
				                   "armor_class"    => 10,
				                   "initiative"     => 0,
				                   "token_type"     => "portrait",
				                   "sheet"          => "none");
				$this->show_character_form($character);
			} else if ($this->page->parameter_numeric(0)) {
				/* Edit character
				 */
				if (($character = $this->model->get_character($this->page->parameters[0])) == false) {
					$this->view->add_tag("result", "character not found.");
				} else {
					$this->show_character_form($character);
				}
			} else {
				/* Show overview
				 */
				$this->show_overview();
			}
		}
	}
?>
