<?php
	class vault_token_model extends Banshee\model {
		private $valid_extensions = array("gif", "jpg", "jpeg", "png", "webp");

		public function get_tokens() {
			$query = "select * from tokens where organisation_id=%d order by name";

			return $this->db->execute($query, $this->user->organisation_id);
		}

		public function get_token($token_id) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->get_token($token_id);
		}

		private function valid_number($number, $label) {
			if (is_numeric($number) == false) {
				$this->view->add_message("Invalid ".strtolower($label).".");
				return false;
			} else if ($number < 0) {
				$this->view->add_message($label." too low.");
				return false;
			}

			return true;
		}

		public function save_okay($token, $image) {
			$result = true;

			if (trim($token["name"]) == "") {
				$this->view->add_message("Fill in the name.");
				$result = false;
			}

			if ($this->valid_number($token["width"], "Width") == false) {
				$result = false;
			} else if ($token["width"] > 50) {
				$this->view->add_message("Width too high.");
				$result = false;
			}

			if ($this->valid_number($token["height"], "Height") == false) {
				$result = false;
			} else if ($token["height"] > 50) {
				$this->view->add_message("Height too high.");
				$result = false;
			}

			if ($this->valid_number($token["armor_class"], "Armor class") == false) {
				$result = false;
			} else if ($token["armor_class"] > 250) {
				$this->view->add_message("Armor class too high.");
				$result = false;
			}

			if ($this->valid_number($token["hitpoints"], "Hit points") == false) {
				$result = false;
			} else if ($token["hitpoints"] > 65000) {
				$this->view->add_message("Hitpoints too high.");
				$result = false;
			}

			if ($image["error"] != 0) {
				if (isset($token["id"]) == false) {
					$this->view->add_message("Upload a image.");
					$result = false;
				}
			} else {
				list(, $extension) = explode("/", $image["type"], 2);
				if (in_array($extension, $this->valid_extensions) == false) {
					$this->view->add_message("Invalid image.");
					$result = false;
				} else if ($this->user->max_resources > 0) {
					$max_capacity = $this->user->max_resources * MB;
					$capacity = $this->borrow("vault/file")->get_directory_size("resources/".$this->user->resources_key);

					if ($capacity + filesize($image["tmp_name"]) > $max_capacity) {
						$this->view->add_message("This file is too big for your maximum resource capacity (%s MB).", $this->user->max_resources);
						return false;
					}
				}
			}

			return $result;
		}

		public function create_token($post, $image) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->create($post, $image);
		}

		public function update_token($post, $image) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->update($post, $image);
		}

		public function delete_okay($token) {
			$result = true;

			if (($current = $this->get_token($token["id"])) == false) {
				$this->view->add_message("Token not found.");
				return false;
			}

			$query = "select distinct m.title, a.title as adventure from maps m, adventures a, map_token t where m.id=t.map_id and m.adventure_id=a.id and token_id=%d order by title";
			if (($maps = $this->db->execute($query, $token["id"])) === false) {
				$this->view->add_message("Database error.");
				$result = false;
			} else if (count($maps) > 0) {
				$titles = array();
				foreach ($maps as $map) {
					array_push($titles, "\"".$map["adventure"]." - ".$map["title"]."\"");
				}
				$this->view->add_message("This token is being used in the following maps: ".implode(", ", $titles));
				$result = false;
			}

			return $result;
		}

		public function delete_token($token_id) {
			$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
			return $token->delete($token_id);
		}

		public function archive_okay($archive, $post) {
			$result = true;

			if ($archive["error"] != 0) {
				$this->view->add_message("Error uploading archive.");
				$result = false;
			} else {
				$pathinfo = pathinfo($archive["name"]);
				if ($pathinfo["extension"] != "zip") {
					$this->view->add_message("Invalid archive.");
					$result = false;
				}
			}

			return $result;
		}

		public function process_archive($archive, $post) {
			$zip = new \ZipArchive;
			if ($zip->open($archive["tmp_name"]) !== true) {
				return false;
			}

			$directory = "resources/".$this->user->resources_key."/tokens/";

			if (($tempdir = tempnam(sys_get_temp_dir(), "cauldron")) == false) {
				return false;
			}
			unlink($tempdir);
			if (mkdir($tempdir) == false) {
				return false;
			}

			for ($i = 0; $i < $zip->numFiles; $i++) {
				$stat = $zip->statIndex($i);
				$pathinfo = pathinfo($stat["name"]);

				if (isset($pathinfo["extension"]) == false) {
					continue;
				} else if (in_array($pathinfo["extension"], $this->valid_extensions) == false) {
					continue;
				}

				$zip->extractTo($tempdir, $stat["name"]);
				$tempfile = $tempdir."/".$stat["name"];

				$data = array(
					"name"         => substr($pathinfo["filename"], 0, 50),
					"width"        => 1,
					"height"       => 1,
					"type"         => $post["type"],
					"armor_class"  => TOKEN_DEFAULT_AC, 
					"hitpoints"    => TOKEN_DEFAULT_HP,
					"shape_change" => false);

				$image = array(
					"error"        => 0,
					"tmp_name"     => $tempfile,
					"extension"    => $pathinfo["extension"]);
				
				$token = new token($this->db, $this->user->organisation_id, $this->user->resources_key);
				$token->create($data, $image);

				unlink($tempfile);

				if ($pathinfo["dirname"] != ".") {
					$parts = explode("/", $pathinfo["dirname"]);
					while (count($parts) > 0) {
						rmdir($tempdir."/".implode("/", $parts));
						array_pop($parts);
					}
				}
			}

			rmdir($tempdir);

			$zip->close();

			return true;
		}
	}
?>
