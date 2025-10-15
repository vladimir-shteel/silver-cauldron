<?php
	class vault_players_model extends Banshee\model {
		public function get_adventures() {
			$query = "select id, title, (select count(*) from adventure_character where adventure_id=a.id) as players ".
			         "from adventures a where dm_id=%d order by title";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_adventure($adventure_id) {
			$query = "select id, title, (select count(*) from adventure_character where adventure_id=a.id) as players ".
			         "from adventures a where id=%d and dm_id=%d";

			if (($adventures = $this->db->execute($query, $adventure_id, $this->user->id)) == false) {
				return false;
			}

			return $adventures[0];
		}

		public function get_characters($adventure_id) {
			$query = "select c.*, u.fullname, u.id as user_id, ".
			         "(select count(*) from adventure_character where character_id=c.id) as busy, ".
			         "(select count(*) from adventure_character where character_id=c.id and adventure_id=a.id) as enrolled ".
			         "from characters c, users u, adventures a where c.user_id=u.id and a.id=%d and ".
			         "a.rule_system_id=c.rule_system_id and u.organisation_id=%d and u.id!=%d ".
			         "having busy=%d or enrolled=%d order by u.fullname, c.name";

			if (($characters = $this->db->execute($query, $adventure_id, $this->user->organisation_id, $this->user->id, 0, 1)) === false) {
				return false;
			}

			$result = array();
			foreach ($characters as $character) {
				if (isset($result[$character["user_id"]]) == false) {
					$result[$character["user_id"]] = array(
						"name"       => $character["fullname"],
						"characters" => array());
				}

				array_push($result[$character["user_id"]]["characters"], array(
					"id"       => $character["id"],
					"name"     => $character["name"],
					"enrolled" => $character["enrolled"],
					"sheet"    => $character["sheet_url"]));
			}

			return $result;
		}

		public function save_okay($invite) {
			$result = true;

			if ($this->get_adventure($invite["adventure_id"]) == false) {
				$this->view->add_message("Adventure not found.");
				$result = false;
			}

			if (is_array($invite["characters"] ?? null)) {
				$format = implode(", ", array_fill(1, count($invite["characters"]), "%d"));
				$query = "select user_id, name from characters where id in (".$format.")";
				if (($characters = $this->db->execute($query, $invite["characters"])) == false) {
					$result = false;
				} else {
					$players = array();
					$names = array();

					foreach ($characters as $character) {
						if (in_array($character["user_id"], $players)) {
							$this->view->add_message("You may select only one character per player.");
							$result = false;
							break;
						} else {
							array_push($players, $character["user_id"]);
						}

						$name = strtolower($character["name"]);
						if (in_array($name, $names)) {
							$this->view->add_message("You can't select multiple characters with the same name.");
							$result = false;
						} else {
							array_push($names, $name);
						}

						if ($character["user_id"] == $this->user->id) {
							$this->view->add_message("You can't play in your own adventure.");
							$result = false;
						}
					}
				}
			}

			return $result;
		}

		public function invite_players($invite) {
			if ($this->db->query("begin") == false) {
				return false;
			}

			if ($this->db->query("delete from adventure_character where adventure_id=%d", $invite["adventure_id"]) === false) {
				$this->db->query("rollback");
				return false;
			}

			if (is_array($invite["characters"] ?? null)) {
				$data = array("adventure_id" => $invite["adventure_id"]);
				$query = "select * from adventure_character where character_id=%d";
				foreach ($invite["characters"] as $character_id) {
					if (($enrolled = $this->db->execute($query, $character_id)) === false) {
						$this->db->query("rollback");
						return false;
					}
					if (count($enrolled) > 0) {
						$this->db->query("rollback");
						return false;
					}

					$data["character_id"] = $character_id;
					if ($this->db->insert("adventure_character", $data) === false) {
						$this->db->query("rollback");
						return false;
					}
				}
			}

			$query = "select id, start_x, start_y from maps where adventure_id=%d";
			if (($maps = $this->db->execute($query, $invite["adventure_id"])) === false) {
				return false;
			}

			foreach ($maps as $map) {
				if ($this->db->query("delete from map_character where map_id=%d", $map["id"]) === false) {
					$this->db->query("rollback");
					return false;
				}

				if ($this->borrow("vault/map")->place_characters($invite["adventure_id"], $map["id"], $map["start_x"], $map["start_y"]) == false) {
					$this->db->query("rollback");
					return false;
				}
			}

			return $this->db->query("commit") !== false;
		}
	}
?>
