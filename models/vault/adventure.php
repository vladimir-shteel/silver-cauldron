<?php
	class vault_adventure_model extends cauldron_model {
		public function get_adventures() {
			$query = "select *, (select count(*) from adventure_character where adventure_id=a.id) as players, ".
			         "(select count(*) from maps where adventure_id=a.id) as maps ".
			         "from adventures a where dm_id=%d order by title";

			return $this->db->execute($query, $this->user->id);
		}

		public function get_adventure($adventure_id) {
			static $cache = array();

			if (isset($cache[$adventure_id]) == false) {
				$query = "select * from adventures where id=%d and dm_id=%d";

				if (($adventures = $this->db->execute($query, $adventure_id, $this->user->id)) == false) {
					return false;
				}
				$cache[$adventure_id] = $adventures[0];
			}

			return $cache[$adventure_id];
		}

		public function save_okay($adventure) {
			$result = true;

			if (isset($adventure["id"])) {
				if (($current = $this->get_adventure($adventure["id"])) == false) {
					$this->view->add_message("Adventure not found.");
					$result = false;
				}
			}

			if (trim($adventure["title"]) == "") {
				$this->view->add_message("Fill in the title.");
				$result = false;
			}

			if ($adventure["image"] != "") {
				if ((substr($adventure["image"], 0, 8) != "https://") && (substr($adventure["image"], 0, 1) != "/")) {
					$this->view->add_message("Invalid image URL.");
					$result = false;
				}

				if (strlen($adventure["image"]) > 250) {
					$this->view->add_message("Image URL is too long.");
					$result = false;
				}
			}

			return $result;
		}

		public function create_adventure($adventure) {
			$keys = array("id", "title", "image", "introduction", "dm_id", "access", "story", "notes");

			$adventure["id"] = null;
			$adventure["title"] = substr($adventure["title"], 0, 50);
			$adventure["dm_id"] = $this->user->id;
			$adventure["active_map_id"] = null;
			$adventure["story"] = "";
			$adventure["notes"] = "";

			return $this->db->insert("adventures", $adventure, $keys) !== false;
		}

		public function update_adventure($adventure) {
			$keys = array("title", "image", "introduction", "access");

			$adventure["title"] = substr($adventure["title"], 0, 50);

			return $this->db->update("adventures", $adventure["id"], $adventure, $keys) !== false;
		}

		public function delete_okay($adventure) {
			$result = true;

			if (($current = $this->get_adventure($adventure["id"])) == false) {
				$this->view->add_message("Adventure not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_adventure($adventure_id) {
			$query = "select resources_key from organisations o, users u, adventures a ".
			         "where o.id=u.organisation_id and u.id=a.dm_id and a.id=%d";
			if (($result = $this->db->execute($query, $adventure_id)) == false) {
				return false;
			}
			$resources_key = $result[0]["resources_key"];

			$query = "select image from collectables where adventure_id=%d";
			if (($collectables = $this->db->execute($query, $adventure_id)) === false) {
				return false;
			}

			$queries = array(
				array("delete from relation_connections where from_entity_id in ".
					"(select id from relation_entities where adventure_id=%d)", $adventure_id),
				array("delete from relation_connections where to_entity_id in ".
					"(select id from relation_entities where adventure_id=%d)", $adventure_id),
				array("delete from relation_entities where adventure_id=%d", $adventure_id),
				array("delete from agenda where adventure_id=%d", $adventure_id),
				array("delete from story_encounter_monsters where story_encounter_id in ".
						"(select id from story_encounters where adventure_id=%d)", $adventure_id),
				array("delete from story_encounters where adventure_id=%d", $adventure_id),
				array("delete from story_events where adventure_id=%d", $adventure_id),
				array("delete from story_npcs where adventure_id=%d", $adventure_id),
				array("delete from story_objects where adventure_id=%d", $adventure_id),
				array("delete from journal where adventure_id=%d", $adventure_id),
				array("delete from collectables where adventure_id=%d", $adventure_id),
				array("delete from lights where map_id in ".
					"(select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from blinders where map_id in ".
					"(select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from doors where map_id in ".
					"(select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from walls where map_id in ".
					"(select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from zones where map_id in ".
					"(select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from map_token where map_id in ".
					"(select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from map_character where map_id in ".
					"(select id from maps where adventure_id=%d)", $adventure_id),
				array("delete from adventure_character where adventure_id=%d", $adventure_id),
				array("update adventures set active_map_id=null where id=%d", $adventure_id),
				array("delete from maps where adventure_id=%d", $adventure_id),
				array("delete from adventures where id=%d", $adventure_id));

			if ($this->db->transaction($queries) == false) {
				return false;
			}

			foreach ($collectables as $collectable) {
				unlink("resources/".$resources_key."/collectables/".$collectable["image"]);
			}

			return true;
		}

		public function export_adventure($adventure_id) {
			if (($adventure = $this->get_adventure($adventure_id)) == false) {
				$this->view->add_message("Adventure not found.");
				return false;
			}

			$adventure = array_merge(array("version" => $this->settings->database_version), $adventure);

			unset($adventure["id"]);
			unset($adventure["dm_id"]);
			unset($adventure["timestamp"]);
			unset($adventure["active_map_id"]);

			$query = "select id from maps where adventure_id=%d";
			if (($maps = $this->db->execute($query, $adventure_id)) === false) {
				$this->view->add_message("Error retrieving adventure.");
				return false;
			}

			$adventure["maps"] = array();

			foreach ($maps as $mapid) {
				if (($map = $this->borrow("vault/map")->map_export($mapid["id"])) == false) {
					$this->view->add_message("Error retrieving maps.");
					return false;
				}

				$query = "select t.name as type, t.width, t.height, p.name, p.known, p.pos_x, p.pos_y, ".
				         "p.rotation, p.hidden, p.armor_class, p.hitpoints, p. damage ".
				         "from tokens t, map_token p where t.id=p.token_id and p.map_id=%d";
				if (($tokens = $this->db->execute($query, $mapid["id"])) !== false) {
					$map["tokens"] = $tokens;
				}

				array_push($adventure["maps"], $map);
			}

			return gzencode(json_encode($adventure));
		}

		public function get_market() {
			if (($dp = opendir(MARKET_DIRECTORY)) == false) {
				return false;
			}

			$adventures = array();
			while (($dir = readdir($dp)) !== false) {
				if (substr($dir, 0, 1) == ".") {	
					continue;
				}

				$file = MARKET_DIRECTORY.$dir."/adventure.txt";
				if (file_exists($file) == false) {
					continue;
				}
				$index = file($file);

				$adventure = array();
				foreach ($index as $line) {
					if (substr($line, 0, 1) == "#") {
						continue;
					}

					list($key, $value) = explode(":", trim($line), 2);

					if ($key != "source") {
						$adventure[$key] = $value;
					} else {
						if (isset($adventure[$key]) == false) {
							$adventure[$key] = array();
						}
						array_push($adventure[$key], $value);
					}
				}

				$adventure["adventure"] = $dir."/".$adventure["adventure"];
				if (isset($adventure["guide"])) {
					if (substr($adventure["guide"], 0, 4) != "http") {
            	        $adventure["guide"] = "/files/market/".$dir."/".$adventure["guide"];
					}
				}

				array_push($adventures, $adventure);
			}

			closedir($dp);

			$sorting = function($a, $b) {
				$al = (int)$a["level"];
				$bl = (int)$b["level"];

				return $al < $bl ? -1 : ($al > $bl ? 1 : strcmp($a["title"], $b["title"]));
			};

			usort($adventures, $sorting);

			return $adventures;
		}

		public function import_adventure($postdata) {
			$file = $postdata["adventure"];

			if (strpos($file, "..") !== false) {
				$this->view->add_message("Invalid adventure reference.");
				return false;
			}

			$file = MARKET_DIRECTORY.$file;

			if (file_exists($file) == false) {
				$this->view->add_message("An adventure not found.");
				return false;
			}

			$adventure = json_decode(gzdecode(file_get_contents($file)), true);

			$query = "select count(*) as count from adventures where title=%s and dm_id=%d";
			if (($result = $this->db->execute($query, $adventure["title"], $this->user->id)) == false) {
				$this->view->add_message("Adventure query error.");
				return false;
			}

			if ($result[0]["count"] > 0) {
				$this->view->add_message("An adventure with that name already exists.");
				return false;
			}

			$maps = $adventure["maps"];
			unset($adventure["maps"]);

			$this->db->query("begin");

			if ($this->create_adventure($adventure) == false) {
				$this->view->add_message("Error creating adventure.");
				$this->db->query("rollback");
				return false;
			}
			$_SESSION["edit_adventure_id"] = $this->db->last_insert_id;

			foreach ($maps as $map) {
				if ($this->borrow("vault/map")->create_map($map, false) == false) {
					$this->view->add_message("Error creating map.");
					$this->db->query("rollback");
					return false;
				}

				$map_id = $this->db->last_insert_id;
				$map["version"] = $adventure["version"] ?? 3.2;

				if ($this->borrow("vault/map")->constructs_import($map_id, $map, false) == false) {
					$this->view->add_message("Error creating constructs.");
					$this->db->query("rollback");
					return false;
				}

				foreach ($map["tokens"] ?? array() as $token) {
					if (($token_id = $postdata["tokens"][$token["type"]] ?? null) == null) {
						$this->view->add_message("Error finding token.");
						$this->db->query("rollback");
						return false;
					}

					$data = array(
						"id"          => null,
						"map_id"      => $map_id,
						"token_id"    => (int)$token_id,
						"name"        => $token["name"],
						"known"       => $token["known"] ?? YES,
						"pos_x"       => (int)$token["pos_x"],
						"pos_y"       => (int)$token["pos_y"],
						"rotation"    => (int)$token["rotation"],
						"hidden"      => (int)$token["hidden"],
						"armor_class" => (int)$token["armor_class"],
						"hitpoints"   => (int)$token["hitpoints"],
						"damage"      => (int)($token["damage"] ?? 0));

					if ($this->db->insert("map_token", $data) === false) {
						$this->view->add_message("Error placing token.");
						$this->db->query("rollback");
						return false;
					}
				}
			}

			return $this->db->query("commit") !== false;
		}

		public function get_placed_tokens($file) {
			$tokens = array();

			$adventure = json_decode(gzdecode(file_get_contents(MARKET_DIRECTORY.$file)), true);

			foreach ($adventure["maps"] as $map) {
				foreach ($map["tokens"] ?? array() as $token) {
					$tokens[$token["type"]] = $token;
				}
			}

			ksort($tokens);

			return array_values($tokens);
		}

		public function get_tokens() {
			return $this->borrow("vault/token")->get_tokens();
		}
	}
?>
