<?php
	class vault_map_model extends cauldron_model {
		private $export_tables = array("blinders", "doors", "lights", "walls", "zones");

		public function get_maps($adventure_id) {
			$query = "select *, (select count(*) from map_token where map_id=m.id) as tokens ".
			         "from maps m where adventure_id=%d order by title";

			return $this->db->execute($query, $adventure_id);
		}

		public function get_map_type($url) {
			$parts = explode(".", $url);
			$extension = array_pop($parts);

			if (in_array($extension, config_array(MAP_IMAGE_EXTENSIONS))) {
				return "image";
			}

			if (in_array($extension, config_array(MAP_VIDEO_EXTENSIONS))) {
				return "video";
			}

			return false;
		}

		public function get_map($map_id) {
			static $cache = array();

			if (isset($cache[$map_id]) == false) {
				$query = "select m.* from maps m, adventures a ".
				         "where m.adventure_id=a.id and m.id=%d and a.dm_id=%d";

				if (($maps = $this->db->execute($query, $map_id, $this->user->id)) == false) {
					return false;
				}
				$map = $maps[0];

				$map["type"] = $this->get_map_type($map["url"]);

				$cache[$map_id] = $map;
			}

			return $cache[$map_id];
		}

		public function get_image_dimensions($map) {
			if (substr($map["url"], 0, 1) == "/") {
				$image = $map["url"];
				if (substr($image, 0, 11) == "/resources/") {
					$image = "resources/".$this->user->resources_key.substr($image, 10);
				} else if (substr($image, 0, 7) == "/files/") {
					$image = substr($image, 1);
				}
			} else {
				list($protocol,, $hostname, $path) = explode("/", $map["url"], 4);
				if ($protocol == "http:") {
					$website = new \Banshee\Protocol\HTTPS($hostname);
				} else if ($protocol == "https:") {
					$website = new \Banshee\Protocol\HTTPS($hostname);
				} else {
					return false;
				}

				if (($result = $website->GET("/".$path)) === false) {
					return false;
				} else if (($result["status"] ?? null) != 200) {
					return false;
				}

				$image = $result["body"];
			}

			$image = new \Banshee\image($image);

			$map["width"] = $image->width;
			$map["height"] = $image->height;

			return $map;
		}

		public function get_video_dimensions($map) {
			if (substr($map["url"], 0, 1) == "/") {
				$video = $map["url"];
				if (substr($video, 0, 11) == "/resources/") {
					$video = "resources/".$this->user->resources_key.substr($video, 10);
				} else if (substr($video, 0, 7) == "/files/") {
					$video = substr($video, 1);
				}
			} else {
				$this->view->add_system_warning("Automatic dimension detection can only be done for local videos.");
				return false;
			}

			require "../libraries/getid3/getid3.php";
			$getID3 = new getID3;
			$info = $getID3->analyze($video);

			$map["width"] = $info["video"]["resolution_x"];
			$map["height"] = $info["video"]["resolution_y"];

			return $map;
		}

		public function map_changed($map) {
			if (($current = $this->get_map($map["id"])) == false) {
				return true;
			}

			return $map["url"] != $current["url"];
		}

		public function save_okay($map) {
			$result = true;

			if (isset($map["id"])) {
				if ($this->get_map($map["id"]) == false) {
					$this->view->add_message("Map not found.");
					$result = false;
				}
			}

			if (trim($map["title"]) == "") {
				$this->view->add_message("Give the map a title.");
				$result = false;
			}

			if ($map["method"] == "upload") {
				$directory = "resources/".$this->user->resources_key."/maps";
				$warning = "That file already exists in your Resources maps directory. Rename the file or select 'Specify URL to online map file', click 'Browse resources' and select the file from the list.";
				if ($this->borrow("vault/resources")->upload_okay($_FILES["file"], $directory, $warning) == false) {
					return false;
				}

				$map["url"] = $_FILES["file"]["name"];
			}

			if (trim($map["url"]) == "") {
				$this->view->add_message("Empty URL is not allowed.");
				$result = false;
			} else {
				list($url) = explode("?", $map["url"], 2);
				$info = pathinfo($url);
				$extensions = array_merge(
					config_array(MAP_IMAGE_EXTENSIONS),
					config_array(MAP_VIDEO_EXTENSIONS));
				if (in_array($info["extension"] ?? null, $extensions) == false) {
					$this->view->add_message("Unsupported file extension in image/video URL.");
					$result = false;
				}

				if (substr($url, 0, 1) == "/") {
					$file = $this->resource_path($url, $this->user->resources_key);
					if (file_exists(substr(urldecode($file), 1)) == false) {	
						$this->view->add_message("Map file not found.");
						$result = false;
					}
				} else if ((substr($url, 0, 4) != "http") && ($map["method"] == "url")) {
					$this->view->add_message("Invalid map URL.");
					$result = false;
				}
			}

			$min_size = 2 * $this->settings->screen_grid_size;

			if ((valid_input($map["width"], VALIDATE_NUMBERS) == false) || (valid_input($map["height"], VALIDATE_NUMBERS) == false)) {
				$this->view->add_message("Specify map width and height in numbers only.");
				$result = false;
			} else if ((($map["width"] ?? 0) < $min_size) || (($map["height"] ?? 0) < $min_size)) {
				$this->view->add_message("The map must be at least %sx%s pixels. Does the map file exists? Try specifying the dimension manually.", $min_size, $min_size);
				$result = false;
			}

			if (valid_input($map["fow_distance"], VALIDATE_NUMBERS, VALIDATE_NONEMPTY) == false) {
				$this->view->add_message("Invalid FoW distance.");
				$result = false;
			} else if (($map["fow_distance"] == 0) || ($map["fow_distance"] > 250)) {
				$this->view->add_message("Invalid Fog of War distance (1-250).");
				$result = false;
			}

			return $result;
		}

		public function place_characters($adventure_id, $map_id, $start_x, $start_y) {
			if (($map = $this->db->entry("maps", $map_id)) == false) {
				return false;
			}

			$query = "select l.character_id, token_type from adventure_character l, characters c ".
			         "where l.character_id=c.id and l.adventure_id=%d and l.character_id not in ".
			         "(select character_id from map_character where map_id=%d) order by c.name";

			if (($characters = $this->db->execute($query, $adventure_id, $map_id)) === false) {
				return false;
			}

			$data = array(
				"id"       => null,
				"map_id"   => $map_id,
				"pos_x"    => $start_x,
				"pos_y"    => $start_y,
				"rotation" => null,
				"hidden"   => NO,
				"light"    => 0);

			$positions = array(
				array( 0, -1), array( 1,  1), array(-1,  1), array(-1, -1), // cross
				array( 0, -1), array( 2,  0), array( 0,  2), array(-2,  0), // corners
				array( 0,  1), array( 1,  0), array( 1,  0),
				array(-2,  1), array( 1,  0), array( 1,  0));

			foreach ($characters as $character) {
				$data["character_id"] = $character["character_id"];
				$data["rotation"] = ($character["token_type"] == "topdown") ? 180 : 0;

				if ($this->db->insert("map_character", $data) == false) {
					return false;
				}

				$delta = array_shift($positions);
				$data["pos_x"] += $delta[0];
				$data["pos_y"] += $delta[1];
				array_push($positions, $delta);
			}

			return true;
		}

		public function upload_to_url($map, $include_key = false) {
			$url = array();

			if ($include_key == false) {
				array_push($url, "");
			}
			array_push($url, "resources");
			if ($include_key) {
				array_push($url, $this->user->resources_key);
			}
			array_push($url, "maps", $_FILES["file"]["name"]);

			return implode("/", $url);
		}

		public function create_map($map, $transaction = true) {
			$keys = array("id", "adventure_id", "title", "url", "audio", "width", "height",
			              "offset_x", "offset_y", "grid_size", "show_grid", "drag_character",
			              "fog_of_war", "fow_distance", "start_x", "start_y", "dm_notes");

			$adventure_id = $_SESSION["edit_adventure_id"];

			if (($map["method"] ?? null) == "upload") {
				copy($_FILES["file"]["tmp_name"], $this->upload_to_url($map, true));
				$map["url"] = $this->upload_to_url($map);
			}

			$map["id"] = null;
			$map["adventure_id"] = $adventure_id;
			$map["title"] = substr($map["title"], 0, 50);
			if (isset($map["grid_size"]) == false) {
				$map["grid_size"] = 50;
			}
			if (isset($map["start_x"]) == false) {
				$map["start_x"] = 2;
				$map["start_y"] = 2;
			}
			$map["show_grid"] = is_true($_POST["show_grid"] ?? false) ? YES : NO;
			$map["drag_character"] = is_true($map["drag_character"] ?? false) ? YES : NO;

			if (isset($map["offset_x"]) == false) {
				$map["offset_x"] = 0;
			}
			if (isset($map["offset_y"]) == false) {
				$map["offset_y"] = 0;
			}

			if ($transaction) {
				$this->db->query("begin");
			}

			if ($this->db->insert("maps", $map, $keys) === false) {
				if ($transaction) {
					$this->db->query("rollback");
				}
				return false;
			}
			$map_id = $this->db->last_insert_id;

			if ($this->place_characters($adventure_id, $map_id, $map["start_x"], $map["start_y"]) === false) {
				if ($transaction) {
					$this->db->query("rollback");
				}
				return false;
			}

			if ($transaction) {
				if ($this->db->query("commit") === false) {
					return false;
				}
			}

			if (($adventure = $this->db->entry("adventures", $adventure_id)) != false) {
				if ($adventure["active_map_id"] == null) {
					$data = array("active_map_id" => $map_id);
					$this->db->update("adventures", $adventure_id, $data);
				}
			}

			return $map_id;
		}

		public function update_map($map) {
			if ($this->get_map($map["id"]) == false) {
				$this->view->add_message("Map not found.");
				return false;
			}

			$map["title"] = substr($map["title"], 0, 50);

			if ($map["method"] == "upload") {
				copy($_FILES["file"]["tmp_name"], $this->upload_to_url($map, true));
				$map["url"] = $this->upload_to_url($map);
			}

			$keys = array("title", "url", "audio", "width", "height",
			              "drag_character", "fog_of_war", "fow_distance", "dm_notes");

			$map["drag_character"] = is_true($map["drag_character"] ?? false) ? YES : NO;

			return $this->db->update("maps", $map["id"], $map, $keys);
		}

		public function set_grid($map) {
			if ($this->get_map($map["id"]) == false) {
				$this->view->add_message("Map not found.");
				return false;
			}

			$keys = array("grid_size", "show_grid", "offset_x", "offset_y");

			$map["show_grid"] = is_true($map["show_grid"] ?? false) ? YES : NO;

			return $this->db->update("maps", $map["id"], $map, $keys);
		}

		public function constructs_import_file($map_id, $file) {
			if ($this->get_map($map_id) == false) {
				return false;
			} else if (($import = file_get_contents($file["tmp_name"])) == false) {
				return false;
			} else if (substr($import, 0, 2) != "\x1F\x8B") {
				return false;
			} else if (($import = @gzdecode($import)) == false) {
				return false;
			} else if (($import = json_decode($import, true)) == false) {
				return false;
			}

			return $this->constructs_import($map_id, $import);
		}

		public function constructs_import($map_id, $import, $transaction = true) {
			$tables = array(
				"blinders" => array("pos1_x", "pos1_y", "pos2_x", "pos2_y"),
				"doors"    => array("pos_x", "pos_y", "length", "direction", "state", "secret", "bars"),
				"lights"   => array("pos_x", "pos_y", "radius", "state"),
				"walls"    => array("pos_x", "pos_y", "length", "direction", "transparent"),
				"zones"    => array("pos_x", "pos_y", "width", "height", "color", "opacity", "script", "group", "altitude"));

			if ($transaction) {
				$this->db->query("begin");
			}

			$query = "delete from %S where map_id=%d";
			foreach ($tables as $table => $columns) {
				if ($this->db->query($query, $table, $map_id) === false) {
					if ($transaction) {
						$this->db->query("rollback");
					}
					return false;
				}
				
				if (is_array($import[$table] ?? null) == false) {
					continue;
				}

				array_unshift($columns, "map_id");
				array_unshift($columns, "id");
				foreach ($import[$table] as $data) {
					$data["id"] = null;
					$data["map_id"] = $map_id;

					if ($this->db->insert($table, $data, $columns) === false) {
						if ($transaction) {
							$this->db->query("rollback");
						}
						return false;
					}
				}
			}

			return $transaction ? ($this->db->query("commit") != false) : true;
		}

		public function map_export($map_id) {
			if (($map = $this->get_map($map_id)) == false) {
				return false;
			}

			unset($map["id"]);
			unset($map["adventure_id"]);

			$query = "select * from %S where map_id=%d";

			foreach ($this->export_tables as $table) {
				if (($items = $this->db->execute($query, $table, $map_id)) === false) {
					return false;
				}

				$map[$table] = array();
				foreach ($items as $item) {
					unset($item["id"]);
					unset($item["map_id"]);
					array_push($map[$table], $item);
				}
			}

			return $map;
		}

		public function constructs_export($override) {
			if (($map = $this->map_export($override["id"])) == false) {
				return false;
			}

			foreach ($this->export_tables as $table) {
				unset($map[$table]["id"]);
			}

			$data = array("version" => $this->settings->database_version);
			$data = array_merge($data, $map);
			$data["title"] = $override["title"];
			$data["dm_notes"] = $override["dm_notes"];

			return gzencode(json_encode($data));
		}

		public function delete_okay($map) {
			$result = true;

			if ($this->get_map($map["id"]) == false) {
				$this->view->add_message("Map not found.");
				$result = false;
			}

			return $result;
		}

		public function delete_map($map_id) {
			$query = "select a.* from adventures a, maps m ".
			         "where a.id=m.adventure_id and m.id=%d and a.dm_id=%d";
			if (($adventures = $this->db->execute($query, $map_id, $this->user->id)) == false) {
				return false;
			}
			$adventure = $adventures[0];

			$queries = array(
				array("delete from blinders where map_id=%d", $map_id),
				array("delete from doors where map_id=%d", $map_id),
				array("delete from lights where map_id=%d", $map_id),
				array("delete from walls where map_id=%d", $map_id),
				array("delete from zones where map_id=%d", $map_id),
				array("update collectables set map_token_id=null where map_token_id in (select id from map_token where map_id=%d)", $map_id),
				array("delete from map_token where map_id=%d", $map_id),
				array("delete from map_character where map_id=%d", $map_id),
				array("update adventures set active_map_id=null where active_map_id=%d", $map_id),
				array("delete from maps where id=%d", $map_id));

			if ($this->db->transaction($queries) == false) {
				return false;
			}

			if ($adventure["active_map_id"] == $map_id) {
				if (($maps = $this->get_maps($adventure["id"])) != false) {
					$this->db->update("adventures", $adventure["id"], array("active_map_id" => $maps[0]["id"]));
				}
			}
		}

		public function get_market() {
			if (($dp = opendir(MARKET_DIRECTORY)) == false) {
				return false;
			}

			$maps = array();
			while (($dir = readdir($dp)) !== false) {
				if (substr($dir, 0, 1) == ".") {
					continue;
				}

				$file = MARKET_DIRECTORY.$dir."/maps.txt";
				if (file_exists($file) == false) {
					continue;
				}
				$index = file($file);

				foreach ($index as $line) {
					if (substr($line, 0, 1) == "#") {
						continue;
					}

					list($title, $file, $source) = explode("|", trim($line), 3);

					if (strpos($file, ";") !== false) {
						list($file, $url) = explode(";", $file);
					} else {
						$url = null;
					}
					list($base) = explode(".", $file, 2);

					if ($url != null) {
						$file = $url;
					} else {
						$file = "/files/market/".$dir."/".$file;
					}

					array_push($maps, array(
						"title"      => $title,
						"category"   => $dir,
						"background" => $file,
						"constructs" => $base.".cvm",
						"thumbnail"  => $base."-thumbnail.jpg",
						"source"     => $source));
				}
			}

			closedir($dp);

			$sorting = function($a, $b) {
				return strcmp($a["title"], $b["title"]);
			};

			usort($maps, $sorting);

			return $maps;
		}

		public function import_map($map) {
			if (isset($_SESSION["edit_adventure_id"]) == false) {
				$this->view->add_message("No adventure selected.");
				return false;
			}

			if (strpos($map, "..") !== false) {
				$this->view->add_message("Invalid map reference.");
				return false;
			}

			if (($map = file_get_contents(MARKET_DIRECTORY.$map)) == false) {
				return false;
			} else if (substr($map, 0, 2) != "\x1F\x8B") {
				return false;
			} else if (($map = @gzdecode($map)) == false) {
				return false;
			} else if (($map = json_decode($map, true)) == false) {
				return false;
			}

			$query = "select count(*) as count from maps where adventure_id=%d and title=%s";
			if (($result = $this->db->execute($query, $_SESSION["edit_adventure_id"], $map["title"])) == false) {
				$this->view->add_message("Adventure query error.");
				return false;
			}

			if ($result[0]["count"] > 0) {
				$this->view->add_message("A map with that name already exists in this adventure.");
				return false;
			}

			$this->db->query("begin");

			if (($map_id = $this->create_map($map, false)) == false) {
				$this->view->add_message("Error while importing map.");
				$this->db->query("rollback");
				return false;
			}

			if (is_true($map["show_grid"])) {
				$keys = array("show_grid");
				if ($this->db->update("maps", $map_id, $map, $keys) == false) {
					$this->view->add_message("Error while updating maps setting.");
					$this->db->query("rollback");
					return false;
				}
			}

			if ($this->constructs_import($map_id, $map, false) == false) {
				$this->view->add_message("Error while importing map constructs.");
				$this->db->query("rollback");
				return false;
			}

			$this->db->query("commit");

			return $map_id;
		}
	}
?>
