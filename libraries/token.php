<?php
	class token {
		private $db = null;
		private $organisation_id = null;
		private $resources_key = null;

		public function __construct($db, $organisation_id, $resources_key) {
			$this->db = $db;
			$this->organisation_id = $organisation_id;
			$this->resources_key = $resources_key;
		}

		public function get_token($token_id) {
			static $tokens = array();

			if (isset($tokens[$token_id]) == false) {
				if (($token = $this->db->entry("tokens", $token_id)) == false) {
					return false;
				}

				if ($token["organisation_id"] != $this->organisation_id) {
					return false;
				}

				$tokens[$token_id] = $token;
			}

			return $tokens[$token_id];
		}

		private function save_image($image, $id, $type) {
			$destination = "resources/".$this->resources_key."/tokens/".$id.".".$image["extension"];

			if (copy($image["tmp_name"], $destination) == false) {
				return false;
			}

			$token = new \Banshee\image($destination);
			if ($type == "topdown") {
				$token->rotate(180);
			}

			return $token->save($destination);
		}

		public function create($token, $image) {
			$keys = array("id", "organisation_id", "name", "width", "height", "extension", "type", "armor_class", "hitpoints", "shape_change");

			$token["id"] = null;
			$token["organisation_id"] = $this->organisation_id;
			$token["name"] = substr($token["name"], 0, 50);
			$token["shape_change"] = is_true($token["shape_change"] ?? false) ? YES : NO;
			$token["extension"] = $image["extension"];

			if ($this->db->insert("tokens", $token, $keys) === false) {
				return false;
			}
			$token_id = $this->db->last_insert_id;

			if ($this->save_image($image, $token_id, $token["type"]) == false) {
				$this->db->delete("tokens", $token_id);
				return false;
			}

			return true;
		}

		public function update($token, $image) {
			$keys = array("name", "width", "height", "armor_class", "hitpoints", "shape_change");

			if (($current = $this->get_token($token["id"])) == false) {
				return false;
			}

			$token["name"] = substr($token["name"], 0, 50);
			$token["shape_change"] = is_true($token["shape_change"] ?? false) ? YES : NO;

			if ($image["error"] == 0) {
				if ($this->save_image($image, $token["id"], $token["type"]) == false) {
					return false;
				}

				array_push($keys, "extension", "type");
				$token["extension"] = $image["extension"];

				if ($token["type"] == "portrait") {
					$query = "update map_token set rotation=%d where token_id=%d";
					$this->db->query($query, 0, $token["id"]);
				}
			}

			return $this->db->update("tokens", $token["id"], $token, $keys);
		}

		public function delete($token_id) {
			if (($current = $this->get_token($token_id)) == false) {
				return false;
			}

			$queries = array(
				array("update adventure_character set token_id=null where token_id=%d", $token_id),
				array("delete from map_token where token_id=%d", $token_id),
				array("delete from tokens where id=%d", $token_id));
			if ($this->db->transaction($queries) === false) {
				return false;
			}

			$filename = "resources/".$this->resources_key."/tokens/".$token_id.".".$current["extension"];
			if (file_exists($filename)) {
				unlink($filename);
			}

			return true;
		}
	}
?>
