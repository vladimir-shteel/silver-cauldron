<?php
	class character_model extends Banshee\model {
		/* Character functions
		 */
		public function get_characters() {
			$query = "select c.*, a.title from characters c ".
			         "left join adventure_character p on c.id=p.character_id ".
			         "left join adventures a on p.adventure_id=a.id ".
			         "where user_id=%d order by name";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_character($character_id) {
			static $characters = array();

			if (isset($characters[$character_id]) == false) {
				if (($character = $this->db->entry("characters", $character_id)) === false) {
					return false;
				}

				if ($character["user_id"] != $this->user->id) {
					return false;
				}

				$characters[$character_id] = $character;
			}

			return $characters[$character_id];
		}

		private function token_upload_okay($token, $char_id) {
			$result = true;

			if ($token["error"] == UPLOAD_ERR_NO_FILE) {
				if ($char_id == null) {
					$this->view->add_message("Upload a token.");
					$result = false;
				}
			} else {
				$parts = explode("/", $token["type"], 2);

				if (count($parts) < 2) {
					$this->view->add_message("Invalid token.");
					$result = false;
				} else if (in_array($parts[1], array("gif", "jpg", "jpeg", "png")) == false) {
					$this->view->add_message("Invalid token.");
					$result = false;
				}

				if (filesize($token["tmp_name"]) > MAX_CHARACTER_TOKEN_SIZE) {
					$this->view->add_message("Icon size too big.");
					$result = false;
				}
			}

			return $result;
		}

		private function sheet_upload_okay($sheet, $char_id) {
			$result = true;

			if ($sheet["error"] != 0) {
				if ($char_id == null) {
					$this->view->add_message("Select a character sheet file.");
					$result = false;
				}
			} else {
				if ($sheet["type"] != "application/pdf") {
					$this->view->add_message("Invalid character sheet.");
					$result = false;
				}

				if (filesize($sheet["tmp_name"]) > 5 * MB) {
					$this->view->add_message("Character sheet size too big.");
					$result = false;
				}
			}

			return $result;
		}

		private function valid_number($number, $label) {
			if (is_numeric($number) == false) {
				$this->view->add_message("Invalid ".strtolower($label).".");
				return false;
			} else if ($number < 1) {
				$this->view->add_message($label." too low.");
				return false;
			}

			return true;
		}

		public function save_okay($character, $token, $sheet) {
			$result = true;

			if (isset($character["id"])) {
				if ($this->get_character($character["id"]) == false) {
					$this->view->add_message("Character not found.");
					$result = false;
				}
			} else {
				$query = "select count(*) as count from characters where user_id=%d";
				if (($count = $this->db->execute($query, $this->user->id)) === false) {
					$this->view->add_message("Database error.");
					return false;
				}

				if ($count[0]["count"] >= MAX_CHARACTER_COUNT) {
					$this->view->add_message("Maximum number of characters reached.");
					return false;
				}
			}

			if (trim($character["name"]) == "") {
				$this->view->add_message("Fill in the name.");
				$result = false;
			} else {
				$name = preg_replace('/ +/', "", strtolower($character["name"]));
				$forbidden = array("dm", "dungeonmaster", "gm", "gamemaster");

				if (in_array($name, $forbidden)) {
					$this->view->add_message("That name is not allowed.");
					$result = false;
				}
			}

			if ($this->valid_number($character["hitpoints"], "Hit points") == false) {
				$result = false;
			} else if ($character["hitpoints"] > 65000) {
				$this->view->add_message("Hit points too high.");
				$result = false;
			}

			if ($this->valid_number($character["armor_class"], "Armor class") == false) {
				$result = false;
			} else if ($character["armor_class"] > 250) {
				$this->view->add_message("Armor class too high.");
				$result = false;
			}

			if (is_numeric($character["initiative"]) == false) {
				$this->view->add_message("Invalid initiative bonus.");
				$result = false;
			} else if (($character["initiative"] < -32000) || ($character["initiative"] > 32000)) {
				$this->view->add_message("Initiative bonus out of range.");
				$result = false;
			}

			if ($this->token_upload_okay($token, $character["id"] ?? null) == false) {
				$result = false;
			}

			if ($character["sheet"] == "file") {
				if ($this->sheet_upload_okay($sheet, $character["id"] ?? null) == false) {
					$result = false;
				}
			}

			if (($character["sheet"] == "url") && (substr($character["sheet_url"], 0, 4) != 'http')) {
				$this->view->add_message("Invalid character sheet URL.");
				$result = false;
			}

			return $result;
		}

		private function save_token($token, $id, $type) {
			$image = new \Banshee\image($token["tmp_name"]);

			if ($type == "topdown") {
				$image->rotate(180);
			}

			if ($image->save($token["tmp_name"]) == false) {
				return false;
			}

			return copy($token["tmp_name"], "resources/".$this->user->resources_key."/characters/".$id.".".$token["extension"]);
		}

		private function save_sheet($sheet, $id) {
			return copy($sheet["tmp_name"], "resources/".$this->user->resources_key."/characters/".$id.".pdf");
		}

		public function create_character($character, $token, $sheet) {
			$keys = array("id", "user_id", "name", "initiative", "armor_class", "hitpoints", "damage", "vision", "token_type", "extension", "sheet", "sheet_url");

			$character["id"] = null;
			$character["name"] = substr($character["name"], 0, 20);
			$character["user_id"] = $this->user->id;
			$character["initiative"] = (int)$character["initiative"];
			$character["hitpoints"] = (int)$character["hitpoints"];
			$character["damage"] = 0;
			$character["vision"] = 1;
			$character["extension"] = "";
			if ($character["sheet"] == "none") {
				$character["sheet_url"] = null;
			}

			if ($this->db->insert("characters", $character, $keys) === false) {
				return false;
			}
			$char_id = $this->db->last_insert_id;

			if ($this->save_token($token, $char_id, $character["token_type"])) {
				$keys = array("extension");
				$character["extension"] = $token["extension"];
				$this->db->update("characters", $char_id, $character, $keys);
			} else {
				$this->db->delete("characters", $char_id);
				return false;
			}

			if ($character["sheet"] == "file") {
				if ($this->save_sheet($sheet, $char_id)) {
					$keys = array("sheet_url");
					$character["sheet_url"] = "/resources/".$this->user->resources_key."/characters/".$char_id.".pdf";
					$this->db->update("characters", $char_id, $character, $keys);
				} else {
					$this->db->delete("characters", $char_id);
					return false;
				}
			}

			return true;
		}

		public function update_character($character, $token, $sheet) {
			$keys = array("name", "initiative", "armor_class", "hitpoints", "sheet", "sheet_url");

			$character["name"] = substr($character["name"], 0, 20);

			if ($token["error"] == 0) {
				if (($current = $this->get_character($character["id"])) == false) {
					$this->view->add_message("Character not found.");
					$result = false;
				}

				ob_start();
				unlink("resources/".$this->user->resources_key."/characters/".$current["id"].".".$current["extension"]);
				ob_end_clean();

				if ($this->save_token($token, $character["id"], $character["token_type"])) {
					array_push($keys, "extension");
					$character["extension"] = $token["extension"];
				} else {
					return false;
				}

				array_push($keys, "token_type");

				if ($character["token_type"] == "portrait") {
					$query = "update map_character set rotation=%d where character_id=%d";
					$this->db->query($query, 0, $character["id"]);
				}
			} else if ($character["sheet"] == "file") {
				$character["sheet"] = "none";
			}

			$sheet_url = "resources/".$this->user->resources_key."/characters/".$character["id"].".pdf";

			if ($character["sheet"] == "file") {
				if ($sheet["error"] == 0) {
					if ($this->save_sheet($sheet, $character["id"])) {
						$character["sheet_url"] = "/".$sheet_url;
					} else {
						return false;
					}
				} else if (($key = array_search("sheet_url", $keys)) != false) {
					unset($keys[$key]);
				}
			} else {
				if ($character["sheet"] == "none") {
					$character["sheet_url"] = null;
				}

				if (file_exists($sheet_url)){
					unlink($sheet_url);
				}
			}

			return $this->db->update("characters", $character["id"], $character, $keys);
		}

		public function delete_okay($character) {
			$result = true;

			if (($current = $this->get_character($character["id"])) == false) {
				$this->view->add_message("Character not found.");
				$result = false;
			}

			$query = "select count(*) as count from adventure_character where character_id=%d";

			if (($adventures = $this->db->execute($query, $character["id"])) === false) {
				$this->view->add_message("Database error.");
				$result = false;
			}

			if ($adventures[0]["count"] > 0) {
				$this->view->add_message("This character is part of a adventure.");
				$result = false;
			}

			return $result;
		}

		public function delete_character($character_id) {
			if (($current = $this->get_character($character_id)) == false) {
				return false;
			}

			$query = "select * from character_icons where character_id=%d";
			if (($alternates = $this->db->execute($query, $character_id)) === false) {
				return false;
			}

			$queries = array(
				array("delete from character_weapons where character_id=%d", $character_id),
				array("delete from character_icons where character_id=%d", $character_id),
				array("delete from characters where id=%d", $character_id));

			if ($this->db->transaction($queries) === false) {
				return false;
			}

			ob_start();
			foreach ($alternates as $alternate) {
				unlink("resources/".$this->user->resources_key."/characters/".$character_id."_".$alternate["id"].".".$alternate["extension"]);
			}
			unlink("resources/".$this->user->resources_key."/characters/".$character_id.".".$current["extension"]);
			if (file_exists($sheet = "resources/".$this->user->resources_key."/characters/".$character_id.".pdf")) {
				unlink($sheet);
			}
			ob_end_clean();

			return true;
		}

		/* Alternate functions
		 */
		public function get_alternates($character_id) {
			$query = "select * from character_icons where character_id=%d order by name";

			return $this->db->execute($query, $character_id);
		}

		public function token_okay($info, $token) {
			$result = true;

			if ($this->get_character($info["char_id"]) == false) {
				$this->view->add_message("Unknown character.");
				$result = false;
			}

			if (trim($info["name"]) == "") {
				$this->view->add_message("Invalid name.");
				$result = false;
			} else {
				$query = "select count(*) as count from character_icons where name=%s and character_id=%d";
				if (($result = $this->db->execute($query, $info["name"], $info["char_id"])) === false) {
					$this->view->add_message("Database error.");
					$result = false;
				}
				if ($result[0]["count"] > 0) {
					$this->view->add_message("A token with that name already exists.");
					$result = false;
				}
			}

			if (in_array($info["size"], array(1, 2, 3)) == false) {
				$this->view->add_message("Invalid size.");
				$result = false;
			}

			if ($this->token_upload_okay($token, $info["char_id"]) == false) {
				$result = false;
			}

			return $result;
		}

		public function add_token($info, $token) {
			$parts = pathinfo($token["name"]);

			if (isset($parts["extension"]) == false) {
				return false;
			}

			$query = "select token_type from characters where id=%d";
			if (($character = $this->db->execute($query, $info["char_id"])) == false) {
				return false;
			}
			$token_type = $character[0]["token_type"];

			$data = array(
				"id"           => null,
				"character_id" => $info["char_id"],
				"name"         => $info["name"],
				"size"         => $info["size"],
				"extension"    => $parts["extension"]);

			if ($this->db->insert("character_icons", $data) == false) {
				return false;
			}
			$id = $this->db->last_insert_id;

			$image = new \Banshee\image($token["tmp_name"]);
			if ($token_type == "topdown") {
				$image->rotate(180);
			}
			$image->save($token["tmp_name"]);

			if (copy($token["tmp_name"], "resources/".$this->user->resources_key."/characters/".$info["char_id"]."_".$id.".".$parts["extension"]) == false) {
				$this->db->delete("character_icons", $id);
			}

			return true;
		}

		public function delete_token($token_id) {
			$query = "select * from character_icons i, characters c ".
			         "where i.character_id=c.id and i.id=%d and c.user_id=%d";
			if (($character = $this->db->execute($query, $token_id, $this->user->id)) == false) {
				return false;
			}
			$current = $character[0];

			$queries = array(
				array("update adventure_character set alternate_icon_id=null where alternate_icon_id=%d", $token_id),
				array("delete from character_icons where id=%d", $token_id));

			if ($this->db->transaction($queries) == false) {
				return false;
			}

			ob_start();
			unlink("resources/".$this->user->resources_key."/characters/".$current["character_id"]."_".$token_id.".".$current["extension"]);
			ob_end_clean();

			return $current["character_id"];
		}

		/* Weapons
		 */
		public function get_weapons($character_id) {
			$query = "select * from character_weapons where character_id=%d order by name";

			return $this->db->execute($query, $character_id);
		}

		public function weapon_okay($weapon) {
			$result = true;

			if ($this->get_character($weapon["char_id"]) == false) {
				$this->view->add_message("Unknown character.");
				$result = false;
			}

			if (trim($weapon["name"]) == "") {
				$this->view->add_message("Invalid name.");
				$result = false;
			}

			if (trim($weapon["roll"]) == "") {
				$this->view->add_message("Invalid roll.");
				$result = false;
			} else if (strpos($weapon["roll"], "d") === false) {
				$this->view->add_message("No dice found in roll.");
				$result = false;
			} else {
				$roll = preg_replace('/ /', "", $weapon["roll"]);
				$roll = preg_replace('/\+-/', "-", $roll);
				$roll = preg_replace('/-/', "+-", $roll);
				$parts = explode("+", $roll);

				foreach ($parts as $part) {
					if (strlen($part) == 0) {
						$this->view->add_message("Invalid roll.");
						$result = false;
						break;
					}

					if (valid_input($part, VALIDATE_NUMBERS)) {
						continue;
					} else if ((substr($part, 0, 1) == "-") && valid_input(substr($part, 1), VALIDATE_NUMBERS)) {
						continue;
					}

					$dice = explode("d", $part);

					if (count($dice) != 2) {
						$this->view->add_message("Invalid dice.");
						$result = false;
						break;
					}

					if (valid_input($dice[0], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
						$this->view->add_message("Invalid dice count.");
						$result = false;
						break;
					}

					if (in_array($dice[1], array("4", "6", "8", "10", "12", "20", "100")) == false) {
						$this->view->add_message("Invalid dice sides.");
						$result = false;
						break;
					}
				}
			}

			return $result;
		}

		public function add_weapon($weapon) {
			$query = "select id from character_weapons where name=%s and character_id=%d";
			if (($current = $this->db->execute($query, $weapon["name"], $weapon["char_id"])) === false) {
				$this->view->add_message("Database error.");
				return false;
			}

			if (count($current) == 0) {
				$data = array(
					"id"           => null,
					"character_id" => $weapon["char_id"],
					"name"         => $weapon["name"],
					"roll"         => $weapon["roll"]);

				return $this->db->insert("character_weapons", $data) != false;
			} else {
				$data = array(
					"name"         => $weapon["name"],
					"roll"         => $weapon["roll"]);

				return $this->db->update("character_weapons", $current[0]["id"], $data) !== false;
			}
		}

		public function delete_weapon($weapon_id) {
			$query = "select * from character_weapons w, characters c ".
			         "where w.character_id=c.id and w.id=%d and c.user_id=%d";
			if (($character = $this->db->execute($query, $weapon_id, $this->user->id)) == false) {
				return false;
			}
			$current = $character[0];

			if ($this->db->delete("character_weapons", $weapon_id) === false) {
				return false;
			}

			return $current["character_id"];
		}
	}
?>
